from fastapi import Header, HTTPException
from app.config import PIN


def verify_pin(x_auth_pin: str = Header(...)):
    if x_auth_pin != PIN:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    return True
