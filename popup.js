// Hermes Chrome Extension - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const openSidebarBtn = document.getElementById('openSidebar');
  const summarizePageBtn = document.getElementById('summarizePage');
  const explainSelectionBtn = document.getElementById('explainSelection');
  const screenshotPageBtn = document.getElementById('screenshotPage');
  const findRelatedBtn = document.getElementById('findRelated');

  // Open sidebar
  openSidebarBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  });

  // Summarize page
  summarizePageBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.storage.local.set({
      pendingPrompt: 'Summarize this page',
      selectedUrl: tab.url,
      selectedTitle: tab.title
    });
    
    chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  });

  // Explain selection
  explainSelectionBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Get selected text from content script
    chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTEXT' }, (response) => {
      if (chrome.runtime.lastError) {
        alert('Please select some text on the page first');
        return;
      }
      
      if (response && response.selectedText) {
        chrome.storage.local.set({
          pendingPrompt: `Explain this: "${response.selectedText}"`,
          selectedText: response.selectedText,
          selectedUrl: response.url,
          selectedTitle: response.title
        });
        
        chrome.sidePanel.open({ windowId: tab.windowId });
        window.close();
      } else {
        alert('Please select some text on the page first');
      }
    });
  });

  // Screenshot page
  screenshotPageBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.storage.local.set({
      pendingPrompt: 'screenshot',
      selectedUrl: tab.url,
      selectedTitle: tab.title
    });
    
    chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  });

  // Find related
  findRelatedBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.storage.local.set({
      pendingPrompt: 'Find related articles and resources for this page',
      selectedUrl: tab.url,
      selectedTitle: tab.title
    });
    
    chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  });

  // Check API status
  checkApiStatus();
});

async function checkApiStatus() {
  try {
    const settings = await chrome.storage.local.get(['apiEndpoint']);
    const endpoint = settings.apiEndpoint || 'http://84.247.148.26:8642/v1';
    
    const response = await fetch(endpoint.replace('/v1', '') + '/health');
    const data = await response.json();
    
    if (data.status === 'ok') {
      document.querySelector('.popup-info p').textContent = '✓ Connected to Hermes';
      document.querySelector('.popup-info p').style.color = '#10b981';
    }
  } catch (error) {
    document.querySelector('.popup-info p').textContent = '✗ Disconnected';
    document.querySelector('.popup-info p').style.color = '#ef4444';
  }
}
