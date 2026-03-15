/**
 * SATHI – JLN Hospital Interactive Map
 * Draws an SVG campus map and animates a navigation path
 * to the selected department. No real-time GPS needed.
 *
 * Usage:
 *   const map = new HospitalMap(document.getElementById('map-container'));
 *   map.showPath('opd_registration');   // highlight route
 *   map.clearPath();                    // reset
 */

class HospitalMap {
    constructor(container, options = {}) {
        this.container = container;
        this.darkMode = options.darkMode !== false; // default dark for kiosk
        this.onDeptClick = options.onDeptClick || null;
        this.activeDept = null;
        this._build();
    }

    // ── Color palette ───────────────────────────────────────────────────────
    get c() {
        return this.darkMode ? {
            bg: '#041624',
            campus: '#0a1e33',
            building: '#0d2a40',
            buildingStroke: '#1a4a6b',
            green: '#0d3320',
            greenStroke: '#1a5c36',
            road: '#020e18',
            roadLabel: 'rgba(255,255,255,0.35)',
            text: '#f8fafc',
            textMuted: 'rgba(248,250,252,0.5)',
            gate: '#e8a020',
            gateText: '#041624',
            blue: '#1565c0',
            yellow: '#f9a825',
            red: '#c62828',
            green_strip: '#2e7d32',
            pathGlow: 'rgba(255,255,255,0.15)',
            activeDept: '#e8a020',
            you_are: '#e53935',
        } : {
            bg: '#f0f4f8',
            campus: '#e8eef4',
            building: '#ffffff',
            buildingStroke: '#b0c4d8',
            green: '#c8e6c9',
            greenStroke: '#81c784',
            road: '#c5cdd5',
            roadLabel: '#546e7a',
            text: '#1a2a3a',
            textMuted: '#607080',
            gate: '#e8a020',
            gateText: '#ffffff',
            blue: '#1565c0',
            yellow: '#f57f17',
            red: '#c62828',
            green_strip: '#2e7d32',
            pathGlow: 'rgba(0,0,0,0.08)',
            activeDept: '#e8a020',
            you_are: '#e53935',
        };
    }

    // ── Campus layout data ──────────────────────────────────────────────────
    // All coordinates are in SVG viewBox space: 0 0 900 580
    // Based on JLN Hospital ground floor plan

    get BUILDINGS() {
        return [
            // Left wing – Orthopaedic + Admin
            { id: 'left_upper', x: 72, y: 32, w: 165, h: 220, label: 'Admin / PMR', labelY: 50 },
            { id: 'left_lower', x: 72, y: 262, w: 165, h: 258, label: 'Orthopaedic Wing', labelY: 280 },

            // Central OPD block (main corridor)
            { id: 'opd_block', x: 247, y: 282, w: 368, h: 170, label: 'OPD / Registration', labelY: 300 },

            // Upper diagnostic block
            { id: 'diag_left', x: 247, y: 32, w: 170, h: 240, label: 'Wards / X-Ray', labelY: 50 },
            { id: 'diag_right', x: 427, y: 32, w: 188, h: 135, label: 'Blood Bank / Lab', labelY: 50 },
            { id: 'mri_block', x: 427, y: 177, w: 188, h: 95, label: 'MRI / Radiology', labelY: 193 },

            // Right wing – Emergency / Wards
            { id: 'right_upper', x: 625, y: 32, w: 193, h: 200, label: 'Pediatrics / Neuro', labelY: 50 },
            { id: 'right_lower', x: 625, y: 242, w: 193, h: 210, label: 'Emergency / Wards', labelY: 260 },

            // Lower service area
            { id: 'svc_left', x: 247, y: 462, w: 180, h: 88, label: 'Parking / Services', labelY: 478 },
            { id: 'canteen_blk', x: 437, y: 462, w: 178, h: 88, label: 'Canteen / Pharmacy', labelY: 478 },
        ];
    }

