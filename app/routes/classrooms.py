"""
app/routes/classrooms.py
────────────────────────
API endpoints for Classroom management.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body, UploadFile, File
import uuid
from sqlalchemy import select, func, and_

from app.core.dependencies import (
    DBSession, CurrentUser, TeacherUser, AdminUser,
    require_classroom_member, require_classroom_owner,
    get_classroom_membership
)
from app.models.classroom import (
    Classroom, ClassroomMember, ClassroomTopic, ClassroomMaterial, SectionType,
    CommentVisibility, CommentStatus
)
from app.models.material import Material
from app.schemas.classroom import (
    ClassroomCreate, ClassroomOut, ClassroomDetail, JoinClassroomRequest,
    ClassroomTopicCreate, ClassroomTopicUpdate, ClassroomTopicOut,
    ClassroomMaterialCreate, ClassroomMaterialOut,
    ClassroomMemberOut
)
from app.schemas.classroom_comment import ClassroomCommentCreate, ClassroomCommentUpdate, ClassroomCommentOut
from app.schemas.classroom_analytics import ClassroomAnalyticsOut
from app.core.storage import get_storage
from app.services.classroom_service import ClassroomService

router = APIRouter(prefix="/classrooms", tags=["Classrooms"])


@router.post("/", response_model=ClassroomOut, status_code=status.HTTP_201_CREATED)
async def create_classroom(
    data: ClassroomCreate,
    current_user: TeacherUser,
    db: DBSession
):
    """Create a new classroom (Teacher/Admin only)."""
    return await ClassroomService.create_classroom(db, current_user, data)


@router.get("/", response_model=List[ClassroomOut])
async def list_classrooms(
    current_user: CurrentUser,
    db: DBSession
):
    """List classrooms visible to the current user."""
    classrooms = await ClassroomService.list_classrooms_for_user(db, current_user)
    out = []
    for c in classrooms:
        c_out = ClassroomOut.model_validate(c)
        if not (c.created_by_teacher_id == current_user.id or current_user.role.is_privileged):
            c_out.join_code = None
        out.append(c_out)
    return out


@router.get("/{classroom_id}", response_model=ClassroomDetail)
async def get_classroom_detail(
    classroom_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """Get detailed classroom info."""
    classroom = await require_classroom_member(classroom_id, current_user, db)
    
    # 1. Fetch topics
    result = await db.execute(
        select(ClassroomTopic)
        .where(ClassroomTopic.classroom_id == classroom_id)
        .order_by(ClassroomTopic.sort_order.asc())
    )
    topics = list(result.scalars().all())
    
    # 2. Fetch members
    from app.models.user import User
    member_result = await db.execute(
        select(ClassroomMember, User.full_name, User.email)
        .join(User, ClassroomMember.user_id == User.id)
        .where(ClassroomMember.classroom_id == classroom_id)
    )
    members = []
    for row in member_result:
        m_out = ClassroomMemberOut.model_validate(row[0])
        m_out.full_name = row[1]
        m_out.email = row[2]
        members.append(m_out)
    
    member_count = len(members)
    is_owner_or_privileged = (classroom.created_by_teacher_id == current_user.id or current_user.role.is_privileged)
    
    out_data = ClassroomOut.model_validate(classroom)
    if not is_owner_or_privileged:
        out_data.join_code = None

    return ClassroomDetail(
        **out_data.model_dump(),
        topics=[ClassroomTopicOut.model_validate(t) for t in topics],
        members=members,
        member_count=member_count,
        can_manage=is_owner_or_privileged,
        can_add_material=is_owner_or_privileged,
        can_remove_member=is_owner_or_privileged
    )


@router.post("/join", response_model=ClassroomOut)
async def join_classroom(
    data: JoinClassroomRequest,
    current_user: CurrentUser,
    db: DBSession
):
    """Join a classroom using a code."""
    return await ClassroomService.join_classroom_by_code(db, current_user, data)


@router.delete("/{classroom_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_classroom_member(
    classroom_id: str,
    user_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    await require_classroom_owner(classroom_id, current_user, db)
    await ClassroomService.remove_member(db, classroom_id, user_id)
    return None


@router.patch("/{classroom_id}/archive", response_model=ClassroomOut)
async def archive_classroom(
    classroom_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    await require_classroom_owner(classroom_id, current_user, db)
    return await ClassroomService.archive_classroom(db, classroom_id)


# ── TOPICS ───────────────────────────────────────────────────────────────────

@router.post("/{classroom_id}/topics", response_model=ClassroomTopicOut)
async def create_topic(
    classroom_id: str,
    data: ClassroomTopicCreate,
    current_user: CurrentUser,
    db: DBSession
):
    await require_classroom_owner(classroom_id, current_user, db)
    return await ClassroomService.create_topic(db, classroom_id, data)


@router.patch("/{classroom_id}/topics/{topic_id}", response_model=ClassroomTopicOut)
async def update_topic(
    classroom_id: str,
    topic_id: str,
    data: ClassroomTopicUpdate,
    current_user: CurrentUser,
    db: DBSession
):
    await require_classroom_owner(classroom_id, current_user, db)
    return await ClassroomService.update_topic(db, topic_id, data)


@router.delete("/{classroom_id}/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    classroom_id: str,
    topic_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    await require_classroom_owner(classroom_id, current_user, db)
    await ClassroomService.delete_topic(db, topic_id)
    return None


# ── MATERIALS ────────────────────────────────────────────────────────────────

@router.get("/{classroom_id}/materials", response_model=List[ClassroomMaterialOut])
async def list_classroom_materials(
    classroom_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """List all materials attached to this classroom."""
    await require_classroom_member(classroom_id, current_user, db)
    
    rows = await ClassroomService.list_classroom_materials(db, classroom_id)
    out = []
    for cl_material, material in rows:
        m_out = ClassroomMaterialOut.model_validate(cl_material)
        m_out.title = material.title
        m_out.subject = material.subject
        m_out.course = material.course
        m_out.semester = material.semester
        m_out.file_type = material.file_type
        m_out.integrity_status = material.integrity_status
        out.append(m_out)
    return out


@router.post("/{classroom_id}/materials", response_model=ClassroomMaterialOut)
async def attach_material(
    classroom_id: str,
    data: ClassroomMaterialCreate,
    current_user: CurrentUser,
    db: DBSession
):
    """Attach a global material to a classroom topic."""
    await require_classroom_owner(classroom_id, current_user, db)
    cl_material = await ClassroomService.attach_material_to_classroom(db, classroom_id, current_user.id, data)
    
    # Load material metadata for response
    result = await db.execute(select(Material).where(Material.id == cl_material.material_id))
    material = result.scalar_one()
    
    m_out = ClassroomMaterialOut.model_validate(cl_material)
    m_out.title = material.title
    m_out.integrity_status = material.integrity_status
    return m_out


@router.delete("/{classroom_id}/materials/{classroom_material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_classroom_material(
    classroom_id: str,
    classroom_material_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """Remove a material link from the classroom."""
    await require_classroom_owner(classroom_id, current_user, db)
    await ClassroomService.remove_classroom_material(db, classroom_material_id)
    return None


# ── ANNOUNCEMENTS ───────────────────────────────────────────────────────────

from app.schemas.classroom import ClassroomAnnouncementCreate, ClassroomAnnouncementUpdate, ClassroomAnnouncementOut

@router.post("/{classroom_id}/announcements", response_model=ClassroomAnnouncementOut)
async def create_announcement(
    classroom_id: str,
    data: ClassroomAnnouncementCreate,
    current_user: CurrentUser,
    db: DBSession
):
    """Create a new announcement (Owner only)."""
    await require_classroom_owner(classroom_id, current_user, db)
    announcement = await ClassroomService.create_announcement(db, classroom_id, current_user.id, data)
    
    # Return with creator name
    out = ClassroomAnnouncementOut.model_validate(announcement)
    out.creator_name = current_user.full_name
    return out


@router.get("/{classroom_id}/announcements", response_model=List[ClassroomAnnouncementOut])
async def list_announcements(
    classroom_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """List announcements for a classroom (Members only)."""
    await require_classroom_member(classroom_id, current_user, db)
    
    from app.models.user import User
    query = (
        select(ClassroomAnnouncement, User.full_name)
        .join(User, ClassroomAnnouncement.created_by == User.id)
        .where(ClassroomAnnouncement.classroom_id == classroom_id)
        .order_by(ClassroomAnnouncement.pinned.desc(), ClassroomAnnouncement.created_at.desc())
    )
    result = await db.execute(query)
    out = []
    for ann, creator_name in result:
        a_out = ClassroomAnnouncementOut.model_validate(ann)
        a_out.creator_name = creator_name
        out.append(a_out)
    return out


@router.patch("/{classroom_id}/announcements/{announcement_id}", response_model=ClassroomAnnouncementOut)
async def update_announcement(
    classroom_id: str,
    announcement_id: str,
    data: ClassroomAnnouncementUpdate,
    current_user: CurrentUser,
    db: DBSession
):
    """Update an announcement (Owner only)."""
    await require_classroom_owner(classroom_id, current_user, db)
    announcement = await ClassroomService.update_announcement(db, announcement_id, data)
    
    # Refresh creator name
    from app.models.user import User
    res = await db.execute(select(User.full_name).where(User.id == announcement.created_by))
    creator_name = res.scalar()
    
    out = ClassroomAnnouncementOut.model_validate(announcement)
    out.creator_name = creator_name
    return out


@router.delete("/{classroom_id}/announcements/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    classroom_id: str,
    announcement_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """Delete an announcement (Owner only)."""
    await require_classroom_owner(classroom_id, current_user, db)
    await ClassroomService.delete_announcement(db, announcement_id)
    return None


# ── ASSIGNMENTS ─────────────────────────────────────────────────────────────

from app.schemas.classroom import (
    ClassroomAssignmentCreate, ClassroomAssignmentUpdate, ClassroomAssignmentOut,
    AssignmentAttachmentCreate, AssignmentAttachmentOut
)
from app.models.classroom import ClassroomAssignment, AssignmentStatus

@router.post("/{classroom_id}/assignments", response_model=ClassroomAssignmentOut)
async def create_assignment(
    classroom_id: str,
    data: ClassroomAssignmentCreate,
    current_user: CurrentUser,
    db: DBSession
):
    """Create a new assignment (Owner only)."""
    await require_classroom_owner(classroom_id, current_user, db)
    assignment = await ClassroomService.create_assignment(db, classroom_id, current_user.id, data)
    
    out = ClassroomAssignmentOut.model_validate(assignment)
    out.creator_name = current_user.full_name
    return out


@router.get("/{classroom_id}/assignments", response_model=List[ClassroomAssignmentOut])
async def list_assignments(
    classroom_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """List assignments for a classroom (Members only)."""
    await require_classroom_member(classroom_id, current_user, db)
    
    # Check if manager to show drafts
    is_manager = await get_classroom_membership(classroom_id, current_user.id, db)
    is_manager = is_manager is not None and (is_manager.role_in_class == "teacher" or current_user.role.is_privileged)

    from app.models.user import User
    from sqlalchemy.orm import selectinload

    query = (
        select(ClassroomAssignment, User.full_name)
        .join(User, ClassroomAssignment.created_by == User.id)
        .options(selectinload(ClassroomAssignment.attachments))
        .where(ClassroomAssignment.classroom_id == classroom_id)
    )
    if not is_manager:
        query = query.where(ClassroomAssignment.status != AssignmentStatus.DRAFT)
    
    result = await db.execute(query.order_by(ClassroomAssignment.created_at.desc()))
    out = []
    for ass, creator_name in result:
        a_out = ClassroomAssignmentOut.model_validate(ass)
        a_out.creator_name = creator_name
        out.append(a_out)
    return out


@router.get("/{classroom_id}/assignments/{assignment_id}", response_model=ClassroomAssignmentOut)
async def get_assignment(
    classroom_id: str,
    assignment_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """Get assignment details (Members only)."""
    await require_classroom_member(classroom_id, current_user, db)
    
    assignment = await ClassroomService.get_assignment(db, assignment_id)
    if not assignment or assignment.classroom_id != classroom_id:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    # Check if student trying to access draft
    if assignment.status == AssignmentStatus.DRAFT:
        await require_classroom_owner(classroom_id, current_user, db)

    from app.models.user import User
    res = await db.execute(select(User.full_name).where(User.id == assignment.created_by))
    creator_name = res.scalar()

    out = ClassroomAssignmentOut.model_validate(assignment)
    out.creator_name = creator_name
    return out


@router.patch("/{classroom_id}/assignments/{assignment_id}", response_model=ClassroomAssignmentOut)
async def update_assignment(
    classroom_id: str,
    assignment_id: str,
    data: ClassroomAssignmentUpdate,
    current_user: CurrentUser,
    db: DBSession
):
    """Update an assignment (Owner only)."""
    await require_classroom_owner(classroom_id, current_user, db)
    assignment = await ClassroomService.update_assignment(db, assignment_id, data)
    
    from app.models.user import User
    res = await db.execute(select(User.full_name).where(User.id == assignment.created_by))
    creator_name = res.scalar()

    out = ClassroomAssignmentOut.model_validate(assignment)
    out.creator_name = creator_name
    return out


@router.delete("/{classroom_id}/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    classroom_id: str,
    assignment_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """Delete an assignment (Owner only)."""
    await require_classroom_owner(classroom_id, current_user, db)
    await ClassroomService.delete_assignment(db, assignment_id)
    return None


# ── ATTACHMENTS ─────────────────────────────────────────────────────────────

@router.post("/{classroom_id}/assignments/{assignment_id}/attachments", response_model=AssignmentAttachmentOut)
async def attach_material_to_assignment(
    classroom_id: str,
    assignment_id: str,
    data: AssignmentAttachmentCreate,
    current_user: CurrentUser,
    db: DBSession
):
    """Attach a material or link to an assignment (Owner only)."""
    await require_classroom_owner(classroom_id, current_user, db)
    return await ClassroomService.attach_material_to_assignment(db, assignment_id, data)


@router.delete("/{classroom_id}/assignments/{assignment_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_assignment_attachment(
    classroom_id: str,
    assignment_id: str,
    attachment_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """Remove an attachment from an assignment (Owner only)."""
    await require_classroom_owner(classroom_id, current_user, db)
    await ClassroomService.remove_assignment_attachment(db, attachment_id)
    return None


# ── SUBMISSIONS ─────────────────────────────────────────────────────────────

from app.schemas.classroom import (
    AssignmentSubmissionCreate, AssignmentSubmissionOut, AssignmentSubmissionGradeRequest
)
from app.models.classroom import AssignmentSubmission, SubmissionStatus

@router.post("/{classroom_id}/assignments/{assignment_id}/submit", response_model=AssignmentSubmissionOut)
async def submit_assignment(
    classroom_id: str,
    assignment_id: str,
    current_user: CurrentUser,
    db: DBSession,
    text_response: Optional[str] = None,
    file: Optional[UploadFile] = File(None)
):
    """Submit an assignment (Students only)."""
    await require_classroom_member(classroom_id, current_user, db)
    
    file_key = None
    filename = None
    
    if file:
        # Validate file
        allowed_types = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "image/jpeg", "image/png"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Unsupported file type.")
        
        storage = get_storage()
        filename = file.filename
        file_key = f"assignments/{assignment_id}/{current_user.id}/{uuid.uuid4()}_{filename}"
        
        content = await file.read()
        storage.upload_file(content, file_key)

    data = AssignmentSubmissionCreate(text_response=text_response)
    submission = await ClassroomService.submit_assignment(db, assignment_id, current_user.id, data, file_key, filename)
    
    out = AssignmentSubmissionOut.model_validate(submission)
    out.student_name = current_user.full_name
    out.student_email = current_user.email
    out.roll_no = current_user.roll_no
    return out


@router.get("/{classroom_id}/assignments/{assignment_id}/my-submission", response_model=Optional[AssignmentSubmissionOut])
async def get_my_submission(
    classroom_id: str,
    assignment_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """Get current student's submission (Enrolled students only)."""
    await require_classroom_member(classroom_id, current_user, db)
    submission = await ClassroomService.get_my_submission(db, assignment_id, current_user.id)
    if not submission:
        return None
        
    out = AssignmentSubmissionOut.model_validate(submission)
    out.student_name = current_user.full_name
    out.student_email = current_user.email
    out.roll_no = current_user.roll_no
    return out


