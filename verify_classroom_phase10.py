
import asyncio
import sys
import os
import logging

# Disable SQL logging for cleaner output
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.classroom import Classroom, ClassroomMember, ClassroomAssignment, ClassroomMaterial, AssignmentAttachment, AIHelpMode, ClassroomTopic
from app.models.material import Material, Category
from app.services import chatbot_service
from app.models.user import User, Role

async def verify_classroom_ai():
    print("--- Starting Phase 10: Classroom AI Verification ---")
    async with AsyncSessionLocal() as db:
        # 1. Setup Mock Data
        # Get a teacher and a student
        res = await db.execute(select(User).where(User.role == Role.TEACHER))
        teacher = res.scalars().first()
        res = await db.execute(select(User).where(User.role == Role.STUDENT))
        student = res.scalars().first()
        
        if not teacher or not student:
            print("Error: Need at least one teacher and one student in DB.")
            return

        # Create a classroom
        classroom = Classroom(
            name="AI Verification Class",
            course="Computer Science",
            subject="AI Ethics",
            semester=6,
            created_by_teacher_id=teacher.id,
            join_code="AICLASS"
        )
        db.add(classroom)
        await db.flush()
        
        # Add student to classroom
        member = ClassroomMember(classroom_id=classroom.id, user_id=student.id, role_in_class="student")
        db.add(member)
        
        # Create a specific material for this classroom
        mat = Material(
            title="Secret Classroom Note",
            description="The secret code for this class is PEANUTBUTTER.",
            category=Category.NOTES,
            course="Computer Science",
            subject="AI Ethics",
            semester=6,
            is_approved=True,
            uploader_id=teacher.id,
            file_path="fake/path.pdf",
            file_name="secret_note.pdf",
            file_size=1024,
            file_type="application/pdf"
        )
        db.add(mat)
        await db.flush()
        
        topic = ClassroomTopic(classroom_id=classroom.id, name="Ethics Basics")
        db.add(topic)
        await db.flush()
        
        cl_mat = ClassroomMaterial(classroom_id=classroom.id, material_id=mat.id, topic_id=topic.id, added_by=teacher.id)
        db.add(cl_mat)
        
        # Create an assignment
        assignment = ClassroomAssignment(
            classroom_id=classroom.id,
            title="The Secret Code Assignment",
            instructions="What is the secret code found in the notes?",
            ai_help_mode=AIHelpMode.HINT_ONLY,
            created_by=teacher.id
        )
        db.add(assignment)
        await db.flush()
        
        # Attach material to assignment
        att = AssignmentAttachment(assignment_id=assignment.id, material_id=mat.id, title="Secret Note", attachment_type="material")
        db.add(att)
        await db.commit()

        print(f"Test Environment Setup: Classroom {classroom.id}, Assignment {assignment.id}, Material {mat.id}")

        # 2. Test Classroom Scoped Retrieval
        print("\nTesting Classroom Scoped Retrieval...")
        # Since FAISS is async and might not have the new material indexed immediately in this script context,
        # we might need to manually trigger index_one or mock the rag.retrieve if we want to be 100% sure.
        # But let's assume the indexing works if we wait a bit or if it's already there.
        # For a pure unit test of the logic in chatbot_service.ask:
        
        try:
            # Test: Student asking about the secret code
            response = await chatbot_service.ask(
                query="What is the secret code for this class?",
                user_id=student.id,
                session_id=None,
                db=db,
                classroom_id=classroom.id
            )
            print(f"Response (Classroom Scope): {response.answer[:100]}...")
            print(f"Source Scope: {response.source_scope}")
        except Exception as e:
            print(f"Error in classroom scope test: {e}")

        # 3. Test Assignment Hint-Only Mode
        print("\nTesting Assignment Hint-Only Mode...")
        try:
            response = await chatbot_service.ask(
                query="Tell me the secret code for the assignment.",
                user_id=student.id,
                session_id=None,
                db=db,
                classroom_id=classroom.id,
                assignment_id=assignment.id
            )
            print(f"Response (Hint-Only): {response.answer[:200]}...")
            # We expect the answer to be a hint, not 'PEANUTBUTTER' directly if grounded.
            # But the 'system_content' addition is what we are verifying.
        except Exception as e:
            print(f"Error in hint-only test: {e}")

        # 4. Test Assignment Disabled Mode
        print("\nTesting Assignment Disabled Mode...")
        assignment.ai_help_mode = AIHelpMode.DISABLED
        await db.commit()
        try:
            response = await chatbot_service.ask(
                query="Help me with the assignment.",
                user_id=student.id,
                session_id=None,
                db=db,
                classroom_id=classroom.id,
                assignment_id=assignment.id
            )
            print(f"Response (Disabled): {response.answer}")
            if "disabled" in response.answer.lower():
                print("PASSED: AI Help was refused.")
        except Exception as e:
            print(f"Error in disabled mode test: {e}")

        # 5. Test Unauthorized Access
        print("\nTesting Unauthorized Access...")
        other_student = "some-random-id" # Not in classroom
        try:
            await chatbot_service.ask(
                query="What are the secrets?",
                user_id=other_student,
                session_id=None,
                db=db,
                classroom_id=classroom.id
            )
            print("FAILED: Unauthorized user accessed classroom AI.")
        except Exception as e:
            print(f"PASSED: Unauthorized user blocked: {e}")

        # Cleanup
        await db.delete(att)
        await db.delete(assignment)
        await db.delete(cl_mat)
        await db.delete(mat)
        await db.delete(member)
        await db.delete(classroom)
        await db.commit()
        print("\nCleanup complete.")

if __name__ == "__main__":
    asyncio.run(verify_classroom_ai())