    get GREENSPACES() {
        return [
            // Central open garden between OPD and upper diagnostics
            { x: 247, y: 272, w: 368, h: 10 },   // thin green strip between blocks
            // Bottom lawn / playground
            { x: 330, y: 410, w: 250, h: 48 },
        ];
    }

    // Main corridor waypoints (x,y pairs)
    // These are the "roads" inside the campus
    get CORRIDORS() {
        return [
            // Horizontal main corridor (east-west through OPD)
            { x1: 72, y1: 362, x2: 818, y2: 362 },
            // Horizontal upper corridor (diagnostic level)
            { x1: 247, y1: 177, x2: 818, y2: 177 },
            // Vertical center spine
            { x1: 431, y1: 32, x2: 431, y2: 550 },
            // Vertical right spine (emergency side)
            { x1: 754, y1: 32, x2: 754, y2: 550 },
            // Vertical left spine (admin side)
            { x1: 175, y1: 32, x2: 175, y2: 550 },
            // Connector: upper right → lower right
            { x1: 754, y1: 177, x2: 818, y2: 177 },
        ];
    }

    get GATES() {
        return [
            { id: 'gate1', label: 'Gate 1\nMain Gate', x: 818, y: 340, side: 'right', recommended: true },
            { id: 'gate2', label: 'Gate 2\nEmergency', x: 818, y: 440, side: 'right' },
            { id: 'gate3', label: 'Gate 3', x: 431, y: 550, side: 'bottom' },
            { id: 'gate4', label: 'Gate 4\nLohagal Rd', x: 72, y: 420, side: 'left' },
            { id: 'gate5', label: 'Gate 5', x: 310, y: 32, side: 'top' },
            { id: 'gate6', label: 'Gate 6', x: 540, y: 32, side: 'top' },
            { id: 'gate7', label: 'Gate 7\nDental/Neuro', x: 818, y: 130, side: 'right' },
            { id: 'gate8', label: 'Gate 8', x: 686, y: 32, side: 'top' },
        ];
    }

