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
    Returns (disk_path_if_valid, content_bytes_if_db, mime_type)
    Checks multiple possible disk directories and database fallback.
    """
    mime_type = doc.mime_type or mimetypes.guess_type(doc.file_path or "")[0] or "application/pdf"
    
    clean_rel = (doc.file_path or "").lstrip("/").replace("\\", "/")
    if clean_rel.startswith("uploads/"):
        clean_rel = clean_rel[len("uploads/"):]
    filename = os.path.basename(clean_rel)

    # 1. Check multiple candidate disk locations
    candidate_dirs = [
        settings.UPLOAD_DIR,
        os.path.join(settings.UPLOAD_DIR, "materials"),
        os.path.join(os.getcwd(), "uploads"),
        os.path.join(os.getcwd(), "uploads", "materials"),
        os.path.join(os.getcwd(), "backend", "uploads"),
        os.path.join(os.getcwd(), "backend", "uploads", "materials"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", "materials"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "uploads"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "uploads", "materials"),
    ]

    for cdir in candidate_dirs:
        for fname in [clean_rel, filename]:
            p = os.path.normpath(os.path.join(cdir, fname))
            if os.path.isfile(p) and os.path.getsize(p) > 0:
                # If DB doesn't have file_data cached, load it into DB for cloud resilience
                if (not doc.file_data or len(doc.file_data) == 0) and db:
                    try:
                        with open(p, "rb") as f:
                            doc.file_data = f.read()
                        doc.file_size = len(doc.file_data)
                        db.commit()
                    except Exception:
                        pass
                return p, None, mime_type

    # 2. Check if file_data is stored in database
    if doc.file_data and len(doc.file_data) > 0:
        # Cache to disk for high performance if possible
        try:
            target_path = os.path.join(settings.UPLOAD_DIR, clean_rel)
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with open(target_path, "wb") as f:
                f.write(doc.file_data)
            return target_path, None, mime_type
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
    disk_path, doc_bytes, mime_type = get_document_source(doc, db)

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
    disk_path, doc_bytes, mime_type = get_document_source(doc, db)

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
