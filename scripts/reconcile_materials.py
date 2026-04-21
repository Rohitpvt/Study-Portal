import asyncio
import boto3
import os
import sys
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Add current directory to path so we can import 'app'
sys.path.append(os.getcwd())

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.material import Material, MaterialIntegrityStatus

async def reconcile_materials():
    print(f"=== Materials Integrity Reconciliation: {settings.APP_NAME} ===")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Storage:   {settings.STORAGE_BACKEND}")
    
    # Configure S3
    s3_client = None
    if settings.STORAGE_BACKEND == "s3":
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        print(f"Bucket:    {settings.AWS_BUCKET_NAME}")

    stats = {
        "total": 0,
        "available": 0,
        "missing_file": 0,
        "invalid_metadata": 0,
        "errors": 0
    }

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Material))
        materials = result.scalars().all()
        stats["total"] = len(materials)
        
        print(f"\nScanning {stats['total']} materials...\n")

        for material in materials:
            reason = "OK"
            new_status = MaterialIntegrityStatus.available
            
            # 1. Check for Invalid Metadata (Local paths, placeholders)
            # ─────────────────────────────────────────────────────────────
            key = material.file_key or material.file_path or material.file_url
            
            invalid_patterns = [":\\", ":/", "\\\\", "C:", "D:", "invalid", "nothing.pdf", "non_existent"]
            if not key or any(p in str(key) for p in invalid_patterns):
                new_status = MaterialIntegrityStatus.invalid_metadata
                reason = "MALFORMED_KEY_OR_LOCAL_PATH"
            
            # 2. Check for Physical Existence (if metadata looks valid)
            # ─────────────────────────────────────────────────────────────
            if new_status == MaterialIntegrityStatus.available:
                if settings.STORAGE_BACKEND == "s3":
                    # Extract key if URL
                    s3_key = key
                    if str(key).startswith("http"):
                        s3_key = str(key).split(".amazonaws.com/")[-1].split('?')[0]
                    
                    try:
                        s3_client.head_object(Bucket=settings.AWS_BUCKET_NAME, Key=s3_key.lstrip('/'))
                    except Exception:
                        new_status = MaterialIntegrityStatus.missing_file
                        reason = "NOT_FOUND_IN_BUCKET"
                else:
                    # Local path check
                    full_path = os.path.join(settings.UPLOAD_DIR, key.lstrip('/'))
                    if not os.path.exists(full_path):
                        new_status = MaterialIntegrityStatus.missing_file
                        reason = "NOT_FOUND_ON_DISK"

            # 3. Apply Update
            # ─────────────────────────────────────────────────────────────
            material.integrity_status = new_status
            material.last_reconciliation_at = datetime.utcnow()
            
            stats[new_status.value] += 1
            
            # Print results for broken items
            if new_status != MaterialIntegrityStatus.available:
                print(f"[!] {material.title[:30]:<30} | {new_status.value:^18} | {reason}")
                print(f"    - ID:  {material.id}")
                print(f"    - Key: {key}\n")

        await session.commit()

    print("=" * 60)
    print("📈 RECONCILIATION SUMMARY".replace("📈 ", ""))
    print(f"Total Materials:    {stats['total']}")
    print(f"✅ Available:       {stats['available']}".replace("✅ ", "OK: "))
    print(f"❌ Missing File:    {stats['missing_file']}".replace("❌ ", "MISSING: "))
    print(f"⚠️ Invalid Metadata: {stats['invalid_metadata']}".replace("⚠️ ", "INVALID: "))
    print("=" * 60)
    
    if stats["missing_file"] + stats["invalid_metadata"] == 0:
        print("SUCCESS: Integrity preserved. All systems green.")
    else:
        print("ACTION REQUIRED: Review broken items in the platform admin panel.")

if __name__ == "__main__":
    asyncio.run(reconcile_materials())
