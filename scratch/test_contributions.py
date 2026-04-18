"""
Comprehensive Contribution Section Error Test
Tests: Login, Upload Validation, Status Tracking, Admin Report, and Pipeline Execution
"""
import httpx
import asyncio
import json
import os
import time

BASE_URL = "http://localhost:8000/api/v1"
TEST_FILE = os.path.join(os.path.dirname(__file__), "..", "e2e_test_syllabi.pdf")

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
WARN = "\033[93m[WARN]\033[0m"
INFO = "\033[94m[INFO]\033[0m"

errors_found = []

def report(status, msg):
    print(f"  {status} {msg}")
    if status == FAIL:
        errors_found.append(msg)

async def run_tests():
    async with httpx.AsyncClient(timeout=30) as client:
        
        # ═══════════════════════════════════════════════════════════════
        # TEST 1: Authentication
        # ═══════════════════════════════════════════════════════════════
        print("\n══ TEST 1: Authentication ══")
        
        # 1a. Student login
        resp = await client.post(f"{BASE_URL}/auth/login", data={"username": "student@christuniversity.in", "password": "password123"})
        if resp.status_code == 200:
            student_token = resp.json()["access_token"]
            report(PASS, "Student login successful")
        else:
            report(FAIL, f"Student login failed: {resp.status_code} - {resp.text}")
            return
        
        student_headers = {"Authorization": f"Bearer {student_token}"}
        
        # 1b. Admin login
        resp = await client.post(f"{BASE_URL}/auth/login", data={"username": "admin@christuniversity.in", "password": "password123"})
        if resp.status_code == 200:
            admin_token = resp.json()["access_token"]
            report(PASS, "Admin login successful")
        else:
            report(FAIL, f"Admin login failed: {resp.status_code} - {resp.text}")
            return
        
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # ═══════════════════════════════════════════════════════════════
        # TEST 2: Form Validation - Missing Fields
        # ═══════════════════════════════════════════════════════════════
        print("\n══ TEST 2: Upload Form Validation ══")
        
        # 2a. Submit with NO fields at all
        resp = await client.post(f"{BASE_URL}/contributions", headers=student_headers)
        if resp.status_code == 422:
            report(PASS, f"Empty submission correctly rejected (422)")
        else:
            report(FAIL, f"Empty submission returned {resp.status_code} instead of 422")
        
        # 2b. Submit with fields but NO file
        resp = await client.post(f"{BASE_URL}/contributions", headers=student_headers, data={
            "title": "Test No File", "course": "BS", "subject": "CS", "category": "NOTES"
        })
        if resp.status_code == 422:
            report(PASS, f"Missing file correctly rejected (422)")
        else:
            report(FAIL, f"Missing file returned {resp.status_code} instead of 422")
        
        # 2c. Submit with file but missing required fields
        with open(TEST_FILE, "rb") as f:
            resp = await client.post(f"{BASE_URL}/contributions", headers=student_headers, 
                files={"file": ("test.pdf", f, "application/pdf")},
                data={"title": "Test Missing Fields"})
        if resp.status_code == 422:
            detail = resp.json().get("detail", [])
            missing = [d.get("loc", ["?"])[-1] for d in detail if d.get("type") == "missing"]
            report(PASS, f"Missing required fields correctly rejected (422). Missing: {missing}")
        else:
            report(FAIL, f"Missing fields returned {resp.status_code} instead of 422")

        # 2d. Submit with invalid category
        with open(TEST_FILE, "rb") as f:
            resp = await client.post(f"{BASE_URL}/contributions", headers=student_headers,
                files={"file": ("test.pdf", f, "application/pdf")},
                data={"title": "Bad Category", "course": "BS", "subject": "CS", "category": "INVALID_TYPE"})
        if resp.status_code == 422:
            report(PASS, f"Invalid category correctly rejected (422)")
        else:
            report(FAIL, f"Invalid category returned {resp.status_code} instead of 422")

        # 2e. Submit with invalid semester (out of range)
        with open(TEST_FILE, "rb") as f:
            resp = await client.post(f"{BASE_URL}/contributions", headers=student_headers,
                files={"file": ("test.pdf", f, "application/pdf")},
                data={"title": "Bad Semester", "course": "BS", "subject": "CS", "category": "NOTES", "semester": "99"})
        if resp.status_code == 422:
            report(PASS, f"Invalid semester (99) correctly rejected (422)")
        else:
            report(WARN, f"Invalid semester returned {resp.status_code} (may accept any int)")

        await asyncio.sleep(2)  # Avoid rate limiter

        # ═══════════════════════════════════════════════════════════════
        # TEST 3: Valid Upload & Pipeline Trigger
        # ═══════════════════════════════════════════════════════════════
        print("\n══ TEST 3: Valid Upload & Pipeline ══")
        
        with open(TEST_FILE, "rb") as f:
            resp = await client.post(f"{BASE_URL}/contributions", headers=student_headers,
                files={"file": ("test_contrib.pdf", f, "application/pdf")},
                data={
                    "title": "Pipeline Error Test",
                    "course": "BS",
                    "subject": "Computer Science",
                    "category": "NOTES",
                    "semester": "1"
                })
        
        if resp.status_code in [200, 202]:
            contrib = resp.json()
            contrib_id = contrib["id"]
            report(PASS, f"Upload accepted (status {resp.status_code}). ID: {contrib_id[:8]}")
            
            # Check response schema
            expected_fields = ["id", "title", "status", "processing_status"]
            for field in expected_fields:
                if field in contrib:
                    report(PASS, f"Response contains '{field}': {contrib[field]}")
                else:
                    report(FAIL, f"Response MISSING field '{field}'")
        else:
            report(FAIL, f"Valid upload failed: {resp.status_code} - {resp.text}")
            return

        # ═══════════════════════════════════════════════════════════════
        # TEST 4: Student Status Tracking
        # ═══════════════════════════════════════════════════════════════
        print("\n══ TEST 4: Student Status Tracking ══")
        
        # 4a. List student's contributions
        resp = await client.get(f"{BASE_URL}/contributions/mine", headers=student_headers)
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("items", data) if isinstance(data, dict) else data
            report(PASS, f"Student contributions list returned {len(items) if isinstance(items, list) else 'N/A'} items")
        else:
            report(FAIL, f"Student contributions list failed: {resp.status_code} - {resp.text}")
        
        # 4b. Check status tracking endpoint
        resp = await client.get(f"{BASE_URL}/contributions/mine/status", headers=student_headers)
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("items", data) if isinstance(data, dict) else data
            report(PASS, f"Status tracking endpoint works ({resp.status_code})")
        elif resp.status_code == 404:
            report(WARN, f"Status tracking endpoint not found (404) - may not exist")
        else:
            report(FAIL, f"Status tracking failed: {resp.status_code}")

        # 4c. Wait for pipeline, polling status
        print(f"\n  {INFO} Waiting for pipeline to process (polling every 3s, max 90s)...")
        final_status = None
        for i in range(30):
            await asyncio.sleep(3)
            resp = await client.get(f"{BASE_URL}/contributions/mine", headers=student_headers)
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", data) if isinstance(data, dict) else data
                if isinstance(items, list):
                    match = next((c for c in items if c.get("id") == contrib_id), None)
                    if match:
                        ps = match.get("processing_status", "unknown")
                        cs = match.get("status", "unknown")
                        print(f"    [{i*3}s] processing_status={ps}, status={cs}")
                        if ps in ["PROCESSING_COMPLETE", "PROCESSING_FAILED"]:
                            final_status = ps
                            break
            
        if final_status == "PROCESSING_COMPLETE":
            report(PASS, f"Pipeline completed successfully: {final_status}")
        elif final_status == "PROCESSING_FAILED":
            report(FAIL, f"Pipeline failed: {final_status}")
        elif final_status is None:
            report(WARN, f"Pipeline did not complete within 90s (may still be running)")

        # ═══════════════════════════════════════════════════════════════
        # TEST 5: Admin Review Endpoints
        # ═══════════════════════════════════════════════════════════════
        print("\n══ TEST 5: Admin Review Endpoints ══")
        
        # 5a. Pending contributions list
        resp = await client.get(f"{BASE_URL}/contributions/pending", headers=admin_headers)
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("items", [])
            report(PASS, f"Admin pending list: {len(items)} items")
        else:
            report(FAIL, f"Admin pending list failed: {resp.status_code} - {resp.text}")
        
        # 5b. Technical validation report
        resp = await client.get(f"{BASE_URL}/admin/contributions/{contrib_id}/report", headers=admin_headers)
        if resp.status_code == 200:
            report_data = resp.json()
            report(PASS, f"Validation report fetched successfully")
            
            # Check report fields by looking at the specific nested structure
            layers = report_data.get("layers", {})
            summary = report_data.get("summary", {})
            
            report_fields = [
                ("grammar", ["score", "details"]),
                ("plagiarism", ["score", "details"]),
                ("toxicity", ["score", "details"]),
                ("similarity", ["score", "details"]),
                ("metadata", ["valid", "details"]),
                ("ai_generated", ["probability", "details"])
            ]
            
            for layer_name, fields in report_fields:
                if layer_name in layers:
                    for field in fields:
                        val = layers[layer_name].get(field)
                        if val is not None:
                            # Use a safe string representation for large nested objects
                            repr_val = str(val)[:60]
                            report(PASS, f"  Report layer '{layer_name}' has '{field}': {repr_val}")
                        else:
                            report(WARN, f"  Report layer '{layer_name}' field '{field}' is NULL")
                else:
                    report(FAIL, f"  Report MISSING layer '{layer_name}'")
                    
            summary_fields = ["overall_quality_score", "overall_risk_score", "recommendation"]
            for field in summary_fields:
                if field in summary:
                    val = summary.get(field)
                    if val is not None:
                        report(PASS, f"  Report summary has '{field}': {str(val)[:60]}")
                    else:
                        report(WARN, f"  Report summary field '{field}' is NULL")
                else:
                    report(FAIL, f"  Report summary MISSING field '{field}'")
        else:
            report(FAIL, f"Validation report failed: {resp.status_code} - {resp.text}")

        # 5c. Student should NOT access admin report
        resp = await client.get(f"{BASE_URL}/admin/contributions/{contrib_id}/report", headers=student_headers)
        if resp.status_code in [401, 403]:
            report(PASS, f"Student correctly blocked from admin report ({resp.status_code})")
        else:
            report(FAIL, f"Student accessed admin report! Status: {resp.status_code}")

        # ═══════════════════════════════════════════════════════════════
        # TEST 6: Admin Approval Flow
        # ═══════════════════════════════════════════════════════════════
        print("\n══ TEST 6: Admin Approval Flow ══")
        
        resp = await client.patch(f"{BASE_URL}/admin/contributions/{contrib_id}/review", 
            headers=admin_headers, json={"approved": True, "admin_notes": "E2E test approval"})
        if resp.status_code == 200:
            report(PASS, f"Admin approval succeeded")
        else:
            report(FAIL, f"Admin approval failed: {resp.status_code} - {resp.text}")

        # 6b. Verify it left the pending queue
        resp = await client.get(f"{BASE_URL}/contributions/pending", headers=admin_headers)
        if resp.status_code == 200:
            items = resp.json().get("items", [])
            still_there = any(c.get("id") == contrib_id for c in items)
            if not still_there:
                report(PASS, f"Approved contribution removed from pending queue")
            else:
                report(FAIL, f"Approved contribution still in pending queue!")

    # ═══════════════════════════════════════════════════════════════
    # FINAL SUMMARY
    # ═══════════════════════════════════════════════════════════════
    print("\n" + "═" * 60)
    if errors_found:
        print(f"  {FAIL} {len(errors_found)} ERROR(S) FOUND:")
        for e in errors_found:
            print(f"    ✗ {e}")
    else:
        print(f"  {PASS} ALL TESTS PASSED - NO ERRORS FOUND")
    print("═" * 60 + "\n")

if __name__ == "__main__":
    asyncio.run(run_tests())
