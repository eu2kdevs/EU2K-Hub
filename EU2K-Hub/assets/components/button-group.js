/**
 * Button Group Component
 * Custom button group component for login method selection
 */
class ButtonGroup {
  constructor(container, options = {}) {
    this.container = container;
    this.buttons = options.buttons || [];
    this.onButtonClick = options.onButtonClick || null;
    this.selectedButton = null;
    
    this.init();
  }
  
  init() {
    this.createButtonGroup();
    this.attachEvents();
  }
  
  createButtonGroup() {
    // Create button group container
    this.group = document.createElement('div');
    this.group.className = 'button-group';
    
    // Create buttons
    this.buttonElements = [];
    this.buttons.forEach((button, index) => {
      const btn = document.createElement('button');
      btn.className = `button-group-btn ${button.type === 'blue' ? 'button-group-btn--blue' : ''} ${button.isGuest ? 'button-group-btn--guest' : ''}`;
      btn.setAttribute('type', 'button');
      btn.setAttribute('data-index', index);
      btn.setAttribute('data-id', button.id || index);
      
      // Add icon if provided
      if (button.icon && !button.isGuest) {
        const icon = document.createElement('img');
        icon.className = 'button-group-btn-icon';
        icon.src = button.icon;
        icon.alt = button.text || '';
        btn.appendChild(icon);
      }
      
      // Add text
      const text = document.createElement('span');
      text.className = 'button-group-btn-text';
      text.textContent = button.text || '';
      btn.appendChild(text);
      
      this.group.appendChild(btn);
      this.buttonElements.push(btn);
    });
    
    // Append to container
    this.container.appendChild(this.group);
  }
  
  attachEvents() {
    this.buttonElements.forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectButton(index);
      });
    });
  }
  
  selectButton(index) {
    if (this.selectedButton === index) return;
    
    this.selectedButton = index;
    
    // Update visual state
    this.buttonElements.forEach((btn, i) => {
      if (i === index) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
    
    // Update group class for guest button
    const selectedButton = this.buttons[index];
    if (selectedButton && selectedButton.isGuest) {
      this.group.classList.add('button-group--guest-selected');
    } else {
      this.group.classList.remove('button-group--guest-selected');
    }
    
    // Call callback
    if (this.onButtonClick) {
      this.onButtonClick(this.buttons[index], index);
    }
  }
  
  getSelected() {
    if (this.selectedButton !== null) {
      return this.buttons[this.selectedButton];
    }
    return null;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ButtonGroup;
}

