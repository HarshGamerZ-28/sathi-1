"""
SATHI Backend – pytest test suite
Run: cd backend && pytest tests/ -v
"""
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from app import app as flask_app


@pytest.fixture
def client():
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as c:
        yield c


# ── Health ────────────────────────────────────────────────────────────────────

def test_health(client):
    r = client.get('/api/health')
    assert r.status_code == 200
    data = r.get_json()
    assert data['status'] == 'ok'
    assert 'SATHI' in data['service']


# ── Departments ───────────────────────────────────────────────────────────────

def test_get_departments(client):
    r = client.get('/api/departments')
    assert r.status_code == 200
    data = r.get_json()
    assert 'departments' in data
    assert 'gates' in data
    assert len(data['departments']) >= 10
    assert len(data['gates']) >= 3


def test_department_required_fields(client):
    r = client.get('/api/departments')
    depts = r.get_json()['departments']
    required = ['id', 'name', 'hindi', 'category', 'strip_color',
                'gate', 'gate_id', 'floor', 'directions', 'directions_hindi']
    for d in depts:
        for field in required:
            assert field in d, f"Missing '{field}' in department '{d.get('id')}'"


def test_strip_colors_valid(client):
    valid_colors = {'blue', 'yellow', 'red', 'green'}
    r = client.get('/api/departments')
    for d in r.get_json()['departments']:
        assert d['strip_color'] in valid_colors


# ── Single Department ─────────────────────────────────────────────────────────

def test_get_single_department(client):
    r = client.get('/api/department/opd_registration')
    assert r.status_code == 200
    dept = r.get_json()
    assert dept['id'] == 'opd_registration'
    assert dept['strip_color'] == 'blue'


def test_get_nonexistent_department(client):
    r = client.get('/api/department/does_not_exist')
    assert r.status_code == 404


# ── Search ────────────────────────────────────────────────────────────────────

def test_search_fever(client):
    r = client.get('/api/search?q=fever')
    assert r.status_code == 200
    results = r.get_json()['results']
    assert len(results) > 0


def test_search_hindi(client):
    r = client.get('/api/search?q=बुखार')
    assert r.status_code == 200
    # Should return results for Hindi query


def test_search_eye(client):
    r = client.get('/api/search?q=eye')
    results = r.get_json()['results']
    ids = [d['id'] for d in results]
    assert 'eye_opd' in ids


def test_search_bone(client):
    r = client.get('/api/search?q=bone')
    results = r.get_json()['results']
    ids = [d['id'] for d in results]
    assert 'orthopaedic' in ids


def test_search_emergency(client):
    r = client.get('/api/search?q=accident')
    results = r.get_json()['results']
    ids = [d['id'] for d in results]
    assert 'emergency' in ids


def test_search_empty(client):
    r = client.get('/api/search?q=')
    assert r.status_code == 200
    assert r.get_json()['results'] == []


def test_search_no_results(client):
    r = client.get('/api/search?q=xyznotexist99')
    assert r.status_code == 200
    # May return empty list
    assert isinstance(r.get_json()['results'], list)


# ── QR Code ───────────────────────────────────────────────────────────────────

def test_qr_generation(client):
    r = client.get('/api/qr/opd_registration')
    assert r.status_code == 200
    data = r.get_json()
    assert 'qr_base64' in data
    assert data['qr_base64'].startswith('data:image/png;base64,')
    assert 'mobile_url' in data
    assert 'opd_registration' in data['mobile_url']


def test_qr_invalid_dept(client):
    r = client.get('/api/qr/invalid_dept')
    assert r.status_code == 404


# ── Slip ──────────────────────────────────────────────────────────────────────

def test_slip_generation(client):
    r = client.post('/api/slip',
        data=json.dumps({'dept_id': 'opd_registration', 'name': 'Ramu'}),
        content_type='application/json')
    assert r.status_code == 200
    slip = r.get_json()
    assert 'slip_no' in slip
    assert len(slip['slip_no']) == 6
    assert slip['department'] == 'OPD / Registration'
    assert 'directions' in slip
    assert 'strip_color' in slip


def test_slip_invalid_dept(client):
    r = client.post('/api/slip',
        data=json.dumps({'dept_id': 'xyz', 'name': 'Test'}),
        content_type='application/json')
    assert r.status_code == 404


# ── Emergency ─────────────────────────────────────────────────────────────────

def test_emergency_sos(client):
    r = client.post('/api/emergency',
        data=json.dumps({'location': 'Test Kiosk'}),
        content_type='application/json')
    assert r.status_code == 200
    data = r.get_json()
    assert data['status'] == 'alert_sent'
    assert 'timestamp' in data
    assert 'number' in data


def test_emergency_no_body(client):
    r = client.post('/api/emergency', content_type='application/json')
    # Should still work with no body
    assert r.status_code == 200


# ── Gates ─────────────────────────────────────────────────────────────────────

def test_get_gates(client):
    r = client.get('/api/gates')
    assert r.status_code == 200
    gates = r.get_json()['gates']
    assert len(gates) >= 3
    gate_ids = [g['id'] for g in gates]
    assert 'gate1' in gate_ids
    assert 'gate2' in gate_ids
