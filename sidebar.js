// Hermes Chrome Extension - Sidebar Logic
// Connects to local Hermes API server

const DEFAULT_API = 'http://84.247.148.26:8642/v1';

class HermesChat {
  constructor() {
    this.apiEndpoint = DEFAULT_API;
    this.apiKey = '';
    this.messages = [];
    this.maxHistory = 20;
    this.includeContext = true;
    this.autoSummarize = false;
    this.currentPageInfo = null;
    this.isLoading = false;
    this.hasAutoSummarized = false;
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.bindElements();
    this.bindEvents();
    this.loadChatHistory();
    await this.requestPageContext();
    this.checkApiStatus();
    this.handlePendingPrompt();
  }

  async loadSettings() {
    const settings = await chrome.storage.local.get([
      'apiEndpoint', 'apiKey', 'autoSummarize', 'includeContext', 'maxHistory', 'chatHistory'
    ]);
    
    this.apiEndpoint = settings.apiEndpoint || DEFAULT_API;
    this.apiKey = settings.apiKey || '';
    this.autoSummarize = settings.autoSummarize === true;
    this.includeContext = settings.includeContext !== false;
    this.maxHistory = settings.maxHistory || 20;
    
    if (settings.chatHistory) {
      this.messages = settings.chatHistory;
    }
  }

