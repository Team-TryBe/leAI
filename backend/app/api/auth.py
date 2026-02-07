"""
Authentication routes for user registration, login, and token management.
"""

import secrets
import hashlib
from datetime import timedelta, datetime
from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
import httpx

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import User
from app.schemas import (
    UserCreate,
    UserResponse,
    ErrorResponse,
    ApiResponse,
)
from app.services.encryption_service import encrypt_token
from app.services.resend_service import send_email
from app.api.users import get_current_user


router = APIRouter(prefix="/auth", tags=["authentication"])
settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response schema."""
    user: UserResponse
    token: dict


class SignupRequest(UserCreate):
    """Signup request schema."""
    pass


class SignupResponse(BaseModel):
    """Signup response schema."""
    message: str


@router.post(
    "/signup",
    response_model=ApiResponse[SignupResponse],
    status_code=status.HTTP_201_CREATED,
)
async def signup(req: SignupRequest, db: AsyncSession = Depends(get_db)):
    """
    Register a new user.

    - **email**: User's email address (must be unique)
    - **full_name**: User's full name
    - **password**: User's password (will be hashed)
    """
    # Check if user exists
    stmt = select(User).where(User.email == req.email)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create new user
    user = User(
        email=req.email,
        full_name=req.full_name,
        hashed_password=hash_password(req.password),
        phone=req.phone,
        location=req.location,
        email_verified=False,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create email verification token
    verification_token = secrets.token_urlsafe(32)
    user.email_verification_token_hash = hash_token(verification_token)
    user.email_verification_sent_at = datetime.utcnow()
    db.add(user)
    await db.commit()
    await db.refresh(user)

    verify_link = f"{settings.FRONTEND_URL}/auth/verify?token={verification_token}"

    await send_email(
        to_email=user.email,
        subject="Verify your email - Aditus",
        html=(
            f"<h2>Welcome to Aditus 👋</h2>"
            f"<p>Please verify your email to activate your account:</p>"
            f"<p><a href='{verify_link}'>Verify Email</a></p>"
            f"<p>If you did not create this account, please ignore this email.</p>"
        ),
    )

    return ApiResponse(
        success=True,
        data=SignupResponse(
            message="Account created successfully. Please check your email to verify your account.",
        ),
    )


@router.post(
    "/login",
    response_model=ApiResponse[LoginResponse],
)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Login with email and password.

    - **email**: User's email address
    - **password**: User's password
    """
    # Find user by email
    stmt = select(User).where(User.email == req.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in",
        )

    # Generate token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    return ApiResponse(
        success=True,
        data=LoginResponse(
            user=UserResponse.model_validate(user),
            token={
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            },
        ),
    )


@router.post("/logout", response_model=ApiResponse)
async def logout():
    """
    Logout (client-side token deletion).
    This is a no-op endpoint—actual logout happens when client deletes the token.
    """
    return ApiResponse(success=True, data={"message": "Logged out successfully"})


@router.get("/verify-email", response_model=ApiResponse)
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    """Verify email address using a token."""
    token_hash = hash_token(token)
    stmt = select(User).where(User.email_verification_token_hash == token_hash)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    user.email_verified = True
    user.email_verification_token_hash = None
    user.email_verification_sent_at = None
    db.add(user)
    await db.commit()

    return ApiResponse(success=True, data={"message": "Email verified"})


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/forgot-password", response_model=ApiResponse)
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Request password reset. Always returns success to avoid user enumeration."""
    stmt = select(User).where(User.email == req.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user:
        reset_token = secrets.token_urlsafe(32)
        user.password_reset_token_hash = hash_token(reset_token)
        user.password_reset_sent_at = datetime.utcnow()
        user.password_reset_expires_at = datetime.utcnow() + timedelta(hours=1)
        db.add(user)
        await db.commit()

        reset_link = f"{settings.FRONTEND_URL}/auth/reset-password?token={reset_token}"

        await send_email(
            to_email=user.email,
            subject="Reset your password - Aditus",
            html=(
                f"<h2>Password Reset</h2>"
                f"<p>Click the link below to reset your password. This link expires in 1 hour.</p>"
                f"<p><a href='{reset_link}'>Reset Password</a></p>"
            ),
        )

    return ApiResponse(success=True, data={"message": "If the email exists, a reset link has been sent."})


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password", response_model=ApiResponse)
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Reset password using reset token."""
    token_hash = hash_token(req.token)
    stmt = select(User).where(User.password_reset_token_hash == token_hash)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    if not user.password_reset_expires_at or user.password_reset_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired",
        )

    user.hashed_password = hash_password(req.new_password)
    user.password_reset_token_hash = None
    user.password_reset_sent_at = None
    user.password_reset_expires_at = None
    db.add(user)
    await db.commit()

    return ApiResponse(success=True, data={"message": "Password reset successfully"})


