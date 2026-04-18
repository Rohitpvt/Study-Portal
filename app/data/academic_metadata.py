"""
app/data/academic_metadata.py
──────────────────────────────
Canonical source-of-truth for academic course/subject/semester data.

This is the SINGLE authoritative dataset used by the /metadata/* API.
The frontend currently mirrors this data in:
    frontend/src/constants/academicData.js
Both must be kept in sync until the frontend switches to consuming the API.

Structure
---------
Each entry is a dict:
  {
    "course": str           — Full course name
    "code":   str           — Short code used as a stable key
    "subjects": [
      {
        "name":      str    — Subject display name
        "semesters": [int]  — Semesters in which this subject appears
      },
      ...
    ]
  }
"""

COURSES: list[dict] = [
    {
        "course": "BCA (Bachelor of Computer Applications)",
        "code": "BCA",
        "subjects": [
            {"name": "Programming in C",      "semesters": [1, 2]},
            {"name": "Data Structures",       "semesters": [2, 3]},
            {"name": "DBMS",                  "semesters": [3, 4]},
            {"name": "Operating Systems",     "semesters": [3, 4]},
            {"name": "Computer Networks",     "semesters": [4, 5]},
            {"name": "Software Engineering",  "semesters": [5]},
            {"name": "Web Development",       "semesters": [4, 5]},
            {"name": "Python Programming",    "semesters": [2, 3]},
            {"name": "Machine Learning",      "semesters": [5, 6]},
            {"name": "Artificial Intelligence","semesters": [5, 6]},
        ],
    },
    {
        "course": "BSc Data Science & AI",
        "code": "BSC_DS_AI",
        "subjects": [
            {"name": "Python for Data Science",  "semesters": [1, 2]},
            {"name": "Statistics & Probability", "semesters": [1, 2]},
            {"name": "Linear Algebra",           "semesters": [2]},
            {"name": "Machine Learning",         "semesters": [3, 4]},
            {"name": "Deep Learning",            "semesters": [4, 5]},
            {"name": "NLP",                      "semesters": [5]},
            {"name": "Computer Vision",          "semesters": [5, 6]},
            {"name": "Mathematical Foundations", "semesters": [1]},
        ],
    },
    {
        "course": "BSc EMS (Economics, Maths, Stats)",
        "code": "BSC_EMS",
        "subjects": [
            {"name": "Micro Economics",      "semesters": [1, 2]},
            {"name": "Macro Economics",      "semesters": [3, 4]},
            {"name": "Calculus",             "semesters": [1, 2]},
            {"name": "Linear Algebra",       "semesters": [2, 3]},
            {"name": "Probability",          "semesters": [2]},
            {"name": "Statistical Inference","semesters": [4, 5]},
            {"name": "Econometrics",         "semesters": [5, 6]},
        ],
    },
    {
        "course": "MCA (Master of Computer Applications)",
        "code": "MCA",
        "subjects": [
            {"name": "Advanced Data Structures", "semesters": [1, 2]},
            {"name": "Advanced Java",            "semesters": [1, 2]},
            {"name": "Advanced Python",          "semesters": [1]},
            {"name": "Software Engineering",     "semesters": [2]},
            {"name": "Artificial Intelligence",  "semesters": [2, 3]},
            {"name": "Machine Learning",         "semesters": [2, 3]},
            {"name": "Cloud Computing",          "semesters": [3]},
            {"name": "Cyber Security",           "semesters": [3]},
            {"name": "Web Technologies",         "semesters": [1, 2]},
            {"name": "Research Methodology",     "semesters": [4]},
        ],
    },
    {
        "course": "MSc Data Science",
        "code": "MSC_DS",
        "subjects": [
            {"name": "Statistical Methods",     "semesters": [1, 2]},
            {"name": "Data Mining",             "semesters": [2, 3]},
            {"name": "Big Data Analytics",      "semesters": [3]},
            {"name": "Optimization Techniques", "semesters": [2]},
            {"name": "Time Series Analysis",    "semesters": [3, 4]},
            {"name": "Neural Networks",         "semesters": [3, 4]},
        ],
    },
]

# Flat list of all valid categories (mirrors frontend CATEGORIES)
CATEGORIES: list[dict] = [
    {"id": "notes",           "name": "Class Notes"},
    {"id": "previous_papers", "name": "Past Exam Papers"},
    {"id": "assignments",     "name": "Assignments"},
    {"id": "reference",       "name": "Reference Books"},
    {"id": "misc",            "name": "Miscellaneous"},
]

# Valid semester range
SEMESTERS: list[int] = list(range(1, 9))  # 1–8 inclusive
