from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime

# Import our models and services
from models import (
    FileUploadRequest, FileUploadResponse, AnalysisRequest, AnalysisResponse,
    ChecklistResponse, CodeFixRequest, CodeFixResponse, ReviewUpdateRequest,
    ReviewResponse, ReportResponse, UploadedFile, ReviewSession, AnalysisResults,
    FileType, AnalysisStatus, ChecklistItem, FileAnalysis, ModifiedFile, CodeIssue
)
from services.file_processor import FileProcessor
from services.ai_service import AIService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize services
file_processor = FileProcessor()
ai_service = AIService()

# Create the main app without a prefix
app = FastAPI(title="CodeReview AI API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Session management
sessions_collection = db.review_sessions
files_collection = db.uploaded_files
analyses_collection = db.analysis_results


@api_router.get("/")
async def root():
    return {"message": "CodeReview AI Backend - Ready for action! 🚀"}

@api_router.post("/session/create")
async def create_session():
    """Create a new review session"""
    session_id = str(uuid.uuid4())
    session = ReviewSession(session_id=session_id)
    
    await sessions_collection.insert_one(session.dict())
    
    return {"session_id": session_id, "message": "Session created successfully"}

@api_router.post("/files/upload", response_model=FileUploadResponse)
async def upload_file(request: FileUploadRequest, session_id: str):
    """Upload a single file"""
    try:
        # Validate file
        is_valid, message = FileProcessor.validate_file(
            request.name, request.size, request.type
        )
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
        
        # Process file
        uploaded_file = await FileProcessor.process_uploaded_file(
            request.name, request.content, request.type, 
            request.mime_type, session_id
        )
        
        # Save to database
        await files_collection.insert_one(uploaded_file.dict())
        
        # Update session
        await sessions_collection.update_one(
            {"session_id": session_id},
            {"$push": {"uploaded_files": uploaded_file.dict()}}
        )
        
        return FileUploadResponse(
            file_id=uploaded_file.id,
            message="File uploaded successfully",
            session_id=session_id
        )
        
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/files/validate-srs", response_model=dict)
async def validate_srs_file(file_id: str):
    """Validate if uploaded file is actually an SRS document"""
    try:
        # Get file from database
        file_doc = await files_collection.find_one({"id": file_id, "type": FileType.SRS})
        
        if not file_doc:
            raise HTTPException(status_code=404, detail="SRS file not found")
        
        # Simple validation based on content keywords
        content = file_doc.get('content', '').lower()
        
        # SRS keywords to look for
        srs_keywords = [
            'requirements', 'specification', 'functional', 'non-functional',
            'system', 'software', 'user story', 'use case', 'acceptance criteria',
            'business rule', 'constraint', 'assumption', 'dependency'
        ]
        
        # Count how many keywords are present
        keyword_count = sum(1 for keyword in srs_keywords if keyword in content)
        
        # If less than 3 SRS-related keywords found, likely not an SRS
        is_valid_srs = keyword_count >= 3
        confidence = min((keyword_count / 8) * 100, 100)  # Max confidence at 8+ keywords
        
        return {
            "is_valid_srs": is_valid_srs,
            "confidence": round(confidence, 1),
            "keywords_found": keyword_count,
            "message": "Valid SRS document" if is_valid_srs else "This doesn't appear to be an SRS document. Please upload a Software Requirements Specification."
        }
        
    except Exception as e:
        print(f"SRS validation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/files/download-zip/{session_id}")
async def download_files_as_zip(session_id: str):
    """Download all files for a session as a zip file"""
    try:
        import zipfile
        import io
        from fastapi.responses import StreamingResponse
        
        # Get all files for session
        files = await files_collection.find({"session_id": session_id}).to_list(1000)
        
        if not files:
            raise HTTPException(status_code=404, detail="No files found for this session")
        
        # Create zip file in memory
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for file_doc in files:
                if file_doc.get('content'):
                    # Add file content to zip
                    zip_file.writestr(file_doc['name'], file_doc['content'])
        
        zip_buffer.seek(0)
        
        # Return zip file as streaming response
        def iterfile():
            yield zip_buffer.read()
        
        headers = {
            'Content-Disposition': f'attachment; filename="session_{session_id}_files.zip"'
        }
        
        return StreamingResponse(
            iter([zip_buffer.getvalue()]),
            media_type="application/zip",
            headers=headers
        )
        
    except Exception as e:
        print(f"Zip download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/analysis/generate-checklist", response_model=ChecklistResponse)
async def generate_checklist(session_id: str, model: str = "gpt-4o"):
    """Generate checklist from SRS files"""
    try:
        # Get SRS files for session
        srs_files = await files_collection.find({
            "session_id": session_id,
            "type": FileType.SRS
        }).to_list(100)
        
        if not srs_files:
            raise HTTPException(status_code=400, detail="No SRS files found for this session")
        
        # Convert to UploadedFile objects
        srs_file_objects = [UploadedFile(**f) for f in srs_files]
        
        # Generate checklist using AI
        checklist = await ai_service.generate_checklist_from_srs(
            srs_file_objects, model, session_id
        )
        
        return ChecklistResponse(
            checklist=checklist,
            message="Checklist generated successfully"
        )
        
    except Exception as e:
        print(f"Checklist generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/analysis/analyze-code", response_model=AnalysisResponse)
async def analyze_code(request: AnalysisRequest):
    """Analyze code files for issues"""
    try:
        # Get files for session
        code_files = await files_collection.find({
            "session_id": request.session_id,
            "type": FileType.CODE
        }).to_list(100)
        
        srs_files = await files_collection.find({
            "session_id": request.session_id,
            "type": FileType.SRS
        }).to_list(100)
        
        if not code_files:
            raise HTTPException(status_code=400, detail="No code files found for this session")
        
        if not srs_files:
            raise HTTPException(status_code=400, detail="No SRS files found for this session")
        
        # Convert to objects
        code_file_objects = [UploadedFile(**f) for f in code_files]
        srs_file_objects = [UploadedFile(**f) for f in srs_files]
        
        # Generate checklist first
        checklist = await ai_service.generate_checklist_from_srs(
            srs_file_objects, request.model, request.session_id
        )
        
        # Analyze code files
        file_analyses = await ai_service.analyze_code_files(
            code_file_objects, checklist, request.model, request.session_id
        )
        
        # Calculate summary statistics
        total_issues = sum(len(fa.issues) for fa in file_analyses)
        critical_issues = sum(
            len([i for i in fa.issues if i.severity == "critical"]) 
            for fa in file_analyses
        )
        high_issues = sum(
            len([i for i in fa.issues if i.severity == "high"]) 
            for fa in file_analyses
        )
        medium_issues = sum(
            len([i for i in fa.issues if i.severity == "medium"]) 
            for fa in file_analyses
        )
        low_issues = sum(
            len([i for i in fa.issues if i.severity == "low"]) 
            for fa in file_analyses
        )
        
        files_with_issues = len([fa for fa in file_analyses if fa.issues])
        
        # Calculate overall score (0-100)
        max_possible_issues = len(code_file_objects) * 20  # Assume max 20 issues per file
        score = max(0, 100 - int((total_issues / max(max_possible_issues, 1)) * 100))
        
        summary = {
            "totalFiles": len(code_file_objects),
            "totalIssues": total_issues,
            "criticalIssues": critical_issues,
            "highIssues": high_issues,
            "mediumIssues": medium_issues,
            "lowIssues": low_issues,
            "filesWithIssues": files_with_issues,
            "overallScore": score
        }
        
        # Create analysis results
        analysis_results = AnalysisResults(
            session_id=request.session_id,
            summary=summary,
            file_analyses=file_analyses,
            checklist=checklist,
            model_used=request.model,
            status=AnalysisStatus.COMPLETED
        )
        
        # Save to database
        await analyses_collection.insert_one(analysis_results.dict())
        
        return AnalysisResponse(
            analysis_id=analysis_results.id,
            status=AnalysisStatus.COMPLETED,
            message="Code analysis completed successfully"
        )
        
    except Exception as e:
        print(f"Code analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analysis/results/{session_id}")
async def get_analysis_results(session_id: str):
    """Get analysis results for a session"""
    try:
        analysis = await analyses_collection.find_one(
            {"session_id": session_id},
            sort=[("created_at", -1)]
        )
        
        if not analysis:
            raise HTTPException(status_code=404, detail="No analysis found for this session")
        
        return analysis
        
    except Exception as e:
        print(f"Error getting analysis results: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/code/fix", response_model=CodeFixResponse)
async def fix_code_issues(request: CodeFixRequest):
    """Fix code issues using AI"""
    try:
        # Get analysis results
        analysis = await analyses_collection.find_one(
            {"session_id": request.session_id},
            sort=[("created_at", -1)]
        )
        
        if not analysis:
            raise HTTPException(status_code=404, detail="No analysis found for this session")
        
        # Find the file analysis
        file_analysis = None
        for fa in analysis["file_analyses"]:
            if fa["file_name"] == request.file_name:
                file_analysis = fa
                break
        
        if not file_analysis:
            raise HTTPException(status_code=404, detail="File not found in analysis")
        
        # Get original file content
        original_file = await files_collection.find_one({
            "session_id": request.session_id,
            "name": request.file_name,
            "type": FileType.CODE
        })
        
        if not original_file:
            raise HTTPException(status_code=404, detail="Original file not found")
        
        # Get issues to fix
        issues_to_fix = file_analysis["issues"]
        if request.issue_id:
            issues_to_fix = [i for i in issues_to_fix if i["id"] == request.issue_id]
        
        # Use AI to fix issues
        fixed_content, changes = await ai_service.fix_code_issues(
            original_file["content"],
            [CodeIssue(**i) for i in issues_to_fix],
            request.file_name,
            request.model,
            request.session_id
        )
        
        # Create modified file record
        modified_file = ModifiedFile(
            file_name=request.file_name,
            original_content=original_file["content"],
            modified_content=fixed_content,
            changes=changes,
            issues_fixed=[i["message"] for i in issues_to_fix],
            session_id=request.session_id
        )
        
        # Save modified file
        await db.modified_files.insert_one(modified_file.dict())
        
        return CodeFixResponse(
            file_name=request.file_name,
            modified_content=fixed_content,
            changes=changes,
            issues_fixed=[i["message"] for i in issues_to_fix]
        )
        
    except Exception as e:
        print(f"Code fix error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/code/modified/{session_id}")
async def get_modified_files(session_id: str):
    """Get all modified files for a session"""
    try:
        modified_files = await db.modified_files.find(
            {"session_id": session_id}
        ).to_list(100)
        
        return {"modified_files": modified_files}
        
    except Exception as e:
        print(f"Error getting modified files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/review/update", response_model=ReviewResponse)
async def update_review_status(request: ReviewUpdateRequest):
    """Update review status for code changes"""
    try:
        # Update modified file review status
        if request.accept_all:
            # Accept all changes in file
            await db.modified_files.update_many(
                {"session_id": request.session_id, "file_name": request.file_name},
                {"$set": {"review_status": request.status}}
            )
            updated_count = 1
        else:
            # Update specific change
            updated_count = 0
        
        return ReviewResponse(
            message="Review status updated successfully",
            updated_changes=updated_count,
            session_status="active"
        )
        
    except Exception as e:
        print(f"Review update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/report/generate", response_model=ReportResponse)
async def generate_report(session_id: str, include_code: bool = True):
    """Generate final review report"""
    try:
        # Get session data
        session = await sessions_collection.find_one({"session_id": session_id})
        analysis = await analyses_collection.find_one({"session_id": session_id})
        modified_files = await db.modified_files.find({"session_id": session_id}).to_list(100)
        
        if not session or not analysis:
            raise HTTPException(status_code=404, detail="Session or analysis not found")
        
        # Create report data
        report_data = {
            "session_id": session_id,
            "generated_at": datetime.utcnow().isoformat(),
            "summary": analysis.get("summary", {}),
            "files_analyzed": len(analysis.get("file_analyses", [])),
            "issues_found": analysis.get("summary", {}).get("totalIssues", 0),
            "files_modified": len(modified_files),
            "checklist_items": len(analysis.get("checklist", [])),
            "model_used": analysis.get("model_used", "unknown")
        }
        
        if include_code:
            report_data["modified_files"] = [
                {
                    "file_name": mf["file_name"],
                    "issues_fixed": mf.get("issues_fixed", []),
                    "review_status": mf.get("review_status", "pending")
                }
                for mf in modified_files
            ]
        
        return ReportResponse(
            report_data=report_data,
            download_url=None  # Could implement file download later
        )
        
    except Exception as e:
        print(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
