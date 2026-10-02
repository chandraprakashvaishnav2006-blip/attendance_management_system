import io
from typing import Any

import pandas as pd
from fastapi import HTTPException, status


def parse_students_csv(file_bytes: bytes) -> list[dict[str, Any]]:
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse CSV file: {e!s}"
        )

    required_cols = {"name", "roll_no", "email"}
    cols_clean = {c.lower().strip(): c for c in df.columns}
    
    missing = required_cols - set(cols_clean.keys())
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required columns in CSV: {', '.join(missing)}. Required: name, roll_no, email."
        )

    # Standardize columns
    records = []
    for _, row in df.iterrows():
        records.append({
            "name": str(row[cols_clean["name"]]).strip(),
            "roll_no": str(row[cols_clean["roll_no"]]).strip(),
            "email": str(row[cols_clean["email"]]).strip(),
            "section": str(row[cols_clean["section"]]).strip() if "section" in cols_clean and pd.notna(row[cols_clean["section"]]) else "A",
            "phone": str(row[cols_clean["phone"]]).strip() if "phone" in cols_clean and pd.notna(row[cols_clean["phone"]]) else None,
            "gender": str(row[cols_clean["gender"]]).strip() if "gender" in cols_clean and pd.notna(row[cols_clean["gender"]]) else None,
            "address": str(row[cols_clean["address"]]).strip() if "address" in cols_clean and pd.notna(row[cols_clean["address"]]) else None,
            "status": str(row[cols_clean["status"]]).strip() if "status" in cols_clean and pd.notna(row[cols_clean["status"]]) else "active",
        })
    return records

def export_to_csv(data: list[dict[str, Any]]) -> str:
    if not data:
        return ""
    df = pd.DataFrame(data)
    return df.to_csv(index=False)
