# 🏥 SATHI – Smart Assisted Hospital Navigation System
### Jawaharlal Nehru Hospital (JLN), Ajmer · Rajasthan

> **SATHI** guides first-time visitors through JLN Hospital's large campus. A touchscreen kiosk at the main gate lets patients search by symptom in Hindi, English, or Marwari, prints a navigation slip, generates a QR code for their phone, and shows exactly which colour floor strip to follow. A public website helps people plan which gate to use before they even leave home.

---

## 📸 Pages

| Page | URL | Purpose |
|------|-----|---------|
| 🌐 Public Website | `/` | Gate guide + department search for visitors planning ahead |
| 🖥️ Kiosk UI | `/kiosk` | Full-screen touch interface for the hardware kiosk |
| 📱 Mobile Map | `/mobile?dept=<id>` | Phone page that opens when patient scans QR at kiosk |

---

## 🗂️ Project Structure

```
sathi-jln/
├── .github/workflows/ci.yml        ← GitHub Actions CI
├── backend/                        ← Flask API → Render
│   ├── app.py
│   ├── Procfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── data/departments.json       ← All 15 departments + 4 gates
│   └── tests/test_api.py           ← 20 pytest tests ✅
├── frontend/                       ← Static pages → Vercel
│   ├── kiosk/index.html            ← Touchscreen kiosk UI
│   ├── mobile/index.html           ← QR scan page (PWA + offline)
│   ├── website/index.html          ← Public website
│   ├── assets/
│   │   ├── config.js               ← ⚙️ Set your Render URL here
│   │   ├── keyboard.js             ← On-screen virtual keyboard
│   │   └── images/                 ← All hospital photos (included)
│   ├── manifest.json               ← PWA manifest
│   └── sw.js                       ← Service worker (offline support)
├── start.sh                        ← One-command local dev startup
├── render.yaml
└── vercel.json
```

---

## ✨ Features

### Kiosk
- 3-language UI — English / Hindi / Marwari, switchable any time
- **On-screen virtual keyboard** — full touch keyboard, no physical keyboard needed
- Symptom search — type "बुखार" / "fever" / "bone" → department + gate + directions
- Quick-tap symptom pills for one-touch navigation
- QR code per result — patient scans and gets map on their phone
- Slip printing — physical slip with slip number, directions, strip colour
- Emergency SOS button — always visible, alerts emergency ward, shows Gate 2
- Browse all departments, Gate guide screen
- Auto-reset to language selection after 5 min inactivity

### Mobile (post-QR scan)
- Hospital campus map image
- Real photo of the department / building
- Gate, floor, building, bilingual directions
- Floor strip colour reminder
- Emergency SOS floating button (tel: link)
- **PWA + service worker** — works offline after first visit

### Public Website
- Symptom-based department finder
- Gate guide with photos
- Floor strip colour system explained
- Full department directory
- Emergency call banner

### Physical floor tape system
| Colour | Category | Leads To |
|--------|----------|----------|
| 🔵 Blue | OPD | Registration, Eye, ENT, Orthopaedic, Geriatric |
| 🟡 Yellow | Services | Pharmacy, Admin Block, Canteen |
| 🔴 Red | Emergency | Casualty, Cardiology, Blood Bank |
| 🟢 Green | Diagnostics | X-Ray, Lab, MRI, CT Scan, Pediatrics |

---

## 🚀 Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/sathi-jln.git
cd sathi-jln
bash start.sh
```

Opens:
- `http://localhost:3000` → Website  
- `http://localhost:3000/kiosk` → Kiosk  
- `http://localhost:3000/mobile?dept=opd_registration` → Mobile  
- `http://localhost:5000/api/health` → API

---

## ☁️ Deploy in 4 Steps

### 1 — Push to GitHub

```bash
git init
git add .
git commit -m "feat: initial SATHI commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sathi-jln.git
git push -u origin main
```

### 2 — Backend → Render

1. [render.com](https://render.com) → New Web Service → connect repo  
2. **Root Dir:** `backend` | **Build:** `pip install -r requirements.txt`  
3. **Start:** `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2`  
4. Copy your URL (e.g. `https://sathi-jln.onrender.com`)

### 3 — Set backend URL in config

Edit `frontend/assets/config.js`:
```js
RENDER_URL: 'https://sathi-jln.onrender.com',
```
Then `git add . && git commit -m "config: set Render URL" && git push`

### 4 — Frontend → Vercel

1. [vercel.com](https://vercel.com) → New Project → import repo  
2. Leave Root Directory blank — `vercel.json` handles everything  
3. Deploy ✅

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/departments` | All departments + gates |
| GET | `/api/department/<id>` | Single department |
| GET | `/api/search?q=<query>` | Symptom/name search |
| GET | `/api/qr/<dept_id>` | QR PNG (base64) |
| POST | `/api/slip` | Navigation slip |
| POST | `/api/emergency` | SOS alert |
| GET | `/api/gates` | Gate info |

---

## ➕ Adding Departments

Edit `backend/data/departments.json`:

```json
{
  "id": "unique_id",
  "name": "English Name",
  "hindi": "हिंदी नाम",
  "marwari": "मारवाड़ी नाम",
  "category": "opd",
  "strip_color": "blue",
  "strip_label": "Blue Line",
  "gate": "Gate 1 (Main Gate)",
  "gate_id": "gate1",
  "floor": "Ground Floor",
  "building": "Block Name",
  "symptoms": ["english", "keywords"],
  "symptoms_hindi": ["हिंदी", "लक्षण"],
  "directions": "Step-by-step in English",
  "directions_hindi": "हिंदी में दिशा-निर्देश",
  "landmark": "Look for the Blue Floor Strip"
}
```

---

## 🧪 Tests

```bash
cd backend
python -m pytest tests/ -v
# → 20 passed
```

---

## 📞 Contact

**Helpline:** 0145-2625000 &nbsp;|&nbsp; **Emergency Gate:** Gate 2 (24/7)  
JLN Hospital Road, Ajmer, Rajasthan – 305001

---

**Built by Harsh · GEC Ajmer · SATHI Navigation System **  
Stack: Flask · Python · Vanilla JS · HTML/CSS · Render · Vercel
