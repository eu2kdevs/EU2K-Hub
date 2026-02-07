/**
 * Material Design 3 Carousel - Infinite Contained Type (Fixed)
 * Mobile: Highlight (fills space) + Contained (40px) + Contained (hidden)
 */

class M3Carousel {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      containedWidth: 40,
      swipeThreshold: 0.5,
      animationDuration: 500,
      ...options
    };

    this.cards = Array.from(container.querySelectorAll('.event-card'));
    this.currentIndex = 0;
    this.isDragging = false;
    this.startX = 0;
    this.currentX = 0;
    this.swipeProgress = 0;
    
    this.init();
  }

  init() {
    if (this.cards.length === 0) return;
    if (window.innerWidth > 700) return;

    this.setupContainer();
    this.attachEventListeners();
    this.updateLayout();
  }

  setupContainer() {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'row';
    this.container.style.gap = '12px';
    this.container.style.alignItems = 'stretch';
    this.container.style.width = '100%';
  }

  calculateHighlightWidth() {
    const containerWidth = this.container.offsetWidth || this.container.clientWidth;
    const gaps = 2 * 12; // 2 gaps
    const containedWidth = 2 * this.options.containedWidth; // 2 visible contained
    return Math.max(100, containerWidth - containedWidth - gaps); // Min 100px
  }

  updateLayout() {
    const highlightWidth = this.calculateHighlightWidth();
    
    // Prevent layout updates during transition to avoid flickering
    if (this._updating) return;
    this._updating = true;
    
    requestAnimationFrame(() => {
      this.cards.forEach((card, index) => {
        const relativeIndex = this.getRelativeIndex(index);
        const isDragging = this.isDragging;
        
        // Reset position styles
        card.style.removeProperty('transform');
        card.style.removeProperty('position');
        card.style.removeProperty('left');
        
      if (relativeIndex === 0) {
        // Highlight card
        if (!isDragging) {
          this.setCardSize(card, highlightWidth, 240, true);
        }
        this.showCardText(card, true);
      } else if (relativeIndex === 1) {
        // First contained (visible)
        if (!isDragging) {
          this.setCardSize(card, this.options.containedWidth, 240, true);
        }
        this.showCardText(card, false);
      } else if (relativeIndex === 2) {
        // Second contained (hidden but in DOM)
        if (!isDragging) {
          this.setCardSize(card, 0, 240, false);
        }
        this.showCardText(card, false);
      } else {
        // Off-screen cards - keep proper size but hide
        this.setCardSize(card, 0, 240, false);
        card.style.setProperty('position', 'absolute', 'important');
        card.style.setProperty('left', '-9999px', 'important');
      }
      
      // Apply swipe animation
      if (isDragging && relativeIndex <= 2) {
        this.applySwipeAnimation(card, relativeIndex, highlightWidth);
      }
      });
      
      this._updating = false;
    });
  }

  getRelativeIndex(absoluteIndex) {
    let relative = absoluteIndex - this.currentIndex;
    if (relative < 0) relative += this.cards.length;
    return relative;
  }

  setCardSize(card, width, height, visible) {
    card.style.setProperty('width', `${width}px`, 'important');
    card.style.setProperty('min-width', `${width}px`, 'important');
    card.style.setProperty('max-width', `${width}px`, 'important');
    card.style.setProperty('height', `${height}px`, 'important');
    card.style.setProperty('min-height', `${height}px`, 'important');
    card.style.setProperty('max-height', `${height}px`, 'important');
    card.style.setProperty('flex-shrink', '0', 'important');
    card.style.setProperty('opacity', visible ? '1' : '0', 'important');
    card.style.setProperty('pointer-events', visible ? 'auto' : 'none', 'important');
  }

  applySwipeAnimation(card, relativeIndex, highlightWidth) {
    const swipeDistance = this.currentX - this.startX;
    const containerWidth = this.container.offsetWidth;
    const progress = Math.min(Math.abs(swipeDistance) / containerWidth, 1);
    const isSwipeLeft = swipeDistance < 0; // Swipe left = negative
    
    if (relativeIndex === 0) {
      // Highlight shrinks only when swiping left (to next)
      if (isSwipeLeft) {
        // Shrink from highlight to contained size, then to 0
        let currentWidth;
        if (progress < 0.5) {
          // First half: shrink to contained size
          currentWidth = highlightWidth - (highlightWidth - this.options.containedWidth) * (progress * 2);
        } else {
          // Second half: shrink from contained to 0
          const secondHalfProgress = (progress - 0.5) * 2;
          currentWidth = this.options.containedWidth * (1 - secondHalfProgress);
        }
        
        card.style.setProperty('width', `${Math.max(0, currentWidth)}px`, 'important');
        card.style.setProperty('min-width', `${Math.max(0, currentWidth)}px`, 'important');
        card.style.setProperty('max-width', `${Math.max(0, currentWidth)}px`, 'important');
        
        // Hide text as it shrinks
        this.showCardText(card, progress < 0.3);
      }
    } else if (relativeIndex === 1) {
      if (isSwipeLeft) {
        // Contained grows to highlight when swiping left
        const currentWidth = this.options.containedWidth + (highlightWidth - this.options.containedWidth) * progress;
        card.style.setProperty('width', `${currentWidth}px`, 'important');
        card.style.setProperty('min-width', `${currentWidth}px`, 'important');
        card.style.setProperty('max-width', `${currentWidth}px`, 'important');
        
        // Show text as it grows
        if (progress > 0.3) {
          this.showCardText(card, true);
        }
      }
    } else if (relativeIndex === 2) {
      // Second contained - when swiping left, this becomes first contained (becomes visible)
      if (isSwipeLeft) {
        // Grow from 0 to contained size as highlight disappears
        // Start animating when highlight is halfway through (progress > 0.5)
        if (progress > 0.5) {
          const secondHalfProgress = (progress - 0.5) * 2; // 0 to 1 when progress is 0.5 to 1
          const currentWidth = this.options.containedWidth * secondHalfProgress;
          card.style.setProperty('width', `${currentWidth}px`, 'important');
          card.style.setProperty('min-width', `${currentWidth}px`, 'important');
          card.style.setProperty('max-width', `${currentWidth}px`, 'important');
          card.style.setProperty('opacity', `${secondHalfProgress}`, 'important');
        } else {
          // Before 50%, stay hidden
          card.style.setProperty('width', '0px', 'important');
          card.style.setProperty('opacity', '0', 'important');
        }
      }
    }
  }

  showCardText(card, show) {
    const overlay = card.querySelector('.event-card-overlay');
    if (overlay) {
      overlay.style.setProperty('display', show ? 'block' : 'none', 'important');
    }
  }

  attachEventListeners() {
    this.container.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.handleEnd.bind(this), { passive: false });
    
    if (window.innerWidth <= 700) {
      this.container.addEventListener('mousedown', this.handleStart.bind(this));
      this.container.addEventListener('mousemove', this.handleMove.bind(this));
      this.container.addEventListener('mouseup', this.handleEnd.bind(this));
      this.container.addEventListener('mouseleave', this.handleEnd.bind(this));
    }
  }

  handleStart(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    this.isDragging = true;
    this.startX = clientX;
    this.currentX = clientX;
    this.swipeProgress = 0;
    
    // Disable transitions during drag
    this.cards.forEach(card => {
      card.style.setProperty('transition', 'none', 'important');
    });
  }

  handleMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    this.currentX = clientX;
    this.updateLayout(); // Real-time update
  }

  handleEnd(e) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    const swipeDistance = this.currentX - this.startX;
    const containerWidth = this.container.offsetWidth;
    const progress = Math.abs(swipeDistance) / containerWidth;
    
    // Re-enable transitions
    this.cards.forEach(card => {
      card.style.setProperty('transition', `width ${this.options.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${this.options.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`, 'important');
    });
    
    // Check threshold and update index
    let shouldUpdate = false;
    if (progress >= this.options.swipeThreshold) {
      if (swipeDistance > 0) {
        // Swipe right - previous
        this.currentIndex = (this.currentIndex - 1 + this.cards.length) % this.cards.length;
        shouldUpdate = true;
      } else if (swipeDistance < 0) {
        // Swipe left - next
        this.currentIndex = (this.currentIndex + 1) % this.cards.length;
        shouldUpdate = true;
      }
    }
    
    // Always update layout to reset sizes properly
    this.swipeProgress = 0;
    this.updateLayout();
    
    // Force a reflow to ensure smooth transition
    if (shouldUpdate) {
      requestAnimationFrame(() => {
        this.updateLayout();
      });
    }
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.cards.length;
    this.updateLayout();
  }

  previous() {
    this.currentIndex = (this.currentIndex - 1 + this.cards.length) % this.cards.length;
    this.updateLayout();
  }

  update() {
    this.cards = Array.from(this.container.querySelectorAll('.event-card'));
    this.updateLayout();
  }
}

// Initialize
function initM3Carousel() {
  const eventsContainer = document.querySelector('.events-container');
  if (!eventsContainer) return;
  
  if (window.innerWidth <= 700) {
    if (!eventsContainer.m3Carousel) {
      eventsContainer.m3Carousel = new M3Carousel(eventsContainer, {
        containedWidth: 40,
        swipeThreshold: 0.5,
        animationDuration: 500
      });
    } else {
      eventsContainer.m3Carousel.update();
    }
  } else {
    if (eventsContainer.m3Carousel) {
      eventsContainer.m3Carousel = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', initM3Carousel);

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(initM3Carousel, 250);
});

window.initM3Carousel = initM3Carousel;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = M3Carousel;
}
