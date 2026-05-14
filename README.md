# Hermes Chrome Extension

Personal AI browsing assistant powered by Hermes Agent.

## Features

- 💬 **Chat Sidebar** - Chat with Hermes while browsing
- 📝 **Page Summarization** - Summarize any page with one click
- 🔍 **Context Awareness** - Automatically detects page URL and selected text
- ⚡ **Quick Actions** - Summarize, Explain, Key Points, Find Related
- 🎯 **Right-click Menu** - Select text and ask Hermes about it
- ⌨️ **Keyboard Shortcuts** - Quick access with hotkeys

## Installation

### Prerequisites

1. **Hermes Agent** must be running with API server enabled
2. **Chrome Browser** (or Chromium-based browser)

### Setup Steps

1. **Enable API Server in Hermes**

   Add to your `~/.hermes/config.yaml`:
   ```yaml
   gateway:
     platforms:
       api_server:
         enabled: true
         extra:
           host: "0.0.0.0"
           port: 8642
           cors_origins: "*"
   ```

   Or run:
   ```bash
   hermes config set gateway.platforms.api_server.enabled true
   hermes config set gateway.platforms.api_server.extra.host "0.0.0.0"
   hermes config set gateway.platforms.api_server.extra.port 8642
   hermes config set gateway.platforms.api_server.extra.cors_origins "*"
   hermes gateway restart
   ```

2. **Load Extension in Chrome**

   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `hermes-chrome-extension` folder

3. **Configure Extension**

   - Click the extension icon in toolbar
   - Click ⚙️ Settings
   - Set API endpoint (default: `http://localhost:8642/v1`)

4. **Start Using**

   - Click the ⚡ icon in bottom-right corner of any page
   - Or click the extension icon in toolbar
   - Or select text → right-click → "Ask Hermes about..."

## Usage

### Quick Actions

- **📝 Summarize** - Get a quick summary of the current page
- **💡 Explain** - Explain the page in simple terms
- **🔑 Key Points** - Extract key points from the content
- **🔍 Related** - Find related articles and resources

### Context Features

- **Auto-detect URL** - Extension knows what page you're on
- **Selected Text** - Highlight text and it's automatically included
- **Meta Description** - Uses page description for better context

### Keyboard Shortcuts

- `⌘⇧H` (Mac) / `Ctrl+Shift+H` (Windows/Linux) - Open sidebar

### Right-click Menu

1. Select any text on a page
2. Right-click
3. Choose "Ask Hermes about [selected text]"
4. Sidebar opens with explanation request

## Troubleshooting

### "Disconnected" Status

1. Check if Hermes gateway is running:
   ```bash
   hermes gateway status
   ```

2. Check if API server is accessible:
   ```bash
   curl http://localhost:8642/health
   ```

3. Check CORS settings if accessing from different origin

### Extension Not Working

1. Reload extension in `chrome://extensions/`
2. Check browser console for errors (F12 → Console)
3. Ensure API endpoint is correct in settings

### No Response from Hermes

1. Check Hermes gateway logs:
   ```bash
   tail -f ~/.hermes/logs/gateway.log
   ```

2. Verify model is configured:
   ```bash
   hermes model
   ```

## Development

### File Structure

```
hermes-chrome-extension/
├── manifest.json      # Extension manifest
├── sidebar.html       # Main chat interface
├── sidebar.js         # Chat logic
├── styles.css         # Styling
├── popup.html         # Quick popup
├── popup.js           # Popup logic
├── background.js      # Service worker
├── content.js         # Content script
├── content-overlay.css # Floating button styles
├── icons/             # Extension icons
└── README.md          # This file
```

### Customization

- **API Endpoint**: Change in extension settings
- **Max History**: Adjust number of messages to remember
- **Context Toggle**: Enable/disable page context auto-send

## API Reference

The extension connects to Hermes Agent's OpenAI-compatible API:

- **Endpoint**: `POST /v1/chat/completions`
- **Health Check**: `GET /health`
- **Models**: `GET /v1/models`

## Security Notes

- Extension only communicates with local API server
- No data is sent to external servers
- Chat history stored locally in browser
- Page context only sent when explicitly enabled

## License

MIT License - Part of Hermes Agent project

## Support

- [Hermes Agent Docs](https://hermes-agent.nousresearch.com/docs)
- [GitHub Issues](https://github.com/NousResearch/hermes-agent/issues)
