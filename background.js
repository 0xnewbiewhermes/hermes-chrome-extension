// Hermes Chrome Extension - Background Service Worker

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open sidebar
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_SIDEBAR') {
    // Open sidebar panel
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
  }
  
  if (message.type === 'TEXT_SELECTED') {
    // Store selected text for sidebar to access
    chrome.storage.local.set({ 
      selectedText: message.data.text,
      selectedUrl: message.data.url,
      selectedTitle: message.data.title,
      selectedTimestamp: new Date().toISOString()
    });
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
    // Store selected text and open sidebar
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
