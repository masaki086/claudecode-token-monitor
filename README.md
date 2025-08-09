# Claude Code Token Monitor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code Compatible](https://img.shields.io/badge/Claude%20Code-Compatible-blue)](https://claude.ai/code)

A comprehensive token usage monitoring tool for Claude Code sessions. Track your context window usage, estimate token consumption, and optimize your AI-assisted development workflow.

[日本語版 README](README_jp.md)

## ✨ Features

- **🔍 Real-time Token Tracking**: Monitor token usage for user inputs, file reads, and web operations
- **🌐 Multi-language Support**: Automatic detection of Japanese/English content with appropriate token calculation
- **📊 Session Analytics**: Track cumulative token usage throughout your Claude Code session
- **⚙️ Configurable Estimates**: Customize token estimation parameters via external configuration
- **📝 JSONL Logging**: Structured event logging in JSON Lines format for easy parsing
- **💬 Slash Commands**: Quick access to token summaries via `/tokens` and `/tokens-verbose`

## 🚀 Quick Start

### Prerequisites

- Claude Code CLI installed
- Unix-like environment (macOS, Linux, WSL)
- Basic shell scripting support

### Installation

1. Clone the repository:
```bash
git clone https://github.com/masaki086/claudecode-token-monitor.git
cd claudecode-token-monitor
```

2. Copy the example settings:
```bash
cp .claude/settings.local.json.example .claude/settings.local.json
```

3. Make scripts executable:
```bash
chmod +x scripts/*.sh
```

That's it! The hooks will automatically start logging when you begin a new Claude Code session.

## 📖 Usage

### Check Token Usage

In your Claude Code session, use the slash commands:

- `/tokens` - Quick summary of current token usage
- `/tokens-verbose` - Detailed breakdown by event type

### Example Output

```
📊 Token Usage Summary
=====================
Total: 12,845 tokens
Context Window: 12.8% (100,000 tokens)

Breakdown:
• User Inputs: 2,345 tokens
• File Reads: 8,500 tokens  
• Web Operations: 2,000 tokens
```

## ⚙️ Configuration

Edit `config/token-calculator.json` to customize:

```json
{
  "contextWindow": {
    "size": 100000,
    "warningThreshold": 0.8
  },
  "tokenEstimates": {
    "japaneseCharsPerToken": 2.5,
    "englishCharsPerToken": 4,
    "webFetch": { "tokens": 2500 },
    "webSearch": { "tokens": 1750 }
  }
}
```

## 📂 Project Structure

```
claudecode-token-monitor/           # Root directory
├── scripts/
│   ├── log-event.sh                # Main event logging script
│   └── lib/
│       └── token-calculator.js     # Token calculation logic
├── config/
│   └── token-calculator.json       # Configuration file
├── logs/
│   ├── events.jsonl                # Current session event log
│   └── backups/                    # Archived session logs
│       └── YYYY-MM-DD/            # Date-based backup directory
│           └── events-*.jsonl      # Timestamped backup files
├── .claude/
│   ├── commands/                   # Slash commands
│   │   ├── tokens.md              # Quick summary command
│   │   └── tokens-verbose.md      # Detailed summary command
│   ├── settings.local.json         # Hook configuration (not in git)
│   └── settings.local.json.example # Example configuration
├── README.md                        # English documentation
├── README_jp.md                     # Japanese documentation
├── claude.md                        # Claude Code instructions
└── LICENSE                          # MIT License
```

## 🔧 How It Works

1. **Event Hooks**: Claude Code triggers hooks for various events (user input, file operations, etc.)
2. **Event Logging**: Each event is logged to `logs/events.jsonl` with metadata
   - Session start automatically backs up previous logs to `logs/backups/YYYY-MM-DD/events-*.jsonl`
   - Each new session starts with a fresh `events.jsonl` file
3. **Token Calculation**: Language-aware token estimation based on character count
4. **Session Tracking**: Events are grouped by session ID for accurate tracking

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for [Claude Code](https://claude.ai/code) by Anthropic
- Inspired by the need for better context window management
- Community feedback and contributions

## 📧 Support

For issues, questions, or suggestions, please [open an issue](https://github.com/masaki086/claudecode-token-monitor/issues).

---

Made with ❤️ for the Claude Code community