import asyncio
import sys
import os
from datetime import datetime, timedelta
from uuid import uuid4

# Add the app directory to sys.path
sys.path.append(os.getcwd())

from app.db.session import AsyncSessionLocal
from app.services.classroom_service import ClassroomService
from app.services.notification_service import NotificationService
from app.models.user import User, Role
from app.models.classroom import Classroom, ClassroomMember, ClassroomTopic, ClassroomMaterial, ClassroomAnnouncement, ClassroomAssignment, AssignmentAttachment, AssignmentSubmission, ClassroomComment, CommentVisibility
from app.schemas.classroom import ClassroomCreate, ClassroomAnnouncementCreate, ClassroomAssignmentCreate, AssignmentSubmissionCreate, JoinClassroomRequest, ClassroomTopicCreate, AssignmentSubmissionGradeRequest, ClassroomAssignmentUpdate
from app.schemas.classroom_comment import ClassroomCommentCreate
from sqlalchemy import select, delete

async def run_audit():
    db = AsyncSessionLocal()
    print("--- Starting Classroom Backend Audit (v3) ---")
    
    # Setup test users
    test_prefix = f"audit_{uuid4().hex[:8]}"
    
    try:
        # 1. Create Test Users
        teacher_id = str(uuid4())
        student_id = str(uuid4())
        student2_id = str(uuid4())
        
        teacher = User(id=teacher_id, email=f"{test_prefix}_teacher@test.com", full_name="Audit Teacher", role=Role.TEACHER, is_active=True, hashed_password="...")
        student = User(id=student_id, email=f"{test_prefix}_student@test.com", full_name="Audit Student", role=Role.STUDENT, is_active=True, hashed_password="...")
        student2 = User(id=student2_id, email=f"{test_prefix}_student2@test.com", full_name="Audit Student 2", role=Role.STUDENT, is_active=True, hashed_password="...")
        
        db.add_all([teacher, student, student2])
        await db.commit()
        print(f"Test users created with prefix: {test_prefix}")

        # Refresh objects
        res = await db.execute(select(User).where(User.id == teacher_id))
        teacher = res.scalar_one()
        res = await db.execute(select(User).where(User.id == student_id))
        student = res.scalar_one()
        res = await db.execute(select(User).where(User.id == student2_id))
        student2 = res.scalar_one()

        # 2. Classroom Core Lifecycle
        cl_data = ClassroomCreate(name="Audit Classroom", subject="QA", course="Testing", semester=1)
        classroom = await ClassroomService.create_classroom(db, teacher, cl_data)
        print(f"Classroom created: {classroom.name} (Code: {classroom.join_code})")
        
        # Student joins
        await ClassroomService.join_classroom_by_code(db, student, JoinClassroomRequest(join_code=classroom.join_code))
        await ClassroomService.join_classroom_by_code(db, student2, JoinClassroomRequest(join_code=classroom.join_code))
        print("Students joined classroom.")

        # Duplicate join check
        try:
            await ClassroomService.join_classroom_by_code(db, student, JoinClassroomRequest(join_code=classroom.join_code))
            print("FAILED: Duplicate join allowed (Critical)")
        except Exception as e:
            print(f"SUCCESS: Duplicate join blocked correctly.")

        # 3. Materials & Topics
        topic_data = ClassroomTopicCreate(name="Topic 1", description="Audit Topic")
        topic = await ClassroomService.create_topic(db, classroom.id, topic_data)
        print(f"Topic created: {topic.name}")
        
        # 4. Assignments Lifecycle
        as_data = ClassroomAssignmentCreate(
            title="Draft Assignment",
            instructions="Do not submit",
            points=100,
            status="draft",
            ai_help_mode="allowed"
        )
        draft_as = await ClassroomService.create_assignment(db, classroom.id, teacher.id, as_data)
        print(f"Draft assignment created: {draft_as.title}")
        
        # Student list check
        all_as = await ClassroomService.list_assignments(db, classroom.id, is_manager=False)
        if any(a.id == draft_as.id for a in all_as):
            print("FAILED: Student can see draft assignment (Critical)")
        else:
            print("SUCCESS: Student cannot see draft assignment.")

        # Publish
        await ClassroomService.update_assignment(db, draft_as.id, ClassroomAssignmentUpdate(status="published"))
        print("Assignment published.")
        
        # Verify student can see now
        all_as = await ClassroomService.list_assignments(db, classroom.id, is_manager=False)
        if any(a.id == draft_as.id for a in all_as):
            print("SUCCESS: Student can see published assignment.")
        else:
            print("FAILED: Student cannot see published assignment.")

        # 5. Submissions & Grading
        sub_data = AssignmentSubmissionCreate(text_response="Audit Submission Content")
        submission = await ClassroomService.submit_assignment(db, draft_as.id, student.id, sub_data)
        print(f"Submission created: {submission.id} Status: {submission.status}")

        # Grade
        grade_data = AssignmentSubmissionGradeRequest(marks=95, feedback="Great work!")
        await ClassroomService.grade_submission(db, submission.id, teacher.id, grade_data)
        print("Submission graded.")
        
        # Verify Student sees feedback
        my_sub = await ClassroomService.get_my_submission(db, draft_as.id, student.id)
        if my_sub.marks == 95 and my_sub.feedback == "Great work!":
            print("SUCCESS: Student sees grade and feedback.")
        else:
            print("FAILED: Student cannot see grade/feedback correctly.")

        # 6. Analytics
        analytics = await ClassroomService.get_analytics(db, classroom.id)
        print(f"Analytics - Total Students: {analytics['overview']['total_students']}")
        if analytics['overview']['total_students'] == 2:
            print("SUCCESS: Student count correct.")
        else:
            print(f"FAILED: Student count incorrect: {analytics['overview']['total_students']}")

        # 7. Notifications check
        unread = await NotificationService.get_unread_count(db, student.id)
        print(f"Unread notifications for student: {unread}")
        if unread > 0:
            print("SUCCESS: Notifications were triggered during actions.")
        else:
            print("FAILED: No notifications triggered.")

        # 8. Communication (Private Doubt)
        doubt_data = ClassroomCommentCreate(
            content="Audit Private Doubt",
            visibility="private",
            recipient_id=teacher.id
        )
        doubt = await ClassroomService.create_comment(db, classroom.id, student.id, doubt_data)
        print(f"Private doubt created: {doubt.id}")
        
        # Verify student 2 cannot see it
        student2_comments = await ClassroomService.list_comments(db, classroom.id, student2.id, is_manager=False)
        if any(c.id == doubt.id for c in student2_comments):
            print("FAILED: Private doubt leaked to another student (Critical Security Issue)")
        else:
            print("SUCCESS: Private doubt isolated from other students.")

    except Exception as e:
        print(f"ERROR during audit: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        print("--- Cleaning up Audit Data ---")
        if 'classroom' in locals():
            await db.execute(delete(ClassroomMember).where(ClassroomMember.classroom_id == classroom.id))
            await db.execute(delete(Classroom).where(Classroom.id == classroom.id))
        
        await db.execute(delete(User).where(User.id.in_([teacher_id, student_id, student2_id])))
        await db.commit()
        await db.close()
        print("Cleanup complete.")

if __name__ == "__main__":
    asyncio.run(run_audit())
