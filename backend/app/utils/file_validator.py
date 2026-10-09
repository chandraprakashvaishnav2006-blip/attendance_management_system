import mimetypes
import os
import re
import uuid
import zipfile

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


def validate_and_save_file(file: UploadFile, subfolder: str = "materials") -> tuple[str, int, str, str, bytes]:
    """
    Validates any document or folder archive (rejects dangerous executable files)
    and saves to uploads directory.
    Returns: (rel_path, file_size, mime_type, original_filename, content_bytes)
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
    try:
        os.makedirs(target_dir, exist_ok=True)
    except Exception:
        pass

    # Generate safe unique filename
    unique_suffix = uuid.uuid4().hex[:10]
    safe_basename = os.path.splitext(os.path.basename(original_name))[0]
    safe_basename = "".join(c for c in safe_basename if c.isalnum() or c in ("-", "_")).strip() or "document"
    unique_filename = f"{safe_basename}_{unique_suffix}{ext_lower}"
    file_path = os.path.join(target_dir, unique_filename)

    try:
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception:
        pass

    # Reset file cursor just in case
    file.file.seek(0)

    # Return relative URL/path and binary content
    rel_path = f"/uploads/{subfolder}/{unique_filename}"
    return rel_path, file_size, mime_type, original_name, content


# Backward compatibility alias
def validate_and_save_pdf(file: UploadFile, subfolder: str = "materials") -> tuple[str, int]:
    rel_path, file_size, _, _, _ = validate_and_save_file(file, subfolder=subfolder)
    return rel_path, file_size


def save_files_or_folder_as_bundle(
    files: list[UploadFile],
    folder_name: str | None = None,
    subfolder: str = "announcements"
) -> tuple[str, int, str, str, bytes]:
    """
    Handles single file upload or folder/multiple-file upload.
    If multiple files or a folder name is supplied, packages them into a clean .zip archive.
    If a single file without a folder name is supplied, saves as the original file.
    Returns: (rel_path, file_size, mime_type, original_or_bundle_name, content_bytes)
    """
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files provided for upload.")

    target_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
    try:
        os.makedirs(target_dir, exist_ok=True)
    except Exception:
        pass
    max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    # Single file case and not designated as a folder
    if len(files) == 1 and not (folder_name and folder_name.strip()):
        return validate_and_save_file(files[0], subfolder=subfolder)

    # Folder or multiple files bundle -> zip archive
    total_size = 0
    file_contents = []

    for file_obj in files:
        original_name = file_obj.filename or "file"
        _, ext = os.path.splitext(original_name)
        ext_lower = ext.lower()

        if ext_lower in DISALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Security alert: Executable file ({original_name}) is not allowed."
            )

        data = file_obj.file.read()
        total_size += len(data)
        if total_size > max_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total upload size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )
        file_contents.append((original_name, data))
        file_obj.file.seek(0)

    # Sanitize bundle name
    base_label = folder_name.strip() if folder_name and folder_name.strip() else "announcement_materials"
    clean_label = re.sub(r'[^a-zA-Z0-9_\-]', '_', base_label).strip('_') or "bundle"
    unique_suffix = uuid.uuid4().hex[:10]
    zip_filename = f"{clean_label}_{unique_suffix}.zip"
    zip_path = os.path.join(target_dir, zip_filename)

    import io
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for orig_path, data in file_contents:
            clean_arcname = orig_path.replace("\\", "/").lstrip("/")
            parts = [p for p in clean_arcname.split("/") if p and p != ".."]
            arcname = "/".join(parts) if parts else os.path.basename(orig_path)
            zf.writestr(arcname, data)

    zip_bytes = zip_buffer.getvalue()
    try:
        with open(zip_path, "wb") as f:
            f.write(zip_bytes)
        final_size = os.path.getsize(zip_path)
    except Exception:
        final_size = len(zip_bytes)

    rel_path = f"/uploads/{subfolder}/{zip_filename}"
    display_name = f"{clean_label}.zip"

    return rel_path, final_size, "application/zip", display_name, zip_bytes

