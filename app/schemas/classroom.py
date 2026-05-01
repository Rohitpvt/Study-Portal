"""
app/schemas/classroom.py
─────────────────────────
Pydantic schemas for Classrooms, Topics, and Memberships.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.classroom import ClassroomStatus, MembershipStatus, SectionType


# ── TOPIC SCHEMAS ───────────────────────────────────────────────────────────

class ClassroomTopicBase(BaseModel):
    name:        str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    sort_order:  int = 0

class ClassroomTopicCreate(ClassroomTopicBase):
    pass

class ClassroomTopicUpdate(BaseModel):
    name:        Optional[str] = None
    description: Optional[str] = None
    sort_order:  Optional[int] = None

class ClassroomTopicOut(ClassroomTopicBase):
    id: str
    classroom_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── MATERIAL SCHEMAS ────────────────────────────────────────────────────────

class ClassroomMaterialCreate(BaseModel):
    material_id:  str
    topic_id:     Optional[str] = None
    section_type: SectionType = SectionType.OTHER

class ClassroomMaterialOut(BaseModel):
    id:           str # This is the classroom_material_id
    material_id:  str
    topic_id:     Optional[str] = None
    section_type: SectionType
    added_by:     str
    created_at:   datetime
    
    # Nested material info for frontend
    title:            Optional[str] = None
    subject:          Optional[str] = None
    course:           Optional[str] = None
    semester:         Optional[int] = None
    file_type:        Optional[str] = None
    integrity_status: Optional[str] = None # 'valid', 'missing', 'corrupted', etc.

    model_config = ConfigDict(from_attributes=True)


# ── CLASSROOM SCHEMAS ───────────────────────────────────────────────────────

class ClassroomBase(BaseModel):
    name:           str = Field(..., min_length=3, max_length=255)
    description:    Optional[str] = None
    subject:        str = Field(..., min_length=2, max_length=100)
    course:         str = Field(..., min_length=2, max_length=100)
    semester:       int = Field(..., ge=1, le=10)
    section:        Optional[str] = None
    banner_variant: str = "default"

class ClassroomCreate(ClassroomBase):
    pass

class ClassroomUpdate(BaseModel):
    name:           Optional[str] = None
    description:    Optional[str] = None
    subject:        Optional[str] = None
    course:         Optional[str] = None
    semester:       Optional[int] = None
    section:        Optional[str] = None
    status:         Optional[ClassroomStatus] = None
    banner_variant: Optional[str] = None

class ClassroomOut(ClassroomBase):
    id:                    str
    join_code:             Optional[str] = None
    status:                ClassroomStatus
    created_by_teacher_id: str
    created_at:            datetime
    updated_at:            datetime

    model_config = ConfigDict(from_attributes=True)

class JoinClassroomRequest(BaseModel):
    join_code: str = Field(..., min_length=6, max_length=10)


# ── MEMBERSHIP & DETAIL SCHEMAS ─────────────────────────────────────────────

class ClassroomMemberOut(BaseModel):
    user_id:       str
    full_name:     Optional[str] = None
    email:         Optional[str] = None
    role_in_class: str
    status:        MembershipStatus
    joined_at:     datetime

    model_config = ConfigDict(from_attributes=True)

class ClassroomDetail(ClassroomOut):
    topics:         List[ClassroomTopicOut] = []
    members:        List[ClassroomMemberOut] = []
    member_count:   int = 0
    
    # Permission flags for the requesting user
    can_manage:         bool = False
    can_add_material:   bool = False
    can_remove_member:  bool = False

    model_config = ConfigDict(from_attributes=True)


# ── ANNOUNCEMENT SCHEMAS ───────────────────────────────────────────────────

class ClassroomAnnouncementBase(BaseModel):
    title:  str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    pinned:  bool = False

class ClassroomAnnouncementCreate(ClassroomAnnouncementBase):
    pass

class ClassroomAnnouncementUpdate(BaseModel):
    title:   Optional[str] = None
    content: Optional[str] = None
    pinned:  Optional[bool] = None

class ClassroomAnnouncementOut(ClassroomAnnouncementBase):
    id:           str
    classroom_id: str
    created_by:   str
    creator_name: Optional[str] = None
    created_at:   datetime
    updated_at:   datetime

    model_config = ConfigDict(from_attributes=True)


# ── ASSIGNMENT SCHEMAS ───────────────────────────────────────────────────

from app.models.classroom import AssignmentStatus, AIHelpMode

class AssignmentAttachmentBase(BaseModel):
    title:           str
    attachment_type: str # material, link, upload
    material_id:     Optional[str] = None
    file_key:        Optional[str] = None

class AssignmentAttachmentCreate(AssignmentAttachmentBase):
    pass

class AssignmentAttachmentOut(AssignmentAttachmentBase):
    id:            str
    assignment_id: str
    created_at:    datetime

    model_config = ConfigDict(from_attributes=True)

class ClassroomAssignmentBase(BaseModel):
    title:                 str = Field(..., min_length=1, max_length=255)
    description:           Optional[str] = None
    instructions:          str = Field(..., min_length=1)
    topic_id:              Optional[str] = None
    points:                int = 100
    due_at:                Optional[datetime] = None
    allow_late_submission: bool = False
    late_penalty:          Optional[float] = None
    status:                AssignmentStatus = AssignmentStatus.DRAFT
    ai_help_mode:          AIHelpMode = AIHelpMode.ALLOWED

class ClassroomAssignmentCreate(ClassroomAssignmentBase):
    pass

class ClassroomAssignmentUpdate(BaseModel):
    title:                 Optional[str] = None
    description:           Optional[str] = None
    instructions:          Optional[str] = None
    topic_id:              Optional[str] = None
    points:                Optional[int] = None
    due_at:                Optional[datetime] = None
    allow_late_submission: Optional[bool] = None
    late_penalty:          Optional[float] = None
    status:                Optional[AssignmentStatus] = None
    ai_help_mode:          Optional[AIHelpMode] = None

class ClassroomAssignmentOut(ClassroomAssignmentBase):
    id:           str
    classroom_id: str
    created_by:   str
    creator_name: Optional[str] = None
    attachments:  List[AssignmentAttachmentOut] = []
    created_at:   datetime
    updated_at:   datetime

    model_config = ConfigDict(from_attributes=True)


# ── SUBMISSION SCHEMAS ───────────────────────────────────────────────────

from app.models.classroom import SubmissionStatus

class AssignmentSubmissionCreate(BaseModel):
    text_response: Optional[str] = None

class AssignmentSubmissionGradeRequest(BaseModel):
    marks:    float = Field(..., ge=0)
    feedback: Optional[str] = None

class AssignmentSubmissionOut(BaseModel):
    id:                str
    assignment_id:     str
    student_id:        str
    student_name:      Optional[str] = None
    student_email:     Optional[str] = None
    roll_no:           Optional[str] = None
    file_key:          Optional[str] = None
    original_filename: Optional[str] = None
    text_response:     Optional[str] = None
    submitted_at:      datetime
    status:            SubmissionStatus
    marks:             Optional[float] = None
    feedback:          Optional[str] = None
    graded_by:         Optional[str] = None
    graded_at:         Optional[datetime] = None
    resubmission_allowed: bool
    created_at:        datetime
    updated_at:        datetime

    model_config = ConfigDict(from_attributes=True)
