"""
M-Pesa Payment Service for Daraja API Integration.
Handles STK Push (M-Pesa Express) payments for Aditus subscriptions.
"""

import base64
import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.core.config import get_settings
from app.db.models import Transaction, TransactionStatus, User

logger = logging.getLogger(__name__)
settings = get_settings()


class MpesaService:
    """Service for handling M-Pesa Daraja API operations."""

    def __init__(self):
        self.consumer_key = settings.DARAJA_CONSUMER_KEY
        self.consumer_secret = settings.DARAJA_CONSUMER_SECRET
        self.passkey = settings.DARAJA_PASSKEY
        self.shortcode = settings.DARAJA_SHORTCODE
        self.callback_url = settings.DARAJA_CALLBACK_URL
        self.base_url = settings.DARAJA_BASE_URL or "https://sandbox.safaricom.co.ke"
        self.transaction_type = settings.DARAJA_TRANSACTION_TYPE or "CustomerPayBillOnline"
        
        # Token caching
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    async def get_access_token(self) -> str:
        """
        Get OAuth access token from Daraja API.
        Caches token for 50 minutes to avoid excessive API calls.
        """
        # Return cached token if still valid
        if self._access_token and self._token_expires_at:
            if datetime.utcnow() < self._token_expires_at:
                return self._access_token

        # Generate new token
        auth_url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        auth_string = f"{self.consumer_key}:{self.consumer_secret}"
        auth_bytes = base64.b64encode(auth_string.encode()).decode()

        headers = {
            "Authorization": f"Basic {auth_bytes}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(auth_url, headers=headers, timeout=30.0)
                response.raise_for_status()
                data = response.json()

                self._access_token = data.get("access_token")
                # Cache for 50 minutes (token valid for 60 minutes)
                self._token_expires_at = datetime.utcnow() + timedelta(minutes=50)

                logger.info("✅ M-Pesa access token obtained successfully")
                return self._access_token

        except httpx.HTTPError as e:
            logger.error(f"❌ Failed to get M-Pesa access token: {str(e)}")
            raise Exception(f"M-Pesa authentication failed: {str(e)}")

    def _generate_password(self) -> tuple[str, str]:
        """
        Generate M-Pesa password and timestamp.
        Password = Base64(Shortcode + Passkey + Timestamp)
        """
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password_string = f"{self.shortcode}{self.passkey}{timestamp}"
        password = base64.b64encode(password_string.encode()).decode()
        return password, timestamp

    def _format_phone_number(self, phone: str) -> str:
        """
        Format phone number to Kenyan M-Pesa format (254XXXXXXXXX).
        Accepts: 0712345678, 712345678, 254712345678, +254712345678
        """
        # Remove any whitespace and special characters
        phone = phone.strip().replace(" ", "").replace("-", "").replace("+", "")

        # Handle different formats
        if phone.startswith("254"):
            return phone
        elif phone.startswith("0"):
            return f"254{phone[1:]}"
        elif len(phone) == 9:  # Missing leading 0
            return f"254{phone}"
        else:
            raise ValueError(f"Invalid Kenyan phone number format: {phone}")

    async def initiate_stk_push(
        self,
        phone: str,
        amount: int,
        account_ref: str,
        description: str,
        db: AsyncSession,
        user: User,
    ) -> Dict[str, Any]:
        """
        Initiate M-Pesa STK Push payment request.
        
        Args:
            phone: Customer phone number
            amount: Amount in KES (whole numbers, not cents)
            account_ref: Account reference (plan type)
            description: Transaction description
            db: Database session
            user: User making the payment
            
        Returns:
            Dict with transaction details and checkout_request_id
        """
        try:
            # Format phone number
            formatted_phone = self._format_phone_number(phone)

            # Get access token
            access_token = await self.get_access_token()

            # Generate password and timestamp
            password, timestamp = self._generate_password()

            # Prepare STK Push request
            stk_url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }

            payload = {
                "BusinessShortCode": self.shortcode,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": self.transaction_type,  # CustomerPayBillOnline (Paybill) or CustomerBuyGoodsOnline (Till)
                "Amount": amount,
                "PartyA": formatted_phone,  # Customer phone
                "PartyB": self.shortcode,  # Your shortcode
                "PhoneNumber": formatted_phone,  # Customer phone (must match PartyA)
                "CallBackURL": self.callback_url,
                "AccountReference": account_ref,
                "TransactionDesc": description,
            }

            # Send STK Push request
            async with httpx.AsyncClient() as client:
                response = await client.post(stk_url, json=payload, headers=headers, timeout=30.0)
                response.raise_for_status()
                data = response.json()

            # Check if request was successful
            if data.get("ResponseCode") != "0":
                logger.error(f"❌ STK Push failed: {data.get('ResponseDescription')}")
                raise Exception(f"STK Push failed: {data.get('ResponseDescription')}")

            # Create transaction record
            transaction = Transaction(
                user_id=user.id,
                merchant_request_id=data.get("MerchantRequestID"),
                checkout_request_id=data.get("CheckoutRequestID"),
                amount=amount,
                phone_number=formatted_phone,
                account_reference=account_ref,
                transaction_desc=description,
                status=TransactionStatus.PENDING,
            )

            db.add(transaction)
            await db.commit()
            await db.refresh(transaction)

            logger.info(
                f"✅ STK Push initiated: {transaction.checkout_request_id} "
                f"for user {user.id} - KES {amount}"
            )

            return {
                "success": True,
                "transaction_id": transaction.id,
                "checkout_request_id": transaction.checkout_request_id,
                "merchant_request_id": transaction.merchant_request_id,
                "message": "Payment request sent. Please enter your M-Pesa PIN.",
                "phone_number": formatted_phone,
                "amount": amount,
            }

        except httpx.HTTPError as e:
            logger.error(f"❌ HTTP error during STK Push: {str(e)}")
            raise Exception(f"Payment request failed: {str(e)}")
        except Exception as e:
            logger.error(f"❌ Error initiating STK Push: {str(e)}")
            raise

    async def process_callback(
        self,
        callback_data: Dict[str, Any],
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Process M-Pesa callback from Daraja API.
        
        Args:
            callback_data: Full callback JSON from Safaricom
            db: Database session
            
        Returns:
            Dict with processing result
        """
        try:
            # Extract callback body
            body = callback_data.get("Body", {})
            stk_callback = body.get("stkCallback", {})

            merchant_request_id = stk_callback.get("MerchantRequestID")
            checkout_request_id = stk_callback.get("CheckoutRequestID")
            result_code = stk_callback.get("ResultCode")
            result_desc = stk_callback.get("ResultDesc")

            logger.info(
                f"📥 Processing M-Pesa callback: {checkout_request_id} "
                f"- Result Code: {result_code}"
            )

            # Find transaction
            stmt = select(Transaction).where(
                Transaction.checkout_request_id == checkout_request_id
            )
            result = await db.execute(stmt)
            transaction = result.scalar_one_or_none()

            if not transaction:
                logger.error(f"❌ Transaction not found: {checkout_request_id}")
                return {
                    "success": False,
                    "message": "Transaction not found",
                }

            # Update transaction with callback data
            transaction.result_code = result_code
            transaction.result_desc = result_desc
            transaction.callback_payload = callback_data

            # Process based on result code
            if result_code == 0:
                # Payment successful
                callback_metadata = stk_callback.get("CallbackMetadata", {})
                items = callback_metadata.get("Item", [])

                # Extract M-Pesa receipt number
                for item in items:
                    if item.get("Name") == "MpesaReceiptNumber":
                        transaction.mpesa_receipt_number = item.get("Value")
                        break

                transaction.status = TransactionStatus.COMPLETED
                transaction.completed_at = datetime.utcnow()

                logger.info(
                    f"✅ Payment completed: {transaction.mpesa_receipt_number} "
                    f"- KES {transaction.amount}"
                )

                # Unlock feature for user (handled in route)
                await db.commit()

                return {
                    "success": True,
                    "status": "completed",
                    "transaction_id": transaction.id,
                    "mpesa_receipt": transaction.mpesa_receipt_number,
                    "amount": transaction.amount,
                }

            elif result_code == 1032:
                # User cancelled payment
                transaction.status = TransactionStatus.CANCELLED
                logger.info(f"❌ Payment cancelled by user: {checkout_request_id}")

            elif result_code == 1037:
                # Timeout
                transaction.status = TransactionStatus.TIMEOUT
                logger.warning(f"⏱️ Payment timed out: {checkout_request_id}")

            elif result_code == 1:
                # Insufficient funds or other failure
                transaction.status = TransactionStatus.FAILED
                logger.warning(f"❌ Payment failed: {result_desc}")

            else:
                # Other error codes
                transaction.status = TransactionStatus.FAILED
                logger.error(f"❌ Payment error (code {result_code}): {result_desc}")

            await db.commit()

            return {
                "success": False,
                "status": transaction.status.value,
                "result_code": result_code,
                "result_desc": result_desc,
            }

        except Exception as e:
            logger.error(f"❌ Error processing callback: {str(e)}")
            return {
                "success": False,
                "message": f"Callback processing failed: {str(e)}",
            }

    async def check_transaction_status(
        self,
        checkout_request_id: str,
        db: AsyncSession,
    ) -> Optional[Dict[str, Any]]:
        """
        Check the status of a transaction by checkout_request_id.
        Used for polling from frontend.
        """
        stmt = select(Transaction).where(
            Transaction.checkout_request_id == checkout_request_id
        )
        result = await db.execute(stmt)
        transaction = result.scalar_one_or_none()

        if not transaction:
            return None

        return {
            "transaction_id": transaction.id,
            "status": transaction.status.value,
            "amount": transaction.amount,
            "phone_number": transaction.phone_number,
            "mpesa_receipt": transaction.mpesa_receipt_number,
            "result_code": transaction.result_code,
            "result_desc": transaction.result_desc,
            "created_at": transaction.created_at.isoformat(),
            "completed_at": transaction.completed_at.isoformat()
            if transaction.completed_at
            else None,
        }


# Singleton instance
mpesa_service = MpesaService()
