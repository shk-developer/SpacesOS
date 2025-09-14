from fastapi import APIRouter, Depends, HTTPException
from typing import List
from ..schemas import models as schemas
from ..services import api_service

router = APIRouter()

@router.get("/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100):
    users = api_service.get_users(skip=skip, limit=limit)
    return users

@router.get("/{user_id}", response_model=schemas.User)
def read_user(user_id: int):
    db_user = api_service.get_user_by_id(user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
