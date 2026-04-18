import os

base_dir = 'uploads'
test_paths = [
    r'uploads\notes\1626c86f-0439-4fd3-9553-928e176f3d7e_e2e_test_syllabi_admin.pdf',
    r'uploads\contributions\a6613d53-4584-47de-b385-1a537a62e92e_Assignment.pdf',
    'dummy.pdf',
]

abs_base = os.path.abspath(base_dir)
print(f"Base dir (abs): {abs_base}\n")

for path in test_paths:
    abs_path = os.path.abspath(path)
    rel_path = os.path.relpath(abs_path, abs_base)
    url = f'/api/v1/uploads/{rel_path.replace(os.sep, "/")}'
    print(f"Input:    {path}")
    print(f"abs_path: {abs_path}")
    print(f"rel_path: {rel_path}")
    print(f"URL:      {url}")
    print(f"Full URL: http://127.0.0.1:8000{url}")
    print()
