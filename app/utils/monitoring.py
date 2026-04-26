"""
app/utils/monitoring.py
────────────────────────
Utilities for system monitoring, log scrubbing, and health tracking.
"""

from typing import Any, Dict, Optional

def scrub_sentry_event(event: Dict[str, Any], hint: Any) -> Optional[Dict[str, Any]]:
    """
    Sanitize Sentry events by removing sensitive data from logs.
    Redacts passwords, tokens, OTPs, and other PI.
    """
    # 1. Scrub request data
    request = event.get("request")
    if request and "data" in request:
        data = request["data"]
        sensitive_keys = {"password", "token", "otp", "access_token", "secret", "hashed_password"}
        
        if isinstance(data, dict):
            for key in data:
                if any(sk in key.lower() for sk in sensitive_keys):
                    data[key] = "[REDACTED]"
        elif isinstance(data, str):
            # If it's a string (like form-data or raw JSON), we skip for now 
            # or could use regex, but dict is most common for JSON APIs
            pass

    # 2. Scrub breadcrumbs
    breadcrumbs = event.get("breadcrumbs", {}).get("values", [])
    for crumb in breadcrumbs:
        if crumb.get("category") == "httplib":
            # Redact URL params if they look sensitive
            url = crumb.get("data", {}).get("url", "")
            if any(k in url.lower() for k in ["token=", "password=", "otp="]):
                crumb["data"]["url"] = "[REDACTED_URL]"

    # 3. Mask email in user info
    user = event.get("user")
    if user and "email" in user:
        email = user["email"]
        if "@" in email:
            name, domain = email.split("@")
            user["email"] = f"{name[0]}***@{domain}"

    return event
