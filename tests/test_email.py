def test_christ_emails():
    from app.utils.email_validator import is_valid_christ_email
    
    # PASS cases
    assert is_valid_christ_email('rohit.ghosh@mca.christuniversity.in') == True
    assert is_valid_christ_email('user@christuniversity.in') == True
    
    # FAIL cases
    assert is_valid_christ_email('abc@gmail.com') == False
    assert is_valid_christ_email('abc@christuniversity.com') == False
    assert is_valid_christ_email('abc@fakechristuniversity.in') == False
    
    print("All boolean validations passed!")
    
if __name__ == '__main__':
    test_christ_emails()
