/**
 * SATHI – JLN Hospital Ajmer
 * Centralized API configuration
 *
 * For production: change RENDER_URL to your deployed Render backend URL.
 * For local dev:  keep as-is (auto-detects localhost).
 */

const SATHI_CONFIG = {
  // ── Change this to your Render URL after deployment ──────────────────────
  RENDER_URL: 'https://sathi-l301.onrender.com',

  // ── Auto-detect: uses localhost in dev, Render URL in production ──────────
  get API_BASE() {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return this.RENDER_URL;
  },

  // ── Hospital Info ────────────────────────────────────────────────────────
  HOSPITAL_NAME_EN: 'Jawaharlal Nehru Hospital, Ajmer',
  HOSPITAL_NAME_HI: 'जवाहरलाल नेहरू चिकित्सालय, अजमेर',
  HELPLINE: '0145-2625000',
  EMERGENCY_NUMBER: '01452625000',   // tel: link format (no spaces/dashes)
  ADDRESS: 'JLN Hospital Road, Ajmer, Rajasthan – 305001',

  // ── Kiosk inactivity timeout (ms) → resets to language screen ────────────
  KIOSK_TIMEOUT_MS: 300000,          // 5 minutes

  // ── Strip colors ─────────────────────────────────────────────────────────
  STRIP_COLORS: {
    blue: { hex: '#1565c0', label: 'Blue Line', category: 'OPD' },
    yellow: { hex: '#f9a825', label: 'Yellow Line', category: 'Services' },
    red: { hex: '#c62828', label: 'Red Line', category: 'Emergency' },
    green: { hex: '#2e7d32', label: 'Green Line', category: 'Diagnostics' },
  },
};

// Make available globally
window.SATHI = SATHI_CONFIG;
