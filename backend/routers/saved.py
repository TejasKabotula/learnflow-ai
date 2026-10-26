from fastapi import APIRouter, Depends, HTTPException, status
from core.database import get_database
from core.auth import get_current_user
from schemas.saved import SavedResourceCreate, SavedResourceResponse
from datetime import datetime
from bson import ObjectId
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=List[SavedResourceResponse])
async def get_saved_resources(
    resource_type: Optional[str] = None,
    q: Optional[str] = None,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if resource_type and resource_type.lower() != "all":
        query["type"] = resource_type.lower()
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"type": {"$regex": q, "$options": "i"}}
        ]
        
    cursor = db["saved_resources"].find(query).sort("created_at", -1)
    items = await cursor.to_list(length=100)
    for item in items:
        item["id"] = str(item["_id"])
    return items

@router.post("/", response_model=SavedResourceResponse)
async def save_resource(
    item: SavedResourceCreate,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    # Check for existing duplicate for this user
    existing_query = {
        "user_id": current_user["id"],
        "type": item.type.lower(),
        "title": item.title
    }
    if item.video_id:
        existing_query["video_id"] = item.video_id

    existing = await db["saved_resources"].find_one(existing_query)
    if existing:
        # Update existing
        await db["saved_resources"].update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "content": item.content,
                "metadata": item.metadata,
                "updated_at": datetime.utcnow()
            }}
        )
        existing["id"] = str(existing["_id"])
        existing["content"] = item.content
        existing["metadata"] = item.metadata
        return existing

    doc = {
        "user_id": current_user["id"],
        "title": item.title,
        "type": item.type.lower(),
        "content": item.content,
        "video_id": item.video_id,
        "playlist_id": item.playlist_id,
        "metadata": item.metadata or {},
        "created_at": datetime.utcnow()
    }
    result = await db["saved_resources"].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc

@router.get("/{saved_id}", response_model=SavedResourceResponse)
async def get_saved_resource(
    saved_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    try:
        obj_id = ObjectId(saved_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid resource ID format")

    item = await db["saved_resources"].find_one({"_id": obj_id, "user_id": current_user["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Saved resource not found")

    item["id"] = str(item["_id"])
    return item

@router.delete("/{saved_id}")
async def delete_saved_resource(
    saved_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    try:
        obj_id = ObjectId(saved_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid resource ID format")

    result = await db["saved_resources"].delete_one({"_id": obj_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved resource not found")

    return {"message": "Resource removed from library successfully"}
