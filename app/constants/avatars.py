"""
app/constants/avatars.py
─────────────────────────
Backend validation lists for system avatars.
"""

# Hardcoded valid avatar IDs matching the frontend
# All 30 valid system avatars matching the frontend
VALID_AVATARS = {
    *[f"avatar_{i}" for i in range(1, 21)],
    "avatar_bot", "avatar_cool", "avatar_star", "avatar_retro", "avatar_cat",
    "avatar_pixel", "avatar_orb", "avatar_lava", "avatar_glitch", "avatar_wand"
}

