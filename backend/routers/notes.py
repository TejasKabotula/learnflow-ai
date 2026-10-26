from fastapi import APIRouter, Depends, HTTPException, status
from core.database import get_database
from core.auth import get_current_user
from schemas.note import NoteCreate, NoteUpdate, NoteResponse
from datetime import datetime
from bson import ObjectId
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=List[NoteResponse])
async def get_all_notes(
    playlist_id: Optional[str] = None,
    q: Optional[str] = None,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if playlist_id:
        query["playlist_id"] = playlist_id
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"content": {"$regex": q, "$options": "i"}}
        ]
        
    cursor = db["notes"].find(query).sort("updated_at", -1)
    notes = await cursor.to_list(length=200)
    for n in notes:
        n["id"] = str(n["_id"])
        if "title" not in n or not n["title"]:
            n["title"] = "Untitled Note"
    return notes

@router.post("/", response_model=NoteResponse)
async def create_standalone_note(
    note: NoteCreate,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    note_dict = {
        "title": note.title or "Untitled Note",
        "content": note.content,
        "timestamp": note.timestamp or 0,
        "user_id": current_user["id"],
        "playlist_id": note.playlist_id,
        "video_id": note.video_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db["notes"].insert_one(note_dict)
    note_dict["id"] = str(result.inserted_id)
    return note_dict

@router.get("/detail/{note_id}", response_model=NoteResponse)
async def get_note_by_id(
    note_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    try:
        obj_id = ObjectId(note_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid note ID format")

    note = await db["notes"].find_one({"_id": obj_id, "user_id": current_user["id"]})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note["id"] = str(note["_id"])
    if "title" not in note or not note["title"]:
        note["title"] = "Untitled Note"
    return note

@router.put("/{note_id}", response_model=NoteResponse)
async def update_note_by_id(
    note_id: str,
    note_update: NoteUpdate,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    try:
        obj_id = ObjectId(note_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid note ID format")

    update_fields = {"updated_at": datetime.utcnow()}
    if note_update.title is not None:
        update_fields["title"] = note_update.title
    if note_update.content is not None:
        update_fields["content"] = note_update.content

    result = await db["notes"].find_one_and_update(
        {"_id": obj_id, "user_id": current_user["id"]},
        {"$set": update_fields},
        return_document=True
    )

    if not result:
        raise HTTPException(status_code=404, detail="Note not found")

    result["id"] = str(result["_id"])
    if "title" not in result or not result["title"]:
        result["title"] = "Untitled Note"
    return result

@router.delete("/{note_id}")
async def delete_note(
    note_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    try:
        obj_id = ObjectId(note_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid note ID format")

    result = await db["notes"].delete_one({"_id": obj_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")

    return {"message": "Note deleted successfully"}

# Compatibility routes for playlist video notes
@router.get("/{playlist_id}/{video_id}", response_model=NoteResponse)
async def get_video_note(
    playlist_id: str,
    video_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    note = await db["notes"].find_one({
        "user_id": current_user["id"],
        "playlist_id": playlist_id,
        "video_id": video_id
    })
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    note["id"] = str(note["_id"])
    if "title" not in note or not note["title"]:
        note["title"] = f"Lesson Note ({video_id})"
    return note

@router.post("/{playlist_id}/{video_id}", response_model=NoteResponse)
async def create_or_update_video_note(
    playlist_id: str,
    video_id: str,
    note: NoteCreate,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    existing_note = await db["notes"].find_one({
        "user_id": current_user["id"],
        "playlist_id": playlist_id,
        "video_id": video_id
    })
    
    if existing_note:
        await db["notes"].update_one(
            {"_id": existing_note["_id"]},
            {"$set": {
                "title": note.title or existing_note.get("title") or f"Lesson Note ({video_id})",
                "content": note.content, 
                "timestamp": note.timestamp or 0,
                "updated_at": datetime.utcnow()
            }}
        )
        updated_note = await db["notes"].find_one({"_id": existing_note["_id"]})
        updated_note["id"] = str(updated_note["_id"])
        return updated_note
    else:
        note_dict = {
            "title": note.title or f"Lesson Note ({video_id})",
            "content": note.content,
            "timestamp": note.timestamp or 0,
            "user_id": current_user["id"],
            "playlist_id": playlist_id,
            "video_id": video_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await db["notes"].insert_one(note_dict)
        note_dict["id"] = str(result.inserted_id)
        return note_dict
