"""
app/utils/file_handler.py
──────────────────────────
Storage abstraction: local disk now, swappable to S3 later.
Only the LocalStorage and S3Storage classes need to change —
all callers use the `storage` singleton via the same interface.
"""

import os
import uuid
from typing import Protocol

import aiofiles
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

# ── Allowed MIME types ────────────────────────────────────────────────────────
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/msword",  # .doc
    "text/plain",
}

CONVERTIBLE_EXTENSIONS = {".docx", ".doc", ".txt"}


def _validate_file(file: UploadFile, allowed_types: set = None) -> None:
    """Raise HTTP 400/413 for unsupported file types or oversized files."""
    valid_types = allowed_types if allowed_types is not None else ALLOWED_CONTENT_TYPES
    if file.content_type not in valid_types:
        type_str = ", ".join(valid_types)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{file.content_type}' is not allowed for this upload. Allowed: {type_str}",
        )


def _normalize_content_type(filename: str, existing_type: str = None) -> str:
    """
    Returns a normalized MIME type.
    - If it's a .pdf or reported as application/pdf, force application/pdf.
    - Fallback to provided existing_type if valid.
    - Otherwise guess from extension or use octet-stream.
    """
    import mimetypes
    
    # Normalize inputs
    fn_lower = filename.lower() if filename else ""
    existing_lower = existing_type.lower() if existing_type else ""

    # 1. Force PDF if extension or reported type matches
    if fn_lower.endswith(".pdf") or existing_lower == "application/pdf":
        return "application/pdf"
    
    # 2. Check existing type if it's not generic
    if existing_type and existing_lower != "application/octet-stream":
        return existing_type

    # 3. Guess from name/extension
    guessed, _ = mimetypes.guess_type(filename)
    if guessed:
        return guessed

    # 4. Fallback for common types if guessing fails but extension is known
    if fn_lower.endswith(".docx"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if fn_lower.endswith(".doc"):
        return "application/msword"

    return "application/octet-stream"


class StorageBackend(Protocol):
    """Interface every storage backend must implement."""

    async def upload_file(self, file: UploadFile, folder: str = "", allowed_types: set = None) -> dict:
        """Save the file and return dict with file_key, file_url, and sizes."""
        ...

    def get_url(self, file_key: str, is_download: bool = False, filename: str = None) -> str:
        """Return a public or presigned URL for the given key."""
        ...

    async def exists(self, file_key: str) -> bool:
        """Return True if the file exists in storage."""
        ...

    async def delete_file(self, file_key: str) -> bool:
        """Physically remove the file from storage."""
        ...

    async def get_file_stream(self, file_key: str) -> dict:
        """
        Return a dictionary with:
        - stream: An async iterator or file-like object for reading
        - content_type: The MIME type
        - content_length: Total size in bytes
        """
        ...


class LocalStorage:
    """
    Saves files to the local filesystem under UPLOAD_DIR.
    """

    def __init__(self, base_dir: str) -> None:
        self.base_dir = base_dir

    async def upload_file(self, file: UploadFile, folder: str = "", allowed_types: set = None) -> dict:
        _validate_file(file, allowed_types)

        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file upload detected.")
        if len(content) > settings.max_file_size_bytes:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large.")

        dest_dir = os.path.join(self.base_dir, folder)
        os.makedirs(dest_dir, exist_ok=True)

        unique_name = f"{uuid.uuid4()}_{file.filename}"
        dest_path = os.path.join(dest_dir, unique_name).replace('\\', '/')

        async with aiofiles.open(dest_path, "wb") as f:
            await f.write(content)

        # In local storage, the key is the relative path, and URL is the API route
        # Ensure forward slashes for clean URLs
        file_key = f"{folder}/{unique_name}".lstrip('/')
        file_url = f"/api/v1/uploads/{file_key}"

        return {
            "file_key":     file_key,
            "file_url":     file_url,
            "file_name":    file.filename,
            "size":         len(content),
            "content_type": file.content_type,
            "path":         dest_path, # legacy support
        }

    def get_url(self, file_key: str, is_download: bool = False, filename: str = None) -> str:
        if not file_key:
            return None
        if file_key.startswith('http') or file_key.startswith('/api/v1/uploads'):
            return file_key
        # Ensure it's treated correctly as relative
        return f"/api/v1/uploads/{file_key.lstrip('/')}"

    async def exists(self, file_key: str) -> bool:
        if not file_key:
            return False
        # Remove URL prefix if present locally
        clean_key = file_key.replace("/api/v1/uploads/", "").lstrip("/")
        full_path = os.path.join(self.base_dir, clean_key).replace('\\', '/')
        return os.path.exists(full_path)

    async def delete_file(self, file_key: str) -> bool:
        """Remove file from local disk."""
        if not file_key:
            return False
        try:
            path = os.path.join(self.base_dir, file_key.lstrip('/')).replace('\\', '/')
            if os.path.exists(path):
                os.remove(path)
                return True
            return False
        except Exception:
            return False

    async def get_file_stream(self, file_key: str) -> dict:
        """Return a stream for a local file."""
        clean_key = file_key.replace("/api/v1/uploads/", "").lstrip("/")
        full_path = os.path.join(self.base_dir, clean_key).replace('\\', '/')
        
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="Local file not found.")

        content_length = os.path.getsize(full_path)
        content_type = _normalize_content_type(full_path)

        async def _iter():
            async with aiofiles.open(full_path, "rb") as f:
                while chunk := await f.read(1024 * 256):
                    yield chunk

        return {
            "stream": _iter(),
            "content_type": content_type,
            "content_length": content_length
        }


