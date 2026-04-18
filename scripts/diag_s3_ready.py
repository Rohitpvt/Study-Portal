import boto3
import sys
import os
sys.path.append(os.getcwd())
from app.core.config import settings

def list_s3():
    print(f"Checking Bucket: {settings.AWS_BUCKET_NAME} in Region: {settings.AWS_REGION}")
    s3 = boto3.client(
        's3',
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
    )
    try:
        resp = s3.list_objects_v2(Bucket=settings.AWS_BUCKET_NAME, MaxKeys=5)
        print('CONTENTS:')
        if 'Contents' in resp:
            for obj in resp['Contents']:
                print(f" - {obj['Key']}")
        else:
            print(' - No objects found.')
    except Exception as e:
        print(f'FAILURE: {e}')

if __name__ == "__main__":
    list_s3()
