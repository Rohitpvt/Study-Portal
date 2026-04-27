import os
import sentry_sdk
from dotenv import load_dotenv

load_dotenv()

dsn = os.getenv("SENTRY_DSN")
if not dsn:
    print("SENTRY_DSN not found in .env")
    exit(1)

sentry_sdk.init(
    dsn=dsn,
    environment="verification_test",
    traces_sample_rate=1.0
)

print(f"Sentry initialized with DSN: {dsn[:20]}...")
try:
    print("Capturing message...")
    sentry_sdk.capture_message("Verification Test: Backend Connectivity Check")
    print("Message captured. Check Sentry dashboard.")
    
    # Trigger an actual exception
    print("Triggering test exception...")
    1 / 0
except ZeroDivisionError as e:
    sentry_sdk.capture_exception(e)
    print("Exception captured.")

sentry_sdk.flush()
print("Done.")
