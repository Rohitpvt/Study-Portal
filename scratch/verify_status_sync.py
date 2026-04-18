import asyncio
import json
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.contribution import Contribution, ProcessingStatus, FinalRecommendation
from app.services import contribution_service
from app.schemas.contribution import ReviewDecision
from app.models.user import User

async def verify_status_sync():
    async with AsyncSessionLocal() as db:
        # 1. Find a pending contribution
        stmt = select(Contribution).where(Contribution.status == "pending").limit(1)
        res = await db.execute(stmt)
        c = res.scalar_one_or_none()
        
        if not c:
            print("No pending contribution found for test.")
            return

        print(f"Testing SYNC for contribution: {c.title} (ID: {c.id})")
        print(f"PRE-SYNC Status: {c.processing_status}")

        # 2. Find an admin user
        admin_stmt = select(User).where(User.role == "admin").limit(1)
        admin_res = await db.execute(admin_stmt)
        admin = admin_res.scalar_one_or_none()

        # 3. Simulate Approval
        decision = ReviewDecision(approved=True, admin_notes="Verified by system test.")
        
        from fastapi import BackgroundTasks
        bt = BackgroundTasks()
        
        await contribution_service.review_contribution(c.id, decision, admin, db, bt)
        await db.commit()
        await db.refresh(c)

        print("-" * 20)
        print(f"POST-REVIEW status: {c.status}")
        print(f"POST-REVIEW processing_status: {c.processing_status}")
        print(f"POST-REVIEW feedback: {c.student_feedback_message}")
        print(f"POST-REVIEW recommendation: {c.final_recommendation}")
        print(f"POST-REVIEW updated_at: {c.status_updated_at}")
        print("-" * 20)

        # 4. Check if fields match requirements
        assert c.processing_status == ProcessingStatus.APPROVED
        assert "approved by the admin" in c.student_feedback_message
        assert c.final_recommendation == FinalRecommendation.APPROVED_FOR_REVIEW
        assert c.status_updated_at is not None

        print("SUCCESS: Student Portal Sync logic verified.")

if __name__ == "__main__":
    asyncio.run(verify_status_sync())
