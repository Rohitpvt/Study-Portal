import asyncio
import boto3
import os
from sqlalchemy import select
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.material import Material

async def audit_materials():
    print(f"--- Inventory Audit: {settings.APP_NAME} ---")
    print(f"Storage Backend: {settings.STORAGE_BACKEND}")
    
    # Configure S3 client if needed
    s3_client = None
    if settings.STORAGE_BACKEND == "s3":
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        print(f"Target Bucket: {settings.AWS_BUCKET_NAME}")

    missing_count = 0
    total_count = 0
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Material))
        materials = result.scalars().all()
        total_count = len(materials)
        
        print(f"Total Materials in Database: {total_count}\n")
        
        for material in materials:
            status = "FOUND"
            exists = False
            
            if settings.STORAGE_BACKEND == "s3":
                if not material.file_key:
                    status = "MISSING FILE KEY"
                else:
                    try:
                        s3_client.head_object(Bucket=settings.AWS_BUCKET_NAME, Key=material.file_key)
                        exists = True
                    except Exception:
                        status = "NOT FOUND IN S3"
                        exists = False
            else:
                # Local check
                path = os.path.join(settings.UPLOAD_DIR, material.file_path or material.file_name)
                if os.path.exists(path):
                    exists = True
                else:
                    status = "NOT FOUND LOCALLY"
            
            if not exists:
                missing_count += 1
                print(f"[!] {material.title} (ID: {material.id[:8]}) -> {status}")
                print(f"    Target Key: {material.file_key or material.file_path}")
            else:
                # Optionally print success for small lists
                # print(f"[✓] {material.title}")
                pass

    print(f"\n--- Audit Summary ---")
    print(f"Verified: {total_count - missing_count}/{total_count}")
    print(f"Missing:  {missing_count}")
    if missing_count == 0:
        print("✅ SUCCESS: All materials found in storage.")
    else:
        print("❌ WARNING: Some materials are missing from storage.")

if __name__ == "__main__":
    asyncio.run(audit_materials())
