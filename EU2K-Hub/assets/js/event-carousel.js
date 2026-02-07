/**
 * Material Design Carousel for Event Cards
 * Implements swipe functionality with smooth transitions
 * Based on Material Design 3 carousel specifications
 */

class EventCarousel {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      itemSpacing: 12,
      snapToCenter: true,
      visibleItems: 3, // 3 kártya látható egyszerre
      ...options
    };

    this.cards = Array.from(container.querySelectorAll('.event-card'));
    this.currentIndex = 0;
    this.isDragging = false;
    this.startX = 0;
    this.currentX = 0;
    this.scrollLeft = 0;
    this.velocity = 0;
    this.lastMoveTime = 0;

    this.init();
  }

  init() {
    if (this.cards.length === 0) return;

    // Csak mobilra aktiváljuk
    if (window.innerWidth > 700) return;

    this.setupCards();
    this.attachEventListeners();
    this.centerCards();
  }

  setupCards() {
    // Hozzáadjuk a carousel wrapper-t
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';
    
    // Minden kártya kap egy wrapper-t a smooth transition-ért
    this.cards.forEach((card, index) => {
      card.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      card.dataset.index = index;
    });
  }

  attachEventListeners() {
    // Touch events
    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

    // Mouse events (desktop drag support)
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.container.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.container.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    // Scroll event (fallback)
    this.container.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
  }

  handleTouchStart(e) {
    this.isDragging = true;
    this.startX = e.touches[0].clientX;
    this.currentX = this.startX;
    this.scrollLeft = this.container.scrollLeft;
    this.lastMoveTime = Date.now();
    this.velocity = 0;
    this.container.style.scrollBehavior = 'auto';
  }

  handleTouchMove(e) {
    if (!this.isDragging) return;
    
    e.preventDefault();
    this.currentX = e.touches[0].clientX;
    const deltaX = this.currentX - this.startX;
    const now = Date.now();
    const timeDelta = now - this.lastMoveTime;
    
    if (timeDelta > 0) {
      this.velocity = deltaX / timeDelta;
    }
    
    this.lastMoveTime = now;
    
    // Smooth scroll
    this.container.scrollLeft = this.scrollLeft - deltaX;
  }

  handleTouchEnd(e) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.container.style.scrollBehavior = 'smooth';
    
    // Determine if we should snap to next/previous card
    const deltaX = this.currentX - this.startX;
    const threshold = 50; // Minimum swipe distance
    const velocityThreshold = 0.3; // Minimum velocity for swipe
    
    if (Math.abs(deltaX) > threshold || Math.abs(this.velocity) > velocityThreshold) {
      if (deltaX > 0 || this.velocity > 0) {
        // Swipe right - previous card
        this.snapToCard(this.currentIndex - 1);
      } else {
        // Swipe left - next card
        this.snapToCard(this.currentIndex + 1);
      }
    } else {
      // Snap back to current card
      this.snapToCard(this.currentIndex);
    }
  }

  handleMouseDown(e) {
    if (window.innerWidth > 700) return; // Only on mobile
    
    this.isDragging = true;
    this.startX = e.clientX;
    this.currentX = this.startX;
    this.scrollLeft = this.container.scrollLeft;
    this.container.style.scrollBehavior = 'auto';
    this.container.style.cursor = 'grabbing';
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;
    
    e.preventDefault();
    this.currentX = e.clientX;
    const deltaX = this.currentX - this.startX;
    this.container.scrollLeft = this.scrollLeft - deltaX;
  }

  handleMouseUp(e) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.container.style.scrollBehavior = 'smooth';
    this.container.style.cursor = 'grab';
    
    const deltaX = this.currentX - this.startX;
    const threshold = 50;
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        this.snapToCard(this.currentIndex - 1);
      } else {
        this.snapToCard(this.currentIndex + 1);
      }
    } else {
      this.snapToCard(this.currentIndex);
    }
  }

  handleScroll(e) {
    // Update current index based on scroll position
    this.updateCurrentIndex();
  }

  updateCurrentIndex() {
    const containerRect = this.container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    
    let closestCard = null;
    let closestDistance = Infinity;
    
    this.cards.forEach((card, index) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(cardCenter - containerCenter);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCard = index;
      }
    });
    
    if (closestCard !== null) {
      this.currentIndex = closestCard;
    }
  }

  snapToCard(index) {
    // Clamp index to valid range
    index = Math.max(0, Math.min(index, this.cards.length - 1));
    this.currentIndex = index;
    
    const card = this.cards[index];
    if (!card) return;
    
    const containerRect = this.container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const cardCenter = cardRect.left + cardRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const scrollOffset = cardCenter - containerCenter;
    
    // Smooth scroll to center the card
    this.container.scrollTo({
      left: this.container.scrollLeft + scrollOffset,
      behavior: 'smooth'
    });
  }

  centerCards() {
    // Center the first visible card on load
    if (this.cards.length > 0) {
      setTimeout(() => {
        this.snapToCard(0);
      }, 100);
    }
  }

  // Public method to navigate programmatically
  next() {
    this.snapToCard(this.currentIndex + 1);
  }

  previous() {
    this.snapToCard(this.currentIndex - 1);
  }

  goTo(index) {
    this.snapToCard(index);
  }
}

// Initialize carousel when DOM is ready
function initEventCarousel() {
  const eventsContainer = document.querySelector('.events-container');
  if (eventsContainer) {
    // Only initialize on mobile
    if (window.innerWidth <= 700) {
      if (!eventsContainer.carousel) {
        eventsContainer.carousel = new EventCarousel(eventsContainer);
      }
    } else {
      // Clean up on desktop
      if (eventsContainer.carousel) {
        eventsContainer.carousel = null;
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initEventCarousel();
  
  // Re-initialize on resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(initEventCarousel, 250);
  });
});

// Make initEventCarousel globally available
window.initEventCarousel = initEventCarousel;

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventCarousel;
}

