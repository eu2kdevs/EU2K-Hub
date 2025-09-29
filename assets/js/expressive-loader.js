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
      this._timer = null;
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
      this._frameDuration = 800; // ms per shape frame
      this._dList = [];
      this._render();
    }

    connectedCallback(){
      this._init();
    }

    disconnectedCallback(){
      if (this._timer) clearTimeout(this._timer);
    }

    attributeChangedCallback(name){
      if (name === 'variant' || name === 'size'){
        this._size = this.getAttribute('size') || this._size;
        this._variant = this.getAttribute('variant') || this._variant;
        this._render();
      }
    }

    async _init(){
      if (!this._dList.length){
        try {
          const ds = await Promise.all(this._frames.map(u => this._fetchPathD(u)));
          this._dList = ds.filter(Boolean);
        } catch (e) {
          this._dList = [];
        }
      }
      // Fallback if we couldn't load any paths
      if (!this._dList.length){
        this._dList = ['M0,0h1v1h-1z'];
      }
      // Seed current path
      if (this._path){
        this._path.setAttribute('d', this._dList[this._frameIndex]);
      }
      this._loop();
    }

    _loop(){
      if (!this.isConnected) return;
      const nextIndex = (this._frameIndex + 1) % this._dList.length;
      const fromD = this._dList[this._frameIndex];
      const toD = this._dList[nextIndex];
      this._morph(fromD, toD);
      this._frameIndex = nextIndex;
      this._timer = setTimeout(()=> this._loop(), this._frameDuration);
    }

    _morph(fromD, toD){
      if (!this._path || !this._anim) return;
      // Restart bounce on group
      this._g.classList.remove('bounce');
      void this._g.offsetWidth;
      this._g.classList.add('bounce');
      // Configure and start SMIL animate on 'd'
      this._anim.setAttribute('from', fromD);
      this._anim.setAttribute('to', toD);
      this._anim.setAttribute('dur', this._frameDuration + 'ms');
      this._anim.beginElement();
    }

    async _fetchPathD(url){
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const path = doc.querySelector('path');
        return path ? path.getAttribute('d') : null;
      } catch (e) { return null; }
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
        .svgbox{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
        svg{ width:${shapeSize}px; height:${shapeSize}px; overflow:visible; }
        path{ fill: var(--md-sys-color-primary, #6750A4); }
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

      // Inline SVG with <animate> on path 'd'
      const svgBox = document.createElement('div');
      svgBox.className = 'svgbox';
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      const g = document.createElementNS(svgNS, 'g');
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', '');
      const animate = document.createElementNS(svgNS, 'animate');
      animate.setAttribute('attributeName', 'd');
      animate.setAttribute('fill', 'freeze');
      animate.setAttribute('begin', 'indefinite');
      g.appendChild(path);
      path.appendChild(animate);
      svg.appendChild(g);
      svgBox.appendChild(svg);
      wrapper.appendChild(svgBox);

      this._shadow.appendChild(style);
      this._shadow.appendChild(wrapper);

      // Keep refs
      this._svg = svg;
      this._g = g;
      this._path = path;
      this._anim = animate;
      this._g.classList.add('bounce');
    }
  }

  customElements.define('m3-expressive-loader', ExpressiveLoader);
})();


