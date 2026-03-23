"""Authentication utilities for specialist login."""
import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database.models import Specialist
from database.connection import get_db

# JWT Configuration
JWT_SECRET = "loan-workflow-specialist-secret-key-2024"  # In production, use environment variable
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def create_token(specialist_id: int, username: str, role: str) -> str:
    """Create a JWT token for a specialist."""
    payload = {
        "specialist_id": specialist_id,
        "username": username,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_specialist(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Specialist:
    """Get the current authenticated specialist from the JWT token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    specialist_id = payload.get("specialist_id")
    specialist = db.query(Specialist).filter(Specialist.id == specialist_id).first()

    if not specialist:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Specialist not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not specialist.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Specialist account is deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return specialist


def get_optional_specialist(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[Specialist]:
    """Get the current specialist if authenticated, otherwise None."""
    if not credentials:
        return None

    try:
        return get_current_specialist(credentials, db)
    except HTTPException:
        return None


def require_admin(specialist: Specialist = Depends(get_current_specialist)) -> Specialist:
    """Require the current specialist to be an admin."""
    if specialist.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return specialist


def authenticate_specialist(db: Session, username: str, password: str) -> Optional[Specialist]:
    """Authenticate a specialist by username and password."""
    specialist = db.query(Specialist).filter(
        Specialist.username == username,
        Specialist.is_active == True,
    ).first()

    if not specialist:
        return None

    if not verify_password(password, specialist.password_hash):
        return None

    # Update last login time
    specialist.last_login_at = datetime.utcnow()
    db.commit()

    return specialist
