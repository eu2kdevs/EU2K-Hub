// Camera Header Indicator System
// Shows a camera indicator button in the header when camera is in use

// Show camera indicator in header
function showCameraIndicator() {
  console.log('showCameraIndicator called');
  const indicator = document.getElementById('headerCameraIndicator');
  const gradient = document.querySelector('.header-icon-gradient');
  
  console.log('Indicator element:', indicator);
  console.log('Gradient element:', gradient);
  
  if (indicator) {
    indicator.style.display = 'flex';
    console.log('Camera indicator shown');
  } else {
    console.warn('headerCameraIndicator not found in DOM');
  }
  
  if (gradient) {
    gradient.classList.add('has-camera');
    console.log('has-camera class added to gradient');
  } else {
    console.warn('header-icon-gradient not found in DOM');
  }
}

// Hide camera indicator from header - only when explicitly called
function hideCameraIndicator() {
  console.log('hideCameraIndicator called');
  const indicator = document.getElementById('headerCameraIndicator');
  const gradient = document.querySelector('.header-icon-gradient');
  
  if (indicator) {
    indicator.style.display = 'none';
    console.log('Camera indicator hidden');
  }
  
  if (gradient) {
    gradient.classList.remove('has-camera');
    console.log('has-camera class removed from gradient');
  }
}

// Export functions for use in other scripts
window.showCameraIndicator = showCameraIndicator;
window.hideCameraIndicator = hideCameraIndicator;

// Auto-run on QR code page
if (window.location.pathname.includes('qr-code.html')) {
  console.log('QR code page detected, will auto-show camera indicator');
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOM ready, showing camera indicator now');
      setTimeout(showCameraIndicator, 500);
    });
  } else {
    console.log('DOM already ready, showing camera indicator now');
    setTimeout(showCameraIndicator, 500);
  }
}