#!/bin/bash
# Paystack Local Testing Startup Script
# Starts all services needed for webhook testing

set -e

PROJECT_DIR="/home/caleb/kiptoo/trybe/leAI"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     Paystack Local Testing - Full Stack Startup       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Function to print instructions
print_instructions() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}NEXT STEPS FOR WEBHOOK TESTING${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}1. Open a NEW terminal and run ngrok:${NC}"
    echo "   ngrok http 8000"
    echo ""
    echo -e "${YELLOW}2. Copy the HTTPS URL from ngrok output${NC}"
    echo "   Example: https://xxxx-xxxx-xxxx.ngrok.io"
    echo ""
    echo -e "${YELLOW}3. Go to Paystack Dashboard:${NC}"
    echo "   Settings > Webhooks > Add Webhook URL"
    echo ""
    echo -e "${YELLOW}4. Paste webhook URL:${NC}"
    echo "   https://xxxx-xxxx-xxxx.ngrok.io/api/v1/payments/webhook"
    echo ""
    echo -e "${YELLOW}5. Test payment flow:${NC}"
    echo "   Visit http://localhost:3000/dashboard/subscription"
    echo "   Click Subscribe"
    echo "   Use test card: 4111111111111111 | 12/30 | 123"
    echo ""
    echo -e "${YELLOW}6. Watch ngrok terminal for webhook delivery${NC}"
    echo ""
    echo -e "${GREEN}Backend: http://localhost:8000${NC}"
    echo -e "${GREEN}Frontend: http://localhost:3000${NC}"
    echo ""
}

# Check if directories exist
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Backend directory not found: $BACKEND_DIR${NC}"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found: $FRONTEND_DIR${NC}"
    exit 1
fi

# Start backend
echo -e "${GREEN}✅ Starting Backend API...${NC}"
cd "$BACKEND_DIR"
source ~/venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend PID: $BACKEND_PID${NC}"

sleep 3

# Start frontend
echo -e "${GREEN}✅ Starting Frontend...${NC}"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend PID: $FRONTEND_PID${NC}"

sleep 2

# Print instructions
print_instructions

echo -e "${YELLOW}Waiting for services to be ready...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for services to stop
wait

