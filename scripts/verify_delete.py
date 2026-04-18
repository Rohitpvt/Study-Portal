
import asyncio
import os
import logging
from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.material import Material, Category
from app.services import material_service
from app.utils.file_handler import get_storage
from app.ai import rag

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_deletion_flow():
    async with AsyncSessionLocal() as db:
        # 1. Create a dummy material
        material_id = "test-delete-uuid-" + os.urandom(4).hex()
        title = "DELETION_INTEGRATION_TEST_FILE"
        
        material = Material(
            id=material_id,
            title=title,
            course="Test Course",
            subject="Test Subject",
            category=Category.NOTES,
            file_key=f"uploads/notes/{material_id}.pdf",
            file_name=f"{material_id}.pdf",
            file_size=1024,
            file_type="application/pdf",
            is_approved=True,
            uploader_id="admin-id-placeholder"
        )
        db.add(material)
        await db.commit()
        await db.refresh(material)
        
        logger.info(f"Created test material: {material.id}")

        # 2. Create physical file on disk (or S3 mock if using LocalStorage fallback)
        storage = get_storage()
        # We'll just write something to the file_key path if it's LocalStorage, 
        # or just hope the delete_file handles non-existent files gracefully if we don't want to actually upload to S3.
        # But let's try to be thorough.
        
        file_path = ""
        if hasattr(storage, 'base_dir'): # LocalStorage
             file_path = os.path.join(storage.base_dir, material.file_key.lstrip('/')).replace('\\', '/')
             os.makedirs(os.path.dirname(file_path), exist_ok=True)
             with open(file_path, "w") as f:
                 f.write("test content for deletion")
             logger.info(f"Created local test file: {file_path}")
        else:
             logger.info("Using S3 storage, skipping physical file creation for safety, but will test delete call.")

        # 3. Add to FAISS (Mocking index_one or using dummy data)
        # We need the material to actually exist for rag.index_one
        try:
            # We need a real PDF for extract_text to work in index_one...
            # Let's just bypass index_one and manually add to metadata to test removal
            rag._index_docs[12345] = {"material_id": material_id, "title": title, "chunk": "test chunk"}
            logger.info(f"Manually injected material {material_id} into FAISS metadata.")
        except Exception as e:
            logger.error(f"FAISS injection failed: {e}")

        # 4. Perform Deletion
        logger.info(f"--- TRIGGERING DELETION ---")
        await material_service.delete_material(material_id, db)
        await db.commit()

        # 5. Verify DB
        result = await db.execute(select(Material).where(Material.id == material_id))
        updated_mat = result.scalar_one_or_none()
        logger.info(f"DB is_approved: {updated_mat.is_approved} (Expected: False)")

        # 6. Verify Storage
        if file_path and os.path.exists(file_path):
            logger.error(f"FAIL: Local file still exists at {file_path}")
        elif file_path:
            logger.info(f"SUCCESS: Local file removed.")
        
        # 7. Verify FAISS
        ids_in_rag = [k for k, v in rag._index_docs.items() if v.get("material_id") == material_id]
        if ids_in_rag:
            logger.error(f"FAIL: Material {material_id} still found in FAISS metadata.")
        else:
            logger.info(f"SUCCESS: Material removed from FAISS metadata.")

if __name__ == "__main__":
    asyncio.run(test_deletion_flow())
