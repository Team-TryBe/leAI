# Paystack Payment Integration Guide - Aditus

**Project:** Aditus (LeAI) - Career Workflow Automation for Kenyan Job Market  
**Payment Provider:** Paystack (with M-Pesa support)  
**Status:** Implementation Guide  
**Date:** February 2026

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Paystack M-Pesa Flow](#paystack-mpesa-flow)
3. [Account Setup & Configuration](#account-setup--configuration)
4. [Database Schema](#database-schema)
5. [API Implementation](#api-implementation)
6. [Payment Lifecycle](#payment-lifecycle)
7. [Webhook Handling](#webhook-handling)
8. [Error Handling & Edge Cases](#error-handling--edge-cases)
9. [Testing & Validation](#testing--validation)
10. [Production Deployment](#production-deployment)
11. [Troubleshooting](#troubleshooting)

---

## Overview & Architecture

### Why Paystack + M-Pesa?

**Paystack Benefits:**
- ✅ Seamless M-Pesa integration for Kenyan market
- ✅ PCI-DSS compliant (no card data on your servers)
- ✅ Highest transaction success rate in Africa
- ✅ Built-in fraud detection
- ✅ Excellent documentation and support
- ✅ Fast settlements (2-3 business days)
- ✅ Competitive fees (1.5% + ₦100 for M-Pesa in Kenya)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Aditus Frontend                          │
│                    (Next.js 14)                              │
└────────────────┬──────────────────────────────────────────────┘
                 │
        ┌────────▼────────┐
        │ Payment Page    │
        │ (React Form)    │
        └────────┬────────┘
                 │
        ┌────────▼────────────────────────┐
        │ FastAPI Backend                 │
        │ /api/v1/payments/               │
        └────────┬──────────────────────────┘
                 │
    ┌────────────┴────────────────┐
    │                             │
    ▼                             ▼
┌─────────────────┐      ┌──────────────────┐
│ Paystack API    │      │ PostgreSQL       │
│ - Initiate      │      │ - Payments table │
│ - Verify        │      │ - Transactions   │
│ - Webhooks      │      │ - Subscription   │
└─────────────────┘      └──────────────────┘
    │
    └─────────────────────────────────┐
                                      │
                    ┌─────────────────▼─────────────────┐
                    │  M-Pesa Prompt (Paystack)         │
                    │  User enters phone/confirms       │
                    └───────────────────────────────────┘
```

### Integration Flow

```
1. USER INITIATES PAYMENT
   ↓
2. CREATE PAYMENT INTENT (Backend → Paystack)
   ↓
3. REDIRECT TO PAYSTACK CHECKOUT
   ↓
4. USER SELECTS M-PESA
   ↓
5. USER ENTERS PHONE & CONFIRMS
   ↓
6. PAYMENT PROCESSING (Background)
   ↓
7. WEBHOOK NOTIFICATION (Paystack → Backend)
   ↓
8. UPDATE DATABASE & SUBSCRIPTION
   ↓
9. REDIRECT SUCCESS → Frontend
   ↓
10. UPDATE SUBSCRIPTION STATUS
```

---

## Paystack M-Pesa Flow

### Step-by-Step User Journey

#### Phase 1: Initiation (Frontend → Backend)
```
POST /api/v1/payments/initiate
{
  "email": "user@example.com",
  "plan_id": 2,                    // Pro Monthly
  "amount": 9900,                  // In KES cents (99.00 KES)
  "quantity": 1,
  "metadata": {
    "user_id": 123,
    "plan_type": "pro",
    "billing_cycle": "monthly"
  }
}
```

#### Phase 2: Paystack Authorization
- Backend calls: `POST https://api.paystack.co/transaction/initialize`
- Response includes:
  - `authorization_url` - Redirect user here
  - `access_code` - Unique payment session ID
  - `reference` - Payment reference for webhook

#### Phase 3: Checkout (User's Browser)
- User redirected to Paystack hosted checkout page
- Paystack UI presents payment methods (M-Pesa, Card, etc.)
- User selects M-Pesa
- User confirms phone number
- M-Pesa prompt appears on user's phone

#### Phase 4: Confirmation (User's Phone)
- User receives M-Pesa prompt
- User enters M-Pesa PIN
- M-Pesa processes payment

#### Phase 5: Webhook Notification (Paystack → Backend)
- Paystack sends webhook to your callback URL
- Webhook includes payment status
- Backend updates database
- Subscription activated

#### Phase 6: Redirect (Browser)
- User redirected back to frontend
- Frontend checks payment status via API
- Shows success/failure message
- Updates UI

---

## Account Setup & Configuration

### 1. Paystack Account Prerequisites

**You Already Have:**
- ✅ Paystack account created
- ✅ M-Pesa pre-approval (can receive M-Pesa payments)
- ✅ Business verified

**What You Need to Verify:**
```
1. Login to https://dashboard.paystack.com
2. Go to Settings → API Keys & Webhooks
3. Note your:
   - Public Key (starts with: pk_live_...)
   - Secret Key (starts with: sk_live_...)
4. Go to Settings → Webhook
5. Set Webhook URL:
   https://your-domain.com/api/v1/payments/webhook
```

### 2. Environment Variables

Add to `.env` file:

```bash
# ============================================
# PAYSTACK CONFIGURATION
# ============================================

# API Keys
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx

# Webhook verification (Paystack signs webhooks with this)
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Callback URLs (after payment)
PAYSTACK_CALLBACK_SUCCESS=https://your-domain.com/subscription/success
PAYSTACK_CALLBACK_CANCEL=https://your-domain.com/subscription/cancel

# Payment configuration
PAYSTACK_CURRENCY=KES
PAYSTACK_TIMEOUT=30  # Seconds to wait for payment initialization

# Environment
ENVIRONMENT=production  # or staging/development
```

### 3. Environment Setup in `app/core/config.py`

```python
from pydantic import BaseSettings

class Settings(BaseSettings):
    # Paystack Configuration
    PAYSTACK_PUBLIC_KEY: str
    PAYSTACK_SECRET_KEY: str
    PAYSTACK_WEBHOOK_SECRET: str
    PAYSTACK_CALLBACK_SUCCESS: str
    PAYSTACK_CALLBACK_CANCEL: str
    PAYSTACK_CURRENCY: str = "KES"
    PAYSTACK_TIMEOUT: int = 30
    
    class Config:
        env_file = ".env"
```

---

## Database Schema

### 1. Payment Records Table

```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    
    -- User Reference
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    
    -- Payment Details
    reference VARCHAR(255) NOT NULL UNIQUE,      -- Paystack reference
    access_code VARCHAR(255),                     -- Access code from Paystack
    authorization_url TEXT,                       -- Checkout URL
    
    -- Amount Information
    amount INTEGER NOT NULL,                      -- In KES cents (e.g., 9900 = 99.00)
    currency VARCHAR(3) DEFAULT 'KES',
    
    -- Payment Method
    payment_method VARCHAR(50),                   -- 'mpesa', 'card', 'bank_transfer'
    payer_phone VARCHAR(20),                      -- M-Pesa phone (07xxxxxxxx)
    
    -- Status Tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, success, failed, abandoned
    failure_reason TEXT,                          -- Why payment failed
    
    -- Linked Records
    plan_id INTEGER REFERENCES plans(id),
    subscription_id INTEGER REFERENCES subscriptions(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    initiated_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,                        -- Payment expires after 24h
    
    -- Indexing
    INDEX idx_user_id (user_id),
    INDEX idx_reference (reference),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at)
);
```

### 2. Transaction History Table

```sql
CREATE TABLE payment_transactions (
    id SERIAL PRIMARY KEY,
    
    -- Payment Reference
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    
    -- Transaction Details
    transaction_id VARCHAR(255),                  -- Paystack transaction ID
    receipt_number VARCHAR(255),                  -- M-Pesa receipt
    
    -- Status
    status VARCHAR(50),                           -- completed, failed, pending_authorization
    message TEXT,
    
    -- Timing
    timestamp TIMESTAMP,
    
    -- Raw Response
    raw_response JSONB,                          -- Full Paystack response
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_payment_id (payment_id),
    INDEX idx_transaction_id (transaction_id)
);
```

### 3. Payment Logs Table

```sql
CREATE TABLE payment_logs (
    id SERIAL PRIMARY KEY,
    
    -- Reference
    payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
    
    -- Event Information
    event_type VARCHAR(50),                      -- 'initiated', 'success', 'failure', 'webhook_received'
    message TEXT,
    
    -- Technical Details
    request_data JSONB,
    response_data JSONB,
    error_details JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_payment_id (payment_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
);
```

### 4. Update Subscription Model

```python
# In app/db/models.py

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    # ... existing fields ...
    
    # Payment Reference
    last_payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)
    last_payment_status = Column(String(50), nullable=True)
    
    # Payment Method
    payment_method = Column(String(50), nullable=True)  # mpesa, card, bank_transfer
    payer_phone = Column(String(20), nullable=True)     # M-Pesa phone number
    
    # Billing Info
    billing_cycle = Column(String(50), nullable=True)   # monthly, annual
    next_billing_date = Column(DateTime, nullable=True)
    
    # Relationships
    last_payment = relationship("Payment", foreign_keys=[last_payment_id])
```

---

## API Implementation

### 1. PaystackService (Core Service)

**File:** `/backend/app/services/paystack_service.py`

```python
"""
Paystack Payment Service - Handles M-Pesa and other payment methods
"""

import httpx
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.db.models import Payment, PaymentTransaction, PaymentLog, User, Plan, Subscription

logger = logging.getLogger(__name__)
settings = get_settings()


class PaystackError(Exception):
    """Base exception for Paystack operations"""
    pass


class PaymentInitializationError(PaystackError):
    """Raised when payment initialization fails"""
    pass


class WebhookVerificationError(PaystackError):
    """Raised when webhook verification fails"""
    pass


class PaystackService:
    """
    Service for handling Paystack payment operations.
    
    Supports:
    - Payment initialization (M-Pesa, Card, Bank Transfer)
    - Payment verification
    - Webhook handling
    - Transaction history
    
    Uses Paystack API v1 endpoints:
    - POST /transaction/initialize - Start payment
    - GET /transaction/verify/{reference} - Check payment status
    """
    
    BASE_URL = "https://api.paystack.co"
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.api_key = settings.PAYSTACK_SECRET_KEY
        self.public_key = settings.PAYSTACK_PUBLIC_KEY
        self.webhook_secret = settings.PAYSTACK_WEBHOOK_SECRET
        self.timeout = settings.PAYSTACK_TIMEOUT
        self.currency = settings.PAYSTACK_CURRENCY
        
    async def initialize_payment(
        self,
        user_id: int,
        email: str,
        amount: int,  # In KES cents (e.g., 9900 = 99.00)
        plan_id: Optional[int] = None,
        payment_method: Optional[str] = "mpesa",  # mpesa, card, bank_transfer
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Initialize a payment transaction.
        
        Args:
            user_id: User making payment
            email: User's email for receipt
            amount: Amount in KES cents
            plan_id: Plan being purchased
            payment_method: Preferred payment method
            metadata: Additional data to track
            
        Returns:
            {
                "authorization_url": "https://checkout.paystack.com/...",
                "access_code": "xxxxx",
                "reference": "xxxxx",
                "amount": 9900,
                "payment_id": 123
            }
        """
        try:
            # Validate amount
            if amount <= 0:
                raise PaymentInitializationError("Amount must be greater than 0")
            
            # Prepare metadata
            if not metadata:
                metadata = {}
            
            metadata.update({
                "user_id": user_id,
                "plan_id": plan_id,
                "payment_method": payment_method,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Prepare Paystack request
            payload = {
                "email": email,
                "amount": amount,
                "currency": self.currency,
                "metadata": metadata,
                "channels": ["mobile_money"] if payment_method == "mpesa" else None,
            }
            
            # Remove None values
            payload = {k: v for k, v in payload.items() if v is not None}
            
            logger.info(f"Initializing payment: user_id={user_id}, amount={amount}")
            
            # Call Paystack API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/transaction/initialize",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=self.timeout
                )
            
            if response.status_code != 200:
                error_msg = response.json().get("message", "Payment initialization failed")
                logger.error(f"Paystack error: {error_msg}")
                raise PaymentInitializationError(error_msg)
            
            data = response.json()
            
            if not data.get("status"):
                raise PaymentInitializationError(data.get("message", "Unknown error"))
            
            paystack_data = data["data"]
            reference = paystack_data["reference"]
            access_code = paystack_data["access_code"]
            authorization_url = paystack_data["authorization_url"]
            
            # Store payment record
            payment = Payment(
                user_id=user_id,
                reference=reference,
                access_code=access_code,
                authorization_url=authorization_url,
                amount=amount,
                currency=self.currency,
                payment_method=payment_method,
                plan_id=plan_id,
                status="pending",
                metadata=metadata,
                initiated_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(hours=24)
            )
            
            self.db.add(payment)
            await self.db.flush()
            await self.db.refresh(payment)
            
            # Log initialization
            await self._log_payment_event(
                payment.id,
                "initiated",
                f"Payment initialized: {amount} {self.currency}",
                payload,
                paystack_data
            )
            
            logger.info(f"Payment initialized: reference={reference}, amount={amount}")
            
            return {
                "authorization_url": authorization_url,
                "access_code": access_code,
                "reference": reference,
                "amount": amount,
                "payment_id": payment.id
            }
            
        except httpx.TimeoutException:
            logger.error(f"Paystack API timeout: {self.timeout}s")
            raise PaymentInitializationError(f"Payment service timeout (>{self.timeout}s)")
        except Exception as e:
            logger.error(f"Payment initialization error: {str(e)}")
            raise
    
    async def verify_payment(self, reference: str) -> Dict[str, Any]:
        """
        Verify payment status with Paystack.
        
        Args:
            reference: Payment reference from Paystack
            
        Returns:
            {
                "status": "success|failed|pending",
                "amount": 9900,
                "message": "Verification successful",
                "transaction_id": "xxxxx",
                "receipt": "xxxxx"
            }
        """
        try:
            logger.info(f"Verifying payment: {reference}")
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/transaction/verify/{reference}",
                    headers=self._get_headers(),
                    timeout=self.timeout
                )
            
            if response.status_code != 200:
                logger.error(f"Verification failed: HTTP {response.status_code}")
                raise PaystackError("Payment verification failed")
            
            data = response.json()
            
            if not data.get("status"):
                logger.warning(f"Verification returned false: {data}")
                return {
                    "status": "pending",
                    "message": data.get("message", "Payment verification pending")
                }
            
            transaction = data["data"]
            
            # Update payment record in database
            await self._update_payment_from_verification(reference, transaction)
            
            return {
                "status": "success" if transaction["status"] == "success" else "failed",
                "amount": transaction["amount"],
                "message": transaction.get("message", "Payment processed"),
                "transaction_id": transaction.get("id"),
                "receipt": transaction.get("reference")
            }
            
        except Exception as e:
            logger.error(f"Verification error: {str(e)}")
            raise
    
    def verify_webhook_signature(self, signature: str, body: bytes) -> bool:
        """
        Verify webhook signature to ensure it's from Paystack.
        
        Args:
            signature: x-paystack-signature header from Paystack
            body: Raw request body
            
        Returns:
            True if signature is valid, False otherwise
        """
        import hmac
        import hashlib
        
        computed_hash = hmac.new(
            self.webhook_secret.encode(),
            body,
            hashlib.sha512
        ).hexdigest()
        
        is_valid = computed_hash == signature
        
        if not is_valid:
            logger.warning(f"Invalid webhook signature: {signature}")
        
        return is_valid
    
    async def handle_webhook(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle Paystack webhook event.
        
        Args:
            event_data: Webhook payload from Paystack
            
        Returns:
            Success confirmation
        """
        try:
            event = event_data.get("event")
            data = event_data.get("data", {})
            
            reference = data.get("reference")
            status = data.get("status")
            
            logger.info(f"Webhook received: event={event}, reference={reference}, status={status}")
            
            if event == "charge.success":
                await self._handle_charge_success(data)
            elif event == "charge.failed":
                await self._handle_charge_failed(data)
            else:
                logger.warning(f"Unknown event type: {event}")
            
            return {"success": True, "message": "Webhook processed"}
            
        except Exception as e:
            logger.error(f"Webhook handling error: {str(e)}")
            raise
    
    async def _handle_charge_success(self, transaction_data: Dict[str, Any]) -> None:
        """Handle successful payment."""
        reference = transaction_data.get("reference")
        
        # Find payment record
        stmt = select(Payment).where(Payment.reference == reference)
        result = await self.db.execute(stmt)
        payment = result.scalar_one_or_none()
        
        if not payment:
            logger.error(f"Payment not found: {reference}")
            return
        
        # Update payment status
        payment.status = "success"
        payment.completed_at = datetime.utcnow()
        payment.payer_phone = transaction_data.get("phone_number")
        
        # Create transaction record
        transaction = PaymentTransaction(
            payment_id=payment.id,
            transaction_id=transaction_data.get("id"),
            receipt_number=transaction_data.get("receipt_number"),
            status="completed",
            message="Payment successful",
            timestamp=datetime.utcnow(),
            raw_response=transaction_data
        )
        
        self.db.add(transaction)
        
        # Activate subscription if plan is linked
        if payment.plan_id:
            await self._activate_subscription(payment.user_id, payment.plan_id)
        
        await self.db.commit()
        
        logger.info(f"Payment marked as success: {reference}")
    
    async def _handle_charge_failed(self, transaction_data: Dict[str, Any]) -> None:
        """Handle failed payment."""
        reference = transaction_data.get("reference")
        
        stmt = select(Payment).where(Payment.reference == reference)
        result = await self.db.execute(stmt)
        payment = result.scalar_one_or_none()
        
        if not payment:
            logger.error(f"Payment not found: {reference}")
            return
        
        payment.status = "failed"
        payment.failure_reason = transaction_data.get("gateway_response", "Unknown error")
        
        transaction = PaymentTransaction(
            payment_id=payment.id,
            status="failed",
            message=payment.failure_reason,
            timestamp=datetime.utcnow(),
            raw_response=transaction_data
        )
        
        self.db.add(transaction)
        await self.db.commit()
        
        logger.warning(f"Payment marked as failed: {reference}")
    
    async def _activate_subscription(self, user_id: int, plan_id: int) -> None:
        """Activate subscription after successful payment."""
        # Get plan details
        stmt = select(Plan).where(Plan.id == plan_id)
        result = await self.db.execute(stmt)
        plan = result.scalar_one_or_none()
        
        if not plan:
            logger.error(f"Plan not found: {plan_id}")
            return
        
        # Create or update subscription
        stmt = select(Subscription).where(Subscription.user_id == user_id)
        result = await self.db.execute(stmt)
        subscription = result.scalar_one_or_none()
        
        now = datetime.utcnow()
        
        if subscription:
            # Extend existing subscription
            if subscription.status == "active":
                subscription.end_date = subscription.end_date + timedelta(days=30)
            else:
                subscription.start_date = now
                subscription.end_date = now + timedelta(days=30)
                subscription.status = "active"
        else:
            # Create new subscription
            subscription = Subscription(
                user_id=user_id,
                plan_id=plan_id,
                start_date=now,
                end_date=now + timedelta(days=30),
                status="active",
                payment_method="mpesa"
            )
            self.db.add(subscription)
        
        logger.info(f"Subscription activated: user_id={user_id}, plan_id={plan_id}")
    
    async def _update_payment_from_verification(
        self,
        reference: str,
        transaction_data: Dict[str, Any]
    ) -> None:
        """Update payment record based on verification response."""
        stmt = select(Payment).where(Payment.reference == reference)
        result = await self.db.execute(stmt)
        payment = result.scalar_one_or_none()
        
        if not payment:
            return
        
        if transaction_data.get("status") == "success":
            payment.status = "success"
            payment.completed_at = datetime.utcnow()
            payment.payer_phone = transaction_data.get("phone_number")
        elif transaction_data.get("status") == "failed":
            payment.status = "failed"
            payment.failure_reason = transaction_data.get("gateway_response", "Unknown error")
        
        await self.db.commit()
    
    async def _log_payment_event(
        self,
        payment_id: int,
        event_type: str,
        message: str,
        request_data: Dict[str, Any],
        response_data: Dict[str, Any]
    ) -> None:
        """Log payment event for debugging."""
        log = PaymentLog(
            payment_id=payment_id,
            event_type=event_type,
            message=message,
            request_data=request_data,
            response_data=response_data
        )
        
        self.db.add(log)
        await self.db.commit()
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Paystack API requests."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
```

---

## Payment Lifecycle

### Complete Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  1. PAYMENT INITIATION                      │
└─────────────────────────────────────────────────────────────┘
     │
     │ Frontend calls: POST /api/v1/payments/initiate
     │ Body: { email, plan_id, amount }
     ▼
┌─────────────────────────────────────────────────────────────┐
│              2. BACKEND VALIDATION                           │
│  • Check user exists                                         │
│  • Validate amount and plan                                  │
│  • Check user not already subscribed                         │
└─────────────────────────────────────────────────────────────┘
     │
     │ Calls: PaystackService.initialize_payment()
     ▼
┌─────────────────────────────────────────────────────────────┐
│           3. PAYSTACK API INITIALIZATION                     │
│  POST https://api.paystack.co/transaction/initialize         │
│  Response includes:                                          │
│  • authorization_url (checkout page)                         │
│  • access_code (payment session)                             │
│  • reference (payment ID)                                    │
└─────────────────────────────────────────────────────────────┘
     │
     │ Returns: authorization_url to frontend
     ▼
┌─────────────────────────────────────────────────────────────┐
│        4. PAYMENT RECORD STORED IN DATABASE                  │
│  payments table:                                             │
│  • reference = paystack_reference                            │
│  • status = 'pending'                                        │
│  • amount = 9900 (99.00 KES)                                 │
│  • expires_at = now + 24 hours                               │
└─────────────────────────────────────────────────────────────┘
     │
     │ Redirect user to authorization_url
     ▼
┌─────────────────────────────────────────────────────────────┐
│          5. PAYSTACK CHECKOUT PAGE (User's Browser)          │
│  • Paystack displays payment methods                         │
│  • User selects M-Pesa                                       │
│  • M-Pesa popup appears                                      │
└─────────────────────────────────────────────────────────────┘
     │
     │ User enters M-Pesa PIN
     ▼
┌─────────────────────────────────────────────────────────────┐
│          6. SAFARICOM PROCESSES M-PESA PAYMENT               │
│  • Deducts from user's M-Pesa account                        │
│  • Sends confirmation to Paystack                            │
└─────────────────────────────────────────────────────────────┘
     │
     │ (Parallel paths: 6a Webhook + 6b User redirect)
     ├─────────────────────────┬──────────────────────────┐
     ▼                         ▼
┌─────────────────────────┐  ┌──────────────────────────┐
│ 7a. WEBHOOK RECEIVED    │  │ 7b. USER REDIRECTED      │
│ (Async, from Paystack)  │  │ (Sync, to callback URL)  │
│                         │  │                          │
│ POST /api/v1/payments/  │  │ GET /subscription/       │
│ webhook                 │  │ success?reference=xxxxx  │
│                         │  │                          │
│ Headers:                │  │ Frontend polls API for   │
│ x-paystack-signature    │  │ payment status           │
│                         │  │                          │
│ Body:                   │  │ (Frontend should verify) │
│ { event, data }         │  └──────────────────────────┘
│                         │
│ Signature validation    │
│ ✓ Valid = Process       │
│ ✗ Invalid = Reject      │
└─────────────────────────┘
     │
     │ Update: payments.status = 'success'
     │ Call: activate_subscription()
     │ Activate: subscriptions table
     ▼
┌─────────────────────────────────────────────────────────────┐
│           8. SUBSCRIPTION ACTIVATED                          │
│  • Create subscription record                                │
│  • Set end_date = now + 30 days (monthly) or 365 (annual)   │
│  • Update user.subscription_status = 'active'                │
│  • Log payment success                                       │
└─────────────────────────────────────────────────────────────┘
     │
     │ (Optional: Send email confirmation)
     ▼
┌─────────────────────────────────────────────────────────────┐
│         9. FRONTEND RECEIVES CONFIRMATION                    │
│  • Show success message                                      │
│  • Redirect to dashboard                                     │
│  • Update user's subscription status in UI                   │
└─────────────────────────────────────────────────────────────┘
```

### Status Transitions

```
Payment Status Flow:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  pending (0-24 hours)
    │
    ├─→ success ──→ (activate subscription)
    │
    ├─→ failed ──→ (show error, allow retry)
    │
    └─→ abandoned ──→ (expires after 24h, cleanup)


Subscription Status Flow:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  inactive
    │
    └─→ active (payment success)
         │
         ├─→ renewal_pending (7 days before expiry)
         │
         ├─→ expired (end_date passed, no renewal)
         │
         └─→ cancelled (user cancels)
```

---

## Webhook Handling

### 1. Webhook Configuration

In Paystack Dashboard:
```
Settings → Webhook
URL: https://your-domain.com/api/v1/payments/webhook
Test the connection
```

### 2. Webhook Events

Paystack sends these events:

| Event | Triggered | Action |
|-------|-----------|--------|
| `charge.success` | M-Pesa/payment successful | Activate subscription |
| `charge.failed` | M-Pesa/payment failed | Mark payment failed, log error |
| `transfer.success` | Settlement to your account | Update accounting |
| `customer.create` | New customer created | Optional: sync customer data |

### 3. Webhook Payload Example

```json
{
  "event": "charge.success",
  "data": {
    "id": 1234567890,
    "reference": "pslv_xxxxx",
    "authorization": {
      "authorization_code": "AUTH_xxxx",
      "bin": "539999",
      "last4": "9999",
      "exp_month": 10,
      "exp_year": 2025,
      "channel": "mpesa",
      "card_type": "mobile_money",
      "bank": "Safaricom",
      "country_code": "KE",
      "brand": "M-Pesa",
      "reusable": true,
      "signature": "sig_xxxxx",
      "account_name": null
    },
    "customer": {
      "id": 1234567,
      "customer_code": "CUS_xxxxx",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "07xxxxxxxx"
    },
    "plan": {},
    "order_id": null,
    "amount": 9900,
    "currency": "KES",
    "fees": 150,
    "net": 9750,
    "status": "success",
    "message": "Approved",
    "gateway_response": "Successful",
    "paid_at": "2026-02-19T10:30:45.000Z",
    "created_at": "2026-02-19T10:30:45.000Z",
    "receipt_number": "xxxxx",
    "phone_number": "07xxxxxxxx"
  }
}
```

---

## Error Handling & Edge Cases

### Common Errors & Solutions

```
Error 1: "Reference not found"
├─ Cause: Payment already processed or invalid reference
├─ Solution: Check payment_id, ensure idempotency
└─ Code: Return 404

Error 2: "Webhook signature invalid"
├─ Cause: Webhook from non-Paystack source
├─ Solution: Reject and log, verify PAYSTACK_WEBHOOK_SECRET
└─ Code: Return 401

Error 3: "User already has active subscription"
├─ Cause: User trying to buy while subscribed
├─ Solution: Show upgrade/extend option instead
└─ Code: Return 400 with helpful message

Error 4: "Payment expired (> 24 hours)"
├─ Cause: Payment pending too long
├─ Solution: Create cleanup job, user must retry
└─ Code: Mark as abandoned, allow new payment

Error 5: "M-Pesa daily limit exceeded"
├─ Cause: User hit Safaricom's transaction limit
├─ Solution: Suggest card payment or retry next day
└─ Code: Forward Paystack's error message
```

### Idempotency Handling

```python
# Problem: Webhook received twice for same payment
# Solution: Check if payment already processed before updating

async def handle_webhook(event_data):
    reference = event_data["data"]["reference"]
    
    # Check if already processed
    stmt = select(PaymentTransaction).where(
        PaymentTransaction.transaction_id == reference
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        logger.info(f"Webhook already processed: {reference}")
        return {"success": True, "message": "Already processed"}
    
    # Process new webhook
    # ...
```

### Timeout Handling

```python
# Problem: Paystack API slow, user redirected but payment shows pending
# Solution: Frontend should poll status

// Frontend JavaScript
async function checkPaymentStatus(reference) {
    const response = await fetch(`/api/v1/payments/verify/${reference}`);
    const data = await response.json();
    
    if (data.status === 'success') {
        // Activate subscription
    } else if (data.status === 'failed') {
        // Show error
    } else {
        // Still pending, retry in 2 seconds
        setTimeout(() => checkPaymentStatus(reference), 2000);
    }
}
```

---

## Testing & Validation

### Test Mode Setup

1. **Use Paystack Test Keys**
   ```
   Login to Paystack Dashboard
   Toggle: "Live Key" → "Test Key"
   Copy Test Secret/Public Keys
   Update .env with test keys
   ```

2. **M-Pesa Test Numbers**
   ```
   Test Phone: +254718769882 (from Paystack docs)
   Or: Use any valid format starting with 254
   Test OTP: Always works with Paystack test mode
   ```

3. **Payment Amounts for Testing**
   ```
   Amount ending in 15: Will fail
   Amount ending in 85: Will succeed
   Example: 9915 = will fail, 9985 = will succeed
   ```

### Curl Testing Examples

#### Initialize Payment

```bash
curl -X POST https://api.paystack.co/transaction/initialize \
  -H "Authorization: Bearer sk_test_xxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "amount": 9985,
    "currency": "KES",
    "metadata": {
      "user_id": 1,
      "plan_id": 2
    },
    "channels": ["mobile_money"]
  }'

# Response:
{
  "status": true,
  "message": "Authorization URL created.",
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "xxxxx",
    "reference": "xxxxx"
  }
}
```

#### Verify Payment

```bash
curl -X GET https://api.paystack.co/transaction/verify/xxxxx \
  -H "Authorization: Bearer sk_test_xxxxxxxxxxxxx"

# Response:
{
  "status": true,
  "message": "Verification successful",
  "data": {
    "id": 1234567890,
    "reference": "xxxxx",
    "status": "success",
    "amount": 9985,
    "paid_at": "2026-02-19T10:30:45.000Z"
  }
}
```

---

## Production Deployment

### Pre-Launch Checklist

- [ ] Use production Paystack keys (pk_live_*, sk_live_*)
- [ ] Set environment variables in production
- [ ] Webhook URL configured in Paystack dashboard
- [ ] SSL certificate installed (HTTPS required)
- [ ] Database migrations run (payment tables created)
- [ ] Error monitoring configured (Sentry/similar)
- [ ] Email templates for receipts/confirmations ready
- [ ] Admin dashboard for viewing payments prepared
- [ ] Refund process documented and tested
- [ ] Payment dispute process documented
- [ ] Rate limiting configured on payment endpoints
- [ ] PCI compliance verified (no card data in logs)

### Monitoring & Alerts

```python
# Monitor for:
# 1. Failed payments (charge.failed events)
# 2. Webhook failures (retry mechanism)
# 3. Payments stuck in 'pending' (>6 hours)
# 4. Discrepancies between payment records and Paystack API
# 5. Refund requests

# Recommended metrics:
# - Payment success rate (target: >95%)
# - Average payment time (target: <5 min)
# - Webhook latency (target: <1 min)
# - Subscription activation rate (target: 100% of successful payments)
```

### Recovery Procedures

```
If webhook fails:
1. Implement retry mechanism (3 retries with exponential backoff)
2. Store failed webhooks in separate table
3. Admin endpoint to manually process failed webhooks
4. Daily reconciliation between Paystack API and DB

If payment stuck in 'pending':
1. Add cleanup job to mark as abandoned after 24h
2. Manual verification endpoint for admin
3. User-facing "check status" button

If user claims not received subscription:
1. Check payment status in Paystack API
2. Check subscription activation timestamp
3. Re-activate subscription if necessary
```

---

## Troubleshooting

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Invalid merchant" | Webhook from different Paystack account | Verify PAYSTACK_WEBHOOK_SECRET |
| "Signature mismatch" | API key mismatch | Check PAYSTACK_SECRET_KEY in .env |
| "Authorization URL returns 404" | Test/live key mismatch | Verify using correct key pair |
| "M-Pesa not showing" | Payment not configured for M-Pesa | Contact Paystack support |
| "Payment succeeds but subscription not activated" | Webhook not received | Check webhook logs, manual retry |
| "User charged twice" | Idempotency not implemented | Add reference check before processing |

### Debug Commands

```bash
# Check Paystack keys
echo $PAYSTACK_SECRET_KEY
echo $PAYSTACK_PUBLIC_KEY

# Test API connectivity
curl -I https://api.paystack.co
# Should return 301 or 302

# Verify webhook secret
# (From Paystack dashboard: Settings → Webhook)
echo $PAYSTACK_WEBHOOK_SECRET

# Check database for payments
SELECT * FROM payments WHERE status = 'pending' AND created_at < NOW() - INTERVAL '6 hours';

# Check failed webhooks
SELECT * FROM payment_logs WHERE event_type = 'webhook_received' AND response_data->>'status' = 'error';
```

---

## Next Steps

1. **Now:** Review this documentation with Paystack account details
2. **Step 1:** Create payment models in database schema
3. **Step 2:** Implement PaystackService with initialization logic
4. **Step 3:** Create payment API endpoints (initiate, verify, webhook)
5. **Step 4:** Integrate with subscription system
6. **Step 5:** Test with Paystack test mode
7. **Step 6:** Deploy to production
8. **Step 7:** Monitor and optimize

---

**Questions?** Refer to:
- [Paystack Documentation](https://paystack.com/docs/payments/)
- [Paystack M-Pesa Integration Guide](https://paystack.com/docs/payments/mobile-money/)
- [Paystack API Reference](https://paystack.com/docs/api/)

