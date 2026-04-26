"""
app/routes/admin.py
────────────────────
Admin-only API endpoints: dashboard stats, contribution review, user management.
"""

import json
from fastapi import APIRouter, BackgroundTasks, Query, HTTPException
from sqlalchemy import select

from app.core.dependencies import AdminUser, DBSession
from app.models.contribution import Contribution
from app.models.validation_report import ContributionValidationReport
from app.schemas.contribution import ContributionOut, ReviewDecision, ValidationReportOut
from app.schemas.user import UserOut
from app.services import admin_service, contribution_service
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", summary="Platform dashboard statistics")
async def dashboard_stats(db: DBSession, _: AdminUser):
    """
    Returns:
    - Total student count
    - Total approved materials count
    - Contribution counts by status (pending / ai_reviewed / approved / rejected)
    - 5 most recently registered users
    """
    return await admin_service.get_dashboard_stats(db)


@router.get("/material-health", summary="Get library-wide file health analytics")
async def material_health_stats(db: DBSession, _: AdminUser):
    """
    Detailed analytics on document integrity, processing failures,
    and missing files across the entire library.
    """
    from app.services import material_service
    return await material_service.get_material_health_stats(db)


@router.patch(
    "/contributions/{contribution_id}/review",
    response_model=ContributionOut,
    summary="Approve or reject a contribution",
)
async def review_contribution(
    contribution_id: str,
    decision: ReviewDecision,
    db: DBSession,
    current_admin: AdminUser,
    background_tasks: BackgroundTasks,
):
    """
    Admin decision on a student contribution.
    - approved=True  -> status -> APPROVED, Material record created automatically
    - approved=False -> status -> REJECTED with optional admin_notes
    """
    result = await contribution_service.review_contribution(
        contribution_id, decision, current_admin, db, background_tasks
    )

    from app.services.audit_service import log_action
    action_type = "APPROVE_CONTRIBUTION" if decision.approved else "REJECT_CONTRIBUTION"
    await log_action(current_admin, action_type, f"Admin {action_type.split('_')[0].lower()}d contribution ID: {contribution_id}", db)

    await db.commit()
    await db.refresh(result)
    return result


@router.patch(
    "/users/{user_id}/toggle-active",
    response_model=UserOut,
    summary="Activate or deactivate a user account",
)
async def toggle_user(user_id: str, db: DBSession, _: AdminUser):
    """Toggle is_active for a user. Deactivated users cannot log in."""
    return await admin_service.toggle_user_active(user_id, db)


