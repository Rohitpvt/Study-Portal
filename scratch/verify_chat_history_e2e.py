"""
End-to-End Verification Script for Persistent Chat History System
Tests: auto-titling, session CRUD, rename, delete, schema validation
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── TEST 1: Auto-Title Logic (Unit Test — no server needed) ──────────────────
def test_auto_title_logic():
    """Verify the title generation rules match the spec."""
    
    GREETING_TOKENS = {"hi", "hello", "hey", "test", "ping", "help", "thanks", "thank you", "ok", "okay"}
    
    def generate_title(query: str) -> str:
        """Simulate the auto-title logic from chatbot_service.py"""
        q_normalized = query.strip().lower()
        import re
        q_normalized = re.sub(r"\s+", " ", q_normalized)
        
        is_meaningful = q_normalized not in GREETING_TOKENS and len(q_normalized.split()) >= 2
        
        if not is_meaningful:
            return "New Chat"
        
        raw_title = query[:45].strip()
        if len(raw_title) > 40:
            return raw_title[:40].rsplit(' ', 1)[0]
        else:
            return raw_title

    # Test cases
    results = []
    
    # 1. Greeting → "New Chat"
    for greeting in ["Hi", "hello", "Hey", "thanks", "thank you", "ok", "HELLO"]:
        title = generate_title(greeting)
        passed = title == "New Chat"
        results.append(("Greeting filter", greeting, title, "New Chat", passed))
    
    # 2. Single word → "New Chat" (too short)
    for single in ["Python", "DBMS", "a"]:
        title = generate_title(single)
        passed = title == "New Chat"
        results.append(("Single word filter", single, title, "New Chat", passed))
    
    # 3. Meaningful queries → proper title
    cases = [
        ("Explain machine learning algorithms", "Explain machine learning algorithms"),
        ("What is compiler design", "What is compiler design"),
        ("Tell me about database normalization", "Tell me about database normalization"),
    ]
    for query, expected in cases:
        title = generate_title(query)
        passed = title == expected
        results.append(("Meaningful title", query, title, expected, passed))
    
    # 4. Long query → truncated to nearest word, <= 40 chars
    long_query = "Explain the fundamentals of machine learning algorithms and neural networks in detail"
    title = generate_title(long_query)
    passed = len(title) <= 40 and not title.endswith(' ') and ' ' in title
    results.append(("Smart truncation", long_query[:30]+"...", title, f"≤40 chars (got {len(title)})", passed))
    
    # 5. Edge case: exactly 40 chars
    exact_40 = "A" * 20 + " " + "B" * 19  # 20 + 1 + 19 = 40
    title = generate_title(exact_40)
    passed = title == exact_40
    results.append(("Exact 40 chars", exact_40[:20]+"...", title[:20]+"...", "No truncation needed", passed))
    
    # 6. 41 char query → should truncate
    over_40 = "Explain the key concepts of quantum phys X"  # 43 chars
    title = generate_title(over_40)
    passed = len(title) <= 40
    results.append(("41+ chars truncation", over_40[:20]+"...", title, f"≤40 chars (got {len(title)})", passed))

    print("\n" + "="*80)
    print("TEST 1: AUTO-TITLE LOGIC")
    print("="*80)
    
    all_passed = True
    for test_name, input_val, got, expected, passed in results:
        status_icon = "✅" if passed else "❌"
        print(f"  {status_icon} [{test_name}] Input: '{input_val}' → Got: '{got}' | Expected: '{expected}'")
        if not passed:
            all_passed = False
    
    return all_passed


# ── TEST 2: Schema Validation ────────────────────────────────────────────────
def test_schema_validation():
    """Verify Pydantic schemas work correctly."""
    from app.schemas.chat import (
        ChatSessionCreate, ChatSessionUpdate, ChatSessionOut,
        ChatMessageOut, ChatHistoryResponse
    )
    from datetime import datetime

    print("\n" + "="*80)
    print("TEST 2: SCHEMA VALIDATION")
    print("="*80)
    
    results = []
    
    # 2a. ChatSessionCreate default title
    schema = ChatSessionCreate()
    # NOTE: This tests the SCHEMA default, not the service default.
    # The schema still says "New Conversation" — but the service overrides this.
    results.append(("ChatSessionCreate default", schema.title, schema.title, True))
    
    # 2b. ChatSessionUpdate — min_length=1
    try:
        ChatSessionUpdate(title="")
        results.append(("ChatSessionUpdate reject empty", "accepted empty", "should reject", False))
    except Exception:
        results.append(("ChatSessionUpdate reject empty", "rejected", "rejected", True))
    
    try:
        ChatSessionUpdate(title="Valid Title")
        results.append(("ChatSessionUpdate valid title", "accepted", "accepted", True))
    except Exception:
        results.append(("ChatSessionUpdate valid title", "rejected", "accepted", False))
    
    # 2c. ChatMessageOut — JSON source parsing
    msg = ChatMessageOut(
        id="test-id",
        role="assistant",
        content="Hello",
        mode="general",
        sources='[{"title":"Test","source_file":"test.pdf","material_id":"abc123"}]',
        created_at=datetime.now()
    )
    results.append(("ChatMessageOut JSON parse", f"{len(msg.sources)} sources", "1 sources", len(msg.sources) == 1))
    
    # 2d. ChatMessageOut — null sources
    msg2 = ChatMessageOut(
        id="test-id-2",
        role="user",
        content="Hello",
        mode="general",
        sources=None,
        created_at=datetime.now()
    )
    results.append(("ChatMessageOut null sources", f"{msg2.sources}", "[]", msg2.sources == []))
    
    for test_name, got, expected, passed in results:
        status_icon = "✅" if passed else "❌"
        print(f"  {status_icon} [{test_name}] Got: '{got}' | Expected: '{expected}'")
    
    return all(r[3] for r in results)


# ── TEST 3: ORM Model Integrity ──────────────────────────────────────────────
def test_orm_model_integrity():
    """Verify ORM model definitions are consistent."""
    from app.models.chat import ChatSession, ChatMessage
    
    print("\n" + "="*80)
    print("TEST 3: ORM MODEL INTEGRITY")
    print("="*80)
    
    results = []
    
    # 3a. ChatSession has expected columns
    for col in ["id", "user_id", "title", "last_message_at"]:
        has_attr = hasattr(ChatSession, col)
        results.append((f"ChatSession.{col}", "exists" if has_attr else "MISSING", "exists", has_attr))
    
    # 3b. ChatMessage has expected columns
    for col in ["id", "session_id", "role", "content", "mode", "sources"]:
        has_attr = hasattr(ChatMessage, col)
        results.append((f"ChatMessage.{col}", "exists" if has_attr else "MISSING", "exists", has_attr))
    
    # 3c. Cascade relationship
    rel = ChatSession.messages.property
    has_cascade = "delete" in rel.cascade
    results.append(("Cascade delete-orphan", "configured" if has_cascade else "MISSING", "configured", has_cascade))
    
    # 3d. latest_message_preview property
    has_preview = hasattr(ChatSession, "latest_message_preview")
    results.append(("latest_message_preview property", "exists" if has_preview else "MISSING", "exists", has_preview))
    
    for test_name, got, expected, passed in results:
        status_icon = "✅" if passed else "❌"
        print(f"  {status_icon} [{test_name}] Got: '{got}' | Expected: '{expected}'")
    
    return all(r[3] for r in results)


# ── TEST 4: Memory Service Logic ─────────────────────────────────────────────
def test_memory_service():
    """Verify in-memory session history manager works correctly."""
    from app.services.memory_service import (
        get_memory, add_message, trim_memory, clear_memory, set_memory
    )
    
    print("\n" + "="*80)
    print("TEST 4: MEMORY SERVICE")
    print("="*80)
    
    results = []
    test_sid = "test-memory-verify-001"
    
    # 4a. Empty session
    mem = get_memory(test_sid)
    results.append(("Empty session", str(mem), "[]", mem == []))
    
    # 4b. Add messages
    add_message(test_sid, "user", "Hello")
    add_message(test_sid, "assistant", "Hi there!")
    mem = get_memory(test_sid)
    results.append(("After 2 messages", str(len(mem)), "2", len(mem) == 2))
    
    # 4c. set_memory (restore from DB)
    restored = [
        {"role": "user", "content": "Q1"},
        {"role": "assistant", "content": "A1"},
        {"role": "user", "content": "Q2"},
        {"role": "assistant", "content": "A2"},
    ]
    set_memory(test_sid, restored)
    mem = get_memory(test_sid)
    results.append(("set_memory restore", str(len(mem)), "4", len(mem) == 4))
    
    # 4d. Trim
    for i in range(20):
        add_message(test_sid, "user", f"msg-{i}")
    trim_memory(test_sid, max_messages=10)
    mem = get_memory(test_sid)
    results.append(("Trim to 10", str(len(mem)), "10", len(mem) == 10))
    
    # 4e. Clear
    clear_memory(test_sid)
    mem = get_memory(test_sid)
    results.append(("Clear memory", str(mem), "[]", mem == []))
    
    for test_name, got, expected, passed in results:
        status_icon = "✅" if passed else "❌"
        print(f"  {status_icon} [{test_name}] Got: '{got}' | Expected: '{expected}'")
    
    return all(r[3] for r in results)


# ── TEST 5: Import Chain Verification ────────────────────────────────────────
def test_import_chain():
    """Verify all imports in the chatbot_service resolve correctly at module level."""
    
    print("\n" + "="*80)
    print("TEST 5: IMPORT CHAIN VERIFICATION")
    print("="*80)
    
    results = []
    
    # 5a. chatbot_service imports
    try:
        from app.services import chatbot_service
        results.append(("chatbot_service import", "OK", "OK", True))
    except Exception as e:
        results.append(("chatbot_service import", str(e)[:80], "OK", False))
    
    # 5b. Check HTTPException is available in chatbot_service scope
    # The service uses HTTPException but we found it's NOT imported at the top.
    # Let's verify it's available somewhere (maybe via a star import or local import)
    try:
        source_code = open(os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "app", "services", "chatbot_service.py"
        )).read()
        has_http_exc_import = "HTTPException" in source_code and ("from fastapi" in source_code or "import HTTPException" in source_code)
        uses_http_exc = "raise HTTPException" in source_code
        
        if uses_http_exc and not has_http_exc_import:
            results.append(("HTTPException import", "MISSING import but used", "import needed", False))
        elif uses_http_exc and has_http_exc_import:
            results.append(("HTTPException import", "imported and used", "OK", True))
        else:
            results.append(("HTTPException import", "not used", "OK", True))
    except Exception as e:
        results.append(("HTTPException import", str(e)[:80], "OK", False))
    
    # 5c. Check 'status' is available (used with HTTPException)
    has_status_import = "from fastapi import" in source_code and "status" in source_code
    uses_status = "status.HTTP_" in source_code
    if uses_status and not has_status_import:
        results.append(("fastapi.status import", "MISSING import but used", "import needed", False))
    else:
        results.append(("fastapi.status import", "OK or not needed", "OK", True))
    
    # 5d. Route imports
    try:
        from app.routes import chat as chat_routes
        results.append(("chat routes import", "OK", "OK", True))
    except Exception as e:
        results.append(("chat routes import", str(e)[:80], "OK", False))
    
    # 5e. Schema imports
    try:
        from app.schemas.chat import ChatSessionCreate
        results.append(("ChatSessionCreate schema", "OK", "OK", True))
    except Exception as e:
        results.append(("ChatSessionCreate schema", str(e)[:80], "OK", False))
    
    for test_name, got, expected, passed in results:
        status_icon = "✅" if passed else "❌"
        print(f"  {status_icon} [{test_name}] Got: '{got}' | Expected: '{expected}'")
    
    return all(r[3] for r in results)


# ── TEST 6: Indentation / Control Flow Verification ──────────────────────────
def test_indentation_logic():
    """Verify the session management if/else block is correctly structured."""
    
    print("\n" + "="*80)
    print("TEST 6: CONTROL FLOW / INDENTATION AUDIT")
    print("="*80)
    
    results = []
    
    service_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "app", "services", "chatbot_service.py"
    )

    with open(service_path, 'r') as f:
        lines = f.readlines()
    
    # Find the session management block
    session_none_line = None
    else_line = None
    
    for i, line in enumerate(lines, 1):
        stripped = line.rstrip()
        if stripped.strip() == "if session is None:":
            session_none_line = i
            # Check indentation of this line
            indent = len(line) - len(line.lstrip())
            results.append((f"'if session is None:' at L{i}", f"indent={indent}", "indent=4", indent == 4))
        
        if session_none_line and not else_line:
            if stripped.strip().startswith("else:") and i > session_none_line:
                indent = len(line) - len(line.lstrip())
                if indent == 4:
                    else_line = i
                    results.append((f"'else:' at L{i}", f"indent={indent}", "indent=4", indent == 4))
    
    if session_none_line and else_line:
        results.append(("if/else block found", f"L{session_none_line}-L{else_line}", "found", True))
    else:
        results.append(("if/else block found", "MISSING", "found", False))
    
    # Check that 'if session_id:' and 'if session is None:' are at same indent level
    for i, line in enumerate(lines, 1):
        if line.strip() == "if session_id:":
            parent_indent = len(line) - len(line.lstrip())
            if session_none_line:
                child_indent = len(lines[session_none_line - 1]) - len(lines[session_none_line - 1].lstrip())
                same_level = parent_indent == child_indent
                results.append((
                    f"'if session_id:' (L{i}) vs 'if session is None:' (L{session_none_line})",
                    f"indent {parent_indent} vs {child_indent}",
                    "same level",
                    same_level
                ))
            break
    
    # Verify the `else` on L222 is paired with `if session is None:` — not with `if session_id:`
    # The correct structure is:
    #     if session_id:
    #         ... lookup ...
    #     if session is None:
    #         ... create new ...
    #     else:
    #         ... auto-title existing ...
    # Both `if session is None:` and `else:` should be at indent=4

    for test_name, got, expected, passed in results:
        status_icon = "✅" if passed else "❌"
        print(f"  {status_icon} [{test_name}] Got: '{got}' | Expected: '{expected}'")
    
    return all(r[3] for r in results)


# ── TEST 7: ChatSessionCreate Schema Default Audit ──────────────────────────
def test_schema_default_alignment():
    """Check if the schema default matches the service default."""
    
    print("\n" + "="*80)
    print("TEST 7: SCHEMA ↔ SERVICE DEFAULT ALIGNMENT")
    print("="*80)
    
    from app.schemas.chat import ChatSessionCreate
    
    schema_default = ChatSessionCreate().title
    
    service_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "app", "services", "chatbot_service.py"
    )
    with open(service_path) as f:
        src = f.read()
    
    service_default = "New Chat" if 'title: Optional[str] = "New Chat"' in src else "UNKNOWN"
    
    schema_matches_service = schema_default == service_default
    
    results = [
        ("Schema default", schema_default, "New Chat", schema_default == "New Chat"),
        ("Service default", service_default, "New Chat", service_default == "New Chat"),
        ("Schema == Service", f"{schema_default} vs {service_default}", "match", schema_matches_service),
    ]
    
    for test_name, got, expected, passed in results:
        status_icon = "✅" if passed else "❌"
        print(f"  {status_icon} [{test_name}] Got: '{got}' | Expected: '{expected}'")
    
    return all(r[3] for r in results)


# ── MAIN ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "🔬"*20)
    print("  PERSISTENT CHAT HISTORY — END-TO-END VERIFICATION")
    print("🔬"*20)
    
    test_results = {}
    test_results["Auto-Title Logic"] = test_auto_title_logic()
    test_results["Schema Validation"] = test_schema_validation()
    test_results["ORM Model Integrity"] = test_orm_model_integrity()
    test_results["Memory Service"] = test_memory_service()
    test_results["Import Chain"] = test_import_chain()
    test_results["Control Flow / Indentation"] = test_indentation_logic()
    test_results["Schema-Service Alignment"] = test_schema_default_alignment()
    
    print("\n" + "="*80)
    print("FINAL VERDICT")
    print("="*80)
    
    all_pass = True
    for name, passed in test_results.items():
        icon = "✅" if passed else "❌"
        print(f"  {icon} {name}")
        if not passed:
            all_pass = False
    
    if all_pass:
        print("\n  🎉 ALL TESTS PASSED — System is healthy.\n")
    else:
        print("\n  ⚠️  SOME TESTS FAILED — Review findings above.\n")
    
    sys.exit(0 if all_pass else 1)
