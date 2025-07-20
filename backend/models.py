from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class FileType(str, Enum):
    CODE = "code"
    SRS = "srs"


class AnalysisSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class ReviewStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class UploadedFile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: FileType
    size: int
    content: Optional[str] = None
    mime_type: str
    upload_timestamp: datetime = Field(default_factory=datetime.utcnow)
    session_id: str


class CodeIssue(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    line: int
    type: str
    severity: AnalysisSeverity
    message: str
    description: str
    suggestion: str
    auto_fixable: bool = False
    original_code: Optional[str] = None
    fixed_code: Optional[str] = None


class FileAnalysis(BaseModel):
    file_name: str
    language: str
    size: int
    issues: List[CodeIssue] = []
    issue_count: int = 0
    status: AnalysisStatus = AnalysisStatus.PENDING


class ChecklistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str
    title: str
    description: str
    severity: AnalysisSeverity
    checked: bool = False
    automated: bool = True
    items: List[str] = []
    relevant_requirement: Optional[str] = None


class AnalysisResults(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    summary: Dict[str, Any]
    file_analyses: List[FileAnalysis] = []
    checklist: List[ChecklistItem] = []
    model_used: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: AnalysisStatus = AnalysisStatus.PENDING


class CodeChange(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # addition, modification, deletion
    line: int
    content: str
    old_content: Optional[str] = None
    description: str


class ModifiedFile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    file_name: str
    original_content: str
    modified_content: str
    changes: List[CodeChange] = []
    issues_fixed: List[str] = []
    review_status: ReviewStatus = ReviewStatus.PENDING
    session_id: str


class ReviewSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    uploaded_files: List[UploadedFile] = []
    analysis_results: Optional[AnalysisResults] = None
    modified_files: List[ModifiedFile] = []
    selected_model: str = "gpt-4o"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"


# Request/Response Models
class FileUploadRequest(BaseModel):
    name: str
    type: FileType
    size: int
    content: str
    mime_type: str


class FileUploadResponse(BaseModel):
    file_id: str
    message: str
    session_id: str


class AnalysisRequest(BaseModel):
    session_id: str
    model: str = "gpt-4o"


class AnalysisResponse(BaseModel):
    analysis_id: str
    status: AnalysisStatus
    message: str


class ChecklistGenerationRequest(BaseModel):
    session_id: str
    srs_content: List[str]
    model: str = "gpt-4o"


class ChecklistResponse(BaseModel):
    checklist: List[ChecklistItem]
    message: str


class CodeFixRequest(BaseModel):
    session_id: str
    file_name: str
    issue_id: Optional[str] = None
    fix_all: bool = False
    model: str = "gpt-4o"


class CodeFixResponse(BaseModel):
    file_name: str
    modified_content: str
    changes: List[CodeChange]
    issues_fixed: List[str]


class ReviewUpdateRequest(BaseModel):
    session_id: str
    file_name: str
    change_id: Optional[str] = None
    status: ReviewStatus
    accept_all: bool = False


class ReviewResponse(BaseModel):
    message: str
    updated_changes: int
    session_status: str


class ReportGenerationRequest(BaseModel):
    session_id: str
    include_code: bool = True


class ReportResponse(BaseModel):
    report_data: Dict[str, Any]
    download_url: Optional[str] = None