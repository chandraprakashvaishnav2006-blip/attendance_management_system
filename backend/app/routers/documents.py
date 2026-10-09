import mimetypes
import os
import re
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.communication import PDFDocument

router = APIRouter(prefix="/documents", tags=["Documents"])


def get_safe_filename(doc: PDFDocument) -> str:
    orig_ext = os.path.splitext(doc.file_path)[1] if doc.file_path else ".pdf"
    if not orig_ext:
        orig_ext = ".pdf"
    
    # Clean doc title
    safe_title = re.sub(r'[^a-zA-Z0-9_\-\.\(\) ]', '_', doc.title or 'document').strip()
    if not safe_title:
        safe_title = "document"
    
    if not safe_title.lower().endswith(orig_ext.lower()):
        safe_title = f"{safe_title}{orig_ext}"
    return safe_title


def get_document_source(doc: PDFDocument) -> tuple[str | None, bytes | None, str]:
    """
    Returns (disk_path_if_valid, content_bytes_if_db, mime_type)
    """
    mime_type = doc.mime_type or mimetypes.guess_type(doc.file_path)[0] or "application/pdf"
    
    # 1. Resolve disk path
    clean_rel = doc.file_path.lstrip("/").replace("\\", "/")
    # Remove leading 'uploads/' if present to avoid duplicate
    if clean_rel.startswith("uploads/"):
        clean_rel = clean_rel[len("uploads/"):]
    disk_path = os.path.join(settings.UPLOAD_DIR, clean_rel)

    if os.path.isfile(disk_path) and os.path.getsize(disk_path) > 0:
        return disk_path, None, mime_type

    # 2. Check if file_data is stored in database
    if doc.file_data and len(doc.file_data) > 0:
        # Cache to disk for high performance if possible
        try:
            os.makedirs(os.path.dirname(disk_path), exist_ok=True)
            with open(disk_path, "wb") as f:
                f.write(doc.file_data)
            return disk_path, None, mime_type
        except Exception:
            # If disk is read-only / ephemeral container, return bytes directly
            return None, doc.file_data, mime_type

    return None, None, mime_type


@router.get("/{doc_id}/view")
def view_document(doc_id: int, db: Session = Depends(get_db)):
    """
    Renders/views a document inline in the browser (PDF viewer, image viewer, etc.).
    """
    doc = db.query(PDFDocument).filter(PDFDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    safe_filename = get_safe_filename(doc)
    disk_path, doc_bytes, mime_type = get_document_source(doc)

    # Encode filename for RFC 5987 Content-Disposition
    ascii_filename = re.sub(r'[^\x20-\x7E]', '_', safe_filename)
    encoded_filename = urllib.parse.quote(safe_filename)
    content_disp = f'inline; filename="{ascii_filename}"; filename*=UTF-8\'\'{encoded_filename}'

    headers = {
        "Content-Disposition": content_disp,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
        "Cache-Control": "public, max-age=3600",
    }

    if disk_path:
        return FileResponse(
            path=disk_path,
            media_type=mime_type,
            headers=headers
        )
    elif doc_bytes:
        return Response(
            content=doc_bytes,
            media_type=mime_type,
            headers=headers
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file data is not available on server or database."
        )


@router.get("/{doc_id}/download")
def download_document(doc_id: int, db: Session = Depends(get_db)):
    """
    Downloads a document as an attachment and increments download counter.
    """
    doc = db.query(PDFDocument).filter(PDFDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Increment download counter
    doc.download_count = (doc.download_count or 0) + 1
    db.commit()

    safe_filename = get_safe_filename(doc)
    disk_path, doc_bytes, mime_type = get_document_source(doc)

    ascii_filename = re.sub(r'[^\x20-\x7E]', '_', safe_filename)
    encoded_filename = urllib.parse.quote(safe_filename)
    content_disp = f'attachment; filename="{ascii_filename}"; filename*=UTF-8\'\'{encoded_filename}'

    headers = {
        "Content-Disposition": content_disp,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
    }

    if disk_path:
        return FileResponse(
            path=disk_path,
            media_type=mime_type,
            filename=safe_filename,
            headers=headers
        )
    elif doc_bytes:
        return Response(
            content=doc_bytes,
            media_type=mime_type,
            headers=headers
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file data is not available on server or database."
        )