  bindElements() {
    this.chatContainer = document.getElementById('chatContainer');
    this.messageInput = document.getElementById('messageInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.settingsModal = document.getElementById('settingsModal');
    this.closeSettings = document.getElementById('closeSettings');
    this.saveSettings = document.getElementById('saveSettings');
    this.statusEl = document.getElementById('status');
    this.pageContext = document.getElementById('pageContext');
    this.toggleContext = document.getElementById('toggleContext');
    this.charCount = document.getElementById('charCount');
    this.contextBar = document.getElementById('contextBar');
    
    // Settings inputs
    this.apiEndpointInput = document.getElementById('apiEndpoint');
    this.apiKeyInput = document.getElementById('apiKey');
    this.autoSummarizeInput = document.getElementById('autoSummarize');
    this.includeContextInput = document.getElementById('includeContext');
    this.maxHistoryInput = document.getElementById('maxHistory');
    
    // Screenshot button
    this.screenshotBtn = document.getElementById('screenshotBtn');
  }

  bindEvents() {
    // Send message
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // Auto-resize textarea
    this.messageInput.addEventListener('input', () => {
      this.autoResize();
      this.charCount.textContent = this.messageInput.value.length;
      this.sendBtn.disabled = !this.messageInput.value.trim();
    });
    
    // Clear chat
    this.clearBtn.addEventListener('click', () => this.clearChat());
    
    // Settings
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.closeSettings.addEventListener('click', () => this.closeSettingsModal());
    this.saveSettings.addEventListener('click', () => this.saveSettingsAction());
    
    // Context toggle
    this.toggleContext.addEventListener('click', () => this.togglePageContext());
    
    // Quick actions
    document.querySelectorAll('.quick-btn').forEach(btn => {
      if (btn.id === 'screenshotBtn') {
        btn.addEventListener('click', () => this.captureScreenshot());
      } else if (btn.dataset.prompt) {
        btn.addEventListener('click', () => {
          const prompt = btn.dataset.prompt;
          this.messageInput.value = prompt;
          this.autoResize();
          this.sendMessage();
        });
      }
    });
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'PAGE_CONTEXT') {
        this.currentPageInfo = message.data;
        this.updateContextDisplay();
      }
      if (message.type === 'SCREENSHOT_DONE') {
        if (message.data && message.data.screenshot) {
          this.handleScreenshotResult(message.data);
        } else if (message.data && message.data.error) {
          this.addSystemMessage('❌ Screenshot error: ' + message.data.error);
        }
      }
    });
  }

  async requestPageContext() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTEXT' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Could not get page context:', chrome.runtime.lastError);
          resolve();
          return;
        }
        if (response) {
          this.currentPageInfo = response;
          this.updateContextDisplay();
        }
        resolve();
      });
    });
  }

  updateContextDisplay() {
    if (this.currentPageInfo) {
      const domain = new URL(this.currentPageInfo.url).hostname;
      const selected = this.currentPageInfo.selectedText;
      if (selected) {
        this.pageContext.textContent = `${domain} | Selected: "${selected.substring(0, 50)}..."`;
      } else {
        this.pageContext.textContent = domain;
      }
      this.contextBar.classList.add('active');
    }
  }

  togglePageContext() {
    this.includeContext = !this.includeContext;
    this.contextBar.classList.toggle('disabled', !this.includeContext);
    chrome.storage.local.set({ includeContext: this.includeContext });
  }

  async handlePendingPrompt() {
    const data = await chrome.storage.local.get(['pendingPrompt']);
    if (data.pendingPrompt) {
      chrome.storage.local.remove('pendingPrompt');
      
      if (data.pendingPrompt === 'screenshot') {
        setTimeout(() => this.captureScreenshot(), 500);
      } else {
        this.messageInput.value = data.pendingPrompt;
        this.autoResize();
        setTimeout(() => this.sendMessage(), 500);
      }
    } else if (this.autoSummarize && !this.hasAutoSummarized && this.currentPageInfo) {
      this.hasAutoSummarized = true;
      setTimeout(() => this.autoSummarizePage(), 1000);
    }
  }

  autoSummarizePage() {
    if (this.messages.length > 0) return;
    
    const url = this.currentPageInfo?.url || 'unknown page';
    const title = this.currentPageInfo?.title || '';
    
    // Build a comprehensive prompt with page context
    let prompt = `Please summarize the page I'm currently viewing.`;
    if (title) prompt += `\n\nPage Title: ${title}`;
    if (url) prompt += `\nURL: ${url}`;
    if (this.currentPageInfo?.metaDescription) {
      prompt += `\nDescription: ${this.currentPageInfo.metaDescription}`;
    }
    if (this.currentPageInfo?.headings && this.currentPageInfo.headings.length > 0) {
      prompt += `\n\nMain headings on the page:`;
      this.currentPageInfo.headings.slice(0, 5).forEach(h => {
        prompt += `\n- ${h.text}`;
      });
    }
    
    this.messageInput.value = prompt;
    this.autoResize();
    this.sendMessage();
  }

  async captureScreenshot() {
    try {
      this.addSystemMessage('📸 Capturing screenshot...');
      
      // Tell background script to take screenshot
      chrome.runtime.sendMessage({ type: 'TAKE_SCREENSHOT' }, (response) => {
        if (chrome.runtime.lastError) {
          this.addSystemMessage('❌ Error: ' + chrome.runtime.lastError.message);
          return;
        }
        
        if (response && response.screenshot) {
          this.handleScreenshotResult(response);
        } else if (response && response.error) {
          this.addSystemMessage('❌ ' + response.error);
        } else {
          this.addSystemMessage('❌ Screenshot failed - no response');
        }
      });
    } catch (error) {
      this.addSystemMessage('❌ Screenshot error: ' + error.message);
    }
  }

  handleScreenshotResult(data) {
    if (data && data.screenshot) {
      // Show screenshot in UI
      this.addScreenshotToUI(data.screenshot);
      
      // Send to API for analysis
      this.sendVisionMessage(data.screenshot);
    }
  }

  addScreenshotToUI(screenshotUrl) {
    // Remove welcome message if exists
    const welcome = this.chatContainer.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = '👤';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content screenshot-message';
    messageContent.innerHTML = `
      <div class="screenshot-label">📸 Screenshot captured</div>
      <img src="${screenshotUrl}" class="screenshot-preview" alt="Page screenshot">
      <div class="screenshot-prompt">Analyze this screenshot</div>
    `;
    
    messageDiv.appendChild(avatar);
    const messageBody = document.createElement('div');
    messageBody.className = 'message-body';
    messageBody.appendChild(messageContent);
    messageDiv.appendChild(messageBody);
    
    this.chatContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  async sendVisionMessage(screenshotUrl) {
    this.isLoading = true;
    this.showTypingIndicator();

    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      // Build messages with image
      const systemContent = `You are Hermes, a personal AI browsing assistant. The user has captured a screenshot of their browser. Analyze the screenshot and describe what you see on the page. Be helpful and concise. Reply in the same language the user uses.`;
      
      const messages = [
        {
          role: 'system',
          content: systemContent
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Please analyze this screenshot and describe what you see on the page:' },
            { type: 'image_url', image_url: { url: screenshotUrl } }
          ]
        }
      ];
      
      const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: 'hermes-agent',
          messages: messages,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content;
      
      if (assistantMessage) {
        this.messages.push({ role: 'assistant', content: assistantMessage });
        this.addMessageToUI('assistant', assistantMessage);
        this.saveChatHistory();
      } else {
        throw new Error('No response from API');
      }
    } catch (error) {
      console.error('Vision API error:', error);
      this.addSystemMessage('❌ Analysis error: ' + error.message);
    } finally {
      this.isLoading = false;
      this.hideTypingIndicator();
    }
  }

  async checkApiStatus() {
    try {
      const response = await fetch(`${this.apiEndpoint.replace('/v1', '')}/health`);
      const data = await response.json();
      if (data.status === 'ok') {
        this.statusEl.textContent = 'Connected';
        this.statusEl.classList.add('connected');
      } else {
        throw new Error('Not ok');
      }
    } catch (error) {
      this.statusEl.textContent = 'Disconnected';
      this.statusEl.classList.remove('connected');
      this.addSystemMessage('⚠️ Cannot connect to Hermes API. Make sure the gateway is running.');
    }
  }

  buildMessages() {
    const systemMessage = {
      role: 'system',
      content: `You are Hermes, a personal AI browsing assistant. You help the user with anything they need while browsing - research, analysis, summarization, explanations, and more. Be helpful, concise, and direct. Reply in the same language the user uses (Indonesian or English).`
    };

    // Add page context if available and enabled
    if (this.includeContext && this.currentPageInfo) {
      let contextNote = `\n\n=== CURRENT PAGE CONTEXT ===`;
      contextNote += `\n- URL: ${this.currentPageInfo.url}`;
      contextNote += `\n- Title: ${this.currentPageInfo.title}`;
      
      if (this.currentPageInfo.metaDescription) {
        contextNote += `\n- Description: ${this.currentPageInfo.metaDescription.substring(0, 500)}`;
      }
      
      if (this.currentPageInfo.headings && this.currentPageInfo.headings.length > 0) {
        contextNote += `\n- Main headings:`;
        this.currentPageInfo.headings.slice(0, 5).forEach(h => {
          contextNote += `\n  • ${h.text}`;
        });
      }
      
      if (this.currentPageInfo.selectedText) {
        contextNote += `\n- Selected text: "${this.currentPageInfo.selectedText.substring(0, 500)}"`;
      }
      
      contextNote += `\n=============================`;
      
      systemMessage.content += contextNote;
    }

    // Get recent messages within limit
    const recentMessages = this.messages.slice(-this.maxHistory * 2);
    
    return [systemMessage, ...recentMessages];
  }

  async sendMessage() {
    const content = this.messageInput.value.trim();
    if (!content || this.isLoading) return;

    // Add user message
    this.messages.push({ role: 'user', content });
    this.addMessageToUI('user', content);
    
    // Clear input
    this.messageInput.value = '';
    this.autoResize();
    this.charCount.textContent = '0';
    this.sendBtn.disabled = true;
    
    // Show loading
    this.isLoading = true;
    this.showTypingIndicator();

    try {
      const messages = this.buildMessages();
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: 'hermes-agent',
          messages: messages,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content;
      
      if (assistantMessage) {
        this.messages.push({ role: 'assistant', content: assistantMessage });
        this.addMessageToUI('assistant', assistantMessage);
        this.saveChatHistory();
      } else {
        throw new Error('No response content');
      }
    } catch (error) {
      console.error('Error:', error);
      this.addSystemMessage(`❌ Error: ${error.message}`);
    } finally {
      this.isLoading = false;
      this.hideTypingIndicator();
    }
  }

  addMessageToUI(role, content) {
    // Remove welcome message if exists
    const welcome = this.chatContainer.querySelector('.welcome-message');
    if (welcome) {
      welcome.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'user' ? '👤' : '⚡';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Handle array content (for vision messages)
    if (Array.isArray(content)) {
      const textPart = content.find(c => c.type === 'text');
      messageContent.innerHTML = this.renderMarkdown(textPart?.text || '');
    } else {
      messageContent.innerHTML = this.renderMarkdown(content);
    }
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date().toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    messageDiv.appendChild(avatar);
    
    const messageBody = document.createElement('div');
    messageBody.className = 'message-body';
    messageBody.appendChild(messageContent);
    messageBody.appendChild(messageTime);
    messageDiv.appendChild(messageBody);
    
    this.chatContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  addSystemMessage(content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    messageDiv.innerHTML = `<div class="system-content">${content}</div>`;
    this.chatContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  showTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.id = 'typingIndicator';
    typing.innerHTML = `
      <div class="avatar">⚡</div>
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    this.chatContainer.appendChild(typing);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const typing = document.getElementById('typingIndicator');
    if (typing) {
      typing.remove();
    }
  }

  scrollToBottom() {
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  renderMarkdown(text) {
    if (!text) return '';
    
    // Basic markdown rendering
    let html = text
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br>');
    
    return html;
  }

  async saveChatHistory() {
    // Keep only last N messages
    const historyToSave = this.messages.slice(-this.maxHistory * 2);
    await chrome.storage.local.set({ chatHistory: historyToSave });
  }

  loadChatHistory() {
    if (this.messages.length > 0) {
      // Remove welcome message
      const welcome = this.chatContainer.querySelector('.welcome-message');
      if (welcome) {
        welcome.remove();
      }
      
      // Render existing messages
      this.messages.forEach(msg => {
        this.addMessageToUI(msg.role, msg.content);
      });
    }
  }

  clearChat() {
    this.messages = [];
    this.hasAutoSummarized = false;
    chrome.storage.local.remove('chatHistory');
    this.chatContainer.innerHTML = `
      <div class="welcome-message">
        <div class="welcome-icon">⚡</div>
        <h2>Hermes Assistant</h2>
        <p>Your personal AI browsing assistant. Ask me anything!</p>
        <div class="quick-actions">
          <button class="quick-btn" data-prompt="Summarize this page">📝 Summarize</button>
          <button class="quick-btn" data-prompt="Explain this page in simple terms">💡 Explain</button>
          <button class="quick-btn" id="screenshotBtn">📸 Screenshot</button>
          <button class="quick-btn" data-prompt="Find related articles">🔍 Related</button>
        </div>
      </div>
    `;
    
    // Re-bind quick actions
    document.querySelectorAll('.quick-btn').forEach(btn => {
      if (btn.id === 'screenshotBtn') {
        btn.addEventListener('click', () => this.captureScreenshot());
      } else if (btn.dataset.prompt) {
        btn.addEventListener('click', () => {
          const prompt = btn.dataset.prompt;
          this.messageInput.value = prompt;
          this.autoResize();
          this.sendMessage();
        });
      }
    });
  }

  openSettings() {
    this.apiEndpointInput.value = this.apiEndpoint;
    this.apiKeyInput.value = this.apiKey;
    this.autoSummarizeInput.checked = this.autoSummarize;
    this.includeContextInput.checked = this.includeContext;
    this.maxHistoryInput.value = this.maxHistory;
    this.settingsModal.classList.add('active');
  }

  closeSettingsModal() {
    this.settingsModal.classList.remove('active');
  }

  async saveSettingsAction() {
    this.apiEndpoint = this.apiEndpointInput.value;
    this.apiKey = this.apiKeyInput.value;
    this.autoSummarize = this.autoSummarizeInput.checked;
    this.includeContext = this.includeContextInput.checked;
    this.maxHistory = parseInt(this.maxHistoryInput.value);
    
    await chrome.storage.local.set({
      apiEndpoint: this.apiEndpoint,
      apiKey: this.apiKey,
      autoSummarize: this.autoSummarize,
      includeContext: this.includeContext,
      maxHistory: this.maxHistory
    });
    
    this.closeSettingsModal();
    this.checkApiStatus();
  }
}

// Initialize chat
const chat = new HermesChat();
