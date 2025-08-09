# Claude Code Token Monitor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code Compatible](https://img.shields.io/badge/Claude%20Code-Compatible-blue)](https://claude.ai/code)

Claude Code のフックイベントをキャプチャし、トークン使用状況を監視するためのプロジェクトです。

## 🚀 クイックスタート

### 1. セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/masaki086/claudecode-token-monitor.git
cd claudecode-token-monitor

# 設定ファイルをコピー
cp .claude/settings.local.json.example .claude/settings.local.json

# スクリプトに実行権限を付与
chmod +x scripts/*.sh
```

### 2. Hooks設定

`.claude/settings.local.json`ファイルには以下のイベントをキャプチャする設定が含まれています：

- **UserPromptSubmit**: ユーザーがプロンプトを送信した時
- **PreToolUse**: 各種ツール（Read, WebFetch, WebSearch, Grep, Glob）が実行される前
- **PostToolUse**: ツール実行後
- **SessionStart**: セッションが開始された時
- **Stop**: Claude Codeのレスポンスが完了した時

### 3. 動作確認

```bash
# ログファイルを確認
ls -la logs/
tail -f logs/events.jsonl

# バックアップログの確認
ls -la logs/backups/
```

## 📁 ディレクトリ構造

```
claudecode-token-monitor/               # ルートディレクトリ
├── .claude/
│   ├── settings.local.json            # Claude Code フック設定（Git管理外）
│   ├── settings.local.json.example    # 設定ファイルのサンプル
│   └── commands/                      # スラッシュコマンド
│       ├── tokens.md                  # 簡易サマリーコマンド
│       └── tokens-verbose.md          # 詳細サマリーコマンド
├── scripts/
│   ├── log-event.sh                   # イベントログ記録スクリプト
│   └── lib/
│       └── token-calculator.js        # トークン計算ロジック
├── config/
│   └── token-calculator.json          # トークン計算設定
├── logs/                               # イベントログ格納ディレクトリ（Git管理外）
│   ├── events.jsonl                   # 現在のセッションログ
│   └── backups/                       # 過去のセッションログ
│       └── YYYY-MM-DD/                # 日付別バックアップディレクトリ
│           └── events-*.jsonl         # タイムスタンプ付きバックアップ
├── README.md                           # 英語ドキュメント
├── README_jp.md                        # 日本語ドキュメント
├── claude.md                           # Claude Code 用設定
└── LICENSE                             # MITライセンス
```

## 📊 ログフォーマット

各イベントはJSON Lines形式（.jsonl）で記録されます。一行に一つのJSONオブジェクトが記録されます。

### 基本構造

```json
{
  "timestamp": "2025-01-09T10:30:45.123Z",
  "event_type": "EventType",
  "session_id": "session_id_or_null",
  "data": {
    // イベント固有のデータ
  }
}
```

### UserPromptSubmit

```json
{
  "timestamp": "2025-01-09T10:30:45.123Z",
  "event_type": "UserPromptSubmit",
  "session_id": "session-123",
  "data": {
    "user_input": "ユーザーの入力内容",
    "input_length": 24
  }
}
```

### PreToolUse / PostToolUse

```json
{
  "timestamp": "2025-01-09T10:30:45.123Z",
  "event_type": "PreToolUse",
  "session_id": "session-123",
  "data": {
    "tool_name": "Read",
    "parameters": "{\"file_path\":\"/path/to/file.js\"}"
  }
}
```

### SessionStart

```json
{
  "timestamp": "2025-01-09T10:30:45.123Z",
  "event_type": "SessionStart",
  "session_id": "session-123",
  "data": {
    "matcher": "startup",
    "project_root": "/path/to/project",
    "session_id": "session-123"
  }
}
```

## 🔧 カスタマイズ

### 出力言語の設定

`config/token-calculator.json` の `outputLanguage` を編集することで、トークン使用状況レポートの表示言語を切り替えられます：

```json
{
  "outputLanguage": "ja",  // "en" で英語表示、"ja" で日本語表示
  // ...
}
```

- `"outputLanguage": "en"` - 英語で表示（デフォルト）
- `"outputLanguage": "ja"` - 日本語で表示

### 監視するツールを変更

`.claude/settings.local.json`の`PreToolUse`セクションの`matcher`を編集：

```json
"matcher": "Read|Write|Edit|Bash"  // 監視したいツール名を|で区切る
```

### ログ出力先について

- 現在のセッションログ: `logs/events.jsonl`
- バックアップログ: `logs/backups/YYYY-MM-DD/events-*.jsonl`
- 新しいセッション開始時に自動的に前のログがバックアップされます

### デバッグモード

環境変数`DEBUG_HOOKS=true`を設定すると、詳細なログが出力されます：

```bash
export DEBUG_HOOKS=true
```

## 🐛 トラブルシューティング

### ログが記録されない場合

1. スクリプトの実行権限を確認
   ```bash
   ls -la scripts/*.sh
   ```

2. ログディレクトリの権限を確認
   ```bash
   ls -la logs/
   ```

3. 手動でテスト実行
   ```bash
   ./scripts/log-event.sh UserPromptSubmit "test prompt"
   cat logs/events.jsonl
   ```

4. バックアップディレクトリを確認
   ```bash
   ls -la logs/backups/
   ```

## 📝 注意事項

- `.claude/settings.local.json` は Git にコミットされません（.gitignore に含まれています）
- ログファイルも Git 管理外です
- セッションIDが null の場合は、Claude Code が正しくセッションIDを提供していない可能性があります

## 🔒 セキュリティ

- 機密情報がログに記録されないよう注意してください
- ログファイルは定期的に確認し、不要なものは削除してください
- `.claude/settings.local.json` には個人設定が含まれるため、共有しないでください

## 📈 今後の機能拡張予定

- リアルタイムトークン使用量計算
- Webダッシュボード
- 使用量アラート機能
- データ分析ツール

## 📊 トークン使用量の確認

Claude Code セッション内で以下のスラッシュコマンドを使用：

- `/tokens` - 現在のトークン使用量の簡易サマリー
- `/tokens-verbose` - イベント種別ごとの詳細な内訳

### 出力例

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

## 🤝 コントリビューション

プルリクエストを歓迎します！[Issues](https://github.com/masaki086/claudecode-token-monitor/issues)で問題報告や機能提案をお願いします。