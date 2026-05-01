"""
scripts/deadline_reminders.py
──────────────────────────────
Background script to send reminders for upcoming assignment deadlines.
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from sqlalchemy import select, and_, not_

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from app.models.classroom import ClassroomAssignment, AssignmentSubmission, AssignmentStatus, ClassroomMember
from app.models.notification import Notification, NotificationType
from app.services.notification_service import NotificationService
from app.schemas.notification import NotificationCreate

async def process_reminders():
    print(f"--- Starting Deadline Reminders Process [{datetime.now()}] ---")
    
    async with AsyncSessionLocal() as db:
        # 1. Find Published Assignments due in next 24 hours
        now = datetime.utcnow()
        tomorrow = now + timedelta(hours=24)
        
        query = select(ClassroomAssignment).where(
            and_(
                ClassroomAssignment.status == AssignmentStatus.PUBLISHED,
                ClassroomAssignment.due_at >= now,
                ClassroomAssignment.due_at <= tomorrow
            )
        )
        result = await db.execute(query)
        assignments = result.scalars().all()
        
        print(f"Found {len(assignments)} assignments due in next 24h.")
        
        for assignment in assignments:
            # 2. Get all students in this classroom
            student_query = select(ClassroomMember.user_id).where(
                and_(
                    ClassroomMember.classroom_id == assignment.classroom_id,
                    ClassroomMember.role_in_class == "student"
                )
            )
            s_result = await db.execute(student_query)
            all_student_ids = s_result.scalars().all()
            
            # 3. Find students who ALREADY submitted
            sub_query = select(AssignmentSubmission.student_id).where(
                AssignmentSubmission.assignment_id == assignment.id
            )
            sub_result = await db.execute(sub_query)
            submitted_student_ids = set(sub_result.scalars().all())
            
            # 4. Filter students who need reminder
            pending_student_ids = [sid for sid in all_student_ids if sid not in submitted_student_ids]
            
            print(f"  Assignment '{assignment.title}': {len(pending_student_ids)} students pending.")
            
            for student_id in pending_student_ids:
                # 5. Check if already reminded in last 24h for this assignment
                check_query = select(Notification).where(
                    and_(
                        Notification.user_id == student_id,
                        Notification.assignment_id == assignment.id,
                        Notification.type == NotificationType.ASSIGNMENT_DUE_SOON,
                        Notification.created_at >= (now - timedelta(hours=23)) # Buffer
                    )
                )
                check_res = await db.execute(check_query)
                if check_res.scalar_one_or_none():
                    continue # Already reminded recently
                
                # 6. Create Notification
                await NotificationService.create_notification(db, NotificationCreate(
                    user_id=student_id,
                    type=NotificationType.ASSIGNMENT_DUE_SOON,
                    title=f"Reminder: {assignment.title} is due soon!",
                    message=f"Don't forget to submit your work for {assignment.title}. Due at: {assignment.due_at.strftime('%Y-%m-%d %H:%M')}",
                    classroom_id=assignment.classroom_id,
                    assignment_id=assignment.id,
                    link_url=f"/classroom/{assignment.classroom_id}?assignment={assignment.id}"
                ))
                print(f"    - Notified Student {student_id}")

    print("--- Process Complete ---")

if __name__ == "__main__":
    asyncio.run(process_reminders())
