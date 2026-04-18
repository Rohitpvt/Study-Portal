from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel

class AuditLogOut(BaseModel):
    id: str
    user_id: str
    action: str
    description: Optional[str]
    timestamp: datetime

    model_config = {"from_attributes": True}

class AuditLogResponse(BaseModel):
    logs: List[AuditLogOut]
