// Hermes Chrome Extension - Content Script
// Extracts page context and sends to background script

(function() {
  'use strict';

  let lastSentUrl = '';
  let lastSelectedText = '';

  function getPageContext() {
    const context = {
      url: window.location.href,
      title: document.title,
      selectedText: getSelectedText(),
      metaDescription: getMetaDescription(),
      headings: getHeadings(),
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
    if (metaDesc) return metaDesc.getAttribute('content');
    
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) return ogDesc.getAttribute('content');
    
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

  function sendPageContext() {
    const context = getPageContext();
    // Only send if URL changed
    if (context.url !== lastSentUrl) {
      lastSentUrl = context.url;
      console.log('Content script: Sending page context for', context.url);
      chrome.runtime.sendMessage({ type: 'PAGE_CONTEXT_UPDATE', data: context }).catch(() => {});
    }
  }

  function sendSelectedText() {
    const selectedText = getSelectedText();
    if (selectedText && selectedText !== lastSelectedText) {
      lastSelectedText = selectedText;
      chrome.runtime.sendMessage({
        type: 'TEXT_SELECTED',
        data: {
          text: selectedText,
          url: window.location.href,
          title: document.title
        }
      }).catch(() => {});
    }
  }

  // Listen for messages from background/sidebar
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_CONTEXT') {
      const context = getPageContext();
      sendResponse(context);
    }
    return true;
  });

  // Send initial page context
  function initContext() {
    // Small delay to ensure page is fully loaded
    setTimeout(sendPageContext, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContext);
  } else {
    initContext();
  }

  // Send page context when URL changes (SPA navigation)
  let currentUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      lastSentUrl = ''; // Reset to force re-send
      sendPageContext();
    }
  });
  
  // Start observing
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Listen for text selection
  document.addEventListener('mouseup', () => {
    setTimeout(sendSelectedText, 100);
  });

  // Add floating button for quick access
  function addFloatingButton() {
    // Don't add if already exists
    if (document.getElementById('hermes-float-btn')) return;
    
    // Don't add on certain pages
    if (window.location.protocol === 'chrome:' || 
        window.location.protocol === 'chrome-extension:' ||
        window.location.protocol === 'about:') {
      return;
    }
    
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