@router.get(
    "/contributions/{contribution_id}/report",
    summary="Get full validation report for a contribution",
)
async def get_validation_report(
    contribution_id: str, 
    db: DBSession, 
    _: AdminUser
):
    """
    Fetch the complete validation report, parsed and structured for
    the admin technical review interface.
    """
    from main import logger as app_logger
    app_logger.info(f"ADMIN_FETCH_REPORT: Requested ID={contribution_id}")

    # 1. Fetch Contribution
    stmt = select(Contribution).where(Contribution.id == contribution_id)
    res = await db.execute(stmt)
    contribution = res.scalar_one_or_none()
    
    if not contribution:
        app_logger.warning(f"ADMIN_FETCH_REPORT: Contribution {contribution_id} not found.")
        raise HTTPException(status_code=404, detail="Contribution not found")

    # 2. Fetch Report
    report_stmt = select(ContributionValidationReport).where(
        ContributionValidationReport.contribution_id == contribution_id
    )
    report_res = await db.execute(report_stmt)
    report = report_res.scalar_one_or_none()

    if not report:
        app_logger.info(f"ADMIN_FETCH_REPORT: No report found for {contribution_id}")
        raise HTTPException(status_code=404, detail="Validation report not available yet.")

    app_logger.info(f"ADMIN_FETCH_REPORT: Found report row {report.id} for contribution {contribution_id}")

    # 3. Defensive Field-by-Field JSON Parser
    def parse_field(field_name: str, val: any):
        if val is None:
            return {}
        if isinstance(val, dict):
            return val
        
        val_str = str(val).strip()
        if not val_str or val_str.lower() == "null":
            return {}
            
        try:
            return json.loads(val_str)
        except Exception as e:
            app_logger.error(f"ADMIN_REPORT_PARSE_ERROR: Field '{field_name}' contains malformed JSON. Error: {e}")
            return {"error": "Malformed data", "raw_content": val_str[:100]}

    # 4. Structure the Response
    try:
        data = {
            "id": report.id,
            "contribution_id": contribution_id,
            "timeline": {
                "uploaded_at": contribution.uploaded_at.isoformat() if contribution.uploaded_at else None,
                "processing_started_at": contribution.processing_started_at.isoformat() if contribution.processing_started_at else None,
                "processing_completed_at": contribution.processing_completed_at.isoformat() if contribution.processing_completed_at else None,
            },
            "summary": {
                "overall_quality_score": report.overall_score,
                "overall_risk_score": report.overall_risk_score,
                "recommendation": report.recommendation or "PENDING",
                "admin_summary": report.summary or "No summary provided.",
            },
            "layers": {
                "grammar": {
                    "score": report.grammar_score,
                    "details": parse_field("grammar_details", report.grammar_details)
                },
                "plagiarism": {
                    "score": report.plagiarism_score,
                    "details": parse_field("plagiarism_details", report.plagiarism_details)
                },
                "similarity": {
                    "score": report.similarity_score,
                    "details": parse_field("similarity_details", report.similarity_details)
                },
                "toxicity": {
                    "score": report.toxicity_score,
                    "details": parse_field("toxicity_details", report.toxicity_details)
                },
                "metadata": {
                    "valid": report.metadata_valid,
                    "details": parse_field("metadata_details", report.metadata_details)
                },
                "ai_generated": {
                    "probability": report.ai_generated_probability,
                    "details": parse_field("ai_generated_details", report.ai_generated_details)
                }
            }
        }
        return data
    except Exception as e:
        app_logger.exception(f"ADMIN_REPORT_FORMAT_CRASH: Contribution {contribution_id}. Error: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Technical Report found but it contains unrenderable data structure."
        )


@router.get(
    "/logs",
    summary="View system audit logs",
)
async def get_audit_logs(
    db: DBSession, 
    _: AdminUser,
    limit: int = Query(50, ge=1, le=200)
):
    """
    Retrieve all audit logs securely. Restricted strictly to Admins.
    """
    from sqlalchemy.future import select
    from app.models.audit import AuditLog
    from app.schemas.audit import AuditLogResponse
    
    query = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    
    return {"logs": logs}


@router.get("/alerts", summary="Admin Notification Alerts")
async def get_admin_alerts(db: DBSession, _: AdminUser):
    """Aggregate alert counts for the admin notification badge."""
    from app.models.support import ContactSubmission
    from app.models.material import Material
    from app.models.contribution import Contribution, ProcessingStatus
    from sqlalchemy import func

    # 1. Unread/New support tickets
    tickets_q = select(func.count(ContactSubmission.id)).where(ContactSubmission.status == 'new')
    tickets_count = (await db.execute(tickets_q)).scalar() or 0

    # 2. Materials with broken integrity
    integrity_q = select(func.count(Material.id)).where(Material.integrity_status != 'available')
    integrity_count = (await db.execute(integrity_q)).scalar() or 0

    # 3. Failed contribution pipelines
    failed_q = select(func.count(Contribution.id)).where(Contribution.processing_status == ProcessingStatus.PROCESSING_FAILED)
    failed_count = (await db.execute(failed_q)).scalar() or 0

    return {
        "total": tickets_count + integrity_count + failed_count,
        "new_support_tickets": tickets_count,
        "broken_materials": integrity_count,
        "failed_contributions": failed_count
    }
