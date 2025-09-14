from fastapi import FastAPI

app = FastAPI(title="Monopereo API", version="1.0")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Monopereo API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
