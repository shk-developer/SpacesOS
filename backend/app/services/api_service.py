from typing import List, Dict

# Mock database
FAKE_USERS_DB: Dict[int, dict] = {
    1: {"id": 1, "username": "jules", "email": "jules@example.com", "is_active": True, "items": [
        {"id": 1, "name": "Super-Widget", "owner_id": 1, "description": "A widget that is super."},
        {"id": 2, "name": "Mega-Gadget", "owner_id": 1, "description": "A gadget of mega proportions."}
    ]},
    2: {"id": 2, "username": "alex", "email": "alex@example.com", "is_active": True, "items": [
        {"id": 3, "name": "Thingamajig", "owner_id": 2, "description": "What is this thing?"}
    ]},
}

FAKE_ITEMS_DB: Dict[int, dict] = {
    1: {"id": 1, "name": "Super-Widget", "owner_id": 1, "description": "A widget that is super."},
    2: {"id": 2, "name": "Mega-Gadget", "owner_id": 1, "description": "A gadget of mega proportions."},
    3: {"id": 3, "name": "Thingamajig", "owner_id": 2, "description": "What is this thing?"},
}

def get_users(skip: int = 0, limit: int = 100) -> List[dict]:
    return list(FAKE_USERS_DB.values())[skip: limit]

def get_user_by_id(user_id: int) -> dict | None:
    return FAKE_USERS_DB.get(user_id)

def get_items(skip: int = 0, limit: int = 100) -> List[dict]:
    return list(FAKE_ITEMS_DB.values())[skip: limit]

def get_user_items(user_id: int) -> List[dict]:
    user = FAKE_USERS_DB.get(user_id)
    if user:
        return user.get("items", [])
    return []
