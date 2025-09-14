from fastapi import FastAPI
from .routes import users, items

app = FastAPI(title="Monopereo API", version="1.0")

app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(items.router, prefix="/items", tags=["items"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Monopereo API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
