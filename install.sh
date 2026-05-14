#!/bin/bash
# Hermes Chrome Extension - Installation Helper

echo "⚡ Hermes Chrome Extension - Installation Helper"
echo ""

# Check if Chrome is installed
if command -v google-chrome &> /dev/null; then
    CHROME_CMD="google-chrome"
elif command -v chromium-browser &> /dev/null; then
    CHROME_CMD="chromium-browser"
elif command -v chromium &> /dev/null; then
    CHROME_CMD="chromium"
else
    echo "⚠️  Chrome/Chromium not found. Please install Chrome first."
    echo "   Download from: https://www.google.com/chrome/"
    exit 1
fi

echo "✅ Found Chrome: $CHROME_CMD"
echo ""

# Check if Hermes API is running
echo "🔍 Checking Hermes API server..."
if curl -s http://localhost:8642/health > /dev/null 2>&1; then
    echo "✅ Hermes API server is running"
else
    echo "⚠️  Hermes API server not running"
    echo ""
    echo "To start the API server:"
    echo "  1. Edit ~/.hermes/config.yaml"
    echo "  2. Add:"
    echo "     gateway:"
    echo "       platforms:"
    echo "         api_server:"
    echo "           enabled: true"
    echo "           extra:"
    echo "             host: \"0.0.0.0\""
    echo "             port: 8642"
    echo "             cors_origins: \"*\""
    echo ""
    echo "  3. Run: hermes gateway restart"
    echo ""
fi

echo "📦 Installation Steps:"
echo ""
echo "1. Open Chrome and go to: chrome://extensions/"
echo ""
echo "2. Enable 'Developer mode' (toggle in top right)"
echo ""
echo "3. Click 'Load unpacked'"
echo ""
echo "4. Select this folder:"
echo "   $(pwd)"
echo ""
echo "5. Click the ⚡ icon in your browser toolbar"
echo ""
echo "6. Configure API endpoint in settings (default: http://localhost:8642/v1)"
echo ""
echo "🎉 Done! You can now use Hermes while browsing."
echo ""
echo "💡 Quick tip: Click the ⚡ floating button on any page to start chatting!"
