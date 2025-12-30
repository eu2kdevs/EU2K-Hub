// Microsoft Clarity loader neutralized for on-device/offline use.
// Original loader injected the remote script from https://scripts.clarity.ms and sent telemetry to clarity.ms.
// To restore Clarity, download the canonical script from the Clarity CDN and replace this file, or
// revert this file to its original contents. For now we expose a minimal no-op `clarity` API so existing
// calls won't crash the app.
(function(){
	if(typeof window==='undefined') return;
	// Minimal clarity stub
	window.clarity = window.clarity || function(){
		// Accept calls but do nothing to avoid network and telemetry on device.
		try { return { q: [], t: true, v: 1 }; } catch(e) { /* no-op */ }
	};
	window.clarity.start = function(){ /* no-op */ };
	window.clarity.event = function(){ /* no-op */ };
	// Keep a lightweight pixel ping on load if you want a local indicator (disabled by default)
	// (new Image()).src = './assets/clarity-local-ping.png';
	console.info('Clarity loader disabled — no telemetry will be collected on-device.');
})();