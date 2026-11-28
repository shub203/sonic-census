from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import User
from app.schemas.schemas import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    ChangePasswordRequest,
    UserRoleUpdateRequest,
)
from app.dependencies import (
    get_password_hash,
    verify_password,
    create_access_token,
    require_current_user,
    require_officer,
)
from app.security.rate_limit import rate_limit
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit("auth_register", max_requests=10, window_seconds=3600))],
)
def register(user_data: UserRegister, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")

    # Public signup is strictly locked to the lowest-privilege Citizen role
    user = User(
        name=user_data.name.strip(),
        email=user_data.email.lower(),
        password_hash=get_password_hash(user_data.password),
        role="citizen",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    AuditService.log_event(
        db=db,
        action="auth.register",
        resource_type="user",
        resource_id=user.id,
        actor=user,
        request=request,
        details={"role": "citizen"},
    )

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit("auth_login", max_requests=20, window_seconds=60))],
)
def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    email_norm = login_data.email.lower()
    user = db.query(User).filter(User.email == email_norm).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        AuditService.log_event(
            db=db,
            action="auth.login_failed",
            resource_type="user",
            actor=user,
            request=request,
            status_code=401,
            details={"email": email_norm},
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    AuditService.log_event(
        db=db,
        action="auth.login",
        resource_type="user",
        resource_id=user.id,
        actor=user,
        request=request,
    )

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(require_current_user)):
    return user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = get_password_hash(payload.new_password)
    db.commit()

    AuditService.log_event(
        db=db,
        action="auth.change_password",
        resource_type="user",
        resource_id=user.id,
        actor=user,
        request=request,
    )
    return {"message": "Password updated successfully"}


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_officer),
):
    return db.query(User).order_by(User.created_at.desc()).limit(200).all()


@router.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: str,
    payload: UserRoleUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_officer),
):
    allowed_roles = {"citizen", "analyst", "officer"}
    target_role = payload.role.strip().lower()
    if target_role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Allowed: {sorted(allowed_roles)}")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == admin.id and target_role != admin.role:
        raise HTTPException(status_code=400, detail="Cannot downgrade your own active officer session")

    prev_role = target.role
    target.role = target_role
    db.commit()
    db.refresh(target)

    AuditService.log_event(
        db=db,
        action="auth.role_change",
        resource_type="user",
        resource_id=target.id,
        actor=admin,
        request=request,
        details={"previous_role": prev_role, "new_role": target_role},
    )
    return target
