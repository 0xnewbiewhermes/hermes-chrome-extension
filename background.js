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
  console.log('Background received message:', message.type, 'from:', sender.tab ? 'content' : 'extension');
  
  if (message.type === 'PAGE_CONTEXT_UPDATE') {
    // Content script is sending page context
    pageContextStore[message.data.url] = message.data;
    // Forward to sidebar if it's listening
    chrome.runtime.sendMessage({ type: 'PAGE_CONTEXT', data: message.data }).catch(() => {});
    sendResponse({ success: true });
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
      }
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'OPEN_SIDEBAR') {
    if (sender.tab) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId });
    }
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
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'ask-hermes') {
    chrome.storage.local.set({
      selectedText: info.selectionText,
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
});

// Listen for tab updates to refresh page context
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    // Page finished loading, content script will send context
  }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && pageContextStore[tab.url]) {
      // Send stored context to sidebar
      chrome.runtime.sendMessage({ type: 'PAGE_CONTEXT', data: pageContextStore[tab.url] }).catch(() => {});
    }
  });
});
