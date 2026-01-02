from fastapi import APIRouter, UploadFile, File

router = APIRouter(
    prefix="/api/upload",
    tags=["upload"]
)

@router.post("/quiz")
async def upload_quiz(file: UploadFile = File(...)):
    return {"filename": file.filename, "status": "uploaded"}
