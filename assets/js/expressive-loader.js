// Material 3 Expressive Loading Indicator (Web Component)
// Variants: shape-only, shape-with-ring
// Uses CSS custom properties to pick up your M3 theme tokens

(function(){
  class ExpressiveLoader extends HTMLElement {
    static get observedAttributes() { return ['variant', 'size']; }

    constructor(){
      super();
      this._shadow = this.attachShadow({ mode: 'open' });
      this._size = this.getAttribute('size') || '64';
      this._variant = this.getAttribute('variant') || 'shape';
      this._frame = 0;
      this._raf = null;
      this._frames = [
        '/EU2K-Hub/assets/animation/shape1.svg',
        '/EU2K-Hub/assets/animation/shape2.svg',
        '/EU2K-Hub/assets/animation/shape3.svg',
        '/EU2K-Hub/assets/animation/shape4.svg',
        '/EU2K-Hub/assets/animation/shape5.svg',
        '/EU2K-Hub/assets/animation/shape6.svg',
        '/EU2K-Hub/assets/animation/shape7.svg',
        '/EU2K-Hub/assets/animation/shape8.svg'
      ];
      this._lastSwitch = 0;
      this._switchInterval = 180; // ms between frames
      this._render();
    }

    connectedCallback(){
      this._tick = (t)=>{
        if (!this.isConnected) return;
        if (this._lastSwitch === 0) this._lastSwitch = t;
        const elapsed = t - this._lastSwitch;
        if (elapsed >= this._switchInterval){
          this._frame = (this._frame + 1) % this._frames.length;
          this._img.src = this._frames[this._frame];
          this._lastSwitch = t;
        }
        this._raf = requestAnimationFrame(this._tick);
      };
      this._raf = requestAnimationFrame(this._tick);
    }

    disconnectedCallback(){
      if (this._raf) cancelAnimationFrame(this._raf);
    }

    attributeChangedCallback(name){
      if (name === 'variant' || name === 'size'){
        this._size = this.getAttribute('size') || this._size;
        this._variant = this.getAttribute('variant') || this._variant;
        this._render();
      }
    }

    _render(){
      const size = parseInt(this._size, 10) || 64;
      const ring = this._variant === 'ring' || this._variant === 'shape-with-ring';
      this._shadow.innerHTML = '';
      const style = document.createElement('style');
      style.textContent = `
        :host{ display:inline-flex; align-items:center; justify-content:center; }
        .wrapper{ position:relative; width:${size}px; height:${size}px; }
        .ring{ position:absolute; inset:0; border-radius:9999px; background: var(--md-sys-color-primary, #6750A4); opacity:0.25; transform: scale(0.9); animation: pulse 800ms ease-in-out infinite alternate; }
        .shape{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
        .shape img{ width:${Math.round(size*0.56)}px; height:${Math.round(size*0.56)}px; filter: drop-shadow(0 1px 0 rgba(0,0,0,.04)); transition: transform 180ms ease, opacity 180ms ease; opacity:1; }
        @keyframes pulse{ from{ transform: scale(0.88); } to{ transform: scale(1); } }
      `;
      const wrapper = document.createElement('div');
      wrapper.className = 'wrapper';
      if (ring){
        const ringEl = document.createElement('div');
        ringEl.className = 'ring';
        wrapper.appendChild(ringEl);
      }
      const shape = document.createElement('div');
      shape.className = 'shape';
      const img = document.createElement('img');
      img.alt = 'loading';
      img.src = this._frames[this._frame];
      shape.appendChild(img);
      wrapper.appendChild(shape);
      this._shadow.appendChild(style);
      this._shadow.appendChild(wrapper);
      this._img = img;
    }
  }

  customElements.define('m3-expressive-loader', ExpressiveLoader);
})();


