/**
 * SATHI Kiosk – Virtual On-Screen Keyboard
 * Supports: English, Hindi (transliteration hints), and number row
 * Designed for large touch targets on a kiosk display
 */

class VirtualKeyboard {
  constructor(options = {}) {
    this.targetInput = null;
    this.onInput = options.onInput || null;
    this.lang = options.lang || 'en';
    this.visible = false;
    this.container = null;
    this.capsLock = false;
    this.currentLayout = 'alpha';

    this.layouts = {
      en_lower: [
        ['q','w','e','r','t','y','u','i','o','p'],
        ['a','s','d','f','g','h','j','k','l'],
        ['CAPS','z','x','c','v','b','n','m','⌫'],
        ['123','SPACE','CLEAR','✓']
      ],
      en_upper: [
        ['Q','W','E','R','T','Y','U','I','O','P'],
        ['A','S','D','F','G','H','J','K','L'],
        ['caps','Z','X','C','V','B','N','M','⌫'],
        ['123','SPACE','CLEAR','✓']
      ],
      num: [
        ['1','2','3','4','5','6','7','8','9','0'],
        ['-','/',':', ';','(',')','.','@',',','?'],
        ['ABC','!','"','\'','_','&','%','+','⌫'],
        ['SPACE','CLEAR','✓']
      ],
      hi: [
        ['ब','भ','म','य','र','ल','व','श','ष','स'],
        ['क','ख','ग','घ','च','छ','ज','झ','ट','ठ'],
        ['ड','ढ','त','थ','द','ध','न','प','फ','⌫'],
        ['अ','आ','इ','ई','उ','ऊ','ए','ए','ओ','औ'],
        ['ALPHA','SPACE','CLEAR','✓']
      ]
    };

    this._build();
  }

