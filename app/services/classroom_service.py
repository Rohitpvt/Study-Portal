"""
app/services/classroom_service.py
─────────────────────────────────
Logic for classroom creation, joining, and management.
"""

from datetime import datetime
import random
import string
from typing import List, Optional, Tuple
from sqlalchemy import select, func, and_, or_, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.classroom import (
    Classroom, ClassroomMember, ClassroomTopic, ClassroomMaterial, 
    ClassroomAnnouncement, ClassroomAssignment, AssignmentAttachment, AssignmentSubmission,
    ClassroomComment, ClassroomStatus, MembershipStatus, AssignmentStatus, AIHelpMode, SubmissionStatus,
    CommentVisibility, CommentStatus
)
from app.models.user import User, Role
from app.models.material import Material
from app.schemas.classroom import (
    ClassroomCreate, 
AssignmentSubmissionCreate, AssignmentSubmissionGradeRequest
)
from app.schemas.classroom_comment import ClassroomCommentCreate, ClassroomCommentUpdate
from app.services.notification_service import NotificationService
from app.schemas.notification import NotificationCreate
from app.models.notification import NotificationType


class ClassroomService:
    @staticmethod
    async def generate_unique_join_code(db: AsyncSession) -> str:
        """Generates a unique 6-character alphanumeric join code."""
        chars = string.ascii_uppercase + string.digits
        while True:
            code = "".join(random.choices(chars, k=6))
            # Check for collision
            result = await db.execute(select(Classroom).where(Classroom.join_code == code))
            if not result.scalar_one_or_none():
                return code

    @staticmethod
    async def _get_active_student_ids(db: AsyncSession, classroom_id: str) -> List[str]:
        """Fetch all active student IDs for a classroom."""
        result = await db.execute(
            select(ClassroomMember.user_id)
            .where(
                and_(
                    ClassroomMember.classroom_id == classroom_id,
                    ClassroomMember.role_in_class == "student",
                    ClassroomMember.status == MembershipStatus.ACTIVE
                )
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_classroom(db: AsyncSession, creator: User, data: ClassroomCreate) -> Classroom:
        join_code = await ClassroomService.generate_unique_join_code(db)
        classroom = Classroom(
            **data.model_dump(),
            join_code=join_code,
            created_by_teacher_id=creator.id,
            status=ClassroomStatus.ACTIVE
        )
        db.add(classroom)
        await db.flush() # Get ID

        # Auto-add creator as a member with teacher role
        member = ClassroomMember(
            user_id=creator.id,
            classroom_id=classroom.id,
            role_in_class="teacher",
            status=MembershipStatus.ACTIVE
        )
        db.add(member)
        await db.commit()
        await db.refresh(classroom)
        return classroom

    @staticmethod
    async def list_classrooms_for_user(db: AsyncSession, user: User) -> List[Classroom]:
        if user.role.is_privileged:
            query = select(Classroom).where(Classroom.status == ClassroomStatus.ACTIVE)
        else:
            query = (
                select(Classroom)
                .join(ClassroomMember)
                .where(
                    and_(
                        ClassroomMember.user_id == user.id,
                        ClassroomMember.status == MembershipStatus.ACTIVE,
                        Classroom.status == ClassroomStatus.ACTIVE
                    )
                )
            )
        
        result = await db.execute(query.order_by(Classroom.created_at.desc()))
        return list(result.scalars().all())

    @staticmethod
    async def get_classroom_details(db: AsyncSession, classroom_id: str) -> Optional[Classroom]:
        result = await db.execute(select(Classroom).where(Classroom.id == classroom_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def join_classroom_by_code(db: AsyncSession, user: User, data: JoinClassroomRequest) -> Classroom:
        code = data.join_code.strip().upper()
        result = await db.execute(select(Classroom).where(Classroom.join_code == code))
        classroom = result.scalar_one_or_none()
        
        if not classroom:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid classroom code.")
        
        if classroom.status == ClassroomStatus.ARCHIVED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This classroom has been archived.")

        m_result = await db.execute(
            select(ClassroomMember).where(
                and_(ClassroomMember.classroom_id == classroom.id, ClassroomMember.user_id == user.id)
            )
        )
        existing = m_result.scalar_one_or_none()
        
        if existing:
            if existing.status == MembershipStatus.ACTIVE:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already a member of this classroom.")
            else:
                existing.status = MembershipStatus.ACTIVE
                existing.joined_at = func.now()
                await db.commit()
                return classroom

        member = ClassroomMember(
            user_id=user.id,
            classroom_id=classroom.id,
            role_in_class="student",
            status=MembershipStatus.ACTIVE
        )
        db.add(member)
        await db.commit()
        return classroom

    @staticmethod
    async def remove_member(db: AsyncSession, classroom_id: str, user_id: str):
        result = await db.execute(
            select(ClassroomMember).where(
                and_(ClassroomMember.classroom_id == classroom_id, ClassroomMember.user_id == user_id)
            )
        )
        member = result.scalar_one_or_none()
        if not member:
            raise HTTPException(status_code=404, detail="Member not found.")
            
        cl_result = await db.execute(select(Classroom).where(Classroom.id == classroom_id))
        classroom = cl_result.scalar_one_or_none()
        if classroom and classroom.created_by_teacher_id == user_id:
            raise HTTPException(status_code=400, detail="The owner cannot be removed.")

        member.status = MembershipStatus.REMOVED
        await db.commit()

    @staticmethod
    async def archive_classroom(db: AsyncSession, classroom_id: str) -> Classroom:
        result = await db.execute(select(Classroom).where(Classroom.id == classroom_id))
        classroom = result.scalar_one_or_none()
        if not classroom:
            raise HTTPException(status_code=404, detail="Classroom not found.")
        classroom.status = ClassroomStatus.ARCHIVED
        await db.commit()
        await db.refresh(classroom)
        return classroom

    # ── TOPIC MANAGEMENT ───────────────────────────────────────────────────────

    @staticmethod
    async def create_topic(db: AsyncSession, classroom_id: str, data: ClassroomTopicCreate) -> ClassroomTopic:
        result = await db.execute(
            select(func.max(ClassroomTopic.sort_order)).where(ClassroomTopic.classroom_id == classroom_id)
        )
        max_order = result.scalar() or 0
        topic = ClassroomTopic(
            **data.model_dump(exclude={"sort_order"}),
            classroom_id=classroom_id,
            sort_order=data.sort_order if data.sort_order > 0 else max_order + 1
        )
        db.add(topic)
        await db.commit()
        await db.refresh(topic)
        return topic

    @staticmethod
    async def update_topic(db: AsyncSession, topic_id: str, data: ClassroomTopicUpdate) -> ClassroomTopic:
        result = await db.execute(select(ClassroomTopic).where(ClassroomTopic.id == topic_id))
        topic = result.scalar_one_or_none()
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found.")
            
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(topic, key, value)
        await db.commit()
        await db.refresh(topic)
        return topic

    @staticmethod
    async def delete_topic(db: AsyncSession, topic_id: str):
        result = await db.execute(select(ClassroomTopic).where(ClassroomTopic.id == topic_id))
        topic = result.scalar_one_or_none()
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found.")
            
        await db.delete(topic)
        await db.commit()

    # ── MATERIAL LINKING ───────────────────────────────────────────────────────

    @staticmethod
    async def attach_material_to_classroom(db: AsyncSession, classroom_id: str, added_by: str, data: ClassroomMaterialCreate) -> ClassroomMaterial:
        # Check if material exists
        m_result = await db.execute(select(Material).where(Material.id == data.material_id))
        if not m_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Global material not found.")
            
        # Check topic if provided
        if data.topic_id:
            t_result = await db.execute(
                select(ClassroomTopic).where(
                    and_(ClassroomTopic.id == data.topic_id, ClassroomTopic.classroom_id == classroom_id)
                )
            )
            if not t_result.scalar_one_or_none():
                raise HTTPException(status_code=404, detail="Topic not found in this classroom.")

        # Check for duplicate attachment
        dup_query = select(ClassroomMaterial).where(
            and_(
                ClassroomMaterial.classroom_id == classroom_id,
                ClassroomMaterial.topic_id == data.topic_id,
                ClassroomMaterial.material_id == data.material_id,
                ClassroomMaterial.section_type == data.section_type
            )
        )
        dup_result = await db.execute(dup_query)
        if dup_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="This material is already attached to this topic and section.")

        cl_material = ClassroomMaterial(
            classroom_id=classroom_id,
            topic_id=data.topic_id,
            material_id=data.material_id,
            added_by=added_by,
            section_type=data.section_type
        )
        db.add(cl_material)
        await db.commit()
        await db.refresh(cl_material)

        # Notify Students
        try:
            student_ids = await ClassroomService._get_active_student_ids(db, classroom_id)
            if student_ids:
                # Fetch material title for the message
                m_res = await db.execute(select(Material.title).where(Material.id == data.material_id))
                m_title = m_res.scalar() or "New Material"
                
                cl_res = await db.execute(select(Classroom.name).where(Classroom.id == classroom_id))
                cl_name = cl_res.scalar() or "Classroom"

                notifications = [
                    NotificationCreate(
                        user_id=sid,
                        type=NotificationType.MATERIAL_ADDED,
                        title=f"New Material: {m_title}",
                        message=f"A new material has been added to {cl_name}.",
                        classroom_id=classroom_id,
                        link_url=f"/classroom/{classroom_id}?tab=materials"
                    ) for sid in student_ids
                ]
                await NotificationService.create_bulk_notifications(db, notifications)
        except Exception as e:
            logger.warning(f"Failed to trigger material notifications: {e}")

        return cl_material

    @staticmethod
    async def list_classroom_materials(db: AsyncSession, classroom_id: str) -> List[Tuple[ClassroomMaterial, Material]]:
        query = (
            select(ClassroomMaterial, Material)
            .join(Material, ClassroomMaterial.material_id == Material.id)
            .where(ClassroomMaterial.classroom_id == classroom_id)
            .order_by(ClassroomMaterial.created_at.desc())
        )
        result = await db.execute(query)
        return list(result.all())

    @staticmethod
    async def remove_classroom_material(db: AsyncSession, classroom_material_id: str):
        result = await db.execute(select(ClassroomMaterial).where(ClassroomMaterial.id == classroom_material_id))
        cl_material = result.scalar_one_or_none()
        if not cl_material:
            raise HTTPException(status_code=404, detail="Classroom material link not found.")
            
        await db.delete(cl_material)
        await db.commit()

    # ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────

    @staticmethod
    async def create_announcement(db: AsyncSession, classroom_id: str, creator_id: str, data: ClassroomAnnouncementCreate) -> ClassroomAnnouncement:
        announcement = ClassroomAnnouncement(
            **data.model_dump(),
            classroom_id=classroom_id,
            created_by=creator_id
        )
        db.add(announcement)
        await db.commit()
        await db.refresh(announcement)

        # Notify Students
        try:
            student_ids = await ClassroomService._get_active_student_ids(db, classroom_id)
            if student_ids:
                cl_res = await db.execute(select(Classroom.name).where(Classroom.id == classroom_id))
                cl_name = cl_res.scalar() or "Classroom"
                
                notifications = [
                    NotificationCreate(
                        user_id=sid,
                        type=NotificationType.CLASSROOM_ANNOUNCEMENT,
                        title=f"New Announcement: {announcement.title}",
                        message=f"There is a new update in {cl_name}.",
                        classroom_id=classroom_id,
                        link_url=f"/classroom/{classroom_id}?tab=stream"
                    ) for sid in student_ids
                ]
                await NotificationService.create_bulk_notifications(db, notifications)
        except Exception as e:
            logger.warning(f"Failed to trigger announcement notifications: {e}")

        return announcement

    @staticmethod
    async def list_announcements(db: AsyncSession, classroom_id: str) -> List[ClassroomAnnouncement]:
        query = (
            select(ClassroomAnnouncement)
            .where(ClassroomAnnouncement.classroom_id == classroom_id)
            .order_by(ClassroomAnnouncement.pinned.desc(), ClassroomAnnouncement.created_at.desc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_announcement(db: AsyncSession, announcement_id: str, data: ClassroomAnnouncementUpdate) -> ClassroomAnnouncement:
        result = await db.execute(select(ClassroomAnnouncement).where(ClassroomAnnouncement.id == announcement_id))
        announcement = result.scalar_one_or_none()
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found.")
            
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(announcement, key, value)
        await db.commit()
        await db.refresh(announcement)
        return announcement

    @staticmethod
    async def delete_announcement(db: AsyncSession, announcement_id: str):
        result = await db.execute(select(ClassroomAnnouncement).where(ClassroomAnnouncement.id == announcement_id))
        announcement = result.scalar_one_or_none()
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found.")
            
        await db.delete(announcement)
        await db.commit()

    # ── ASSIGNMENTS ───────────────────────────────────────────────────────────

    @staticmethod
    async def create_assignment(db: AsyncSession, classroom_id: str, creator_id: str, data: ClassroomAssignmentCreate) -> ClassroomAssignment:
        assignment = ClassroomAssignment(
            **data.model_dump(),
            classroom_id=classroom_id,
            created_by=creator_id
        )
        db.add(assignment)
        await db.commit()
        await db.refresh(assignment)

        # Reload with attachments to avoid lazy load in Pydantic validation
        result = await db.execute(
            select(ClassroomAssignment)
            .options(selectinload(ClassroomAssignment.attachments))
            .where(ClassroomAssignment.id == assignment.id)
        )
        assignment = result.scalar_one()

        # Notify Students if published
        if assignment.status == AssignmentStatus.PUBLISHED:
            try:
                student_ids = await ClassroomService._get_active_student_ids(db, classroom_id)
                if student_ids:
                    cl_res = await db.execute(select(Classroom.name).where(Classroom.id == classroom_id))
                    cl_name = cl_res.scalar() or "Classroom"
                    
                    notifications = [
                        NotificationCreate(
                            user_id=sid,
                            type=NotificationType.ASSIGNMENT_CREATED,
                            title=f"New Assignment: {assignment.title}",
                            message=f"A new assignment has been posted in {cl_name}.",
                            classroom_id=classroom_id,
                            assignment_id=assignment.id,
                            link_url=f"/classroom/{classroom_id}?assignment={assignment.id}"
                        ) for sid in student_ids
                    ]
                    await NotificationService.create_bulk_notifications(db, notifications)
            except Exception as e:
                logger.warning(f"Failed to trigger assignment notifications: {e}")

        return assignment

    @staticmethod
    async def list_assignments(db: AsyncSession, classroom_id: str, is_manager: bool = False) -> List[ClassroomAssignment]:
        query = (
            select(ClassroomAssignment)
            .options(selectinload(ClassroomAssignment.attachments))
            .where(ClassroomAssignment.classroom_id == classroom_id)
        )
        if not is_manager:
            query = query.where(ClassroomAssignment.status != AssignmentStatus.DRAFT)
        
        result = await db.execute(query.order_by(ClassroomAssignment.created_at.desc()))
        return list(result.scalars().all())

    @staticmethod
    async def get_assignment(db: AsyncSession, assignment_id: str) -> Optional[ClassroomAssignment]:
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(ClassroomAssignment)
            .options(selectinload(ClassroomAssignment.attachments))
            .where(ClassroomAssignment.id == assignment_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_assignment(db: AsyncSession, assignment_id: str, data: ClassroomAssignmentUpdate) -> ClassroomAssignment:
        result = await db.execute(
            select(ClassroomAssignment)
            .options(selectinload(ClassroomAssignment.attachments))
            .where(ClassroomAssignment.id == assignment_id)
        )
        assignment = result.scalar_one_or_none()
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found.")
            
        old_status = assignment.status
        data_dict = data.model_dump(exclude_unset=True)
        for key, value in data_dict.items():
            setattr(assignment, key, value)
            
        # Check if status changed to PUBLISHED
        status_changed_to_published = False
        if "status" in data_dict and data_dict["status"] == AssignmentStatus.PUBLISHED and old_status != AssignmentStatus.PUBLISHED:
            status_changed_to_published = True

        await db.commit()
        await db.refresh(assignment)

        # Notify Students if just published
        if status_changed_to_published:
            try:
                student_ids = await ClassroomService._get_active_student_ids(db, assignment.classroom_id)
                if student_ids:
                    cl_res = await db.execute(select(Classroom.name).where(Classroom.id == assignment.classroom_id))
                    cl_name = cl_res.scalar() or "Classroom"
                    
                    notifications = [
                        NotificationCreate(
                            user_id=sid,
                            type=NotificationType.ASSIGNMENT_CREATED,
                            title=f"Assignment Published: {assignment.title}",
                            message=f"Assignment {assignment.title} is now available in {cl_name}.",
                            classroom_id=assignment.classroom_id,
                            assignment_id=assignment.id,
                            link_url=f"/classroom/{assignment.classroom_id}?assignment={assignment.id}"
                        ) for sid in student_ids
                    ]
                    await NotificationService.create_bulk_notifications(db, notifications)
            except Exception as e:
                logger.warning(f"Failed to trigger publication notifications: {e}")

        return assignment

    @staticmethod
    async def delete_assignment(db: AsyncSession, assignment_id: str):
        result = await db.execute(select(ClassroomAssignment).where(ClassroomAssignment.id == assignment_id))
        assignment = result.scalar_one_or_none()
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found.")
            
        await db.delete(assignment)
        await db.commit()

    # ── ASSIGNMENT ATTACHMENTS ───────────────────────────────────────────────

    @staticmethod
    async def attach_material_to_assignment(db: AsyncSession, assignment_id: str, data: AssignmentAttachmentCreate) -> AssignmentAttachment:
        if data.material_id:
            m_result = await db.execute(select(Material).where(Material.id == data.material_id))
            if not m_result.scalar_one_or_none():
                raise HTTPException(status_code=404, detail="Material not found.")

        attachment = AssignmentAttachment(
            **data.model_dump(),
            assignment_id=assignment_id
        )
        db.add(attachment)
        await db.commit()
        await db.refresh(attachment)
        return attachment

    @staticmethod
    async def remove_assignment_attachment(db: AsyncSession, attachment_id: str):
        result = await db.execute(select(AssignmentAttachment).where(AssignmentAttachment.id == attachment_id))
        attachment = result.scalar_one_or_none()
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found.")
            
        await db.delete(attachment)
        await db.commit()

    # ── SUBMISSIONS ───────────────────────────────────────────────────────────

    @staticmethod
    async def submit_assignment(
        db: AsyncSession, 
        assignment_id: str, 
        student_id: str, 
        data: AssignmentSubmissionCreate,
        file_key: Optional[str] = None,
        filename: Optional[str] = None
    ) -> AssignmentSubmission:
        # Check if assignment exists
        res = await db.execute(select(ClassroomAssignment).where(ClassroomAssignment.id == assignment_id))
        assignment = res.scalar_one_or_none()
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found.")

        # Check deadline
        now = datetime.now(assignment.due_at.tzinfo) if assignment.due_at else datetime.now()
        status = SubmissionStatus.SUBMITTED
        
        if assignment.due_at and now > assignment.due_at:
            if not assignment.allow_late_submission:
                raise HTTPException(status_code=400, detail="Late submissions are not allowed for this assignment.")
            status = SubmissionStatus.LATE

        # Check for existing submission
        sub_res = await db.execute(
            select(AssignmentSubmission).where(
                and_(AssignmentSubmission.assignment_id == assignment_id, AssignmentSubmission.student_id == student_id)
            )
        )
        submission = sub_res.scalar_one_or_none()
        
        if submission:
            if not submission.resubmission_allowed and submission.status in [SubmissionStatus.GRADED, SubmissionStatus.RETURNED]:
                raise HTTPException(status_code=400, detail="Resubmission is not allowed for this assignment.")
            
            # Update existing
            submission.text_response = data.text_response
            submission.file_key = file_key or submission.file_key
            submission.original_filename = filename or submission.original_filename
            submission.submitted_at = func.now()
            submission.status = status
        else:
            # Create new
            submission = AssignmentSubmission(
                assignment_id=assignment_id,
                student_id=student_id,
                text_response=data.text_response,
                file_key=file_key,
                original_filename=filename,
                status=status
            )
            db.add(submission)

        await db.commit()
        await db.refresh(submission)
        return submission

    @staticmethod
    async def get_my_submission(db: AsyncSession, assignment_id: str, student_id: str) -> Optional[AssignmentSubmission]:
        result = await db.execute(
            select(AssignmentSubmission).where(
                and_(AssignmentSubmission.assignment_id == assignment_id, AssignmentSubmission.student_id == student_id)
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_submissions(db: AsyncSession, assignment_id: str) -> List[AssignmentSubmission]:
        result = await db.execute(
            select(AssignmentSubmission)
            .where(AssignmentSubmission.assignment_id == assignment_id)
            .order_by(AssignmentSubmission.submitted_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def grade_submission(
        db: AsyncSession, 
        submission_id: str, 
        grader_id: str, 
        data: AssignmentSubmissionGradeRequest
    ) -> AssignmentSubmission:
        result = await db.execute(select(AssignmentSubmission).where(AssignmentSubmission.id == submission_id))
        submission = result.scalar_one_or_none()
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found.")
            
        # Validate marks against assignment points
        from sqlalchemy.orm import joinedload
        res = await db.execute(
            select(ClassroomAssignment).where(ClassroomAssignment.id == submission.assignment_id)
        )
        assignment = res.scalar_one()
        if data.marks > assignment.points:
            raise HTTPException(status_code=400, detail=f"Marks ({data.marks}) cannot exceed total points ({assignment.points}).")

        submission.marks = data.marks
        submission.feedback = data.feedback
        submission.graded_by = grader_id
        submission.graded_at = func.now()
        submission.status = SubmissionStatus.GRADED
        
        await db.commit()
        await db.refresh(submission)

        # Notify Student
        try:
            # Fetch assignment title
            a_res = await db.execute(select(ClassroomAssignment.title).where(ClassroomAssignment.id == submission.assignment_id))
            a_title = a_res.scalar() or "Assignment"
            
            await NotificationService.create_notification(db, NotificationCreate(
                user_id=submission.student_id,
                type=NotificationType.ASSIGNMENT_GRADED,
                title=f"Assignment Graded: {a_title}",
                message=f"Your submission for {a_title} has been graded.",
                assignment_id=submission.assignment_id,
                link_url=f"/classroom/{assignment.classroom_id}?assignment={submission.assignment_id}"
            ))
        except Exception as e:
            logger.warning(f"Failed to trigger grade notification: {e}")

        return submission

    @staticmethod
    async def return_submission(db: AsyncSession, submission_id: str) -> AssignmentSubmission:
        result = await db.execute(select(AssignmentSubmission).where(AssignmentSubmission.id == submission_id))
        submission = result.scalar_one_or_none()
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found.")
            
        submission.status = SubmissionStatus.RETURNED
        submission.resubmission_allowed = True
        await db.commit()
        await db.refresh(submission)

        # Notify Student
        try:
            a_res = await db.execute(select(ClassroomAssignment.title).where(ClassroomAssignment.id == submission.assignment_id))
            a_title = a_res.scalar() or "Assignment"
            
            await NotificationService.create_notification(db, NotificationCreate(
                user_id=submission.student_id,
                type=NotificationType.ASSIGNMENT_RETURNED,
                title=f"Assignment Returned: {a_title}",
                message=f"Your submission for {a_title} has been returned for revisions.",
                assignment_id=submission.assignment_id,
                link_url=f"/classroom/{submission.assignment.classroom_id}?assignment={submission.assignment_id}"
            ))
        except Exception as e:
            logger.warning(f"Failed to trigger return notification: {e}")

        return submission

    # ── COMMENTS & DOUBTS ──────────────────────────────────────────────────────
    
    @staticmethod
    async def create_comment(
        db: AsyncSession, 
        classroom_id: str, 
        sender_id: str, 
        data: ClassroomCommentCreate
    ) -> ClassroomComment:
        # Check if sender is member
        m_result = await db.execute(
            select(ClassroomMember).where(
                and_(ClassroomMember.classroom_id == classroom_id, ClassroomMember.user_id == sender_id)
            )
        )
        member = m_result.scalar_one_or_none()
        if not member:
            raise HTTPException(status_code=403, detail="You are not a member of this classroom.")

        # If it's a reply, inherit visibility and validate parent
        parent = None
        if data.parent_id:
            p_res = await db.execute(select(ClassroomComment).where(ClassroomComment.id == data.parent_id))
            parent = p_res.scalar_one_or_none()
            if not parent or parent.classroom_id != classroom_id:
                raise HTTPException(status_code=404, detail="Parent comment not found in this classroom.")
            
            # Inherit visibility from parent
            data.visibility = parent.visibility
            # If parent was private, recipient should be the original student or the teacher
            if parent.visibility == CommentVisibility.PRIVATE:
                if not data.recipient_id:
                    # Default recipient is the other party in the private conversation
                    data.recipient_id = parent.sender_id if parent.sender_id != sender_id else parent.recipient_id

        # If private doubt, recipient handling
        if data.visibility == CommentVisibility.PRIVATE:
            if not data.recipient_id:
                # Default to classroom owner/teacher
                cl_res = await db.execute(select(Classroom).where(Classroom.id == classroom_id))
                cl = cl_res.scalar_one()
                data.recipient_id = cl.created_by_teacher_id
            else:
                # Validate recipient is a teacher/admin
                recp_res = await db.execute(
                    select(ClassroomMember).where(
                        and_(ClassroomMember.classroom_id == classroom_id, ClassroomMember.user_id == data.recipient_id)
                    )
                )
                recp_member = recp_res.scalar_one_or_none()
                if not recp_member:
                    raise HTTPException(status_code=400, detail="Recipient is not a member of this classroom.")
                
                # Check if recipient has educator role (Teacher/Admin/Dev)
                u_res = await db.execute(select(User).where(User.id == data.recipient_id))
                u = u_res.scalar_one()
                if not u.role.is_educator:
                     # Allow student-student if teacher/admin (already handled by role checks in routes usually)
                     # But for classroom, private doubts are Student <-> Teacher
                     if member.role_in_class == "student":
                         raise HTTPException(status_code=400, detail="Private doubts must be addressed to a teacher.")

        comment = ClassroomComment(
            **data.model_dump(),
            classroom_id=classroom_id,
            sender_id=sender_id
        )
        db.add(comment)
        await db.commit()
        await db.refresh(comment)

        # Notify Recipient if it's a private reply from a teacher
        try:
            if comment.visibility == CommentVisibility.PRIVATE and comment.recipient_id and comment.parent_id:
                # Check if sender is a teacher
                s_res = await db.execute(select(User).where(User.id == sender_id))
                sender = s_res.scalar()
                if sender and sender.role.is_educator:
                    await NotificationService.create_notification(db, NotificationCreate(
                        user_id=comment.recipient_id,
                        type=NotificationType.PRIVATE_DOUBT_REPLY,
                        title="New Doubt Reply",
                        message="A teacher has replied to your private doubt.",
                        classroom_id=classroom_id,
                        assignment_id=comment.assignment_id,
                        link_url=f"/classroom/{classroom_id}?assignment={comment.assignment_id}&tab=comments" if comment.assignment_id else f"/classroom/{classroom_id}"
                    ))
        except Exception as e:
            logger.warning(f"Failed to trigger comment notification: {e}")

        return comment

    @staticmethod
    async def list_comments(
        db: AsyncSession, 
        classroom_id: str, 
        user_id: str,
        is_manager: bool = False,
        assignment_id: Optional[str] = None,
        visibility: Optional[CommentVisibility] = None,
        status: Optional[CommentStatus] = None
    ) -> List[ClassroomComment]:
        query = select(ClassroomComment).where(ClassroomComment.classroom_id == classroom_id).options(
            selectinload(ClassroomComment.sender)
        )
        
        if assignment_id:
            query = query.where(ClassroomComment.assignment_id == assignment_id)
        if status:
            query = query.where(ClassroomComment.status == status)
            
        # Privacy Filtering
        if is_manager:
            # Manager sees all public and all private addressed to them or any private doubts in the class
            if visibility:
                query = query.where(ClassroomComment.visibility == visibility)
        else:
            # Student filtering
            if visibility == CommentVisibility.PUBLIC:
                query = query.where(ClassroomComment.visibility == CommentVisibility.PUBLIC)
            elif visibility == CommentVisibility.PRIVATE:
                query = query.where(
                    and_(
                        ClassroomComment.visibility == CommentVisibility.PRIVATE,
                        or_(ClassroomComment.sender_id == user_id, ClassroomComment.recipient_id == user_id)
                    )
                )
            else:
                # If visibility not specified, show all public + their own private
                query = query.where(
                    or_(
                        ClassroomComment.visibility == CommentVisibility.PUBLIC,
                        and_(
                            ClassroomComment.visibility == CommentVisibility.PRIVATE,
                            or_(ClassroomComment.sender_id == user_id, ClassroomComment.recipient_id == user_id)
                        )
                    )
                )
        
        # Only show top-level comments (threading handled by frontend or separate fetch)
        # Actually list usually implies top level, but for डाउट्स we might want a flat list
        # For simplicity, we'll return all and let UI handle threading or just flat list
        result = await db.execute(query.order_by(ClassroomComment.created_at.desc()))
        return list(result.scalars().all())

    @staticmethod
    async def resolve_comment(db: AsyncSession, comment_id: str, user_id: str, is_manager: bool):
        result = await db.execute(select(ClassroomComment).where(ClassroomComment.id == comment_id))
        comment = result.scalar_one_or_none()
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found.")
            
        # Only manager or sender can resolve? usually teacher resolves doubt
        if not is_manager and comment.sender_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to resolve this comment.")
            
        comment.status = CommentStatus.RESOLVED
        await db.commit()
        await db.refresh(comment)
        return comment

    @staticmethod
    async def get_analytics(db: AsyncSession, classroom_id: str):
        """Aggregate classroom metrics for teacher insights."""
        # 1. Fetch Classroom Core with eager loading
        result = await db.execute(
            select(Classroom).where(Classroom.id == classroom_id).options(
                selectinload(Classroom.memberships).selectinload(ClassroomMember.user),
                selectinload(Classroom.topics),
                selectinload(Classroom.materials),
                selectinload(Classroom.assignments),
                selectinload(Classroom.announcements)
            )
        )
        classroom = result.scalar_one_or_none()
        if not classroom:
            raise HTTPException(status_code=404, detail="Classroom not found.")

        # Counts
        students = [m for m in classroom.memberships if m.role_in_class == "student" and m.status == MembershipStatus.ACTIVE]
        total_students = len(students)
        total_topics = len(classroom.topics)
        total_materials = len(classroom.materials)
        total_assignments = len(classroom.assignments)
        total_announcements = len(classroom.announcements)

        # 2. Assignment & Submission Metrics
        all_assignments = classroom.assignments
        published_assignments = [a for a in all_assignments if a.status == AssignmentStatus.PUBLISHED]
        
        # Submissions
        submission_result = await db.execute(
            select(AssignmentSubmission)
            .join(ClassroomAssignment)
            .where(ClassroomAssignment.classroom_id == classroom_id)
            .options(selectinload(AssignmentSubmission.assignment))
        )
        all_submissions = submission_result.scalars().all()

        total_submissions = len(all_submissions)
        submitted_count = len([s for s in all_submissions if s.status in [SubmissionStatus.SUBMITTED, SubmissionStatus.LATE, SubmissionStatus.GRADED, SubmissionStatus.RETURNED]])
        late_count = len([s for s in all_submissions if s.status == SubmissionStatus.LATE])
        graded_count = len([s for s in all_submissions if s.status in [SubmissionStatus.GRADED, SubmissionStatus.RETURNED]])
        returned_count = len([s for s in all_submissions if s.status == SubmissionStatus.RETURNED])

        # Dynamic Missing Calculation
        now = datetime.utcnow()
        missing_count = 0
        student_ids = [s.user_id for s in students]
        student_submission_map = {} # student_id -> {assignment_id: submission}
        
        for s in all_submissions:
            if s.student_id not in student_submission_map:
                student_submission_map[s.student_id] = {}
            student_submission_map[s.student_id][s.assignment_id] = s

        assignment_missing_map = {} # assignment_id -> count
        student_attention_map = {} # student_id -> {missing: 0, late: 0, marks: []}

        for student_id in student_ids:
            student_attention_map[student_id] = {"missing": 0, "late": 0, "marks": []}

        for assignment in published_assignments:
            is_past_due = assignment.due_at and assignment.due_at < now
            missing_for_this_assignment = 0
            
            for student_id in student_ids:
                sub = student_submission_map.get(student_id, {}).get(assignment.id)
                
                if sub:
                    if sub.status == SubmissionStatus.LATE:
                        student_attention_map[student_id]["late"] += 1
                    if sub.marks is not None:
                        student_attention_map[student_id]["marks"].append(sub.marks / assignment.points * 100 if assignment.points else 0)
                elif is_past_due:
                    missing_count += 1
                    missing_for_this_assignment += 1
                    student_attention_map[student_id]["missing"] += 1
            
            assignment_missing_map[assignment.id] = missing_for_this_assignment

        # Averages
        all_marks = [s.marks / s.assignment.points * 100 for s in all_submissions if s.marks is not None and s.assignment.points]
        average_marks = sum(all_marks) / len(all_marks) if all_marks else None
        highest_marks = max(all_marks) if all_marks else None
        lowest_marks = min(all_marks) if all_marks else None

        completion_rate = (submitted_count / (total_students * len(published_assignments)) * 100) if (total_students and published_assignments) else 0

        # 3. Student Attention List
        attention_list = []
        for m in students:
            stats = student_attention_map.get(m.user_id, {"missing": 0, "late": 0, "marks": []})
            avg = sum(stats["marks"]) / len(stats["marks"]) if stats["marks"] else None
            
            # Only include if they have issues or if we need the full list
            # The requirement says "Only include minimal student data: student_id, name, roll_no, missing_count, late_count, average_marks"
            # We'll return all students but maybe the frontend will filter.
            attention_list.append({
                "student_id": m.user_id,
                "name": m.user.full_name,
                "roll_no": m.user.roll_no,
                "missing_count": stats["missing"],
                "late_count": stats["late"],
                "average_marks": avg
            })

        # 4. Assignment Breakdown
        breakdown = []
        for a in all_assignments:
            subs = [s for s in all_submissions if s.assignment_id == a.id]
            a_marks = [s.marks / a.points * 100 for s in subs if s.marks is not None and a.points]
            breakdown.append({
                "assignment_id": a.id,
                "title": a.title,
                "due_at": a.due_at,
                "points": a.points,
                "submission_count": len(subs),
                "missing_count": assignment_missing_map.get(a.id, 0),
                "late_count": len([s for s in subs if s.status == SubmissionStatus.LATE]),
                "average_marks": sum(a_marks) / len(a_marks) if a_marks else None,
                "status": a.status
            })

        # 5. Weak Topics
        topic_stats = {} # topic_id -> {marks: [], missing: 0, late: 0, title: ""}
        for t in classroom.topics:
            topic_stats[t.id] = {"marks": [], "missing": 0, "late": 0, "title": t.name}
        
        # Uncategorized topic
        topic_stats[None] = {"marks": [], "missing": 0, "late": 0, "title": "No Topic"}

        for a_summary in breakdown:
            a_obj = next((a for a in all_assignments if a.id == a_summary["assignment_id"]), None)
            t_id = a_obj.topic_id if a_obj else None
            
            if t_id not in topic_stats and t_id is not None:
                 continue # Should not happen

            if a_summary["average_marks"] is not None:
                topic_stats[t_id]["marks"].append(a_summary["average_marks"])
            topic_stats[t_id]["missing"] += a_summary["missing_count"]
            topic_stats[t_id]["late"] += a_summary["late_count"]

        weak_topics = []
        for t_id, stats in topic_stats.items():
            if t_id is None and not stats["marks"] and not stats["missing"]: continue
            
            avg = sum(stats["marks"]) / len(stats["marks"]) if stats["marks"] else None
            
            # Rule: Average < 50% or Missing Rate > 20%
            is_weak = False
            reason = ""
            if avg is not None and avg < 50:
                is_weak = True
                reason = "Low average score."
            
            # Missing rate should only consider assignments that are actually past due
            past_due_in_topic = [a for a in published_assignments if a.topic_id == t_id and a.due_at and a.due_at < now]
            total_expected = total_students * len(past_due_in_topic)
            
            if total_expected > 0:
                missing_rate = (stats["missing"] / total_expected) * 100
                if missing_rate > 20:
                    is_weak = True
                    reason += (" " if reason else "") + "High missing rate."

            if is_weak:
                weak_topics.append({
                    "topic_id": t_id,
                    "topic_title": stats["title"],
                    "average_score": avg if avg is not None else 0,
                    "missing_count": stats["missing"],
                    "late_count": stats["late"],
                    "reason": reason
                })

        # 6. Communication Metrics
        comm_result = await db.execute(
            select(ClassroomComment).where(ClassroomComment.classroom_id == classroom_id)
        )
        all_comments = comm_result.scalars().all()
        
        open_doubts = [c for c in all_comments if c.visibility == CommentVisibility.PRIVATE and c.status == CommentStatus.OPEN and not c.parent_id]
        resolved_doubts = [c for c in all_comments if c.visibility == CommentVisibility.PRIVATE and c.status == CommentStatus.RESOLVED and not c.parent_id]
        public_comments = [c for c in all_comments if c.visibility == CommentVisibility.PUBLIC and not c.parent_id]

        # 7. Rule-based Insights
        insights = []
        if weak_topics:
            insights.append(f"Students are struggling with: {', '.join([w['topic_title'] for w in weak_topics[:2]])}.")
        
        most_missing_assignment = max(breakdown, key=lambda x: x["missing_count"]) if breakdown else None
        if most_missing_assignment and most_missing_assignment["missing_count"] > 0:
            insights.append(f"Highest missing work: '{most_missing_assignment['title']}'.")
            
        if late_count > total_submissions * 0.3:
            insights.append("High volume of late submissions detected.")
            
        if not graded_count and total_submissions > 0:
            insights.append("Several submissions are pending grading.")

        if not insights:
            insights.append("Classroom performance is stable.")

        return {
            "classroom_id": classroom_id,
            "overview": {
                "total_students": total_students,
                "total_topics": total_topics,
                "total_materials": total_materials,
                "total_assignments": total_assignments,
                "total_announcements": total_announcements
            },
            "performance": {
                "total_submissions": total_submissions,
                "submitted_count": submitted_count,
                "late_count": late_count,
                "graded_count": graded_count,
                "returned_count": returned_count,
                "missing_count": missing_count,
                "completion_rate": round(completion_rate, 2),
                "average_marks": round(average_marks, 2) if average_marks is not None else None,
                "highest_marks": round(highest_marks, 2) if highest_marks is not None else None,
                "lowest_marks": round(lowest_marks, 2) if lowest_marks is not None else None
            },
            "student_attention": attention_list,
            "assignment_breakdown": breakdown,
            "weak_topics": weak_topics,
            "communication": {
                "open_private_doubts": len(open_doubts),
                "resolved_private_doubts": len(resolved_doubts),
                "public_comments_count": len(public_comments),
                "private_doubts_count": len(open_doubts) + len(resolved_doubts)
            },
            "ai_insight_summary": " ".join(insights),
            "generated_at": datetime.utcnow()
        }
