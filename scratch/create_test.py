import requests
import json

def test():
    queries = [
        "Who is the Prime Minister of India?",
        "What is the capital of France?",
        "Who is Elon Musk?",
        "What is Data Communication?",
        "What is bandwidth?"
    ]
    
    # Wait, the ask endpoint expects a JWT or we just bypass auth for the test?
    # The API might be auth protected. Let's call the python function directly but use sys.path modification.
    
code = """
import sys
import os
import asyncio
sys.path.append(os.path.abspath('.'))

from app.db.session import SessionLocal
from app.services.chatbot_service import ask

async def validate():
    queries = [
        "Who is the Prime Minister of India?",
        "What is the capital of France?",
        "Who is Elon Musk?",
        "What is Data Communication?",
        "What is bandwidth?"
    ]
    
    print("\\n--- RUNNING BOT MIXED-MODE VALIDATION ---\\n")
    
    async with SessionLocal() as db:
        for q in queries:
            print(f"QUERY: '{q}'")
            resp = await ask(
                query=q,
                user_id="test_student_x@christuniversity.in",
                session_id=None,
                db=db
            )
            print(f"  -> MODE: {resp.mode}")
            print(f"  -> SOURCES COUNT: {len(resp.sources)}")
            # print(f"  -> RESPONSE: {resp.answer[:60]}...")
            print("-" * 40)

if __name__ == "__main__":
    asyncio.run(validate())
"""

with open("scratch/test_routing_fix.py", "w") as f:
    f.write(code)
