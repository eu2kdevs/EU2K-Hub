// Lightweight shim for @material/web components used by the Hub on webOS.
// Replaces a CDN HTML dump with a small ESM module that registers
// minimal custom elements the app references. This avoids runtime
// network imports and fixes the JS compile errors caused by embedded HTML.

class MdSwitch extends HTMLElement {
	constructor(){ super(); this.selected = false }
	connectedCallback(){ this.setAttribute('role','switch'); this.tabIndex = 0 }
}

class MdRadio extends HTMLElement {
	constructor(){ super(); this.checked = false }
	connectedCallback(){ this.setAttribute('role','radio'); this.tabIndex = 0 }
}

class MdFilledButton extends HTMLElement {
	connectedCallback(){ this.tabIndex = 0 }
}

class MdFab extends HTMLElement {
	connectedCallback(){ this.tabIndex = 0 }
}

if (typeof customElements !== 'undefined') {
	if (!customElements.get('md-switch')) customElements.define('md-switch', MdSwitch);
	if (!customElements.get('md-radio')) customElements.define('md-radio', MdRadio);
	if (!customElements.get('md-filled-button')) customElements.define('md-filled-button', MdFilledButton);
	if (!customElements.get('md-fab')) customElements.define('md-fab', MdFab);
}

// Export a tiny 'styles' object in case pages import it.
export const styles = {
	typescaleStyles: {
		styleSheet: (function(){
			try { return new CSSStyleSheet() } catch(e) { const s = document.createElement('style'); document.head.appendChild(s); return s.sheet }
		})()
	}
};

