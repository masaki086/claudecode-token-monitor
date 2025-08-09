# Claude Code Context Monitoring

Claude Code のフックイベントをキャプチャし、トークン使用状況を監視するためのプロジェクトです。

## 🚀 クイックスタート

### 1. セットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd claudecode-context-monitoring

# スクリプトに実行権限を付与
chmod +x scripts/*.js
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
# 検証スクリプトを実行
node scripts/verify-logging.js

# ログファイルを確認
ls -la logs/
tail -f logs/$(date +%Y-%m-%d)-events.jsonl
```

## 📁 ディレクトリ構造

```
claudecode-context-monitoring/
├── .claude/
│   └── settings.local.json    # Claude Code フック設定（Git管理外）
├── scripts/
│   ├── log-event.js          # イベントログ記録スクリプト
│   └── verify-logging.js     # 動作検証スクリプト
├── logs/                      # イベントログ格納ディレクトリ（Git管理外）
│   └── YYYY-MM-DD-events.jsonl
└── internal/                  # 内部ドキュメント
    ├── requirements/          # 要件定義
    ├── templates/             # テンプレート
    └── *.md                   # 各種ガイド文書
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

### 監視するツールを変更

`.claude/settings.local.json`の`PreToolUse`セクションの`matcher`を編集：

```json
"matcher": "Read|Write|Edit|Bash"  // 監視したいツール名を|で区切る
```

### ログ出力先を変更

`scripts/log-event.js`の`logsDir`変数を編集してください。

### デバッグモード

環境変数`DEBUG_HOOKS=true`を設定すると、詳細なログが出力されます：

```bash
export DEBUG_HOOKS=true
```

## 🐛 トラブルシューティング

### ログが記録されない場合

1. Node.jsがインストールされているか確認
   ```bash
   node --version
   ```

2. スクリプトの実行権限を確認
   ```bash
   ls -la scripts/*.js
   ```

3. 検証スクリプトを実行
   ```bash
   node scripts/verify-logging.js
   ```

4. ログディレクトリの権限を確認
   ```bash
   ls -la logs/
   ```

5. 手動でテスト実行
   ```bash
   node scripts/log-event.js UserPromptSubmit "test prompt"
   cat logs/$(date +%Y-%m-%d)-events.jsonl
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

## 📝 開発プロセス

新機能の開発は`/internal/development-process.md`に従って6フェーズで実施されます。