    get DEPARTMENTS() {
        return [
            {
                id: 'opd_registration', label: 'OPD\nRegistration', labelHi: 'पंजीकरण',
                x: 380, y: 342, r: 18, color: 'blue',
                gate: 'gate1',
                path: [[818, 340], [754, 340], [754, 362], [431, 362], [380, 362], [380, 342]]
            },
            {
                id: 'eye_opd', label: 'Eye OPD', labelHi: 'नेत्र',
                x: 310, y: 342, r: 14, color: 'blue',
                gate: 'gate1',
                path: [[818, 340], [754, 340], [754, 362], [431, 362], [310, 362], [310, 342]]
            },
            {
                id: 'ent_opd', label: 'ENT OPD', labelHi: 'नाक-कान-गला',
                x: 310, y: 315, r: 14, color: 'blue',
                gate: 'gate1',
                path: [[818, 340], [754, 340], [754, 362], [431, 362], [310, 362], [310, 315]]
            },
            {
                id: 'geriatric', label: 'Geriatric\nCentre', labelHi: 'वृद्धजन',
                x: 455, y: 342, r: 14, color: 'blue',
                gate: 'gate1',
                path: [[818, 340], [754, 340], [754, 362], [455, 362], [455, 342]]
            },
            {
                id: 'orthopaedic', label: 'Orthopaedic\nOPD', labelHi: 'हड्डी रोग',
                x: 145, y: 390, r: 18, color: 'blue',
                gate: 'gate4',
                path: [[72, 420], [175, 420], [175, 390], [145, 390]]
            },
            {
                id: 'emergency', label: 'Emergency\n24/7', labelHi: 'आपातकाल',
                x: 754, y: 380, r: 20, color: 'red',
                gate: 'gate2',
                path: [[818, 440], [754, 440], [754, 380]],
                pulse: true
            },
            {
                id: 'cardiology', label: 'Cardiology', labelHi: 'हृदय रोग',
                x: 754, y: 290, r: 16, color: 'red',
                gate: 'gate2',
                path: [[818, 440], [754, 440], [754, 290]]
            },
            {
                id: 'xray_pathology', label: 'X-Ray /\nPathology', labelHi: 'एक्स-रे / जांच',
                x: 310, y: 177, r: 16, color: 'green',
                gate: 'gate1',
                path: [[818, 340], [754, 340], [754, 177], [431, 177], [310, 177]]
            },
            {
                id: 'mri_ct', label: 'MRI / CT\nScan', labelHi: 'एमआरआई',
                x: 510, y: 207, r: 16, color: 'green',
                gate: 'gate6',
                path: [[540, 32], [540, 177], [510, 177], [510, 207]]
            },
            {
                id: 'blood_bank', label: 'Blood\nBank', labelHi: 'ब्लड बैंक',
                x: 580, y: 100, r: 16, color: 'red',
                gate: 'gate6',
                path: [[540, 32], [540, 100], [580, 100]]
            },
            {
                id: 'drug_distribution', label: 'Drug\nDistribution', labelHi: 'दवा वितरण',
                x: 500, y: 342, r: 16, color: 'yellow',
                gate: 'gate1',
                path: [[818, 340], [754, 340], [754, 362], [500, 362], [500, 342]]
            },
            {
                id: 'medicine_center', label: 'Medical\nShop', labelHi: 'दवाई दुकान',
                x: 175, y: 440, r: 14, color: 'yellow',
                gate: 'gate4',
                path: [[72, 420], [175, 420], [175, 440]]
            },
            {
                id: 'admin', label: 'Admin\nBlock', labelHi: 'प्रशासनिक',
                x: 145, y: 180, r: 16, color: 'yellow',
                gate: 'gate4',
                path: [[72, 420], [175, 420], [175, 180], [145, 180]]
            },
            {
                id: 'canteen', label: 'Canteen', labelHi: 'कैंटीन',
                x: 510, y: 490, r: 16, color: 'yellow',
                gate: 'gate3',
                path: [[431, 550], [431, 490], [510, 490]]
            },
            {
                id: 'pediatrics', label: 'Shishu Rog\nPediatrics', labelHi: 'बाल रोग',
                x: 700, y: 100, r: 18, color: 'green',
                gate: 'gate7',
                path: [[818, 130], [754, 130], [754, 100], [700, 100]]
            },
        ];
    }

    // ── Build the SVG ───────────────────────────────────────────────────────
    _build() {
        const c = this.c;

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 900 580');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.cssText = 'display:block; border-radius:14px; font-family: "Exo 2", sans-serif;';
        this.svg = svg;

        // ── Defs (gradients, filters, markers) ─────────────────────────────
        const defs = document.createElementNS(svgNS, 'defs');

        // Arrow marker for path end
        const arrowId = 'sathi-arrow-' + Math.random().toString(36).slice(2, 7);
        this._arrowId = arrowId;
        const marker = document.createElementNS(svgNS, 'marker');
        marker.setAttribute('id', arrowId);
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '10');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        const poly = document.createElementNS(svgNS, 'polygon');
        poly.setAttribute('points', '0 0, 10 3.5, 0 7');
        poly.setAttribute('fill', '#ffffff');
        marker.appendChild(poly);
        defs.appendChild(marker);

        // Glow filter for active path
        const filter = document.createElementNS(svgNS, 'filter');
        filter.setAttribute('id', 'glow');
        filter.setAttribute('x', '-50%'); filter.setAttribute('y', '-50%');
        filter.setAttribute('width', '200%'); filter.setAttribute('height', '200%');
        const feGaussian = document.createElementNS(svgNS, 'feGaussianBlur');
        feGaussian.setAttribute('stdDeviation', '3');
        feGaussian.setAttribute('result', 'blur');
        const feMerge = document.createElementNS(svgNS, 'feMerge');
        ['blur', 'SourceGraphic'].forEach(n => {
            const node = document.createElementNS(svgNS, 'feMergeNode');
            if (n === 'blur') node.setAttribute('in', 'blur');
            feMerge.appendChild(node);
        });
        filter.appendChild(feGaussian);
        filter.appendChild(feMerge);
        defs.appendChild(filter);

