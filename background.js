// Hermes Chrome Extension - Background Service Worker
// Acts as a relay between sidebar and content scripts

// Store page context from content scripts
let pageContextStore = {};

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Handle messages from content script and sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background: received message:', message.type);
  
  if (message.type === 'PAGE_CONTEXT_UPDATE') {
    // Content script is sending page context
    pageContextStore[message.data.url] = message.data;
    // Forward to sidebar
    chrome.runtime.sendMessage({ type: 'PAGE_CONTEXT', data: message.data }).catch(() => {});
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'GET_PAGE_CONTEXT') {
    // Sidebar is requesting page context
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const tab = tabs[0];
        // Try to get from store first
        if (pageContextStore[tab.url]) {
          sendResponse(pageContextStore[tab.url]);
        } else {
          // Send basic tab info
          sendResponse({
            url: tab.url,
            title: tab.title,
            selectedText: null,
            metaDescription: null
          });
        }
      } else {
        sendResponse(null);
      }
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'TAKE_SCREENSHOT') {
    console.log('Background: Taking screenshot...');
    
    // First open the side panel if not already open
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        sendResponse({ error: 'No active tab found' });
        return;
      }
      
      // Capture the visible tab
      chrome.tabs.captureVisibleTab(
        null, 
        { format: 'png', quality: 90 },
        (dataUrl) => {
          if (chrome.runtime.lastError) {
            console.error('Screenshot error:', chrome.runtime.lastError);
            sendResponse({ error: chrome.runtime.lastError.message });
          } else if (dataUrl) {
            console.log('Background: Screenshot captured, sending to sidebar');
            sendResponse({ screenshot: dataUrl });
          } else {
            sendResponse({ error: 'No screenshot data' });
          }
        }
      );
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'OPEN_SIDEBAR') {
    if (sender.tab) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId });
    }
    return true;
  }
  
  if (message.type === 'TEXT_SELECTED') {
    // Store selected text
    if (sender.tab) {
      const context = pageContextStore[sender.tab.url] || { url: sender.tab.url, title: sender.tab.title };
      context.selectedText = message.data.text;
      pageContextStore[sender.tab.url] = context;
      // Forward to sidebar
      chrome.runtime.sendMessage({ type: 'TEXT_SELECTED', data: message.data }).catch(() => {});
    }
    return true;
  }
  
  return true;
});

// Set up side panel
chrome.sidePanel.setOptions({
  enabled: true
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-sidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.sidePanel.open({ windowId: tabs[0].windowId });
      }
    });
  }
});

// Handle context menu (right-click)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ask-hermes',
    title: 'Ask Hermes about "%s"',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'summarize-page',
    title: 'Summarize this page with Hermes',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'screenshot-page',
    title: 'Screenshot this page with Hermes',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'ask-hermes') {
    chrome.storage.local.set({
      pendingPrompt: `Explain this: "${info.selectionText}"`,
      selectedUrl: tab.url,
      selectedTitle: tab.title
    });
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
  
  if (info.menuItemId === 'summarize-page') {
    chrome.storage.local.set({
      pendingPrompt: 'Summarize this page',
      selectedUrl: tab.url,
      selectedTitle: tab.title
    });
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
  
  if (info.menuItemId === 'screenshot-page') {
    chrome.storage.local.set({
      pendingPrompt: 'screenshot',
      selectedUrl: tab.url,
      selectedTitle: tab.title
    });
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Listen for tab activation to update context
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && pageContextStore[tab.url]) {
      chrome.runtime.sendMessage({ type: 'PAGE_CONTEXT', data: pageContextStore[tab.url] }).catch(() => {});
    }
  });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    // Content script will send context update
  }
});
