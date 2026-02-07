import React, { useState, useRef, useEffect } from 'react';
import './M3Carousel.css';

// Enums converted to constants
export const CarouselType = {
  HERO: 'hero',
  CONTAINED: 'contained',
  UNCONTAINED: 'uncontained'
};

export const HeroAlignment = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right'
};

const M3Carousel = ({
  width = null,
  height = null,
  type = CarouselType.HERO,
  isExtended = false,
  freeScroll = false,
  heroAlignment = HeroAlignment.CENTER,
  uncontainedItemExtent = 270.0,
  uncontainedShrinkExtent = 150.0,
  childElementBorderRadius = 28.0,
  scrollAnimationDuration = 500,
  singleSwipeGestureSensitivityRange = 300,
  onTap = null,
  children = []
}) => {
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const [frameHeight, setFrameHeight] = useState(0);
  const [itemScrolled, setItemScrolled] = useState(0);
  const [layoutWeight, setLayoutWeight] = useState([]);
  const dragStartX = useRef(0);
  const dragStartTime = useRef(0);
  const isDragging = useRef(false);

  // Initialize layout weights based on carousel type
  useEffect(() => {
    let weights = [];
    let initialScroll = 0;

    switch (type) {
      case CarouselType.HERO:
        switch (heroAlignment) {
          case HeroAlignment.LEFT:
            weights = [8, 2];
            initialScroll = 0;
            break;
          case HeroAlignment.CENTER:
            weights = [2, 6, 2];
            initialScroll = 1;
            break;
          case HeroAlignment.RIGHT:
            weights = [2, 8];
            initialScroll = 1;
            break;
        }
        break;
      case CarouselType.CONTAINED:
        weights = isExtended ? [4, 3, 2, 1] : [5, 4, 1];
        break;
      case CarouselType.UNCONTAINED:
        weights = [];
        break;
    }

    setLayoutWeight(weights);
    setItemScrolled(initialScroll);
  }, [type, heroAlignment, isExtended]);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setFrameWidth(width || rect.width);
        setFrameHeight(height || rect.height);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [width, height]);

  // Attach native event listeners (non-passive) for proper preventDefault support
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || freeScroll) return;

    const handleTouchStart = (e) => {
      isDragging.current = true;
      dragStartX.current = e.touches[0].clientX;
      dragStartTime.current = Date.now();
      scrollContainer.style.cursor = 'grabbing';
    };

    const handleTouchMove = (e) => {
      if (!isDragging.current) return;
      e.preventDefault(); // Now this works!
    };

    const handleTouchEnd = (e) => {
      if (!isDragging.current) return;
      
      isDragging.current = false;
      scrollContainer.style.cursor = freeScroll ? 'grab' : 'pointer';
      
      const dragEndX = e.changedTouches[0].clientX;
      const deltaX = dragEndX - dragStartX.current;
      const deltaTime = Date.now() - dragStartTime.current;
      const velocity = (deltaX / deltaTime) * 1000;
      
      if (velocity > singleSwipeGestureSensitivityRange) {
        scrollFrame(0);
      } else if (velocity < -singleSwipeGestureSensitivityRange) {
        scrollFrame(1);
      }
    };

    // Add with { passive: false } to allow preventDefault
    scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollContainer.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      scrollContainer.removeEventListener('touchstart', handleTouchStart);
      scrollContainer.removeEventListener('touchmove', handleTouchMove);
      scrollContainer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [freeScroll, singleSwipeGestureSensitivityRange]);

  // Mouse drag handlers (for desktop)
  const handleMouseDown = (e) => {
    if (freeScroll) return;
    
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartTime.current = Date.now();
    
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || freeScroll) return;
    e.preventDefault();
  };

  const handleMouseUp = (e) => {
    if (freeScroll || !isDragging.current) return;
    
    isDragging.current = false;
    
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = freeScroll ? 'grab' : 'pointer';
    }
    
    const dragEndX = e.clientX;
    const deltaX = dragEndX - dragStartX.current;
    const deltaTime = Date.now() - dragStartTime.current;
    const velocity = (deltaX / deltaTime) * 1000;
    
    if (velocity > singleSwipeGestureSensitivityRange) {
      scrollFrame(0);
    } else if (velocity < -singleSwipeGestureSensitivityRange) {
      scrollFrame(1);
    }
  };

  const scrollFrame = (direction) => {
    if (!scrollContainerRef.current) return;

    const currentScroll = scrollContainerRef.current.scrollLeft;
    let nextScrollPosition = 0;
    let newItemScrolled = itemScrolled;

    if (type === CarouselType.HERO) {
      const shouldAddOrSubtract = 
        ((heroAlignment === HeroAlignment.LEFT 
          ? Math.max(...layoutWeight) 
          : Math.min(...layoutWeight)) * 10 / 100) * frameWidth;
      
      let limit = 0;
      switch (heroAlignment) {
        case HeroAlignment.CENTER:
          limit = direction === 0 ? 0 : 3;
          break;
        case HeroAlignment.LEFT:
        case HeroAlignment.RIGHT:
          limit = direction === 0 ? 0 : 2;
          break;
      }

      if (direction === 0) {
        if (itemScrolled <= limit) return;
        nextScrollPosition = currentScroll - shouldAddOrSubtract;
        newItemScrolled = itemScrolled - 1;
      } else {
        if (itemScrolled >= (children.length - limit)) return;
        nextScrollPosition = currentScroll + shouldAddOrSubtract;
        newItemScrolled = itemScrolled + 1;
      }
    } else if (type === CarouselType.CONTAINED) {
      const shouldAddOrSubtract = ((Math.max(...layoutWeight) * 10) / 100) * frameWidth;
      
      if (direction === 0) {
        if (itemScrolled <= 0) return;
        nextScrollPosition = currentScroll - shouldAddOrSubtract;
        newItemScrolled = itemScrolled - 1;
      } else {
        if (itemScrolled >= (children.length - (isExtended ? 4 : 3))) return;
        nextScrollPosition = currentScroll + shouldAddOrSubtract;
        newItemScrolled = itemScrolled + 1;
      }
    } else {
      if (direction === 0) {
        if (itemScrolled <= 0) return;
        nextScrollPosition = currentScroll - uncontainedItemExtent;
        newItemScrolled = itemScrolled - 1;
      } else {
        if (itemScrolled >= (children.length - 1)) return;
        nextScrollPosition = currentScroll + uncontainedItemExtent;
        newItemScrolled = itemScrolled + 1;
      }
    }

    scrollContainerRef.current.scrollTo({
      left: nextScrollPosition,
      behavior: 'smooth'
    });
    setItemScrolled(newItemScrolled);
  };

  const handleMouseDown = (e) => {
    if (freeScroll) return;
    
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartTime.current = Date.now();
    
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || freeScroll) return;
    e.preventDefault();
  };

  const handleMouseUp = (e) => {
    if (freeScroll || !isDragging.current) return;
    
    isDragging.current = false;
    
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = freeScroll ? 'grab' : 'pointer';
    }
    
    const dragEndX = e.clientX;
    const deltaX = dragEndX - dragStartX.current;
    const deltaTime = Date.now() - dragStartTime.current;
    const velocity = (deltaX / deltaTime) * 1000;
    
    if (velocity > singleSwipeGestureSensitivityRange) {
      scrollFrame(0);
    } else if (velocity < -singleSwipeGestureSensitivityRange) {
      scrollFrame(1);
    }
  };

  const getItemStyle = (index) => {
    if (type === CarouselType.UNCONTAINED) {
      return {
        minWidth: `${uncontainedItemExtent}px`,
        flexShrink: 0,
        borderRadius: `${childElementBorderRadius}px`,
        overflow: 'hidden'
      };
    } else {
      const weight = layoutWeight[index % layoutWeight.length] || 1;
      return {
        flex: weight,
        borderRadius: `${childElementBorderRadius}px`,
        overflow: 'hidden',
        minWidth: 0
      };
    }
  };

  return (
    <div 
      ref={containerRef}
      className="m3-carousel-container"
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        ref={scrollContainerRef}
        className="m3-carousel-scroll"
        style={{
          display: 'flex',
          gap: type === CarouselType.UNCONTAINED ? '16px' : '8px',
          height: '100%',
          overflowX: freeScroll ? 'auto' : 'hidden',
          scrollBehavior: 'smooth',
          cursor: freeScroll ? 'grab' : 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {children.map((child, index) => (
          <div
            key={index}
            className="m3-carousel-item"
            style={getItemStyle(index)}
            onClick={() => onTap && onTap(index)}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};

export default M3Carousel;
