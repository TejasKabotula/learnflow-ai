from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from core.database import get_database
from core.security import verify_password, get_password_hash, create_access_token
from core.auth import get_current_user
from schemas.user import UserCreate, UserResponse, Token, UserProfileUpdate, PasswordChangeRequest
from datetime import datetime
from bson import ObjectId

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db = Depends(get_database)):
    # Check if user exists
    existing_user = await db["users"].find_one({"email": user.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user.password)
    
    # Create user document
    user_dict = {
        "email": user.email.lower(),
        "full_name": user.full_name,
        "hashed_password": hashed_password,
        "preferences": {
            "theme": "dark",
            "daily_goal_minutes": 30,
            "quiz_question_count": 5,
            "auto_advance": True
        },
        "created_at": datetime.utcnow()
    }
    
    result = await db["users"].insert_one(user_dict)
    
    # Return user response
    return {
        "id": str(result.inserted_id),
        "email": user_dict["email"],
        "full_name": user_dict["full_name"],
        "preferences": user_dict["preferences"],
        "created_at": user_dict["created_at"]
    }

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_database)):
    # Find user by email
    user = await db["users"].find_one({"email": form_data.username.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(subject=user["email"])
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user.get("full_name"),
        "preferences": current_user.get("preferences") or {},
        "created_at": current_user["created_at"]
    }

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    data: UserProfileUpdate,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    update_fields = {}
    if data.full_name is not None:
        update_fields["full_name"] = data.full_name.strip()
    if data.preferences is not None:
        # Merge existing preferences
        existing_prefs = current_user.get("preferences") or {}
        existing_prefs.update(data.preferences)
        update_fields["preferences"] = existing_prefs

    if update_fields:
        await db["users"].update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": update_fields}
        )

    updated_user = await db["users"].find_one({"_id": ObjectId(current_user["id"])})
    return {
        "id": str(updated_user["_id"]),
        "email": updated_user["email"],
        "full_name": updated_user.get("full_name"),
        "preferences": updated_user.get("preferences") or {},
        "created_at": updated_user["created_at"]
    }

@router.post("/change-password")
async def change_password(
    data: PasswordChangeRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    if not verify_password(data.current_password, current_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")

    new_hash = get_password_hash(data.new_password)
    await db["users"].update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"hashed_password": new_hash}}
    )
    return {"message": "Password changed successfully"}
