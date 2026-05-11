"""app/models/__init__.py"""

from app.models.user import User, Role
from app.models.material import Material, Category
from app.models.contribution import Contribution, ContributionStatus, ProcessingStatus, FinalRecommendation
from app.models.validation_report import ContributionValidationReport
from app.models.chat import ChatSession, ChatMessage
from app.models.audit import AuditLog
from app.models.favorite import Favorite
from app.models.otp import OTPRecord
from app.models.notification import Notification, NotificationType
from app.models.support import ContactSubmission
from app.models.classroom import (
    Classroom, ClassroomMember, ClassroomTopic, ClassroomMaterial,
    ClassroomAnnouncement, ClassroomAssignment, AssignmentAttachment, AssignmentSubmission,
    ClassroomComment
)

__all__ = [
    "User",
    "Role",
    "Material",
    "Category",
    "Contribution",
    "ContributionStatus",
    "ProcessingStatus",
    "FinalRecommendation",
    "ContributionValidationReport",
    "ChatSession",
    "ChatMessage",
    "AuditLog",
    "Favorite",
    "OTPRecord",
    "Notification",
    "NotificationType",
    "ContactSubmission",
    "Classroom",
    "ClassroomMember",
    "ClassroomTopic",
    "ClassroomMaterial",
    "ClassroomAnnouncement",
    "ClassroomAssignment",
    "AssignmentAttachment",
    "AssignmentSubmission",
    "ClassroomComment",
]
