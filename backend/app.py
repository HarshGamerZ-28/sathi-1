from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
import qrcode
import io
import base64
from datetime import datetime
import random
import string
from dotenv import load_dotenv

# Load .env for local development (no-op in production)
load_dotenv()

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app, origins=[
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    os.environ.get('FRONTEND_URL', ''),
    'https://sathi-eight.vercel.app',
])

# Load departments data
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE_DIR, 'data', 'departments.json'), 'r', encoding='utf-8') as f:
    DATA = json.load(f)

DEPARTMENTS = DATA['departments']
GATES = DATA['gates']

# ── Serve Frontend Pages ──────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory(app.static_folder + '/website', 'index.html')

@app.route('/kiosk')
def kiosk():
    return send_from_directory(app.static_folder + '/kiosk', 'index.html')

@app.route('/mobile')
def mobile():
    return send_from_directory(app.static_folder + '/mobile', 'index.html')

# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.route('/api/departments', methods=['GET'])
def get_departments():
    """Return all departments."""
    lang = request.args.get('lang', 'en')
    return jsonify({'departments': DEPARTMENTS, 'gates': GATES})


@app.route('/api/search', methods=['GET'])
def search():
    """Search departments by symptom or keyword."""
    query = request.args.get('q', '').lower().strip()
    lang = request.args.get('lang', 'en')

    if not query:
        return jsonify({'results': [], 'query': query})

    results = []
    for dept in DEPARTMENTS:
        score = 0
        # Check English symptoms
        for symptom in dept.get('symptoms', []):
            if query in symptom.lower() or symptom.lower() in query:
                score += 10
                break
        # Check Hindi symptoms
        for symptom in dept.get('symptoms_hindi', []):
            if query in symptom or symptom in query:
                score += 10
                break
        # Check name
        if query in dept['name'].lower():
            score += 5
        if query in dept.get('hindi', '').lower():
            score += 5
        # Check category
        if query in dept.get('category', '').lower():
            score += 3

        if score > 0:
            results.append({'dept': dept, 'score': score})

    results.sort(key=lambda x: x['score'], reverse=True)
    return jsonify({
        'results': [r['dept'] for r in results[:5]],
        'query': query
    })


@app.route('/api/department/<dept_id>', methods=['GET'])
def get_department(dept_id):
    """Get a single department by ID."""
    dept = next((d for d in DEPARTMENTS if d['id'] == dept_id), None)
    if not dept:
        return jsonify({'error': 'Department not found'}), 404
    return jsonify(dept)


@app.route('/api/qr/<dept_id>', methods=['GET'])
def generate_qr(dept_id):
    """Generate QR code that links to mobile map page for this department."""
    dept = next((d for d in DEPARTMENTS if d['id'] == dept_id), None)
    if not dept:
        return jsonify({'error': 'Department not found'}), 404

    # Build mobile URL
    base_url = request.host_url.rstrip('/')
    mobile_url = f"{base_url}/mobile?dept={dept_id}"

    # Generate QR
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(mobile_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0a3d62", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    b64 = base64.b64encode(buf.getvalue()).decode('utf-8')

    return jsonify({
        'qr_base64': f"data:image/png;base64,{b64}",
        'mobile_url': mobile_url,
        'dept': dept
    })


@app.route('/api/slip', methods=['POST'])
def generate_slip():
    """Generate a printable slip for a patient."""
    data = request.get_json()
    dept_id = data.get('dept_id', '')
    name = data.get('name', 'Patient')
    lang = data.get('lang', 'en')

    dept = next((d for d in DEPARTMENTS if d['id'] == dept_id), None)
    if not dept:
        return jsonify({'error': 'Department not found'}), 404

    # Generate slip number
    slip_no = ''.join(random.choices(string.digits, k=6))
    timestamp = datetime.now().strftime('%d/%m/%Y %H:%M')

    slip = {
        'slip_no': slip_no,
        'timestamp': timestamp,
        'name': name,
        'department': dept['name'],
        'department_hindi': dept['hindi'],
        'gate': dept['gate'],
        'floor': dept['floor'],
        'building': dept['building'],
        'strip_color': dept['strip_color'],
        'directions': dept['directions'],
        'directions_hindi': dept['directions_hindi'],
        'landmark': dept['landmark'],
        'hospital': 'Jawaharlal Nehru Hospital, Ajmer',
        'helpline': DATA['helpline']
    }
    return jsonify(slip)


@app.route('/api/emergency', methods=['POST'])
def emergency_sos():
    """Log emergency SOS trigger."""
    try:
        data = request.get_json(silent=True) or {}
    except Exception:
        data = {}
    location = data.get('location', 'Main Gate Kiosk')
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"🚨 EMERGENCY SOS triggered at {location} — {timestamp}")
    # In production: send alert to emergency desk, trigger intercom, etc.
    return jsonify({
        'status': 'alert_sent',
        'message': 'Emergency team alerted!',
        'number': DATA['emergency_number'],
        'timestamp': timestamp
    })


@app.route('/api/gates', methods=['GET'])
def get_gates():
    return jsonify({'gates': GATES})


# ── Health check ──────────────────────────────────────────────────────────────

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'service': 'SATHI – JLN Hospital Ajmer'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('DEBUG', 'false').lower() == 'true')
