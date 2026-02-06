"""
Gmail API service for sending emails using OAuth2 credentials.
Handles token refresh and email sending via Gmail API.
"""

import base64
import httpx
from datetime import datetime
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email import encoders
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.db.models import User
from app.services.encryption_service import decrypt_token, encrypt_token

settings = get_settings()


class GmailService:
    """Service for handling Gmail API operations."""
    
    GMAIL_API_URL = "https://www.googleapis.com/gmail/v1/users/me/messages/send"
    TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
    
    @staticmethod
    async def refresh_access_token(refresh_token: str) -> dict:
        """
        Refresh the access token using the refresh token.
        
        Returns:
            dict: Contains 'access_token', 'expires_in', and other OAuth2 fields
        """
        data = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(GmailService.TOKEN_ENDPOINT, data=data)
            response.raise_for_status()
            return response.json()
    
    @staticmethod
    async def send_email(
        user_id: int,
        db: AsyncSession,
        to_emails: list[str],
        cc_emails: list[str] | None = None,
        subject: str = "",
        body: str = "",
        attachments: dict[str, bytes] | None = None,
    ) -> dict:
        """
        Send an email via Gmail API.
        
        Args:
            user_id: User ID to fetch tokens for
            db: Database session
            to_emails: List of recipient email addresses
            cc_emails: List of CC email addresses (optional)
            subject: Email subject
            body: Email body (HTML or plain text)
            attachments: Dict of {filename: file_content} for attachments
            
        Returns:
            dict: Response from Gmail API with message ID
            
        Raises:
            HTTPException: If user has no Gmail connection or token refresh fails
        """
        # Fetch user with Gmail tokens
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user or not user.gmail_refresh_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gmail account not connected. Please connect Gmail first.",
            )
        
        # Decrypt refresh token
        refresh_token = decrypt_token(user.gmail_refresh_token)
        
        # Check if access token needs refresh
        access_token = None
        if user.gmail_access_token and user.gmail_token_expires_at:
            if datetime.utcnow() < user.gmail_token_expires_at:
                access_token = decrypt_token(user.gmail_access_token)
        
        # If no valid access token, refresh it
        if not access_token:
            token_response = await GmailService.refresh_access_token(refresh_token)
            access_token = token_response.get("access_token")
            
            # Update user with new access token (don't store refresh token again)
            if access_token:
                user.gmail_access_token = encrypt_token(access_token)
                # Calculate expiry: current time + expires_in
                expires_in = token_response.get("expires_in", 3600)
                user.gmail_token_expires_at = datetime.utcnow().replace(
                    microsecond=0
                ) + __import__('datetime').timedelta(seconds=expires_in)
                await db.commit()
        
        # Create MIME message
        message = MIMEMultipart("alternative")
        message["To"] = ", ".join(to_emails)
        message["Subject"] = subject
        
        if cc_emails:
            message["Cc"] = ", ".join(cc_emails)
        
        # Add HTML body
        message.attach(MIMEText(body, "html"))
        
        # Add attachments
        if attachments:
            for filename, file_content in attachments.items():
                part = MIMEBase("application", "octet-stream")
                part.set_payload(file_content)
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename= {filename}",
                )
                message.attach(part)
        
        # Encode message to base64
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        # Send via Gmail API
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        
        payload = {"raw": raw_message}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                GmailService.GMAIL_API_URL,
                json=payload,
                headers=headers,
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to send email: {response.text}",
                )
            
            return response.json()
