"""
app/utils/email_validator.py
─────────────────────────────
Enforces that only @christuniversity.in emails can register.
"""

import re
from app.core.config import settings

def is_christ_email(email: str) -> bool:
    """
    Centralized validation for Christ University email format.
    Required format: firstname.lastname@course.christuniversity.in
    Supports multi-part names: first.middle.last@course.christuniversity.in
    """
    pattern = r"^[A-Za-z]+(?:\.[A-Za-z]+)+@[A-Za-z0-9]+\.christuniversity\.in$"
    return bool(re.match(pattern, email))

def is_valid_christ_email(email: str) -> bool:
    """
    Returns True if the email follows the official Christ University format.
    """
    return is_christ_email(email)
        
COURSE_MAP = {
    "mca": "MCA (Master of Computer Applications)",
    "bca": "BCA (Bachelor of Computer Applications)",
    "ds":  "BSc Data Science & AI",
    "ems": "BSc EMS (Economics, Maths, Stats)",
    "datascience": "MSc Data Science",
    "mscds": "MSc Data Science",
}

def extract_department(email: str) -> str | None:
    """
    Extracts and normalizes the course/department from a Christ University email.
    Maps subdomains (short codes) to full names used in valid academic filters.
    Example: 'rohit.ghosh@mca.christuniversity.in' -> 'MCA (Master of Computer Applications)'
    """
    if not is_christ_email(email):
        return None
        
    parts = email.split("@")
    domain = parts[1].lower()
    subdomain = domain.split(".")[0]
    
    # Return the mapped full name if found, otherwise return the raw subdomain as fallback
    return COURSE_MAP.get(subdomain, subdomain)