        svg.appendChild(defs);

        // ── Layer groups (draw order) ───────────────────────────────────────
        this._gRoads = this._group(svg, 'layer-roads');
        this._gCampus = this._group(svg, 'layer-campus');
        this._gGreen = this._group(svg, 'layer-green');
        this._gCorridors = this._group(svg, 'layer-corridors');
        this._gBuildings = this._group(svg, 'layer-buildings');
        this._gPath = this._group(svg, 'layer-path');
        this._gGates = this._group(svg, 'layer-gates');
        this._gDepts = this._group(svg, 'layer-depts');
        this._gLabels = this._group(svg, 'layer-labels');

        this._drawRoads();
        this._drawCampus();
        this._drawGreenSpaces();
        this._drawCorridors();
        this._drawBuildings();
        this._drawGates();
        this._drawDepartments();
        this._drawLegend();

        this.container.innerHTML = '';
        this.container.appendChild(svg);

        // Add CSS animation for the dashed path
        const style = document.createElement('style');
        style.textContent = `
      @keyframes sathi-dash {
        to { stroke-dashoffset: -20; }
      }
      @keyframes sathi-pulse-dot {
        0%,100% { r: 10; opacity: 1; }
        50%      { r: 15; opacity: 0.6; }
      }
      .sathi-nav-path {
        animation: sathi-dash 0.6s linear infinite;
      }
      .sathi-pulse { animation: sathi-pulse-dot 1.4s ease-in-out infinite; }
    `;
        this.container.appendChild(style);
    }

    // ── Draw helpers ────────────────────────────────────────────────────────
    _group(parent, id) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('id', id);
        parent.appendChild(g);
        return g;
    }

    _rect(parent, x, y, w, h, fill, stroke, strokeW, rx = 6) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        el.setAttribute('x', x); el.setAttribute('y', y);
        el.setAttribute('width', w); el.setAttribute('height', h);
        el.setAttribute('fill', fill);
        if (stroke) { el.setAttribute('stroke', stroke); el.setAttribute('stroke-width', strokeW || 1); }
        el.setAttribute('rx', rx);
        parent.appendChild(el);
        return el;
    }

    _line(parent, x1, y1, x2, y2, stroke, width, dash) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        el.setAttribute('x1', x1); el.setAttribute('y1', y1);
        el.setAttribute('x2', x2); el.setAttribute('y2', y2);
        el.setAttribute('stroke', stroke); el.setAttribute('stroke-width', width);
        if (dash) el.setAttribute('stroke-dasharray', dash);
        parent.appendChild(el);
        return el;
    }

    _text(parent, x, y, txt, size, fill, anchor = 'middle', weight = '600') {
        const lines = txt.split('\n');
        if (lines.length === 1) {
            const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            el.setAttribute('x', x); el.setAttribute('y', y);
            el.setAttribute('font-size', size); el.setAttribute('fill', fill);
            el.setAttribute('text-anchor', anchor); el.setAttribute('font-weight', weight);
            el.setAttribute('font-family', '"Exo 2", "Noto Sans Devanagari", sans-serif');
            el.textContent = txt;
            parent.appendChild(el);
            return el;
        } else {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            lines.forEach((line, i) => {
                const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                el.setAttribute('x', x); el.setAttribute('y', y + i * (size * 1.3));
                el.setAttribute('font-size', size); el.setAttribute('fill', fill);
                el.setAttribute('text-anchor', anchor); el.setAttribute('font-weight', weight);
                el.setAttribute('font-family', '"Exo 2", "Noto Sans Devanagari", sans-serif');
                el.textContent = line;
                g.appendChild(el);
            });
            parent.appendChild(g);
            return g;
        }
    }

    _circle(parent, cx, cy, r, fill, stroke, sw) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        el.setAttribute('cx', cx); el.setAttribute('cy', cy); el.setAttribute('r', r);
        el.setAttribute('fill', fill);
        if (stroke) { el.setAttribute('stroke', stroke); el.setAttribute('stroke-width', sw || 2); }
        parent.appendChild(el);
        return el;
    }

    _polyline(parent, points, stroke, width, dash, cls) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        el.setAttribute('points', points.map(p => p.join(',')).join(' '));
        el.setAttribute('stroke', stroke); el.setAttribute('stroke-width', width);
        el.setAttribute('fill', 'none');
        el.setAttribute('stroke-linecap', 'round');
        el.setAttribute('stroke-linejoin', 'round');
        if (dash) el.setAttribute('stroke-dasharray', dash);
        if (cls) el.setAttribute('class', cls);
        parent.appendChild(el);
        return el;
    }

    // ── Layers ───────────────────────────────────────────────────────────────
    _drawRoads() {
        const c = this.c;
        // Background (road colour)
        this._rect(this._gRoads, 0, 0, 900, 580, c.road, null, 0, 0);

        // Road labels
        this._text(this._gRoads, 30, 300, 'LOHAGAL ROAD', 9, c.roadLabel, 'middle', '700');
        this._text(this._gRoads, 860, 350, 'HOSPITAL ROAD', 9, c.roadLabel, 'middle', '700');
        this._text(this._gRoads, 450, 572, 'JLN HOSPITAL ROAD', 9, c.roadLabel, 'middle', '700');

        // Rotate the vertical road labels
        const leftLabel = this.svg.querySelector('text:nth-of-type(1)');
        const rightLabel = this.svg.querySelector('text:nth-of-type(2)');
    }

    _drawCampus() {
        const c = this.c;
        // Campus boundary (slightly inset from roads)
        this._rect(this._gCampus, 72, 32, 746, 518, c.campus, c.buildingStroke, 1.5, 4);

        // Title
        this._text(this._gCampus, 450, 22, 'JAWAHARLAL NEHRU HOSPITAL, AJMER', 9,
            this.darkMode ? 'rgba(26,154,184,0.7)' : '#0d6e8a', 'middle', '700');
    }

    _drawGreenSpaces() {
        const c = this.c;
        // Central open space between blocks
        this._rect(this._gGreen, 247, 263, 368, 18, c.green, c.greenStroke, 1, 2);
        // Bottom lawn
        this._rect(this._gGreen, 330, 412, 250, 46, c.green, c.greenStroke, 1, 3);
        // Trees on lawn (simple circles)
        [[365, 432], [395, 427], [430, 435], [460, 425], [495, 432], [525, 428], [555, 432]].forEach(([x, y]) => {
            this._circle(this._gGreen, x, y, 6, c.greenStroke, c.green, 1);
        });
    }

    _drawCorridors() {
        const c = this.c;
        const corridorColor = this.darkMode ? 'rgba(13,110,138,0.25)' : 'rgba(13,110,138,0.15)';
        const corridorStroke = this.darkMode ? 'rgba(13,110,138,0.4)' : 'rgba(13,110,138,0.3)';
        this.CORRIDORS.forEach(cor => {
            // Wide corridor fill
            this._line(this._gCorridors, cor.x1, cor.y1, cor.x2, cor.y2, corridorColor, 18);
            // Corridor edge lines
            this._line(this._gCorridors, cor.x1, cor.y1, cor.x2, cor.y2, corridorStroke, 1);
        });
    }

    _drawBuildings() {
        const c = this.c;
        this.BUILDINGS.forEach(b => {
            this._rect(this._gBuildings, b.x, b.y, b.w, b.h,
                c.building, c.buildingStroke, 1, 5);
            // Building label (small, muted)
            this._text(this._gBuildings,
                b.x + b.w / 2, b.labelY,
                b.label, 7.5, c.textMuted, 'middle', '500');
        });
    }

    _drawGates() {
        const c = this.c;
        this.GATES.forEach(gate => {
            const isMain = gate.id === 'gate1';
            const size = isMain ? 14 : 11;
            const fill = isMain ? c.you_are : c.gate;

            // Gate marker (diamond shape)
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('id', 'gate-' + gate.id);

            // Pin body
            this._circle(g, gate.x, gate.y, size, fill, '#ffffff', isMain ? 2.5 : 1.5);

            // Gate label
            const lines = gate.label.split('\n');
            const [lx, ly] = this._gateLabelPos(gate, size, lines.length);
            lines.forEach((line, i) => {
                this._text(g, lx, ly + i * 9, line, 7.5, c.text, 'middle', '700');
            });

            if (isMain) {
                // "You Are Here" pulse ring
                const pulse = this._circle(g, gate.x, gate.y, size + 4, 'none', fill, 2);
                pulse.style.opacity = '0.5';
                pulse.setAttribute('class', 'sathi-pulse');
            }

            this._gGates.appendChild(g);
        });
    }

    _gateLabelPos(gate, size, lineCount) {
        const offset = size + 10;
        switch (gate.side) {
            case 'right': return [gate.x - offset - 5, gate.y - (lineCount - 1) * 4.5];
            case 'left': return [gate.x + offset + 5, gate.y - (lineCount - 1) * 4.5];
            case 'top': return [gate.x, gate.y + offset];
            case 'bottom': return [gate.x, gate.y - offset + 4];
            default: return [gate.x, gate.y - offset];
        }
    }

    _drawDepartments() {
        const c = this.c;
        const colorMap = {
            blue: c.blue,
            yellow: c.yellow,
            red: c.red,
            green: c.green_strip,
        };

        this.DEPARTMENTS.forEach(dept => {
            const fill = colorMap[dept.color];
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('id', 'dept-' + dept.id);
            g.style.cursor = this.onDeptClick ? 'pointer' : 'default';

            // Dept circle
            const circle = this._circle(g, dept.x, dept.y, dept.r, fill, '#ffffff', 2);

            // Icon letter
            this._text(g, dept.x, dept.y + 4, dept.label.charAt(0),
                dept.r * 0.85, '#ffffff', 'middle', '800');

            // Label below
            const lblLines = dept.label.split('\n');
            const lblY = dept.y + dept.r + 10;
            lblLines.forEach((line, i) => {
                // white bg pill for readability
                this._text(g, dept.x, lblY + i * 9, line, 7,
                    this.darkMode ? '#e8f4f8' : '#1a2a3a', 'middle', '700');
            });

            if (this.onDeptClick) {
                g.addEventListener('click', () => this.onDeptClick(dept.id));
                g.addEventListener('mouseenter', () => circle.setAttribute('stroke-width', '3.5'));
                g.addEventListener('mouseleave', () => circle.setAttribute('stroke-width', '2'));
            }

            this._gDepts.appendChild(g);
        });
    }

    _drawLegend() {
        const c = this.c;
        const bg = this.darkMode ? 'rgba(4,22,36,0.88)' : 'rgba(255,255,255,0.9)';
        const lx = 74, ly = 500;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this._rect(g, lx, ly, 190, 72, bg, c.buildingStroke, 1, 6);
        this._text(g, lx + 8, ly + 12, 'FLOOR STRIPS', 7, c.textMuted, 'start', '700');

        [
            [c.blue, 'Blue = OPD'],
            [c.yellow, 'Yellow = Services'],
            [c.red, 'Red = Emergency'],
            [c.green_strip, 'Green = Diagnostics'],
        ].forEach(([col, lbl], i) => {
            const y = ly + 22 + i * 13;
            this._rect(g, lx + 8, y - 6, 22, 8, col, null, 0, 3);
            this._text(g, lx + 36, y + 1, lbl, 7.5, c.text, 'start', '600');
        });

        this._gLabels.appendChild(g);
    }

    // ── Public API ───────────────────────────────────────────────────────────

    showPath(deptId) {
        this.clearPath();
        const dept = this.DEPARTMENTS.find(d => d.id === deptId);
        if (!dept) return;

        this.activeDept = deptId;
        const c = this.c;
        const colorMap = {
            blue: c.blue,
            yellow: c.yellow,
            red: c.red,
            green: c.green_strip,
        };
        const pathColor = colorMap[dept.color];

        // Find gate marker and animate it
        const gateId = 'gate-' + dept.gate;
        const gateEl = this.svg.getElementById(gateId);
        if (gateEl) {
            gateEl.querySelector('circle').setAttribute('stroke-width', '4');
        }

        // 1) Shadow/glow path (wider, semi-transparent)
        const shadow = this._polyline(this._gPath, dept.path, 'rgba(255,255,255,0.12)', 16, null, null);

        // 2) Base path (solid)
        const base = this._polyline(this._gPath, dept.path, pathColor, 6, null, null);
        base.style.opacity = '0.35';

        // 3) Animated dashed overlay (the "moving" line)
        const animated = this._polyline(this._gPath, dept.path, '#ffffff', 4, '10 10', 'sathi-nav-path');
        animated.style.opacity = '0.9';
        animated.setAttribute('marker-end', `url(#${this._arrowId})`);

        // 4) Start dot (at gate)
        const start = dept.path[0];
        const startDot = this._circle(this._gPath, start[0], start[1], 8, pathColor, '#ffffff', 2.5);

        // 5) End dot with pulse (at department)
        const end = dept.path[dept.path.length - 1];
        const endRing = this._circle(this._gPath, end[0], end[1], 18, 'none', pathColor, 3);
        endRing.setAttribute('class', 'sathi-pulse');
        const endDot = this._circle(this._gPath, end[0], end[1], 11, pathColor, '#ffffff', 2.5);

        // 6) "START" label at gate entry
        const dir = this._getGateDir(dept.gate);
        const sl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sl.setAttribute('x', start[0] + dir[0]); sl.setAttribute('y', start[1] + dir[1]);
        sl.setAttribute('font-size', '8'); sl.setAttribute('fill', '#ffffff');
        sl.setAttribute('text-anchor', 'middle'); sl.setAttribute('font-weight', '800');
        sl.setAttribute('font-family', '"Exo 2", sans-serif');
        sl.setAttribute('paint-order', 'stroke');
        sl.setAttribute('stroke', 'rgba(0,0,0,0.5)'); sl.setAttribute('stroke-width', '2');
        sl.textContent = 'START HERE';
        this._gPath.appendChild(sl);

        // 7) Highlight the dept circle
        const deptEl = this.svg.getElementById('dept-' + deptId);
        if (deptEl) {
            const circle = deptEl.querySelector('circle');
            if (circle) {
                circle.setAttribute('stroke', '#ffffff');
                circle.setAttribute('stroke-width', '4');
            }
        }
    }

    clearPath() {
        this._gPath.innerHTML = '';
        this.activeDept = null;
        // Reset all dept circles
        this.DEPARTMENTS.forEach(dept => {
            const el = this.svg.getElementById('dept-' + dept.id);
            if (el) {
                const circle = el.querySelector('circle');
                if (circle) {
                    circle.setAttribute('stroke', '#ffffff');
                    circle.setAttribute('stroke-width', '2');
                }
            }
        });
        // Reset gate markers
        this.GATES.forEach(gate => {
            const el = this.svg.getElementById('gate-' + gate.id);
            if (el) {
                const circle = el.querySelector('circle');
                if (circle) circle.setAttribute('stroke-width', gate.id === 'gate1' ? '2.5' : '1.5');
            }
        });
    }

    _getGateDir(gateId) {
        const gate = this.GATES.find(g => g.id === gateId);
        if (!gate) return [0, -18];
        switch (gate.side) {
            case 'right': return [-28, -14];
            case 'left': return [28, -14];
            case 'top': return [0, 18];
            case 'bottom': return [0, -18];
            default: return [0, -18];
        }
    }
}

// Export globally
window.HospitalMap = HospitalMap;