#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# SATHI – Local Development Startup Script
# Usage:  bash start.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SATHI – JLN Hospital Ajmer Navigation System       ║${NC}"
echo -e "${BLUE}║   Local Development Startup                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Python virtual environment ────────────────────────────────────────────
if [ ! -d "backend/venv" ]; then
  echo -e "${YELLOW}► Creating Python virtual environment...${NC}"
  python3 -m venv backend/venv
fi

echo -e "${YELLOW}► Activating venv and installing dependencies...${NC}"
source backend/venv/bin/activate
pip install -r backend/requirements.txt -q

# ── 2. Run backend ────────────────────────────────────────────────────────────
echo -e "${GREEN}► Starting Flask backend on http://localhost:5000${NC}"
(cd backend && python app.py &)
BACKEND_PID=$!
sleep 1.5

# ── 3. Serve frontend ─────────────────────────────────────────────────────────
if command -v npx &> /dev/null; then
  echo -e "${GREEN}► Serving frontend on http://localhost:3000${NC}"
  (cd frontend && npx serve . -l 3000 -s &)
  FRONTEND_PID=$!
else
  echo -e "${GREEN}► Serving frontend on http://localhost:3000${NC}"
  (cd frontend && python3 -m http.server 3000 &)
  FRONTEND_PID=$!
fi

sleep 1

# ── 4. Open URLs ──────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ SATHI is running!                                ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  🌐 Website:   http://localhost:3000                 ║${NC}"
echo -e "${GREEN}║  🖥️  Kiosk:     http://localhost:3000/kiosk           ║${NC}"
echo -e "${GREEN}║  📱 Mobile:    http://localhost:3000/mobile          ║${NC}"
echo -e "${GREEN}║  🔌 API:       http://localhost:5000/api/health      ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop all servers                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── 5. Run tests ──────────────────────────────────────────────────────────────
echo -e "${YELLOW}► Running backend tests...${NC}"
(cd backend && python -m pytest tests/ -q 2>&1 | tail -5)
echo ""

# ── Cleanup on exit ───────────────────────────────────────────────────────────
cleanup() {
  echo -e "\n${RED}► Shutting down servers...${NC}"
  kill $BACKEND_PID  2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  echo -e "${GREEN}Done. Goodbye!${NC}"
  exit 0
}
trap cleanup INT TERM

wait
