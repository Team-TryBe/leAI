# 🎁 Referral System Implementation - Complete

## Overview
Implemented a "Give 1, Get 1" referral system for Aditus where users can earn 1 free application credit by successfully referring friends. The system includes anti-fraud measures, atomic transactions, and a user-friendly frontend interface.

---

## 🗄️ Database Schema

### User Model Additions
```python
referral_code: VARCHAR(8), UNIQUE  # Each user gets unique 8-char alphanumeric code
referred_by: INTEGER, FK → users   # Who referred this user
referral_credits: INTEGER = 0      # Free credits earned via referrals
has_earned_referral_reward: BOOLEAN = False  # One-time reward gate
referral_reward_earned_at: TIMESTAMP  # When reward was earned
signup_ip: VARCHAR(45)             # For fraud detection
```

### ReferralTransaction Table
Tracks all referral relationships and their status:
```sql
id (PK)
referrer_id (FK → users)
referred_user_id (FK → users)
status: PENDING | COMPLETED       # Completes when referred user verifies email
referral_code: VARCHAR(8)
signup_ip: VARCHAR(45)
verified_at: TIMESTAMP            # When referred user verified email
reward_granted_at: TIMESTAMP      # When credit was issued
created_at, updated_at: TIMESTAMP
```

---

## 🔧 Backend Implementation

### 1. Referral Service ([backend/app/services/referral_service.py](backend/app/services/referral_service.py))

**Core Methods:**

- **`generate_referral_code()`** - Creates unique 8-character alphanumeric code (A-Z, 0-9)
  
- **`validate_referral_code()`** - Sanitizes and validates code, prevents SQL injection

- **`check_self_referral()`** - 🛡️ Anti-Fraud Detection
  - Compares signup IP within 24-hour window
  - Checks for phone number matches
  - Silently rejects self-referrals

- **`create_referral_transaction()`** - Creates transaction record with PENDING status

- **`process_referral_reward()`** - 🔐 Atomic Transaction (Security Gate)
  - Called only after email verification
  - Checks `has_earned_referral_reward == False`
  - Grants exactly 1 credit (immutable after first reward)
  - Updates transaction status to COMPLETED
  - Race-condition safe via database locks

- **`get_referral_stats()`** - Returns user's referral dashboard data

### 2. API Endpoints ([backend/app/api/referral.py](backend/app/api/referral.py))

- **GET `/api/v1/referral/stats`** - Returns user's referral statistics
- **GET `/api/v1/referral/link`** - Returns shareable referral link

### 3. Auth Signup Updates ([backend/app/api/auth.py](backend/app/api/auth.py))

Modified signup flow:
1. Accept optional `ref_code` query parameter
2. Validate referral code & check self-referral
3. Generate unique referral code for new user
4. Store `referral_code`, `referred_by`, `signup_ip`
5. Create `ReferralTransaction` record (PENDING)
6. On email verification → trigger reward processing

---

## 🚀 Frontend Implementation

### 1. ReferralCard Component ([frontend/src/components/dashboard/ReferralCard.tsx](frontend/src/components/dashboard/ReferralCard.tsx))

**Features:**
- Displays referral progress (0/1 friends)
- Shows earned credits count
- Copy referral code button
- Social media share buttons:
  - **WhatsApp** - Pre-filled message with link
  - **Twitter/X** - Tweet with referral link
  - **LinkedIn** - Share URL
  - **Instagram** - Copy link helper (manual share for Stories)
- Referral statistics:
  - Total referrals
  - Successfully verified (COMPLETED)
  - Pending verification (PENDING)
- Reward earned status badge

### 2. Dashboard Integration ([frontend/src/app/dashboard/page.tsx](frontend/src/app/dashboard/page.tsx))

Added **"Refer Friends & Earn Credits"** section on dashboard homepage with:
- Prominent referral CTA
- ReferralCard component
- Positioned between Quick Actions and Recent Applications

---

## 🛡️ Security Features

