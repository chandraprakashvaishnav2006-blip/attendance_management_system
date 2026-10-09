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


def get_document_source(doc: PDFDocument, db: Session | None = None) -> tuple[str | None, bytes | None, str]:
    """
    Returns (disk_path_if_valid, content_bytes_if_db, mime_type).
    Prioritizes file_data directly from PostgreSQL database.
    """
    mime_type = doc.mime_type or mimetypes.guess_type(doc.file_path or "")[0] or "application/pdf"

    # 1. Direct Database retrieval (cloud/PostgreSQL resilience)
    if doc.file_data and len(doc.file_data) > 0:
        return None, doc.file_data, mime_type

    clean_rel = (doc.file_path or "").lstrip("/").replace("\\", "/")
    clean_rel = clean_rel.removeprefix("uploads/")
    filename = os.path.basename(clean_rel)

    # 2. Check candidate disk locations if DB does not yet have it
    candidate_dirs = [
        settings.UPLOAD_DIR,
        os.path.join(settings.UPLOAD_DIR, "materials"),
        os.path.join(os.getcwd(), "uploads"),
        os.path.join(os.getcwd(), "uploads", "materials"),
        os.path.join(os.getcwd(), "backend", "uploads"),
        os.path.join(os.getcwd(), "backend", "uploads", "materials"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", "materials"),
    ]

    for cdir in candidate_dirs:
        for fname in [clean_rel, filename]:
            p = os.path.normpath(os.path.join(cdir, fname))
            if os.path.isfile(p) and os.path.getsize(p) > 0:
                try:
                    with open(p, "rb") as f:
                        file_bytes = f.read()
                    if db and (not doc.file_data or len(doc.file_data) == 0):
                        doc.file_data = file_bytes
                        doc.file_size = len(file_bytes)
                        db.commit()
                    return None, file_bytes, mime_type
                except Exception:
                    return p, None, mime_type

    return None, None, mime_type


@router.get("/{doc_id}/view")
def view_document(doc_id: int, db: Session = Depends(get_db)):
    """
    Renders/views a document inline in the browser directly through database or disk.
    """
    doc = db.query(PDFDocument).filter(PDFDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    safe_filename = get_safe_filename(doc)
    disk_path, doc_bytes, mime_type = get_document_source(doc, db)

    ascii_filename = re.sub(r'[^\x20-\x7E]', '_', safe_filename)
    encoded_filename = urllib.parse.quote(safe_filename)
    content_disp = f'inline; filename="{ascii_filename}"; filename*=UTF-8\'\'{encoded_filename}'

    headers = {
        "Content-Disposition": content_disp,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
        "Cache-Control": "public, max-age=3600",
    }
    if doc_bytes:
        headers["Content-Length"] = str(len(doc_bytes))
        return Response(content=doc_bytes, media_type=mime_type, headers=headers)
    elif disk_path:
        return FileResponse(path=disk_path, media_type=mime_type, headers=headers)
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file data is not available on server or database."
        )


@router.get("/{doc_id}/download")
def download_document(doc_id: int, db: Session = Depends(get_db)):
    """
    Downloads a document as an attachment directly through database and increments download counter.
    """
    doc = db.query(PDFDocument).filter(PDFDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Increment download counter
    doc.download_count = (doc.download_count or 0) + 1
    db.commit()

    safe_filename = get_safe_filename(doc)
    disk_path, doc_bytes, mime_type = get_document_source(doc, db)

    ascii_filename = re.sub(r'[^\x20-\x7E]', '_', safe_filename)
    encoded_filename = urllib.parse.quote(safe_filename)
    content_disp = f'attachment; filename="{ascii_filename}"; filename*=UTF-8\'\'{encoded_filename}'

    headers = {
        "Content-Disposition": content_disp,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
    }

    if doc_bytes:
        headers["Content-Length"] = str(len(doc_bytes))
        return Response(content=doc_bytes, media_type=mime_type, headers=headers)
    elif disk_path:
        return FileResponse(path=disk_path, media_type=mime_type, filename=safe_filename, headers=headers)
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file data is not available on server or database."
        )
