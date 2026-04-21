import boto3
import os
from dotenv import load_dotenv

load_dotenv()

def check_s3_metadata(key):
    bucket = os.getenv("AWS_BUCKET_NAME")
    region = os.getenv("AWS_REGION")
    ak = os.getenv("AWS_ACCESS_KEY_ID")
    sk = os.getenv("AWS_SECRET_ACCESS_KEY")

    s3 = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=ak,
        aws_secret_access_key=sk
    )

    try:
        response = s3.head_object(Bucket=bucket, Key=key)
        print(f"--- Metadata for {key} ---")
        print(f"ContentType: {response.get('ContentType')}")
        print(f"ContentDisposition: {response.get('ContentDisposition')}")
        print(f"Metadata: {response.get('Metadata')}")
        print("---------------------------")
    except Exception as e:
        print(f"Error checking metadata: {e}")

if __name__ == "__main__":
    # From previous check: 'uploads/notes/data_comm_notes.pdf'
    check_s3_metadata("uploads/notes/data_comm_notes.pdf")
    # Also check the mislabeled/misc one
    check_s3_metadata("MISC/fc707c3c-f744-4ea5-9b6c-92d248a52ebb_Hybrid - IEEE.pdf")
