import os

PY_HEADER = """# Copyright (c) 2026 Rohit Ghosh
# Licensed under the MIT License. See LICENSE file in the project root for full license information.

"""

JS_HEADER = """/*
 * Copyright (c) 2026 Rohit Ghosh
 * Licensed under the MIT License. See LICENSE file in the project root for full license information.
 */

"""

EXCLUDE_DIRS = {
    'node_modules', 'alembic', 'dist', 'build', '.git', 'venv', '__pycache__', '.pytest_cache'
}
EXCLUDE_FILES = {
    'apply_license.py'
}

def main():
    root_dir = os.getcwd()
    modified_count = 0
    skipped_count = 0

    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            if file in EXCLUDE_FILES:
                continue

            filepath = os.path.join(root, file)
            ext = os.path.splitext(file)[1].lower()
            
            if ext in ['.py']:
                header = PY_HEADER
            elif ext in ['.js', '.jsx', '.ts', '.tsx', '.css']:
                header = JS_HEADER
            else:
                continue

            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check if it already has a copyright
                if 'Copyright (c) 2026 Rohit Ghosh' in content:
                    skipped_count += 1
                    continue
                
                # Add header
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(header + content)
                modified_count += 1
                
            except Exception as e:
                print(f"Error processing {filepath}: {e}")

    print(f"Total files modified: {modified_count}")
    print(f"Total files skipped (already had header): {skipped_count}")

if __name__ == "__main__":
    main()
