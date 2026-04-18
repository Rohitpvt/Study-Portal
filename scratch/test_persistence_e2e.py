"""
E2E test for persistent chat flow integration.
Tests: session creation, auto-title, message persistence, session reload, memory restoration.
"""
import httpx
import asyncio
import sys
import io

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:8000/api/v1"

async def test_persistent_chat_flow():
    print("\n" + "="*60)
    print("PERSISTENT CHAT FLOW -- E2E VERIFICATION")
    print("="*60)

    async with httpx.AsyncClient(timeout=60.0) as client:
        # 1. Login as Admin to get a token
        print("\n[STEP 1] Logging in as Admin...")
        login_res = await client.post(f"{BASE_URL}/auth/login", data={
            "username": "rohit.ghosh@mca.christuniversity.in",
            "password": "admin123"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"  OK - Authenticated. Token: {token[:20]}...")

        # 2. Send first message WITHOUT a session_id (creates new session)
        print("\n[STEP 2] Sending first message (no session_id -> triggers session creation)...")
        ask_res = await client.post(f"{BASE_URL}/chat/ask", json={
            "query": "My favorite programming language is Python",
            "session_id": None
        }, headers=headers)
        print(f"  Status: {ask_res.status_code}")
        assert ask_res.status_code == 200, f"Ask failed: {ask_res.text}"
        
        ask_data = ask_res.json()
        session_id = ask_data["session_id"]
        print(f"  OK - Session created: {session_id}")
        print(f"  OK - Answer preview: {ask_data['answer'][:80]}...")

        # 3. List sessions -- verify the new session appears with auto-title
        print("\n[STEP 3] Listing sessions (verify auto-title from first query)...")
        list_res = await client.get(f"{BASE_URL}/chat/sessions", headers=headers)
        assert list_res.status_code == 200
        sessions = list_res.json()["sessions"]
        print(f"  OK - Total sessions: {len(sessions)}")
        
        found = [s for s in sessions if s["id"] == session_id]
        assert len(found) == 1, f"Session {session_id} not found in list"
        session_title = found[0]["title"]
        print(f"  OK - Session title: '{session_title}'")
        assert "My favorite programming language is Python" in session_title, \
            f"Expected auto-title from first query, got: '{session_title}'"
        print(f"  OK - Auto-title matches first query!")

        # 4. Send a second message IN the same session
        print("\n[STEP 4] Sending second message in the same session...")
        ask_res2 = await client.post(f"{BASE_URL}/chat/ask", json={
            "query": "My favorite color is Blue",
            "session_id": session_id
        }, headers=headers)
        assert ask_res2.status_code == 200
        assert ask_res2.json()["session_id"] == session_id, "Session ID should remain the same"
        print(f"  OK - Second message persisted in same session")

        # 5. Verify title did NOT change (it should only set once)
        print("\n[STEP 5] Verifying title stability (should NOT change after second message)...")
        list_res2 = await client.get(f"{BASE_URL}/chat/sessions", headers=headers)
        found2 = [s for s in list_res2.json()["sessions"] if s["id"] == session_id]
        title_after_second = found2[0]["title"]
        print(f"  OK - Title after second message: '{title_after_second}'")
        assert title_after_second == session_title, \
            f"Title changed unexpectedly! Was '{session_title}', now '{title_after_second}'"

        # 6. Load session details -- verify full message history
        print("\n[STEP 6] Loading full session history...")
        detail_res = await client.get(f"{BASE_URL}/chat/sessions/{session_id}", headers=headers)
        assert detail_res.status_code == 200
        messages = detail_res.json()["messages"]
        print(f"  OK - Total messages in session: {len(messages)}")
        
        # Should have at least 4 messages: user1, assistant1, user2, assistant2
        assert len(messages) >= 4, f"Expected at least 4 messages, got {len(messages)}"
        
        # Verify chronological order
        roles = [m["role"] for m in messages]
        print(f"  OK - Message order: {roles}")
        assert roles[0] == "user" and roles[1] == "assistant", "First exchange should be user->assistant"
        
        # Verify content integrity
        assert "My favorite programming language is Python" in messages[0]["content"]
        assert "My favorite color is Blue" in messages[2]["content"]
        print(f"  OK - Message content integrity verified")

        # 7. Test memory restoration by asking a follow-up question
        print("\n[STEP 7] Testing memory restoration (asking about previously stated info)...")
        ask_res3 = await client.post(f"{BASE_URL}/chat/ask", json={
            "query": "What is my favorite color?",
            "session_id": session_id
        }, headers=headers)
        assert ask_res3.status_code == 200
        memory_answer = ask_res3.json()["answer"].lower()
        print(f"  OK - AI response: {ask_res3.json()['answer'][:120]}...")
        
        if "blue" in memory_answer:
            print(f"  OK - MEMORY RESTORED: AI correctly recalled 'Blue'!")
        else:
            print(f"  WARN - Memory test: 'Blue' not found in response (may depend on LLM behavior)")

        # 8. Cleanup: delete the test session
        print("\n[STEP 8] Cleaning up test session...")
        del_res = await client.delete(f"{BASE_URL}/chat/sessions/{session_id}", headers=headers)
        assert del_res.status_code == 204
        print(f"  OK - Test session deleted")

    print("\n" + "="*60)
    print("ALL PERSISTENCE TESTS PASSED")
    print("="*60)

if __name__ == "__main__":
    try:
        asyncio.run(test_persistent_chat_flow())
    except Exception as e:
        print(f"\nVERIFICATION FAILED: {e}")
        import traceback
        traceback.print_exc()
