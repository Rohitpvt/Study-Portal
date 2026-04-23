"""
app/services/integrity_reconciliation_service.py
─────────────────────────────────────────────────
Background logic for scanning study materials for physical file integrity.
Supports local and S3 storage.
"""

import logging
import asyncio
from datetime import datetime
from typing import List, Optional

import fitz  # PyMuPDF for PDF corruption checks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Material, MaterialIntegrityStatus
from app.models.audit import AuditLog
from app.utils.file_handler import get_storage
from app.services import material_service

logger = logging.getLogger("integrity_reconciliation")

async def run_global_reconciliation(db: AsyncSession):
    """
    Scans all approved materials and verifies their physical storage status.
    """
    logger.info("[RECONCILIATION] Starting global integrity scan...")
    
    # 1. Fetch all approved materials
    result = await db.execute(select(Material).where(Material.is_approved == True))
    materials = result.scalars().all()
    
    storage = get_storage()
    total = len(materials)
    issues_found = 0
    
    for i, material in enumerate(materials):
        if i % 10 == 0:
            logger.info(f"[RECONCILIATION] Progress: {i}/{total} materials scanned.")
            
        old_status = material.integrity_status
        
        # 2. Reconcile this specific material
        new_status, message = await reconcile_material_integrity(material, storage)
        
        # 3. Update DB if changed
        if new_status != old_status or material.integrity_message != message:
            await material_service.update_material_integrity(
                material.id, new_status, message, db
            )
            
            # 4. Notify Admin (Audit Log) on newly detected issues
            if new_status != MaterialIntegrityStatus.available and old_status == MaterialIntegrityStatus.available:
                await log_integrity_issue(material, new_status, message, db)
                issues_found += 1
                
        # Small sleep to prevent CPU spikes or rate limits
        await asyncio.sleep(0.1)

    await db.commit()
    logger.info(f"[RECONCILIATION] Scan complete. Total: {total}, New Issues: {issues_found}")


async def reconcile_material_integrity(material: Material, storage) -> tuple[MaterialIntegrityStatus, Optional[str]]:
    """
    Perform deep check: existence -> readability -> corruption.
    """
    key = material.file_key or material.file_url or material.file_path
    
    if not key:
        return MaterialIntegrityStatus.invalid_metadata, "Missing storage reference (key/path/url)"

    # A. Check Existence
    try:
        exists = await storage.exists(key)
        if not exists:
            return MaterialIntegrityStatus.missing_file, "File not found in storage backend."
    except Exception as e:
        logger.error(f"Storage check failed for {material.id}: {e}")
        return MaterialIntegrityStatus.pending, f"Storage service unreachable: {str(e)}"

    # B. Check Readability / Corruption (PDF specific)
    if material.file_type == "application/pdf" or material.file_name.lower().endswith(".pdf"):
        try:
            # We don't need the whole file, just a stream to check headers and basic structure
            file_info = await storage.get_file_stream(key)
            
            # Read full stream for structural check (fitz needs the whole file to find the trailer)
            content = b""
            async for chunk in file_info["stream"]:
                content += chunk
            
            if not content:
                return MaterialIntegrityStatus.corrupted_file, "File is empty (0 bytes)."

            # Perform PDF structural check using PyMuPDF
            try:
                # fitz.open(stream=...) expects the entire file content
                doc = fitz.open(stream=content, filetype="pdf")
                if doc.is_closed or doc.page_count == 0:
                    return MaterialIntegrityStatus.corrupted_file, "PDF has no pages or is structurally invalid."
                doc.close()
            except Exception as pdf_err:
                return MaterialIntegrityStatus.corrupted_file, f"PDF structural error: {str(pdf_err)}"
                
        except Exception as e:
            logger.warning(f"Corruption check failed for {material.id}: {e}")
            # If we can't even get the stream, it's missing or inaccessible
            if "not found" in str(e).lower():
                return MaterialIntegrityStatus.missing_file, "File reported as missing during stream test."
            return MaterialIntegrityStatus.corrupted_file, f"Read failure: {str(e)}"

    return MaterialIntegrityStatus.available, "System verified: File is healthy and accessible."


async def log_integrity_issue(material: Material, status: MaterialIntegrityStatus, message: str, db: AsyncSession):
    """Adds a critical alert to the audit logs for admins to see."""
    from app.models.base import generate_uuid
    alert = AuditLog(
        id=generate_uuid(),
        user_id=material.uploader_id,
        action="INTEGRITY_ALERT",
        description=f"CRITICAL: Material '{material.title}' (ID: {material.id}) failed integrity check. Status: {status.value}. Reason: {message}"
    )
    db.add(alert)
    logger.warning(f"[INTEGRITY_ALERT] {material.title} -> {status.value}")
