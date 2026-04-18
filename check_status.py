import asyncio
import json
from app.core.database import AsyncSessionLocal
from app.models.contribution import Contribution
from sqlalchemy import select

async def check_status():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Contribution).where(Contribution.title == 'DBMS Verification Doc'))
        docs = res.scalars().all()
        print(json.dumps([{
            'id': d.id, 
            'status': d.status.value, 
            'title': d.title,
            'ai_feedback': d.ai_feedback,
            'ai_quality_score': d.ai_quality_score
        } for d in docs], indent=2))

if __name__ == "__main__":
    asyncio.run(check_status())
