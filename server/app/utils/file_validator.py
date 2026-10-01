import mimetypes
import os
import uuid

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

# Disallowed dangerous executable and script extensions
DISALLOWED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".vbs", ".js", ".mjs", ".scr",
    ".msi", ".dll", ".com", ".pif", ".application", ".gadget"
}

# Explicit MIME mappings for common academic office and archive formats
MIME_MAP = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".ppt": "application/vnd.ms-powerpoint",
    ".csv": "text/csv",
    ".txt": "text/plain",
    ".rtf": "application/rtf",
    ".md": "text/markdown",
    ".zip": "application/zip",
    ".rar": "application/x-rar-compressed",
    ".7z": "application/x-7z-compressed",
    ".tar": "application/x-tar",
    ".gz": "application/gzip",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
}


def validate_and_save_file(file: UploadFile, subfolder: str = "materials") -> tuple[str, int, str, str]:
    """
    Validates any document or folder archive (rejects dangerous executable files)
    and saves to uploads directory.
    Returns: (rel_path, file_size, mime_type, original_filename)
    """
    original_name = file.filename or "uploaded_document"
    _, ext = os.path.splitext(original_name)
    ext_lower = ext.lower()

    if ext_lower in DISALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security alert: Executable files ({ext_lower}) are not allowed for upload."
        )

    # Read content to check size
    content = file.file.read()
    file_size = len(content)

    max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # Detect MIME type
    mime_type = MIME_MAP.get(ext_lower)
    if not mime_type:
        guessed_type, _ = mimetypes.guess_type(original_name)
        mime_type = guessed_type or "application/octet-stream"

    # Create destination directory
    target_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(target_dir, exist_ok=True)

    # Generate safe unique filename
    unique_suffix = uuid.uuid4().hex[:10]
    safe_basename = os.path.splitext(os.path.basename(original_name))[0]
    safe_basename = "".join(c for c in safe_basename if c.isalnum() or c in ("-", "_")).strip() or "document"
    unique_filename = f"{safe_basename}_{unique_suffix}{ext_lower}"
    file_path = os.path.join(target_dir, unique_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Reset file cursor just in case
    file.file.seek(0)

    # Return relative URL/path
    rel_path = f"/uploads/{subfolder}/{unique_filename}"
    return rel_path, file_size, mime_type, original_name


# Backward compatibility alias
def validate_and_save_pdf(file: UploadFile, subfolder: str = "materials") -> tuple[str, int]:
    rel_path, file_size, _, _ = validate_and_save_file(file, subfolder=subfolder)
    return rel_path, file_size