  _build() {
    // Overlay backdrop
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 800;
      background: rgba(0,0,0,0.35);
      display: none;
      pointer-events: none;
    `;
    document.body.appendChild(this.overlay);

    // Keyboard container
    this.container = document.createElement('div');
    this.container.id = 'vkb-container';
    this.container.style.cssText = `
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 850;
      background: #0a2342;
      border-top: 3px solid #0d6e8a;
      padding: 12px 10px 16px;
      display: none;
      box-shadow: 0 -10px 40px rgba(0,0,0,0.6);
      user-select: none;
      -webkit-user-select: none;
    `;

    // Input preview bar
    this.preview = document.createElement('div');
    this.preview.style.cssText = `
      background: rgba(13,110,138,0.15);
      border: 1px solid rgba(13,110,138,0.4);
      border-radius: 10px;
      padding: 10px 16px;
      font-size: 18px;
      color: #f8fafc;
      font-family: 'Noto Sans Devanagari', 'Exo 2', sans-serif;
      margin-bottom: 10px;
      min-height: 44px;
      display: flex; align-items: center; justify-content: space-between;
      letter-spacing: 0.5px;
    `;
    this.previewText = document.createElement('span');
    this.previewCursor = document.createElement('span');
    this.previewCursor.textContent = '|';
    this.previewCursor.style.cssText = 'animation: blink 1s infinite; color: #1a9ab8; font-weight: 300;';
    const style = document.createElement('style');
    style.textContent = `@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`;
    document.head.appendChild(style);
    this.preview.appendChild(this.previewText);
    this.preview.appendChild(this.previewCursor);

    // Lang toggle row
    const langRow = document.createElement('div');
    langRow.style.cssText = 'display:flex; gap:8px; margin-bottom:10px;';
    ['EN', 'हि', 'मा'].forEach((l, i) => {
      const btn = document.createElement('button');
      btn.textContent = l;
      btn.dataset.lang = ['en','hi','mr'][i];
      btn.style.cssText = `
        padding: 7px 18px; border-radius: 8px; border: 1px solid rgba(13,110,138,0.4);
        background: rgba(13,110,138,0.15); color: #f8fafc;
        font-size: 13px; font-weight: 700; cursor: pointer;
        transition: all 0.15s; font-family: 'Noto Sans Devanagari', sans-serif;
      `;
      btn.addEventListener('click', () => {
        this.lang = btn.dataset.lang;
        document.querySelectorAll('#vkb-container [data-lang]').forEach(b =>
          b.style.background = 'rgba(13,110,138,0.15)'
        );
        btn.style.background = '#0d6e8a';
        this.currentLayout = this.lang === 'hi' || this.lang === 'mr' ? 'hi' : 'en_lower';
        this._renderKeys();
      });
      langRow.appendChild(btn);
    });

    this.keysArea = document.createElement('div');
    this.keysArea.style.cssText = 'display:flex; flex-direction:column; gap:7px;';

    this.container.appendChild(this.preview);
    this.container.appendChild(langRow);
    this.container.appendChild(this.keysArea);
    document.body.appendChild(this.container);

    this._renderKeys();
  }

  _renderKeys() {
    this.keysArea.innerHTML = '';
    const layout = this.layouts[this.currentLayout] ||
                   this.layouts[this.capsLock ? 'en_upper' : 'en_lower'];

    layout.forEach(row => {
      const rowDiv = document.createElement('div');
      rowDiv.style.cssText = 'display:flex; gap:6px; justify-content:center;';

      row.forEach(key => {
        const btn = document.createElement('button');
        btn.dataset.key = key;

        // Sizing
        let minWidth = '48px'; let flex = '1';
        if (key === 'SPACE') { flex = '3'; minWidth = '120px'; }
        else if (['CAPS','caps','123','ABC','ALPHA','CLEAR','✓'].includes(key)) {
          flex = '1.5'; minWidth = '70px';
        }

        // Colors
        let bg = 'rgba(255,255,255,0.08)';
        let color = '#f8fafc';
        let border = '1px solid rgba(255,255,255,0.1)';
        if (key === '✓') { bg = 'linear-gradient(135deg,#0d6e8a,#1a9ab8)'; border = 'none'; }
        else if (key === '⌫') { bg = 'rgba(198,40,40,0.25)'; border = '1px solid rgba(198,40,40,0.4)'; color = '#ef9a9a'; }
        else if (key === 'CLEAR') { bg = 'rgba(198,40,40,0.15)'; border = '1px solid rgba(198,40,40,0.3)'; color = '#ef9a9a'; }
        else if (['CAPS','caps','123','ABC','ALPHA'].includes(key)) { bg = 'rgba(13,110,138,0.3)'; }

        btn.style.cssText = `
          flex: ${flex}; min-width: ${minWidth};
          padding: 13px 8px;
          background: ${bg}; color: ${color}; border: ${border};
          border-radius: 10px; font-size: 16px; font-weight: 600;
          cursor: pointer; font-family: 'Noto Sans Devanagari', 'Exo 2', sans-serif;
          transition: transform 0.1s, opacity 0.1s;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        `;

        // Display label
        btn.textContent = key === 'SPACE' ? '______' :
                          key === 'CAPS' ? '⬆ CAPS' :
                          key === 'caps' ? '⬆ caps' :
                          key === 'CLEAR' ? '✖ Clear' :
                          key === 'ALPHA' ? 'ABC' :
                          key === '✓' ? '✓ Done' : key;

        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          btn.style.transform = 'scale(0.9)';
          btn.style.opacity = '0.7';
          this._handleKey(key);
        });
        btn.addEventListener('pointerup', () => {
          btn.style.transform = '';
          btn.style.opacity = '';
        });

        rowDiv.appendChild(btn);
      });
      this.keysArea.appendChild(rowDiv);
    });
  }

  _handleKey(key) {
    if (!this.targetInput) return;
    const input = this.targetInput;

    switch(key) {
      case '⌫':
        input.value = input.value.slice(0, -1);
        break;
      case 'CLEAR':
        input.value = '';
        break;
      case 'SPACE':
        input.value += ' ';
        break;
      case '✓':
        this.hide();
        if (this.onInput) this.onInput(input.value);
        return;
      case 'CAPS':
        this.capsLock = true;
        this.currentLayout = 'en_upper';
        this._renderKeys();
        return;
      case 'caps':
        this.capsLock = false;
        this.currentLayout = 'en_lower';
        this._renderKeys();
        return;
      case '123':
        this.currentLayout = 'num';
        this._renderKeys();
        return;
      case 'ABC':
        this.currentLayout = this.capsLock ? 'en_upper' : 'en_lower';
        this._renderKeys();
        return;
      case 'ALPHA':
        this.currentLayout = 'en_lower';
        this.lang = 'en';
        this._renderKeys();
        return;
      default:
        if (this.capsLock && this.currentLayout === 'en_upper') {
          this.capsLock = false;
          this.currentLayout = 'en_lower';
        }
        input.value += key;
    }

    this.previewText.textContent = input.value;

    // Trigger oninput on the actual input
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (this.onInput) this.onInput(input.value);
  }

  attach(inputElement, onInputCallback) {
    this.targetInput = inputElement;
    this.onInput = onInputCallback || null;
    this.previewText.textContent = inputElement.value;

    // Show on focus
    inputElement.addEventListener('focus', () => this.show());
    inputElement.addEventListener('click', () => this.show());
    // Prevent native keyboard on mobile/kiosk
    inputElement.setAttribute('readonly', 'readonly');
    inputElement.addEventListener('focus', () => {
      inputElement.removeAttribute('readonly');
    });
  }

  show() {
    this.container.style.display = 'block';
    this.overlay.style.display = 'block';
    this.visible = true;
    if (this.targetInput) {
      this.previewText.textContent = this.targetInput.value;
      // Set lang-appropriate layout
      if (this.lang === 'hi' || this.lang === 'mr') {
        this.currentLayout = 'hi';
      } else {
        this.currentLayout = this.capsLock ? 'en_upper' : 'en_lower';
      }
      this._renderKeys();
    }
  }

  hide() {
    this.container.style.display = 'none';
    this.overlay.style.display = 'none';
    this.visible = false;
    if (this.targetInput) this.targetInput.blur();
  }

  setLang(lang) {
    this.lang = lang;
    if (lang === 'hi' || lang === 'mr') {
      this.currentLayout = 'hi';
    } else {
      this.currentLayout = 'en_lower';
    }
    this._renderKeys();
  }
}

// Export for use in kiosk
window.VirtualKeyboard = VirtualKeyboard;
