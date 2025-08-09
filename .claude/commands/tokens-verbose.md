---
description: トークン使用量の詳細表示（ファイルリスト付き）
allowed-tools:
  - Bash
---

現在のセッションのトークン使用量を詳細表示で計算してください。

```bash
cd $CLAUDE_PROJECT_DIR && npm run token-calc:verbose
```

以下の情報を含めて表示してください：
- 合計トークン数
- カテゴリ別の内訳
- 最近のユーザー入力
- 読み込んだファイルのリスト
- 言語判定結果