"""
app/routes/metadata.py
───────────────────────
Public read-only endpoints that expose academic metadata
(courses, subjects, semesters, categories).

These endpoints require NO authentication and are safe to call
from an unauthenticated context (e.g., registration form, public docs).

Caching
-------
All responses are computed once at first request and held in memory via
`functools.lru_cache`.  The data is static, so cache invalidation is not
needed at runtime — a server restart resets the cache.
If the data ever becomes dynamic (DB-driven), swap lru_cache for
`fastapi_cache` with a short TTL.

Forward compatibility
---------------------
The response shape here mirrors the frontend `academicData.js` constants
so the frontend can switch from static data → this API with zero
breaking changes.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.data.academic_metadata import CATEGORIES, COURSES, SEMESTERS

router = APIRouter(prefix="/metadata", tags=["Metadata"])


# ── Pydantic Response Schemas ─────────────────────────────────────────────────

class SubjectSchema(BaseModel):
    name: str = Field(..., description="Subject display name")
    semesters: list[int] = Field(
        ..., description="Semester numbers in which this subject is offered"
    )

    model_config = {"from_attributes": True}


class CourseSchema(BaseModel):
    course: str = Field(..., description="Full course name")
    code: str = Field(..., description="Short stable course code")
    subjects: list[SubjectSchema] = Field(
        ..., description="Subjects belonging to this course"
    )

    model_config = {"from_attributes": True}


class CategorySchema(BaseModel):
    id: str = Field(..., description="Category identifier used in API calls")
    name: str = Field(..., description="Human-readable category label")


class MetadataSummarySchema(BaseModel):
    """Top-level envelope returned by GET /metadata."""
    courses: list[CourseSchema]
    categories: list[CategorySchema]
    semesters: list[int]
    total_courses: int
    total_subjects: int


# ── Internal cache helpers ────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _build_courses() -> list[CourseSchema]:
    """Parse raw dicts once and cache as validated Pydantic objects."""
    return [CourseSchema(**c) for c in COURSES]


@lru_cache(maxsize=1)
def _build_categories() -> list[CategorySchema]:
    return [CategorySchema(**cat) for cat in CATEGORIES]


@lru_cache(maxsize=1)
def _build_summary() -> MetadataSummarySchema:
    courses = _build_courses()
    return MetadataSummarySchema(
        courses=courses,
        categories=_build_categories(),
        semesters=SEMESTERS,
        total_courses=len(courses),
        total_subjects=sum(len(c.subjects) for c in courses),
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=MetadataSummarySchema,
    summary="Full academic metadata (courses + categories + semesters)",
)
async def get_all_metadata():
    """
    Returns the complete academic metadata payload in a single request.

    Useful when the frontend needs to hydrate all filter dropdowns at once.
    No authentication required.
    """
    return _build_summary()


@router.get(
    "/courses",
    response_model=list[CourseSchema],
    summary="List all courses with their subjects and semesters",
)
async def get_courses(
    code: Optional[str] = Query(
        None,
        description="Filter by short course code (e.g. MCA, BCA). Case-insensitive.",
    )
):
    """
    Returns all courses, each with their subjects and the semesters those
    subjects are offered in.

    **Example response:**
    ```json
    [
      {
        "course": "MCA (Master of Computer Applications)",
        "code": "MCA",
        "subjects": [
          {"name": "Advanced Data Structures", "semesters": [1, 2]},
          {"name": "Cloud Computing",          "semesters": [3]}
        ]
      }
    ]
    ```

    No authentication required.
    """
    courses = _build_courses()
    if code:
        courses = [c for c in courses if c.code.upper() == code.upper()]
    return courses


@router.get(
    "/courses/{course_code}/subjects",
    response_model=list[SubjectSchema],
    summary="List subjects for a specific course",
)
async def get_subjects_for_course(
    course_code: str,
    semester: Optional[int] = Query(
        None, ge=1, le=8,
        description="Filter subjects offered in a specific semester"
    ),
):
    """
    Returns subjects belonging to a given course code.
    Optionally filter by semester.

    - `course_code`: e.g. `MCA`, `BCA`, `BSC_DS_AI`
    - `semester`: return only subjects offered in that semester

    No authentication required.
    """
    courses = _build_courses()
    match = next((c for c in courses if c.code.upper() == course_code.upper()), None)

    if match is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Course code '{course_code}' not found.")

    subjects = match.subjects
    if semester is not None:
        subjects = [s for s in subjects if semester in s.semesters]
    return subjects


@router.get(
    "/categories",
    response_model=list[CategorySchema],
    summary="List all material categories",
)
async def get_categories():
    """
    Returns the list of valid material categories used when filtering
    or uploading study materials.

    No authentication required.
    """
    return _build_categories()


@router.get(
    "/semesters",
    response_model=list[int],
    summary="List valid semester numbers",
)
async def get_semesters():
    """
    Returns the list of valid semester numbers (1–8).

    No authentication required.
    """
    return SEMESTERS
