import os
import sqlite3
import json

db_path = "christ_uni_dev.db"

def audit_materials():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    report = {
        "materials": {"total": 0, "missing_file_key": 0, "missing_in_s3": 0, "healthy": 0},
        "contributions": {"total": 0, "missing_file_key": 0, "missing_in_s3": 0, "healthy": 0},
        "submissions": {"total": 0, "missing_file_key": 0, "missing_in_s3": 0, "healthy": 0}
    }
    
    try:
        import boto3
        s3 = boto3.client(
            's3',
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "AKIA5WBJGEU2SSZ2JEPK"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "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"),
            region_name=os.environ.get("AWS_REGION", "ap-south-1")
        )
        bucket = os.environ.get("AWS_BUCKET_NAME", "christ-study-platform-aiproject-2026")
        
        def check_s3(key):
            if not key: return False
            try:
                s3.head_object(Bucket=bucket, Key=key)
                return True
            except Exception:
                return False
                
        # Check Materials
        cursor.execute("SELECT id, title, file_key FROM materials")
        materials = cursor.fetchall()
        report["materials"]["total"] = len(materials)
        for m in materials:
            if not m["file_key"]:
                report["materials"]["missing_file_key"] += 1
            elif not check_s3(m["file_key"]):
                report["materials"]["missing_in_s3"] += 1
            else:
                report["materials"]["healthy"] += 1

        # Check Contributions
        cursor.execute("SELECT id, title, file_key FROM contributions")
        contributions = cursor.fetchall()
        report["contributions"]["total"] = len(contributions)
        for c in contributions:
            if not c["file_key"]:
                report["contributions"]["missing_file_key"] += 1
            elif not check_s3(c["file_key"]):
                report["contributions"]["missing_in_s3"] += 1
            else:
                report["contributions"]["healthy"] += 1

        # Check Submissions
        cursor.execute("SELECT id, file_key FROM assignment_submissions WHERE file_key IS NOT NULL")
        submissions = cursor.fetchall()
        report["submissions"]["total"] = len(submissions)
        for s in submissions:
            if not s["file_key"]:
                report["submissions"]["missing_file_key"] += 1
            elif not check_s3(s["file_key"]):
                report["submissions"]["missing_in_s3"] += 1
            else:
                report["submissions"]["healthy"] += 1

    except ImportError:
        report["error"] = "boto3 not installed"
    except Exception as e:
        report["error"] = str(e)
        
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    audit_materials()