### 1. Self-Referral Prevention
```python
# Check same IP within 24 hours
if referrer.signup_ip == new_user_ip and (now - referrer.created_at) < 24h:
    reject_referral()

# Check same phone number
if referrer.phone == new_user_phone:
    reject_referral()
```

### 2. One-Time Reward Enforcement
```python
# Database-level check before granting reward
if user.has_earned_referral_reward:
    return False  # Can't earn again

# Atomic update
user.referral_credits += 1
user.has_earned_referral_reward = True  # Immutable
```

### 3. Input Sanitization
```python
# Validate referral code format
if not ref_code.isalnum() or len(ref_code) != 8:
    return None  # Reject invalid codes
```

### 4. Race Condition Prevention
```python
# Uses database-level transaction & locks
# Prevents double-crediting if two friends verify simultaneously
```

---

## 📊 User Flow

1. **User A signs up** → Receives unique code (e.g., "ABC12345")
2. **Dashboard shows banner** → "Share your code to earn free credits"
3. **User A clicks "Share"** → Selects platform (WhatsApp, Twitter, etc.)
4. **Pre-filled message sent** → "Found this career hack... Code: ABC12345"
5. **User B clicks link** → Redirected to `/signup?ref=ABC12345`
6. **User B signs up** → System links referral via `referred_by` field
7. **User B verifies email** → `process_referral_reward()` triggered
8. **User A gets notified** → 1 credit granted instantly
9. **User A sees updated dashboard** → "Reward Earned!" + "+1 Credits"

---

## 💾 Database Migration

Run migration to apply changes:
```bash
cd backend
python3 migrations/add_referral_system.py
```

What it does:
- Adds referral columns to `users` table
- Generates unique referral codes for existing users
- Creates `referral_transactions` table with indexes
- Sets up performance indexes for fast queries

---

## 📋 API Contract

### GET `/api/v1/referral/stats`
```json
{
  "success": true,
  "data": {
    "code": "ABC12345",
    "referral_credits": 1,
    "has_earned_reward": true,
    "total_referrals": 2,
    "successful_referrals": 1,
    "pending_referrals": 1,
    "reward_earned_at": "2026-02-13T10:30:00"
  }
}
```

### GET `/api/v1/referral/link`
```json
{
  "success": true,
  "data": {
    "code": "ABC12345",
    "referral_link": "https://leai.co.ke/signup?ref=ABC12345",
    "referral_credits": 1
  }
}
```

---

## ✅ Testing Checklist

- [ ] Generate unique referral code on signup
- [ ] Store referral code in user record
- [ ] Validate referral code on signup attempt
- [ ] Detect self-referral (IP + phone matching)
- [ ] Create ReferralTransaction record (PENDING)
- [ ] Process reward on email verification
- [ ] Grant exactly 1 credit to referrer
- [ ] Prevent double-crediting (one-time reward)
- [ ] Display referral stats on dashboard
- [ ] Copy referral code to clipboard
- [ ] Share on WhatsApp with pre-filled message
- [ ] Share on Twitter with pre-filled tweet
- [ ] Share on LinkedIn
- [ ] Copy link for Instagram manual share
- [ ] Display reward earned status

---

## 🔄 Future Enhancements

1. **Staggered Rewards** - Referrer gets 50% discount first month, referred gets 50% off
2. **Referral Tiers** - Unlock badges (Refer 3→5→10 friends)
3. **Leaderboard** - Monthly top referrers
4. **SMS Notifications** - "You earned 1 free credit!" message
5. **Email Notifications** - Dashboard notification bell icon
6. **Analytics Dashboard** - Detailed referral metrics for admin
7. **Referral Expiration** - Codes expire after X days
8. **Family Plans** - Share credits with referred users

---

## 📝 Notes

- Referral rewards are **financial transactions** (equivalent to paid credits)
- One-time reward **per user** (can only be earned once in lifetime)
- Reward triggered on **email verification** (prevents spam signups)
- All sensitive operations use **atomic transactions** for data integrity
- Frontend URL format: `https://leai.co.ke/signup?ref=CODE`

