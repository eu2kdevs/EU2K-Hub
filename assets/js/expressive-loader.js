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
      this._frameIndex = 0;
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
      this._frameDuration = 800; // ms per shape frame
      this._crossfade = 180; // ms crossfade duration
      this._render();
    }

    connectedCallback(){
      this._tick = (t)=>{
        if (!this.isConnected) return;
        if (this._lastSwitch === 0) this._lastSwitch = t;
        const elapsed = t - this._lastSwitch;
        if (elapsed >= this._frameDuration){
          this._advanceFrame();
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

    _advanceFrame(){
      const nextIndex = (this._frameIndex + 1) % this._frames.length;
      const nextUrl = this._frames[nextIndex];
      const current = this._front;
      const next = this._back;

      // Prepare back layer
      next.style.maskImage = `url(${nextUrl})`;
      next.style.webkitMaskImage = `url(${nextUrl})`;
      // Bounce animation on the incoming shape
      next.classList.remove('bounce');
      // Force reflow to restart animation
      void next.offsetWidth;
      next.classList.add('bounce');

      // Crossfade
      next.style.opacity = '1';
      current.style.opacity = '0';

      // Swap references after crossfade
      setTimeout(()=>{
        const tmp = this._front; this._front = this._back; this._back = tmp;
        this._frameIndex = nextIndex;
      }, this._crossfade);
    }

    _render(){
      const size = parseInt(this._size, 10) || 64;
      const showRing = this._variant === 'ring' || this._variant === 'shape-with-ring';
      const shapeSize = Math.round(size * 0.56);

      this._shadow.innerHTML = '';
      const style = document.createElement('style');
      style.textContent = `
        :host{ display:inline-flex; align-items:center; justify-content:center; }
        .wrapper{ position:relative; width:${size}px; height:${size}px; }
        .ring{ position:absolute; inset:0; border-radius:9999px; background: var(--md-sys-color-primary, #6750A4); opacity:0.12; }
        .plane{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
        .shape-figure{ width:${shapeSize}px; height:${shapeSize}px; background: var(--md-sys-color-primary, #6750A4); opacity:1; transition: opacity ${this._crossfade}ms ease; mask-repeat:no-repeat; mask-position:center; mask-size:contain; -webkit-mask-repeat:no-repeat; -webkit-mask-position:center; -webkit-mask-size:contain; }
        .bounce{ animation: m3bounce ${this._frameDuration}ms cubic-bezier(.2,.6,.2,1) 1; }
        @keyframes m3bounce{ 0%{ transform:scale(0.96); } 50%{ transform:scale(1.04); } 100%{ transform:scale(1.0); } }
      `;

      const wrapper = document.createElement('div');
      wrapper.className = 'wrapper';

      if (showRing){
        const ringEl = document.createElement('div');
        ringEl.className = 'ring';
        wrapper.appendChild(ringEl);
      }

      // Two planes for crossfade
      const planeA = document.createElement('div');
      planeA.className = 'plane';
      const figA = document.createElement('div');
      figA.className = 'shape-figure bounce';
      figA.style.maskImage = `url(${this._frames[this._frameIndex]})`;
      figA.style.webkitMaskImage = `url(${this._frames[this._frameIndex]})`;
      figA.style.opacity = '1';
      planeA.appendChild(figA);

      const planeB = document.createElement('div');
      planeB.className = 'plane';
      const figB = document.createElement('div');
      figB.className = 'shape-figure';
      figB.style.opacity = '0';
      planeB.appendChild(figB);

      wrapper.appendChild(planeA);
      wrapper.appendChild(planeB);

      this._shadow.appendChild(style);
      this._shadow.appendChild(wrapper);

      // Keep refs
      this._front = figA;
      this._back = figB;
    }
  }

  customElements.define('m3-expressive-loader', ExpressiveLoader);
})();


