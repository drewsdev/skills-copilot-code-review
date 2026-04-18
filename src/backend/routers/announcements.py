"""
Announcement endpoints for the High School Management System API
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query

from ..database import announcements_collection, teachers_collection

router = APIRouter(
    prefix="/announcements",
    tags=["announcements"]
)


def parse_datetime(value: Optional[str], field_name: str, required: bool = False) -> Optional[datetime]:
    """Parse and normalize ISO datetime strings to UTC."""
    if not value:
        if required:
            raise HTTPException(status_code=400, detail=f"{field_name} is required")
        return None

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be a valid ISO datetime"
        ) from exc

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(timezone.utc)


def ensure_signed_in(teacher_username: Optional[str]) -> Dict[str, Any]:
    if not teacher_username:
        raise HTTPException(status_code=401, detail="Authentication required for this action")

    teacher = teachers_collection.find_one({"_id": teacher_username})
    if not teacher:
        raise HTTPException(status_code=401, detail="Invalid teacher credentials")

    return teacher


def serialize_announcement(announcement: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(announcement["_id"]),
        "title": announcement["title"],
        "message": announcement["message"],
        "start_date": announcement.get("start_date").isoformat() if announcement.get("start_date") else None,
        "expiration_date": announcement["expiration_date"].isoformat(),
        "created_by": announcement.get("created_by", "")
    }


@router.get("", response_model=List[Dict[str, Any]])
def get_active_announcements() -> List[Dict[str, Any]]:
    """Return only currently active (non-expired) announcements."""
    now = datetime.now(timezone.utc)
    query = {
        "expiration_date": {"$gt": now},
        "$or": [
            {"start_date": {"$exists": False}},
            {"start_date": None},
            {"start_date": {"$lte": now}}
        ]
    }

    results = announcements_collection.find(query).sort("expiration_date", 1)
    return [serialize_announcement(item) for item in results]


@router.get("/manage", response_model=List[Dict[str, Any]])
def get_all_announcements_for_management(
    teacher_username: Optional[str] = Query(None)
) -> List[Dict[str, Any]]:
    """Return all announcements for signed-in users managing announcements."""
    ensure_signed_in(teacher_username)
    results = announcements_collection.find({}).sort("expiration_date", -1)
    return [serialize_announcement(item) for item in results]


@router.post("", response_model=Dict[str, Any])
def create_announcement(
    title: str,
    message: str,
    expiration_date: str,
    start_date: Optional[str] = None,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Create a new announcement. Expiration date is required."""
    teacher = ensure_signed_in(teacher_username)
    normalized_start = parse_datetime(start_date, "start_date")
    normalized_expiration = parse_datetime(expiration_date, "expiration_date", required=True)

    if normalized_start and normalized_start >= normalized_expiration:
        raise HTTPException(status_code=400, detail="start_date must be earlier than expiration_date")

    if not title.strip() or not message.strip():
        raise HTTPException(status_code=400, detail="title and message are required")

    doc = {
        "title": title.strip(),
        "message": message.strip(),
        "start_date": normalized_start,
        "expiration_date": normalized_expiration,
        "created_by": teacher["username"]
    }

    inserted = announcements_collection.insert_one(doc)
    created = announcements_collection.find_one({"_id": inserted.inserted_id})
    return serialize_announcement(created)


@router.put("/{announcement_id}", response_model=Dict[str, Any])
def update_announcement(
    announcement_id: str,
    title: str,
    message: str,
    expiration_date: str,
    start_date: Optional[str] = None,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Update an existing announcement."""
    ensure_signed_in(teacher_username)

    try:
        object_id = ObjectId(announcement_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid announcement id") from exc

    normalized_start = parse_datetime(start_date, "start_date")
    normalized_expiration = parse_datetime(expiration_date, "expiration_date", required=True)

    if normalized_start and normalized_start >= normalized_expiration:
        raise HTTPException(status_code=400, detail="start_date must be earlier than expiration_date")

    if not title.strip() or not message.strip():
        raise HTTPException(status_code=400, detail="title and message are required")

    update_result = announcements_collection.update_one(
        {"_id": object_id},
        {
            "$set": {
                "title": title.strip(),
                "message": message.strip(),
                "start_date": normalized_start,
                "expiration_date": normalized_expiration
            }
        }
    )

    if update_result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")

    updated = announcements_collection.find_one({"_id": object_id})
    return serialize_announcement(updated)


@router.delete("/{announcement_id}", response_model=Dict[str, str])
def delete_announcement(
    announcement_id: str,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, str]:
    """Delete an announcement by id."""
    ensure_signed_in(teacher_username)

    try:
        object_id = ObjectId(announcement_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid announcement id") from exc

    result = announcements_collection.delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")

    return {"message": "Announcement deleted"}
