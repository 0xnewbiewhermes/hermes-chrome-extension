// Hermes Chrome Extension - Content Script
// Extracts page context and selected text

(function() {
  'use strict';

  // Listen for messages from the sidebar
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_CONTEXT') {
      const context = getPageContext();
      sendResponse(context);
    }
    return true;
  });

  function getPageContext() {
    const context = {
      url: window.location.href,
      title: document.title,
      selectedText: getSelectedText(),
      metaDescription: getMetaDescription(),
      headings: getHeadings(),
      links: getImportantLinks(),
      timestamp: new Date().toISOString()
    };
    
    return context;
  }

  function getSelectedText() {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      return selection.toString().trim().substring(0, 2000);
    }
    return null;
  }

  function getMetaDescription() {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      return metaDesc.getAttribute('content');
    }
    
    // Try og:description
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      return ogDesc.getAttribute('content');
    }
    
    return null;
  }

  function getHeadings() {
    const headings = [];
    const headingElements = document.querySelectorAll('h1, h2, h3');
    
    headingElements.forEach((heading, index) => {
      if (index < 10) {
        headings.push({
          level: heading.tagName.toLowerCase(),
          text: heading.textContent.trim().substring(0, 200)
        });
      }
    });
    
    return headings;
  }

  function getImportantLinks() {
    const links = [];
    const linkElements = document.querySelectorAll('a[href]');
    
    linkElements.forEach((link, index) => {
      if (index < 20 && link.href && !link.href.startsWith('javascript:')) {
        const text = link.textContent.trim();
        if (text && text.length > 2 && text.length < 100) {
          links.push({
            text: text,
            href: link.href
          });
        }
      }
    });
    
    return links;
  }

  // Notify sidebar when text is selected
  document.addEventListener('mouseup', () => {
    const selectedText = getSelectedText();
    if (selectedText) {
      chrome.runtime.sendMessage({
        type: 'TEXT_SELECTED',
        data: {
          text: selectedText,
          url: window.location.href,
          title: document.title
        }
      });
    }
  });

  // Add floating button for quick access
  function addFloatingButton() {
    const button = document.createElement('div');
    button.id = 'hermes-float-btn';
    button.innerHTML = '⚡';
    button.title = 'Ask Hermes';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #7c3aed, #8b5cf6);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
      z-index: 999999;
      transition: all 0.3s ease;
      user-select: none;
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.5)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.4)';
    });
    
    button.addEventListener('click', () => {
      // Open sidebar
      chrome.runtime.sendMessage({ type: 'OPEN_SIDEBAR' });
    });
    
    document.body.appendChild(button);
  }

  // Initialize floating button
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addFloatingButton);
  } else {
    addFloatingButton();
  }

})();
