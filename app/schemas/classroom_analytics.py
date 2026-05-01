from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class OverviewMetrics(BaseModel):
    total_students: int
    total_topics: int
    total_materials: int
    total_assignments: int
    total_announcements: int

class AssignmentPerformance(BaseModel):
    total_submissions: int
    submitted_count: int
    late_count: int
    graded_count: int
    returned_count: int
    missing_count: int
    completion_rate: float
    average_marks: Optional[float] = None
    highest_marks: Optional[float] = None
    lowest_marks: Optional[float] = None

class StudentAttention(BaseModel):
    student_id: str
    name: str
    roll_no: Optional[str] = None
    missing_count: int
    late_count: int
    average_marks: Optional[float] = None

class AssignmentSummary(BaseModel):
    assignment_id: str
    title: str
    due_at: Optional[datetime] = None
    points: int
    submission_count: int
    missing_count: int
    late_count: int
    average_marks: Optional[float] = None
    status: str

class WeakTopic(BaseModel):
    topic_id: Optional[str] = None
    topic_title: str
    average_score: float
    missing_count: int
    late_count: int
    reason: str

class CommunicationMetrics(BaseModel):
    open_private_doubts: int
    resolved_private_doubts: int
    public_comments_count: int
    private_doubts_count: int

class ClassroomAnalyticsOut(BaseModel):
    classroom_id: str
    overview: OverviewMetrics
    performance: AssignmentPerformance
    student_attention: List[StudentAttention]
    assignment_breakdown: List[AssignmentSummary]
    weak_topics: List[WeakTopic]
    communication: CommunicationMetrics
    ai_insight_summary: Optional[str] = None
    generated_at: datetime
