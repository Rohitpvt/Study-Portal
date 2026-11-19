def test_christ_emails():
    from app.utils.email_validator import is_christ_email
    
    # PASS cases
    assert is_christ_email('rohit.ghosh@mca.christuniversity.in') is True
    assert is_christ_email('user@christuniversity.in') is True
    
    # FAIL cases
    assert is_christ_email('abc@gmail.com') is False
    assert is_christ_email('abc@christuniversity.com') is False
    assert is_christ_email('abc@fakechristuniversity.in') is False
