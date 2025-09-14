from fastapi import APIRouter
from typing import List
from ..schemas import models as schemas
from ..services import api_service

router = APIRouter()

@router.get("/", response_model=List[schemas.Item])
def read_items(skip: int = 0, limit: int = 100):
    items = api_service.get_items(skip=skip, limit=limit)
    return items