@router.get("/{classroom_id}/assignments/{assignment_id}/submissions", response_model=List[AssignmentSubmissionOut])
async def list_assignment_submissions(
    classroom_id: str,
    assignment_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """List all submissions for an assignment (Owner only)."""
    await require_classroom_owner(classroom_id, current_user, db)
    
    from app.models.user import User
    query = (
        select(AssignmentSubmission, User)
        .join(User, AssignmentSubmission.student_id == User.id)
        .where(AssignmentSubmission.assignment_id == assignment_id)
        .order_by(AssignmentSubmission.submitted_at.desc())
    )
    result = await db.execute(query)
    
    out = []
    for sub, student in result:
        s_out = AssignmentSubmissionOut.model_validate(sub)
        s_out.student_name = student.full_name
        s_out.student_email = student.email
        s_out.roll_no = student.roll_no
        out.append(s_out)
    return out


@router.patch("/{classroom_id}/assignments/{assignment_id}/submissions/{submission_id}/grade", response_model=AssignmentSubmissionOut)
async def grade_submission(
    classroom_id: str,
    assignment_id: str,
    submission_id: str,
    data: AssignmentSubmissionGradeRequest,
    current_user: CurrentUser,
    db: DBSession
):
    """Grade a submission (Owner only)."""
    await require_classroom_owner(classroom_id, current_user, db)
    submission = await ClassroomService.grade_submission(db, submission_id, current_user.id, data)
    
    from app.models.user import User
    res = await db.execute(select(User).where(User.id == submission.student_id))
    student = res.scalar_one()
    
    out = AssignmentSubmissionOut.model_validate(submission)
    out.student_name = student.full_name
    out.student_email = student.email
    out.roll_no = student.roll_no
    return out


@router.post("/{classroom_id}/assignments/{assignment_id}/submissions/{submission_id}/return", response_model=AssignmentSubmissionOut)
async def return_submission(
    classroom_id: str,
    assignment_id: str,
    submission_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """Return a submission for revision (Owner only)."""
    await require_classroom_owner(classroom_id, current_user, db)
    submission = await ClassroomService.return_submission(db, submission_id)
    
    from app.models.user import User
    res = await db.execute(select(User).where(User.id == submission.student_id))
    student = res.scalar_one()
    
    out = AssignmentSubmissionOut.model_validate(submission)
    out.student_name = student.full_name
    out.student_email = student.email
    out.roll_no = student.roll_no
    return out


@router.get("/{classroom_id}/assignments/{assignment_id}/submissions/{submission_id}/file")
async def get_submission_file(
    classroom_id: str,
    assignment_id: str,
    submission_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """Stream a submission file securely."""
    await require_classroom_member(classroom_id, current_user, db)
    
    # Permission check: own submission or owner
    res = await db.execute(select(AssignmentSubmission).where(AssignmentSubmission.id == submission_id))
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")
        
    is_owner = await get_classroom_membership(classroom_id, current_user.id, db)
    is_owner = is_owner and is_owner.role_in_class == "teacher"
    
    if not (submission.student_id == current_user.id or is_owner or current_user.role.is_privileged):
        raise HTTPException(status_code=403, detail="Unauthorized to access this file.")

    if not submission.file_key:
        raise HTTPException(status_code=404, detail="No file attached to this submission.")

    from fastapi.responses import StreamingResponse
    import io
    storage = get_storage()
    content = storage.get_file(submission.file_key)
    
    # Determine media type
    ext = submission.original_filename.split('.')[-1].lower() if submission.original_filename else ""
    media_type = "application/octet-stream"
    if ext == "pdf": media_type = "application/pdf"
    elif ext in ["jpg", "jpeg"]: media_type = "image/jpeg"
    elif ext == "png": media_type = "image/png"
    elif ext == "txt": media_type = "text/plain"

    return StreamingResponse(
        io.BytesIO(content),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={submission.original_filename}"}
    )


# ── COMMENTS & DOUBTS ──────────────────────────────────────────────────────

@router.post("/{classroom_id}/comments", response_model=ClassroomCommentOut)
async def create_comment(
    classroom_id: str,
    data: ClassroomCommentCreate,
    current_user: CurrentUser,
    db: DBSession
):
    """Create a new public comment or private doubt."""
    # create_comment handles membership and privacy logic
    return await ClassroomService.create_comment(db, classroom_id, current_user.id, data)


@router.get("/{classroom_id}/comments", response_model=List[ClassroomCommentOut])
async def list_comments(
    classroom_id: str,
    current_user: CurrentUser,
    db: DBSession,
    assignment_id: Optional[str] = None,
    visibility: Optional[CommentVisibility] = None,
    status: Optional[CommentStatus] = None
):
    """List comments with privacy filtering (Members only)."""
    # Check membership
    is_manager = False
    membership = await get_classroom_membership(classroom_id, current_user.id, db)
    if not membership and not current_user.role.is_privileged:
        raise HTTPException(status_code=403, detail="Not a member of this classroom.")
    
    if current_user.role.is_privileged or (membership and membership.role_in_class == "teacher"):
        is_manager = True

    comments = await ClassroomService.list_comments(
        db, classroom_id, current_user.id, is_manager, assignment_id, visibility, status
    )
    
    # Map sender names
    results = []
    for c in comments:
        c_out = ClassroomCommentOut.model_validate(c)
        c_out.sender_name = c.sender.full_name
        c_out.sender_role = "teacher" if (c.sender.role.is_educator) else "student" # Simplified role check
        results.append(c_out)
        
    return results


@router.post("/{classroom_id}/comments/{comment_id}/reply", response_model=ClassroomCommentOut)
async def reply_to_comment(
    classroom_id: str,
    comment_id: str,
    data: ClassroomCommentCreate,
    current_user: CurrentUser,
    db: DBSession
):
    """Reply to a comment. Inherits parent visibility."""
    data.parent_id = comment_id
    return await ClassroomService.create_comment(db, classroom_id, current_user.id, data)


@router.patch("/{classroom_id}/comments/{comment_id}/resolve", response_model=ClassroomCommentOut)
async def resolve_comment(
    classroom_id: str,
    comment_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """Mark a doubt as resolved (Teacher or Sender only)."""
    membership = await get_classroom_membership(classroom_id, current_user.id, db)
    is_manager = current_user.role.is_privileged or (membership and membership.role_in_class == "teacher")
    
    return await ClassroomService.resolve_comment(db, comment_id, current_user.id, is_manager)


@router.delete("/{classroom_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    classroom_id: str,
    comment_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """Delete a comment (Sender or Manager only)."""
    membership = await get_classroom_membership(classroom_id, current_user.id, db)
    is_manager = current_user.role.is_privileged or (membership and membership.role_in_class == "teacher")
    
    await ClassroomService.delete_comment(db, comment_id, current_user.id, is_manager)
    return None


@router.get("/{classroom_id}/analytics", response_model=ClassroomAnalyticsOut)
async def get_classroom_analytics(
    classroom_id: str,
    current_user: CurrentUser,
    db: DBSession
):
    """Fetch classroom analytics (Teacher/Admin/Dev only)."""
    # 1. Check access: Must be teacher-member with ownership OR Admin/Dev
    membership = await get_classroom_membership(classroom_id, current_user.id, db)
    
    is_privileged = current_user.role.is_privileged
    is_owner = membership and membership.role_in_class == "teacher"
    
    if not (is_privileged or is_owner):
        raise HTTPException(
            status_code=403, 
            detail="Access denied. Only classroom teachers or admins can view analytics."
        )

    return await ClassroomService.get_analytics(db, classroom_id)