export default { MdSwitch, MdRadio, MdFilledButton, MdFab, styles };
					<option value="@material/web@2.3.1-nightly.bfd9cdf.0">@material/web@2.3.1-nightly.bfd9cdf.0</option>
					<option value="@material/web@2.3.1-nightly.8c1b985.0">@material/web@2.3.1-nightly.8c1b985.0</option>
					<option value="@material/web@2.3.1-nightly.898e9c1.0">@material/web@2.3.1-nightly.898e9c1.0</option>
					<option value="@material/web@2.3.1-nightly.8808a25.0">@material/web@2.3.1-nightly.8808a25.0</option>
					<option value="@material/web@2.3.1-nightly.70a1d8e.0">@material/web@2.3.1-nightly.70a1d8e.0</option>
					<option value="@material/web@2.3.1-nightly.6c06074.0">@material/web@2.3.1-nightly.6c06074.0</option>
					<option value="@material/web@2.3.1-nightly.688ab3c.0">@material/web@2.3.1-nightly.688ab3c.0</option>
					<option value="@material/web@2.3.1-nightly.67ea11a.0">@material/web@2.3.1-nightly.67ea11a.0</option>
					<option value="@material/web@2.3.1-nightly.5bc1506.0">@material/web@2.3.1-nightly.5bc1506.0</option>
					<option value="@material/web@2.3.1-nightly.470d82d.0">@material/web@2.3.1-nightly.470d82d.0</option>
					<option value="@material/web@2.3.1-nightly.3e9cbf6.0">@material/web@2.3.1-nightly.3e9cbf6.0</option>
					<option value="@material/web@2.3.1-nightly.169023d.0">@material/web@2.3.1-nightly.169023d.0</option>
					<option value="@material/web@2.3.1-nightly.150105a.0">@material/web@2.3.1-nightly.150105a.0</option>
					<option value="@material/web@2.3.0">@material/web@2.3.0</option>
					<option value="@material/web@2.2.1-nightly.ff9ab97.0">@material/web@2.2.1-nightly.ff9ab97.0</option>
					<option value="@material/web@2.2.1-nightly.e217185.0">@material/web@2.2.1-nightly.e217185.0</option>
					<option value="@material/web@2.2.1-nightly.d69f2f2.0">@material/web@2.2.1-nightly.d69f2f2.0</option>
					<option value="@material/web@2.2.1-nightly.d280122.0">@material/web@2.2.1-nightly.d280122.0</option>
					<option value="@material/web@2.2.1-nightly.c27bdee.0">@material/web@2.2.1-nightly.c27bdee.0</option>
					<option value="@material/web@2.2.1-nightly.b10ce3f.0">@material/web@2.2.1-nightly.b10ce3f.0</option>
					<option value="@material/web@2.2.1-nightly.ac91657.0">@material/web@2.2.1-nightly.ac91657.0</option>
					<option value="@material/web@2.2.1-nightly.919fe12.0">@material/web@2.2.1-nightly.919fe12.0</option>
					<option value="@material/web@2.2.1-nightly.855de0b.0">@material/web@2.2.1-nightly.855de0b.0</option>
					<option value="@material/web@2.2.1-nightly.82a32ad.0">@material/web@2.2.1-nightly.82a32ad.0</option>
					<option value="@material/web@2.2.1-nightly.767d1f1.0">@material/web@2.2.1-nightly.767d1f1.0</option>
					<option value="@material/web@2.2.1-nightly.40b8cb3.0">@material/web@2.2.1-nightly.40b8cb3.0</option>
					<option value="@material/web@2.2.1-nightly.223b88d.0">@material/web@2.2.1-nightly.223b88d.0</option>
					<option value="@material/web@2.2.1-nightly.1bdcbd3.0">@material/web@2.2.1-nightly.1bdcbd3.0</option>
					<option value="@material/web@2.2.1-nightly.045fe94.0">@material/web@2.2.1-nightly.045fe94.0</option>
					<option value="@material/web@2.2.0">@material/web@2.2.0</option>
					<option value="@material/web@2.1.1-nightly.a9ee4f5.0">@material/web@2.1.1-nightly.a9ee4f5.0</option>
					<option value="@material/web@2.1.1-nightly.44c13cd.0">@material/web@2.1.1-nightly.44c13cd.0</option>
					<option value="@material/web@2.1.1-nightly.28d8a1e.0">@material/web@2.1.1-nightly.28d8a1e.0</option>
					<option value="@material/web@2.1.1-nightly.22e19c2.0">@material/web@2.1.1-nightly.22e19c2.0</option>
					<option value="@material/web@2.1.1-nightly.024d6d9.0">@material/web@2.1.1-nightly.024d6d9.0</option>
					<option value="@material/web@2.1.0">@material/web@2.1.0</option>
					<option value="@material/web@2.0.1-nightly.e15f47e.0">@material/web@2.0.1-nightly.e15f47e.0</option>
					<option value="@material/web@2.0.1-nightly.c1991c4.0">@material/web@2.0.1-nightly.c1991c4.0</option>
					<option value="@material/web@2.0.1-nightly.be69438.0">@material/web@2.0.1-nightly.be69438.0</option>
					<option value="@material/web@2.0.1-nightly.b8f362a.0">@material/web@2.0.1-nightly.b8f362a.0</option>
					<option value="@material/web@2.0.1-nightly.7231e51.0">@material/web@2.0.1-nightly.7231e51.0</option>
					<option value="@material/web@2.0.0">@material/web@2.0.0</option>
					<option value="@material/web@1.5.2-nightly.d8cda54.0">@material/web@1.5.2-nightly.d8cda54.0</option>
					<option value="@material/web@1.5.2-nightly.d72193f.0">@material/web@1.5.2-nightly.d72193f.0</option>
					<option value="@material/web@1.5.2-nightly.aea7781.0">@material/web@1.5.2-nightly.aea7781.0</option>
					<option value="@material/web@1.5.2-nightly.7ec70c4.0">@material/web@1.5.2-nightly.7ec70c4.0</option>
					<option value="@material/web@1.5.2-nightly.713f0a8.0">@material/web@1.5.2-nightly.713f0a8.0</option>
					<option value="@material/web@1.5.2-nightly.5df9410.0">@material/web@1.5.2-nightly.5df9410.0</option>
					<option value="@material/web@1.5.2-nightly.5b73f4c.0">@material/web@1.5.2-nightly.5b73f4c.0</option>
					<option value="@material/web@1.5.2-nightly.352607d.0">@material/web@1.5.2-nightly.352607d.0</option>
					<option value="@material/web@1.5.2-nightly.7867674.0">@material/web@1.5.2-nightly.7867674.0</option>
					<option value="@material/web@1.5.1">@material/web@1.5.1</option>
					<option value="@material/web@1.5.1-nightly.dc2ba2a.0">@material/web@1.5.1-nightly.dc2ba2a.0</option>
					<option value="@material/web@1.5.1-nightly.c84bef7.0">@material/web@1.5.1-nightly.c84bef7.0</option>
					<option value="@material/web@1.5.1-nightly.c1d585d.0">@material/web@1.5.1-nightly.c1d585d.0</option>
					<option value="@material/web@1.5.1-nightly.b75bd2f.0">@material/web@1.5.1-nightly.b75bd2f.0</option>
					<option value="@material/web@1.5.1-nightly.aab5e69.0">@material/web@1.5.1-nightly.aab5e69.0</option>
					<option value="@material/web@1.5.1-nightly.9bbe75a.0">@material/web@1.5.1-nightly.9bbe75a.0</option>
					<option value="@material/web@1.5.1-nightly.4f7ff4f.0">@material/web@1.5.1-nightly.4f7ff4f.0</option>
					<option value="@material/web@1.5.1-nightly.17aa21a.0">@material/web@1.5.1-nightly.17aa21a.0</option>
					<option value="@material/web@1.5.1-nightly.0509c86.0">@material/web@1.5.1-nightly.0509c86.0</option>
					<option value="@material/web@1.5.0">@material/web@1.5.0</option>
					<option value="@material/web@1.4.2-nightly.faf03c2.0">@material/web@1.4.2-nightly.faf03c2.0</option>
					<option value="@material/web@1.4.2-nightly.e77ce06.0">@material/web@1.4.2-nightly.e77ce06.0</option>
					<option value="@material/web@1.4.2-nightly.e1f9cbc.0">@material/web@1.4.2-nightly.e1f9cbc.0</option>
					<option value="@material/web@1.4.2-nightly.d802f89.0">@material/web@1.4.2-nightly.d802f89.0</option>
					<option value="@material/web@1.4.2-nightly.b73792a.0">@material/web@1.4.2-nightly.b73792a.0</option>
					<option value="@material/web@1.4.2-nightly.9ec8d38.0">@material/web@1.4.2-nightly.9ec8d38.0</option>
					<option value="@material/web@1.4.2-nightly.7f3d9d1.0">@material/web@1.4.2-nightly.7f3d9d1.0</option>
					<option value="@material/web@1.4.2-nightly.47b4f67.0">@material/web@1.4.2-nightly.47b4f67.0</option>
					<option value="@material/web@1.4.2-nightly.2b02497.0">@material/web@1.4.2-nightly.2b02497.0</option>
					<option value="@material/web@1.4.2-nightly.1bf8b5f.0">@material/web@1.4.2-nightly.1bf8b5f.0</option>
					<option value="@material/web@1.4.2-nightly.0aea436.0">@material/web@1.4.2-nightly.0aea436.0</option>
					<option value="@material/web@1.4.2-nightly.9233821.0">@material/web@1.4.2-nightly.9233821.0</option>
					<option value="@material/web@1.4.1">@material/web@1.4.1</option>
					<option value="@material/web@1.4.1-nightly.ffc08d1.0">@material/web@1.4.1-nightly.ffc08d1.0</option>
					<option value="@material/web@1.4.1-nightly.df6923e.0">@material/web@1.4.1-nightly.df6923e.0</option>
					<option value="@material/web@1.4.1-nightly.b46361e.0">@material/web@1.4.1-nightly.b46361e.0</option>
					<option value="@material/web@1.4.1-nightly.7a6cf16.0">@material/web@1.4.1-nightly.7a6cf16.0</option>
					<option value="@material/web@1.4.1-nightly.6f354ac.0">@material/web@1.4.1-nightly.6f354ac.0</option>
					<option value="@material/web@1.4.1-nightly.69b4e94.0">@material/web@1.4.1-nightly.69b4e94.0</option>
					<option value="@material/web@1.4.1-nightly.59662e1.0">@material/web@1.4.1-nightly.59662e1.0</option>
					<option value="@material/web@1.4.1-nightly.9757681.0">@material/web@1.4.1-nightly.9757681.0</option>
					<option value="@material/web@1.4.0">@material/web@1.4.0</option>
					<option value="@material/web@1.3.1-nightly.ec0a8eb.0">@material/web@1.3.1-nightly.ec0a8eb.0</option>
					<option value="@material/web@1.3.1-nightly.cde649c.0">@material/web@1.3.1-nightly.cde649c.0</option>
					<option value="@material/web@1.3.1-nightly.c6ffd70.0">@material/web@1.3.1-nightly.c6ffd70.0</option>
					<option value="@material/web@1.3.1-nightly.c3d303e.0">@material/web@1.3.1-nightly.c3d303e.0</option>
					<option value="@material/web@1.3.1-nightly.c35bad0.0">@material/web@1.3.1-nightly.c35bad0.0</option>
					<option value="@material/web@1.3.1-nightly.8f7cb4c.0">@material/web@1.3.1-nightly.8f7cb4c.0</option>
					<option value="@material/web@1.3.1-nightly.80b14d7.0">@material/web@1.3.1-nightly.80b14d7.0</option>
					<option value="@material/web@1.3.1-nightly.758e615.0">@material/web@1.3.1-nightly.758e615.0</option>
					<option value="@material/web@1.3.1-nightly.41bfda8.0">@material/web@1.3.1-nightly.41bfda8.0</option>
					<option value="@material/web@1.3.1-nightly.34c0a67.0">@material/web@1.3.1-nightly.34c0a67.0</option>
					<option value="@material/web@1.3.1-nightly.2ae226c.0">@material/web@1.3.1-nightly.2ae226c.0</option>
					<option value="@material/web@1.3.1-nightly.274ce3e.0">@material/web@1.3.1-nightly.274ce3e.0</option>
					<option value="@material/web@1.3.1-nightly.2613de4.0">@material/web@1.3.1-nightly.2613de4.0</option>
					<option value="@material/web@1.3.0">@material/web@1.3.0</option>
					<option value="@material/web@1.2.1-nightly.f39617f.0">@material/web@1.2.1-nightly.f39617f.0</option>
					<option value="@material/web@1.2.1-nightly.e18d913.0">@material/web@1.2.1-nightly.e18d913.0</option>
					<option value="@material/web@1.2.1-nightly.b23e321.0">@material/web@1.2.1-nightly.b23e321.0</option>
					<option value="@material/web@1.2.1-nightly.87d7eac.0">@material/web@1.2.1-nightly.87d7eac.0</option>
					<option value="@material/web@1.2.1-nightly.84536d7.0">@material/web@1.2.1-nightly.84536d7.0</option>
					<option value="@material/web@1.2.1-nightly.6ecda49.0">@material/web@1.2.1-nightly.6ecda49.0</option>
					<option value="@material/web@1.2.1-nightly.6b95a13.0">@material/web@1.2.1-nightly.6b95a13.0</option>
					<option value="@material/web@1.2.1-nightly.6589b2e.0">@material/web@1.2.1-nightly.6589b2e.0</option>
					<option value="@material/web@1.2.1-nightly.5f93c82.0">@material/web@1.2.1-nightly.5f93c82.0</option>
					<option value="@material/web@1.2.1-nightly.3e934e1.0">@material/web@1.2.1-nightly.3e934e1.0</option>
					<option value="@material/web@1.2.1-nightly.3be7ca3.0">@material/web@1.2.1-nightly.3be7ca3.0</option>
					<option value="@material/web@1.2.1-nightly.09f620d.0">@material/web@1.2.1-nightly.09f620d.0</option>
					<option value="@material/web@1.2.1-nightly.2049323.0">@material/web@1.2.1-nightly.2049323.0</option>
					<option value="@material/web@1.2.0">@material/web@1.2.0</option>
					<option value="@material/web@1.1.2-nightly.cef1b74.0">@material/web@1.1.2-nightly.cef1b74.0</option>
					<option value="@material/web@1.1.2-nightly.c97362c.0">@material/web@1.1.2-nightly.c97362c.0</option>
					<option value="@material/web@1.1.2-nightly.c9360e2.0">@material/web@1.1.2-nightly.c9360e2.0</option>
					<option value="@material/web@1.1.2-nightly.ad52075.0">@material/web@1.1.2-nightly.ad52075.0</option>
					<option value="@material/web@1.1.2-nightly.a3b2be8.0">@material/web@1.1.2-nightly.a3b2be8.0</option>
					<option value="@material/web@1.1.2-nightly.98ba0b9.0">@material/web@1.1.2-nightly.98ba0b9.0</option>
					<option value="@material/web@1.1.2-nightly.926edfb.0">@material/web@1.1.2-nightly.926edfb.0</option>
					<option value="@material/web@1.1.2-nightly.839667d.0">@material/web@1.1.2-nightly.839667d.0</option>
					<option value="@material/web@1.1.2-nightly.7dd7a68.0">@material/web@1.1.2-nightly.7dd7a68.0</option>
					<option value="@material/web@1.1.2-nightly.73725be.0">@material/web@1.1.2-nightly.73725be.0</option>
					<option value="@material/web@1.1.2-nightly.6efc904.0">@material/web@1.1.2-nightly.6efc904.0</option>
					<option value="@material/web@1.1.2-nightly.5dc870b.0">@material/web@1.1.2-nightly.5dc870b.0</option>
					<option value="@material/web@1.1.2-nightly.50a9ffa.0">@material/web@1.1.2-nightly.50a9ffa.0</option>
					<option value="@material/web@1.1.2-nightly.4b4c373.0">@material/web@1.1.2-nightly.4b4c373.0</option>
					<option value="@material/web@1.1.2-nightly.422f105.0">@material/web@1.1.2-nightly.422f105.0</option>
					<option value="@material/web@1.1.2-nightly.363fc05.0">@material/web@1.1.2-nightly.363fc05.0</option>
					<option value="@material/web@1.1.2-nightly.3151fd8.0">@material/web@1.1.2-nightly.3151fd8.0</option>
					<option value="@material/web@1.1.2-nightly.044ee51.0">@material/web@1.1.2-nightly.044ee51.0</option>
					<option value="@material/web@1.1.2-nightly.043bbad.0">@material/web@1.1.2-nightly.043bbad.0</option>
					<option value="@material/web@1.1.2-nightly.035d155.0">@material/web@1.1.2-nightly.035d155.0</option>
					<option value="@material/web@1.1.1">@material/web@1.1.1</option>
					<option value="@material/web@1.1.0">@material/web@1.1.0</option>
					<option value="@material/web@1.0.2-nightly.f7a66a8.0">@material/web@1.0.2-nightly.f7a66a8.0</option>
					<option value="@material/web@1.0.2-nightly.e78a52f.0">@material/web@1.0.2-nightly.e78a52f.0</option>
					<option value="@material/web@1.0.2-nightly.c9e8de0.0">@material/web@1.0.2-nightly.c9e8de0.0</option>
					<option value="@material/web@1.0.2-nightly.b5686ea.0">@material/web@1.0.2-nightly.b5686ea.0</option>
					<option value="@material/web@1.0.2-nightly.a6d984a.0">@material/web@1.0.2-nightly.a6d984a.0</option>
					<option value="@material/web@1.0.2-nightly.a0baa4d.0">@material/web@1.0.2-nightly.a0baa4d.0</option>
					<option value="@material/web@1.0.2-nightly.8eb1f30.0">@material/web@1.0.2-nightly.8eb1f30.0</option>
					<option value="@material/web@1.0.2-nightly.79f7dd2.0">@material/web@1.0.2-nightly.79f7dd2.0</option>
					<option value="@material/web@1.0.2-nightly.77fd177.0">@material/web@1.0.2-nightly.77fd177.0</option>
					<option value="@material/web@1.0.2-nightly.739cf33.0">@material/web@1.0.2-nightly.739cf33.0</option>
					<option value="@material/web@1.0.2-nightly.6be83b4.0">@material/web@1.0.2-nightly.6be83b4.0</option>
					<option value="@material/web@1.0.2-nightly.6a1fb38.0">@material/web@1.0.2-nightly.6a1fb38.0</option>
					<option value="@material/web@1.0.2-nightly.636a68c.0">@material/web@1.0.2-nightly.636a68c.0</option>
					<option value="@material/web@1.0.2-nightly.52e568d.0">@material/web@1.0.2-nightly.52e568d.0</option>
					<option value="@material/web@1.0.2-nightly.3d8c7ac.0">@material/web@1.0.2-nightly.3d8c7ac.0</option>
					<option value="@material/web@1.0.2-nightly.33c1afe.0">@material/web@1.0.2-nightly.33c1afe.0</option>
					<option value="@material/web@1.0.1">@material/web@1.0.1</option>
					<option value="@material/web@1.0.0">@material/web@1.0.0</option>
					<option value="@material/web@1.0.0-pre.17">@material/web@1.0.0-pre.17</option>
					<option value="@material/web@1.0.0-pre.16">@material/web@1.0.0-pre.16</option>
					<option value="@material/web@1.0.0-pre.15">@material/web@1.0.0-pre.15</option>
					<option value="@material/web@1.0.0-pre.14">@material/web@1.0.0-pre.14</option>
					<option value="@material/web@1.0.0-pre.13">@material/web@1.0.0-pre.13</option>
					<option value="@material/web@1.0.0-pre.12">@material/web@1.0.0-pre.12</option>
					<option value="@material/web@1.0.0-pre.11">@material/web@1.0.0-pre.11</option>
					<option value="@material/web@1.0.0-pre.10">@material/web@1.0.0-pre.10</option>
					<option value="@material/web@1.0.0-pre.9">@material/web@1.0.0-pre.9</option>
					<option value="@material/web@1.0.0-pre.8">@material/web@1.0.0-pre.8</option>
					<option value="@material/web@1.0.0-pre.7">@material/web@1.0.0-pre.7</option>
					<option value="@material/web@1.0.0-pre.6">@material/web@1.0.0-pre.6</option>
					<option value="@material/web@1.0.0-pre.5">@material/web@1.0.0-pre.5</option>
					<option value="@material/web@1.0.0-pre.4">@material/web@1.0.0-pre.4</option>
					<option value="@material/web@1.0.0-pre.3">@material/web@1.0.0-pre.3</option>
					<option value="@material/web@1.0.0-pre.2">@material/web@1.0.0-pre.2</option>
					<option value="@material/web@1.0.0-pre.1">@material/web@1.0.0-pre.1</option>
					<option value="@material/web@1.0.0-pre.0">@material/web@1.0.0-pre.0</option>
					<option value="@material/web@0.1.0-alpha.2">@material/web@0.1.0-alpha.2</option>
					<option value="@material/web@0.1.0-alpha.1">@material/web@0.1.0-alpha.1</option>
					<option value="@material/web@0.1.0-alpha.0">@material/web@0.1.0-alpha.0</option>
				</select>
			</div>

			<div class="listing">
				<table>
					<tbody>

					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/button/">button</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/checkbox/">checkbox</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/chips/">chips</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/color/">color</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/dialog/">dialog</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/divider/">divider</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/elevation/">elevation</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/fab/">fab</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/field/">field</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/focus/">focus</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/icon/">icon</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/iconbutton/">iconbutton</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/internal/">internal</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/labs/">labs</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/list/">list</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/menu/">menu</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/migrations/">migrations</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/progress/">progress</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/radio/">radio</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/ripple/">ripple</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/select/">select</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/slider/">slider</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/switch/">switch</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/tabs/">tabs</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/testing/">testing</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/textfield/">textfield</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/tokens/">tokens</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5C2 3.89543 2.89543 3 4 3H8.46482C8.79917 3 9.1114 3.1671 9.29687 3.4453L10.7031 5.5547C10.8886 5.8329 11.2008 6 11.5352 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" fill="#5C667A"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/typography/">typography</a>
						</td>
						<td class="size"></td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4C4 2.89543 4.89543 2 6 2H11L16 7V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="#5C667A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/all.d.ts">all.d.ts</a>
						</td>
						<td class="size">3.47 KB</td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4C4 2.89543 4.89543 2 6 2H11L16 7V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="#5C667A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/all.js">all.js</a>
						</td>
						<td class="size">3.7 KB</td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4C4 2.89543 4.89543 2 6 2H11L16 7V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="#5C667A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/all.js.map">all.js.map</a>
						</td>
						<td class="size">5.94 KB</td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4C4 2.89543 4.89543 2 6 2H11L16 7V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="#5C667A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/common.d.ts">common.d.ts</a>
						</td>
						<td class="size">2.05 KB</td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4C4 2.89543 4.89543 2 6 2H11L16 7V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="#5C667A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/common.js">common.js</a>
						</td>
						<td class="size">2.28 KB</td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4C4 2.89543 4.89543 2 6 2H11L16 7V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="#5C667A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/common.js.map">common.js.map</a>
						</td>
						<td class="size">3.6 KB</td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4C4 2.89543 4.89543 2 6 2H11L16 7V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="#5C667A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/LICENSE">LICENSE</a>
						</td>
						<td class="size">11.08 KB</td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4C4 2.89543 4.89543 2 6 2H11L16 7V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="#5C667A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/package.json">package.json</a>
						</td>
						<td class="size">4.46 KB</td>
					</tr>
					<tr>
						<td class="name">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4C4 2.89543 4.89543 2 6 2H11L16 7V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="#5C667A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
							<a rel="nofollow" href="/npm/@material/web@2.4.0/README.md">README.md</a>
						</td>
						<td class="size">3.07 KB</td>
					</tr>
					</tbody>
				</table>
			</div>

			<div class="landing">
				<p class="left">Free Open Source CDN for <strong>@material/web</strong></p>

				<p class="right">
					Looking for a nice landing page for your package?
					<a href="https://www.jsdelivr.com/package/npm/@material/web">https://www.jsdelivr.com/package/npm/@material/web</a>
				</p>
			</div>
		</div>

		<footer>
			<div class="footer-left">
				<svg class="logo" viewBox="0 0 140 34" xmlns="http://www.w3.org/2000/svg">
					<g fill="#1e3b45">
						<path
							d="m43.616 19.576c0 4.005-1.389 6.008-4.168 6.008-.432 0-.853-.059-1.261-.174v-1.112c.455.154.883.232 1.285.232 1.065 0 1.833-.404 2.304-1.209.471-.807.706-2.063.706-3.769v-10.859h1.134z"/>
						<path
							d="m47.065 24.705v-1.309c1.188.756 2.393 1.135 3.612 1.135 1.296 0 2.28-.268 2.952-.805.671-.537 1.007-1.288 1.007-2.251 0-.85-.226-1.528-.678-2.032-.451-.506-1.429-1.194-2.935-2.067-1.682-.979-2.747-1.799-3.195-2.46-.447-.66-.671-1.422-.671-2.286 0-1.172.455-2.169 1.366-2.988.911-.817 2.126-1.227 3.647-1.227.988 0 1.975.166 2.963.498v1.204c-.972-.44-2.011-.66-3.113-.66-1.127 0-2.02.287-2.681.858-.659.571-.99 1.297-.99 2.177 0 .848.226 1.524.677 2.026.452.5 1.426 1.184 2.923 2.048 1.551.881 2.584 1.663 3.097 2.345.514.684.77 1.469.77 2.356 0 1.274-.442 2.311-1.325 3.114-.884.803-2.133 1.204-3.746 1.204-.572 0-1.229-.09-1.973-.266-.745-.178-1.313-.383-1.707-.614z"/>
						<path
							d="m59.104 25.295v-16.602h5.881c5.895 0 8.844 2.698 8.844 8.093 0 2.585-.805 4.65-2.413 6.194-1.61 1.543-3.753 2.315-6.431 2.315zm3.74-13.556v10.522h1.852c1.621 0 2.892-.485 3.814-1.458s1.383-2.296 1.383-3.97c0-1.583-.457-2.827-1.372-3.734-.914-.907-2.199-1.36-3.85-1.36z"/>
						<path
							d="m86.841 25.295h-9.957v-16.602h9.574v3.046h-5.834v3.693h5.43v3.032h-5.43v3.796h6.217z"/>
						<path d="m99.893 25.295h-9.887v-16.602h3.74v13.568h6.147z"/>
						<path d="m105.989 8.693v16.602h-3.74v-16.602z"/>
						<path
							d="m123.834 8.693-5.719 16.602h-4.236l-5.651-16.602h4.029l3.462 11.553c.186.625.297 1.178.336 1.657h.068c.055-.518.174-1.084.36-1.702l3.439-11.508z"/>
						<path
							d="m140 25.295h-4.295l-2.581-4.273c-.193-.322-.379-.613-.555-.868-.178-.254-.358-.473-.539-.654-.182-.18-.369-.321-.567-.416-.197-.096-.41-.145-.643-.145h-1.006v6.356h-3.74v-16.602h5.926c4.029 0 6.043 1.506 6.043 4.515 0 .578-.088 1.114-.266 1.604s-.428.932-.752 1.325c-.324.395-.717.733-1.176 1.02-.459.285-.969.508-1.534.67v.047c.248.076.486.203.719.375.231.174.455.377.67.61.217.231.424.479.619.746.197.266.377.526.539.782zm-10.185-13.8v4.619h1.62c.803 0 1.448-.231 1.932-.694.494-.471.742-1.053.742-1.749 0-1.45-.87-2.177-2.605-2.177h-1.689z"/>
					</g>
					<path d="m15.386.338-3.106 11.038v.104 11.039l3.106 11.143 3.194-11.143v-11.039-.104z"
						  fill="#bd483b"/>
					<path d="m15.386.338-15.386 5.542 2.186 20.492 13.2 7.29" fill="#e64e3d"/>
					<path d="m15.386 33.662 13.268-7.365 2.483-20.49-15.751-5.469" fill="#bd483b"/>
					<path
						d="m12.594 25.088c-1.514-.473-2.864-1.317-3.94-2.431l-.003-.002c-.131-.137-.257-.274-.381-.418-.838-.979-1.478-2.13-1.857-3.396.251.233.518.447.796.647.003.008.008.016.011.027-.003-.012-.008-.02-.011-.027.398.279.822.526 1.269.737.141.064.282.125.427.186.177.07.36.135.542.195.011.006.024.006.035.01.032.012.065.023.097.033.074.756.649 1.372 1.39 1.504.287 1.157.833 2.146 1.625 2.935z"
						fill="#fec82f"/>
					<path
						d="m13.174 11.794c0 .324.088.627.243.883-1.25 1.753-2.108 3.656-2.479 5.539-.041.209-.077.416-.105.619-.429.113-.79.393-1.016.762-.013 0-.024-.004-.035-.01-.023-.006-.04-.014-.061-.021-.142-.045-.281-.098-.417-.152-.204-.08-.403-.174-.598-.272-.663-.338-1.26-.772-1.781-1.291-.11-.111-.213-.219-.311-.332l-.041-.049c-.038-.045-.078-.092-.115-.137-.017-.021-.032-.039-.047-.059-.014-.018-.024-.031-.037-.045-.005-.01-.013-.016-.017-.023-.02-.022-.037-.047-.053-.068-.008-.012-.017-.022-.023-.029-.001-.004-.002-.004-.004-.008-.013-.014-.024-.033-.037-.049-.055-.072-.107-.149-.157-.225-.009-.012-.019-.024-.025-.039-.006-.006-.015-.018-.02-.027-.014-.203-.02-.408-.02-.617 0-1.882.557-3.636 1.512-5.105.113-.176.235-.348.361-.514.12-.16.245-.319.374-.467 1.126-1.317 2.61-2.315 4.299-2.847.026.182.059.367.095.553.192.967.513 1.942.949 2.898-.271.3-.434.698-.434 1.132z"
						fill="#fec82f"/>
					<path
						d="m12.176 20.479c0 .221-.079.424-.212.58-.029.037-.061.068-.096.1-.161.141-.368.225-.596.225-.173 0-.335-.049-.472-.135-.147-.09-.265-.219-.342-.375-.058-.121-.089-.252-.089-.395 0-.26.11-.494.286-.658.029-.027.06-.051.091-.074.148-.107.331-.17.526-.17.206 0 .395.068.546.186.085.063.155.139.213.229.094.137.145.307.145.487z"
						fill="#fec82f"/>
					<path
						d="m15.777 11.794c0 .147-.032.281-.094.403-.148.299-.456.502-.808.502-.044 0-.087-.002-.128-.006-.008-.004-.016-.004-.025-.006-.383-.066-.684-.369-.741-.756-.007-.043-.01-.09-.01-.137 0-.102.017-.201.05-.295.123-.354.46-.606.854-.606h.002.036c.392.018.72.285.827.645.025.082.037.168.037.256z"
						fill="#fec82f"/>
					<path
						d="m24.752 16.143c0 .907-.129 1.782-.368 2.61-.799-.211-1.606-.52-2.4-.914.022-.109.033-.221.033-.336 0-.225-.044-.442-.125-.639.031-.029.064-.061.095-.094.957-.977 1.763-2.055 2.404-3.212.234.821.361 1.69.361 2.585z"
						fill="#df9c26"/>
					<path
						d="m23.881 12.196c-.063.139-.131.277-.201.416-.627 1.235-1.455 2.382-2.459 3.407-.009.01-.02.02-.028.027-.255-.156-.557-.244-.879-.244-.375 0-.722.123-1.004.328-.514-.404-1.011-.848-1.49-1.327-.608-.604-1.157-1.247-1.647-1.909.252-.297.405-.68.405-1.102 0-.313-.087-.61-.237-.862 1.21-1.163 2.547-2.106 3.917-2.788 1.572.961 2.841 2.372 3.623 4.054z"
						fill="#df9c26"/>
					<path
						d="m21.217 17.503c0 .379-.23.701-.556.836-.108.045-.225.07-.348.07-.063 0-.125-.008-.185-.02-.385-.082-.681-.408-.715-.805.011-.01.021-.016.028-.022-.01-.008-.021-.014-.03-.023-.001-.012-.001-.022-.001-.037 0-.389.25-.723.601-.85.095-.033.196-.053.302-.053.09 0 .179.014.262.039.346.105.606.412.64.785.002.027.002.055.002.08z"
						fill="#df9c26"/>
					<path
						d="m21.452 18.767c-.301.274-.7.44-1.139.44-.351 0-.677-.107-.949-.289-.039.025-.078.051-.115.072-1.233.781-2.538 1.352-3.864 1.698v4.824c3.887 0 7.222-2.37 8.64-5.744-.859-.237-1.723-.573-2.573-1.001z"
						fill="#df9c26"/>
					<path
						d="m15.386 20.688c-.793.205-1.591.33-2.385.367-.042.002-.086.006-.128.008-.151.41-.454.744-.839.94.245.909.688 1.698 1.319 2.327.524.524 1.162.92 1.891 1.18.046 0 .093.002.142.002z"
						fill="#fec82f"/>
					<path
						d="m18.612 17.503c0-.172.026-.34.074-.498-.562-.44-1.106-.92-1.625-1.442-.614-.614-1.172-1.262-1.675-1.934v5.946c1.124-.324 2.235-.823 3.291-1.489.009-.006.02-.014.03-.022-.061-.174-.095-.364-.095-.561z"
						fill="#df9c26"/>
					<path
						d="m15.386 13.629c-.045-.059-.091-.113-.132-.174-.123.029-.249.043-.378.043-.227 0-.441-.045-.637-.123-1.134 1.606-1.912 3.341-2.25 5.049-.032.162-.059.32-.083.475.477.195.848.596.996 1.092.016-.004.029-.004.046-.004.809-.039 1.627-.18 2.438-.412z"
						fill="#fec82f"/>
					<path
						d="m15.386 6.778v3.394c.048.016.098.033.145.055 1.106-1.073 2.316-1.979 3.573-2.681-1.14-.496-2.399-.768-3.718-.768z"
						fill="#df9c26"/>
					<path
						d="m15.386 6.778c-.608 0-1.201.055-1.773.168.025.197.06.404.101.606.168.86.449 1.725.829 2.575.106-.02.219-.033.333-.033.178 0 .347.027.51.078z"
						fill="#fec82f"/>
				</svg>

				<p class="copyright">&copy; jsdelivr.com, 2012 - 2025</p>
			</div>

			<div class="footer-right">
				<a href="https://github.com/jsdelivr/jsdelivr">
					<span class="gh-icon">
						<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="12" height="12" viewBox="0 0 16 16" xml:space="preserve">
						<path id="XMLID_1_" fill="#ff5627" d="M8,0.2c-4.4,0-8,3.6-8,8c0,3.5,2.3,6.5,5.5,7.6C5.9,15.9,6,15.6,6,15.4c0-0.2,0-0.7,0-1.4
							C3.8,14.5,3.3,13,3.3,13c-0.4-0.9-0.9-1.2-0.9-1.2c-0.7-0.5,0.1-0.5,0.1-0.5c0.8,0.1,1.2,0.8,1.2,0.8C4.4,13.4,5.6,13,6,12.8
							c0.1-0.5,0.3-0.9,0.5-1.1c-1.8-0.2-3.6-0.9-3.6-4c0-0.9,0.3-1.6,0.8-2.1c-0.1-0.2-0.4-1,0.1-2.1c0,0,0.7-0.2,2.2,0.8
							c0.6-0.2,1.3-0.3,2-0.3c0.7,0,1.4,0.1,2,0.3c1.5-1,2.2-0.8,2.2-0.8c0.4,1.1,0.2,1.9,0.1,2.1c0.5,0.6,0.8,1.3,0.8,2.1
							c0,3.1-1.9,3.7-3.7,3.9C9.7,12,10,12.5,10,13.2c0,1.1,0,1.9,0,2.2c0,0.2,0.1,0.5,0.6,0.4c3.2-1.1,5.5-4.1,5.5-7.6
							C16,3.8,12.4,0.2,8,0.2z"/>
						</svg>
					</span>
					Documentation
				</a>

				<a href="https://www.jsdelivr.com/features">Learn more about jsDelivr</a>
			</div>
		</footer>

		<script>
			var versions = document.querySelector('.versions');

			[].slice.call(versions.querySelectorAll('option')).forEach(function(option) {
				if (option.value === '@material/web@2.4.0') {
					option.selected = true;
				}
			});

			versions.addEventListener('change', function() {
				location.pathname = '/npm/' + this.value + '/';
			});
		</script>
	</body>
</html>