class S3Storage:
    """
    AWS S3 storage backend using boto3 (run in thread-pool via asyncio.to_thread).
    """

    def __init__(self) -> None:
        import boto3
        from botocore.config import Config
        self._bucket = settings.AWS_BUCKET_NAME
        self._region = settings.AWS_REGION
        self._client = boto3.client(
            "s3",
            region_name=self._region,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "virtual"}
            )
        )

    async def upload_file(self, file: UploadFile, folder: str = "", allowed_types: set = None) -> dict:
        import asyncio

        _validate_file(file, allowed_types)

        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file upload detected.")
        if len(content) > settings.max_file_size_bytes:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large.")

        unique_name = f"{uuid.uuid4()}_{file.filename}"
        file_key = f"{folder}/{unique_name}".lstrip("/")

        def _upload() -> None:
            import io
            self._client.upload_fileobj(
                io.BytesIO(content),
                self._bucket,
                file_key,
                ExtraArgs={"ContentType": file.content_type},
            )

        await asyncio.to_thread(_upload)

        file_url = f"https://{self._bucket}.s3.{self._region}.amazonaws.com/{file_key}"

        return {
            "file_key":     file_key,
            "file_url":     file_url,
            "file_name":    file.filename,
            "size":         len(content),
            "content_type": file.content_type,
            "path":         file_url, # fall back for existing models expecting path to be complete URL
        }

    def get_url(self, file_key: str, is_download: bool = False, filename: str | None = None) -> str:
        if not file_key:
            return None
            
        # If it's a raw S3 HTTPS URL, extract the key
        if file_key.startswith("http"):
            if ".amazonaws.com/" in file_key:
                # Key is everything after .amazonaws.com/, but strip query params if any
                key = file_key.split(".amazonaws.com/")[-1].split('?')[0]
            else:
                return file_key # External URL, leave alone
        else:
            # It's an internal key or path, strip leading slash
            key = file_key.lstrip('/')
            if key.startswith('s3://'):
                key = key.split(f"s3://{self._bucket}/")[-1]

        params = {"Bucket": self._bucket, "Key": key}
        
        if is_download:
            download_name = filename or os.path.basename(key)
            # Minimal sanitization for Content-Disposition: remove quotes and backslashes
            safe_name = download_name.replace('"', '').replace('\\', '')
            params["ResponseContentDisposition"] = f'attachment; filename="{safe_name}"'

        return self._client.generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=86400 # 24 hours
        )

    async def exists(self, file_key: str) -> bool:
        """Check if object exists in S3 using head_object."""
        if not file_key:
            return False
            
        import asyncio
        from botocore.exceptions import ClientError
        
        # Extract key if it's a URL
        if file_key.startswith("http"):
            if ".amazonaws.com/" in file_key:
                key = file_key.split(".amazonaws.com/")[-1].split('?')[0]
            else:
                return True # Assume external URLs are valid/accessible for now
        else:
            key = file_key.lstrip("/")

        def _check():
            try:
                self._client.head_object(Bucket=self._bucket, Key=key)
                return True
            except ClientError:
                return False

        return await asyncio.to_thread(_check)

    async def delete_file(self, file_key: str) -> bool:
        """Remove object from S3 bucket."""
        if not file_key:
            return False
        try:
            import asyncio
            # If it's a raw S3 HTTPS URL, extract the key
            if file_key.startswith("http"):
                if ".amazonaws.com/" in file_key:
                    key = file_key.split(".amazonaws.com/")[-1].split('?')[0]
                else:
                    return False # External URL
            else:
                key = file_key.lstrip('/')
                if key.startswith('s3://'):
                    key = key.split(f"s3://{self._bucket}/")[-1]

            def _delete() -> None:
                self._client.delete_object(Bucket=self._bucket, Key=key)

            await asyncio.to_thread(_delete)
            return True
        except Exception:
            return False

    async def get_file_stream(self, file_key: str) -> dict:
        """Stream an object directly from S3."""
        import asyncio
        from botocore.exceptions import ClientError
        
        # Extract key
        if file_key.startswith("http"):
            if ".amazonaws.com/" in file_key:
                key = file_key.split(".amazonaws.com/")[-1].split('?')[0]
            else:
                raise HTTPException(status_code=400, detail="Cannot stream from external URL.")
        else:
            key = file_key.lstrip("/")

        def _get():
            try:
                return self._client.get_object(Bucket=self._bucket, Key=key)
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code')
                if error_code == 'NoSuchKey' or error_code == '404':
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND, 
                        detail=f"FILE_NOT_FOUND: The requested material '{key}' does not exist in storage."
                    )
                if error_code == 'AccessDenied' or error_code == '403':
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN, 
                        detail="ACCESS_DENIED: Access to this material is restricted by storage policy."
                    )
                # Log the specific error to help with diagnostics
                print(f"DEBUG: S3 Service Error [{error_code}]: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"STORAGE_SERVICE_ERROR: {error_code or 'Unknown error'}"
                )

        response = await asyncio.to_thread(_get)
        content_type = _normalize_content_type(key, response.get('ContentType'))

        async def _iter():
            for chunk in response['Body']:
                yield chunk

        return {
            "stream": _iter(),
            "content_type": content_type,
            "content_length": response['ContentLength']
        }


def get_storage() -> StorageBackend:
    if settings.STORAGE_BACKEND == "s3":
        try:
            return S3Storage()
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error(f"S3 init failed: {exc}")
    return LocalStorage(base_dir=settings.UPLOAD_DIR)

# Expose global storage instance (and the factory function per requirements)
storage: StorageBackend = get_storage()

