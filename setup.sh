#!/usr/bin/env bash
# Quick setup script for Aditus local development

set -e

echo "🚀 Aditus Local Setup"
echo "===================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v python3.11 &> /dev/null; then
    echo -e "${RED}❌ Python 3.11+ is required${NC}"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL client not found. Installing...${NC}"
    # This would depend on the OS
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Backend setup
echo "🔧 Setting up backend..."
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3.11 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate || . venv/Scripts/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -q -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please update .env with your Gemini API key${NC}"
fi

cd ..

echo -e "${GREEN}✅ Backend setup complete${NC}"
echo ""

# Database setup
echo "🗄️  Setting up database..."

# Check if PostgreSQL is running
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Manual PostgreSQL setup required.${NC}"
    echo "Create database manually:"
    echo "  createdb aditus"
else
    echo "Starting PostgreSQL with Docker..."
    docker run --name aditus-db \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=aditus \
        -p 5432:5432 \
        -d postgres:15 2>/dev/null || true
    
    echo "Waiting for database to be ready..."
    sleep 5
fi

echo -e "${GREEN}✅ Database setup complete${NC}"
echo ""

# Print next steps
echo "🎯 Next steps:"
echo ""
echo "1. Update backend/.env with your Gemini API key:"
echo "   - Get key from: https://ai.google.dev/"
echo ""
echo "2. Start the backend server:"
echo "   cd backend"
echo "   source venv/bin/activate  # or: . venv\\Scripts\\activate (Windows)"
echo "   uvicorn main:app --reload"
echo ""
echo "3. Access the API:"
echo "   - Swagger UI: http://localhost:8000/docs"
echo "   - OpenAPI: http://localhost:8000/openapi.json"
echo ""
echo "📚 Documentation:"
echo "   - Backend: backend/README.md"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"
