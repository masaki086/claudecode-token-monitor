# Claude Code のトークン監視を行う機能を提供する開発を行います

## ⚙️ フック設定

**重要**: Claude Code のフック設定は必ず `.claude/settings.local.json` を使用してください。
- `.claude/settings.json` ではなく `.claude/settings.local.json` に設定を記述
- `.claude/settings.local.json` は Git にコミットされません（.gitignore に含まれています）
- ローカル環境固有の設定を安全に管理できます

### 📌 フック設定の重要な注意事項

**必ず守ること**:
1. フックコマンドには `$CLAUDE_PROJECT_DIR` 環境変数を使用する
   - ❌ 間違い: `/Users/username/path/to/project/scripts/log-event.sh`
   - ✅ 正しい: `$CLAUDE_PROJECT_DIR/scripts/log-event.sh`
2. ログスクリプトは `.sh` ファイル（シェルスクリプト）を使用する
   - 現在のログ出力先: `logs/events.jsonl`（日付なしの固定ファイル名）
3. 絶対パスでなく環境変数を使用することで、プロジェクトの移植性を確保

### 🚨 settings.local.json 変更禁止ルール

**重要な禁止事項**:
- **`.claude/settings.local.json` ファイルは原則として変更禁止**
- ログ出力の修正が必要な場合は、必ず以下の手順に従う：
  1. ❌ してはいけないこと: `settings.local.json` を直接編集
  2. ✅ 正しい対応: `scripts/log-event.sh` のみを修正
- 理由：
  - settings.local.json の不適切な変更により、フックが動作しなくなる可能性がある
  - フックの無限ループやバグの原因となる
  - デバッグが困難になり、修正不能な状態に陥る可能性がある
- **例外**: ユーザーから明示的に settings.local.json の変更を要求された場合のみ変更可能

## 🗂 命名規則

### ファイル名

小文字、ハイフン区切り

/fix: 内部文書の命名規則違反を検出したら自動修正提案

### Git ブランチ

- `feature-{機能名}`: 新機能開発用
- `fix-{修正内容}`: バグ修正用
- `docs-{文書名}`: ドキュメント更新用
- `backup-{元ブランチ}-YYYYMMDD-{番号}`: バックアップ用

## 🗂 ディレクトリ構造

```

```

## 🔒 セキュリティと Git 管理

### .gitignore 必須項目

```gitignore
# APIトークン
.claude/config/*-token.json
.claude/config/secrets.json

# 環境設定
.env
.env.local
*.key
*.secret

# ログ・一時ファイル
*.log
logs/
tmp/
temp/
.DS_Store
```

/fix: 機密情報を検出したら即座に警告

- API トークンの直接記載を防止
- 個人情報の記載を防止
- パスワードやシークレットキーの記載を防止

## 🚫 禁止事項

/fix: 以下の違反を検出したら自動停止

- 機密情報や個人情報の記載
- 未検証情報の事実としての記載
- 他者著作物の無断使用
- 過度な専門用語の説明なし使用

## 🔧 新機能実装プロセス

/fix: 新機能実装時は必ず以下のプロセスに従う

- **詳細プロセス**: `/internal/development-process.md` を参照
- **クイックリファレンス**: `/internal/dev-process-quick-ref.md` で概要確認
- **6 フェーズ標準プロセス**を厳守（要件定義 → 設計 → テスト設計 → タスク分解 → 実装 → 確認）

/todo: 実装開始前の必須確認

- [ ] `/internal/development-process.md` を読み込む
- [ ] 該当フェーズのテンプレートを `/internal/templates/` から取得
- [ ] 人間への確認事項をリストアップ
- [ ] TodoWrite ツールでタスク管理を開始

/fix: 以下のルールを常に適用
/todo: 各作業開始時の必須確認

- [ ] 不要なファイル作成をしていないか
- [ ] 既存ファイルの編集で対応できないか
- [ ] 正しい言語で文書を作成しているか
- [ ] 記事作成の場合は/articles/claude.md を参照したか