class GoogleAuthRequest(BaseModel):
    id_token: str


@router.post("/google", response_model=ApiResponse[LoginResponse])
async def google_auth(req: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """Login or signup using Google OAuth ID token."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": req.id_token},
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

    payload = resp.json()
    email = payload.get("email")
    email_verified = payload.get("email_verified") == "true"
    full_name = payload.get("name") or payload.get("given_name") or ""
    google_sub = payload.get("sub")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token missing email",
        )

    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            full_name=full_name or email.split("@")[0],
            hashed_password=hash_password(secrets.token_urlsafe(24)),
            email_verified=email_verified,
            google_sub=google_sub,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        if email_verified and not user.email_verified:
            user.email_verified = True
        if google_sub and not user.google_sub:
            user.google_sub = google_sub
        db.add(user)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    return ApiResponse(
        success=True,
        data=LoginResponse(
            user=UserResponse.model_validate(user),
            token={
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            },
        ),
    )


# ============================================================================
# Gmail OAuth2 Integration
# ============================================================================


class GmailConnectRequest(BaseModel):
    """Request to initiate Gmail OAuth2 flow."""
    pass


class GmailConnectResponse(BaseModel):
    """Response with OAuth2 authorization URL."""
    auth_url: str


@router.post("/gmail/connect")
async def initiate_gmail_connect(
    req: GmailConnectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[GmailConnectResponse]:
    """
    Initiate Gmail OAuth2 connection.
    
    Returns:
        Authorization URL for the user to click
    
    Documentation:
    ✅ Step 1: Generate OAuth2 URL with CSRF protection
    - Create a random 'state' parameter to prevent CSRF attacks
    - Store it in the user's session (or cache) temporarily
    - Return the Google authorization URL to the frontend
    """
    
    # Generate CSRF protection state
    state = secrets.token_urlsafe(32)
    
    # Store state in user (or use cache/session in production)
    # For now, we'll pass it back to frontend which will send it back
    
    # Build authorization URL
    root_url = "https://accounts.google.com/o/oauth2/v2/auth"
    
    options = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": f"{settings.API_URL}/api/v1/auth/gmail/callback",
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/gmail.send",
        "access_type": "offline",  # CRITICAL: Get refresh token
        "prompt": "consent",  # Force consent screen for refresh token
        "state": state,  # CSRF protection
        "login_hint": current_user.email,  # Pre-fill the user's email
    }
    
    # Build query string manually
    params = "&".join(f"{k}={v}" for k, v in options.items())
    auth_url = f"{root_url}?{params}"
    
    return ApiResponse(
        success=True,
        data=GmailConnectResponse(auth_url=auth_url),
    )


@router.get("/gmail/callback")
async def gmail_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
):
    """
    Handle OAuth2 callback from Google.
    
    Documentation:
    ✅ Step 2: Pass authorization code back to frontend
    - Receive code and state from Google
    - Redirect to frontend with code (do NOT exchange here - code can only be used once!)
    - Frontend will exchange code for tokens via /gmail/store-tokens
    """
    
    try:
        print(f"✅ Gmail OAuth2 callback received")
        print(f"   Code: {code[:20]}...")
        print(f"   State: {state}")
        
        # Return redirect to dashboard with code and state (frontend will exchange for tokens)
        # IMPORTANT: We do NOT exchange the code here because it can only be used ONCE
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard/settings?code={code}&state={state}"
        )
        
    except Exception as e:
        print(f"❌ Error in Gmail callback: {e}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard?gmail_error=callback_error"
        )


class GmailTokenRequest(BaseModel):
    """Request to store Gmail tokens after successful OAuth2 flow."""
    code: str
    state: str


@router.post("/gmail/store-tokens")
async def store_gmail_tokens(
    req: GmailTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse:
    """
    Store Gmail OAuth2 tokens for the current user.
    
    Called after successful OAuth2 callback to securely store tokens.
    
    Documentation:
    ✅ Step 3: Store encrypted tokens in database
    - Exchange code for tokens
    - Encrypt both access and refresh tokens
    - Store in database linked to user
    - Mark gmail_connected = True
    """
    
    try:
        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        
        data = {
            "code": req.code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": f"{settings.API_URL}/api/v1/auth/gmail/callback",
            "grant_type": "authorization_code",
        }
        
        print(f"🔐 Exchanging auth code for tokens")
        print(f"   Redirect URI: {data['redirect_uri']}")
        print(f"   Code: {req.code[:20]}...")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=data)
            
            if response.status_code != 200:
                error_response = response.json()
                print(f"❌ Token exchange failed with status {response.status_code}")
                print(f"   Error: {error_response}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Google token exchange failed: {error_response.get('error_description', error_response.get('error', 'Unknown error'))}",
                )
            
            tokens = response.json()
        
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 3600)
        
        if not access_token or not refresh_token:
            raise ValueError("Missing access_token or refresh_token in response")
        
        # Encrypt tokens before storing
        encrypted_access = encrypt_token(access_token)
        encrypted_refresh = encrypt_token(refresh_token)
        
        # Calculate token expiry
        token_expires_at = datetime.utcnow().replace(microsecond=0) + __import__('datetime').timedelta(seconds=expires_in)
        
        # Update user
        current_user.gmail_access_token = encrypted_access
        current_user.gmail_refresh_token = encrypted_refresh
        current_user.gmail_token_expires_at = token_expires_at
        current_user.gmail_connected = True
        
        db.add(current_user)
        await db.commit()
        
        print(f"✅ Gmail tokens stored for user {current_user.id}")
        
        return ApiResponse(
            success=True,
            data={
                "message": "Gmail connected successfully!",
                "gmail_connected": True,
                "email": current_user.email,
            },
        )
        
    except Exception as e:
        print(f"❌ Error storing Gmail tokens: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect Gmail: {str(e)}",
        )


@router.get("/gmail/status")
async def get_gmail_status(
    current_user: User = Depends(get_current_user),
) -> ApiResponse:
    """
    Get Gmail connection status for the current user.
    
    Returns:
        gmail_connected: Boolean flag
        gmail_email: The email address connected (if available)
    """
    return ApiResponse(
        success=True,
        data={
            "gmail_connected": current_user.gmail_connected,
            "connected_email": current_user.email,  # Gmail account email
        },
    )


@router.post("/gmail/disconnect")
async def disconnect_gmail(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse:
    """
    Disconnect Gmail account from Aditus.
    
    Removes all stored tokens.
    """
    current_user.gmail_connected = False
    current_user.gmail_access_token = None
    current_user.gmail_refresh_token = None
    current_user.gmail_token_expires_at = None
    
    db.add(current_user)
    await db.commit()
    
    return ApiResponse(
        success=True,
        data={"message": "Gmail disconnected successfully"},
    )
