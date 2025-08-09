#!/usr/bin/env node

/**
 * Token Calculator for Claude Code Sessions
 * Calculates token usage from event logs
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class TokenCalculator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot || process.cwd();
    this.logFile = path.join(this.projectRoot, 'logs', 'events.jsonl');
    this.claudeMdPath = path.join(this.projectRoot, 'claude.md');
    
    // 設定ファイルの読み込み
    this.config = this.loadConfig();
    
    // メッセージの初期化
    this.messages = this.getMessages();
    
    // セッションデータの初期化
    this.sessionData = {
      sessionId: null,
      startTime: null,
      userInputs: [],
      filesRead: [],
      filesWritten: [],
      initialContext: null,
      totals: {
        userInputTokens: 0,
        fileReadTokens: 0,
        fileWriteTokens: 0,
        contextTokens: 0,
        totalTokens: 0
      },
      languageStats: {
        japaneseRatio: 0,
        primaryLanguage: 'en'
      }
    };
  }

  /**
   * 設定ファイルを読み込み
   */
  loadConfig() {
    const configPath = path.join(this.projectRoot, 'config', 'token-calculator.json');
    try {
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch (error) {
      console.error('Config file loading failed, using defaults:', error.message);
    }
    
    // デフォルト設定
    return {
      contextWindow: {
        size: 100000,
        warningThreshold: 0.8,
        cautionThreshold: 0.6
      },
      tokenEstimates: {
        webFetch: { tokens: 2500 },
        webSearch: { tokens: 1750 }
      },
      languageDetection: {
        japaneseThreshold: 0.2,
        tokensPerCharacter: {
          japanese: 2.5,
          english: 4.0
        }
      },
      outputLanguage: 'en'
    };
  }

  /**
   * 言語別メッセージを取得
   */
  getMessages() {
    const messages = {
      en: {
        title: 'Claude Code Token Usage Report',
        sessionId: 'Session ID',
        startTime: 'Start Time',
        tokenUsageSummary: 'Token Usage Summary',
        userInput: 'User Input',
        filesRead: 'Files Read',
        filesWritten: 'Files Written',
        initialContext: 'Initial Context',
        totalTokens: 'Total Tokens',
        contextWindowUsage: 'Context Window Usage',
        ofTokens: 'of',
        tokens: 'tokens',
        warning: 'WARNING: Context window usage is above',
        warningMessage: 'Old conversation history may be dropped soon.',
        note: 'Note: Context window usage is above',
        languageDetection: 'Language Detection',
        japaneseContent: 'Japanese Content',
        calculatedAs: '(calculated as ',
        calculatedAsSuffix: ')',
        japanese: 'Japanese',
        english: 'English',
        detailedBreakdown: 'Detailed Breakdown',
        userInputs: 'User Inputs',
        filesReadList: 'Files Read',
        filesWrittenList: 'Files Written',
        estimated: 'estimated'
      },
      ja: {
        title: 'Claude Code トークン使用状況レポート',
        sessionId: 'セッションID',
        startTime: '開始時刻',
        tokenUsageSummary: 'トークン使用状況サマリー',
        userInput: 'ユーザー入力',
        filesRead: 'ファイル読み込み',
        filesWritten: 'ファイル書き込み',
        initialContext: '初期コンテキスト',
        totalTokens: '合計トークン',
        contextWindowUsage: 'コンテキストウィンドウ使用率',
        ofTokens: '/',
        tokens: 'トークン',
        warning: '警告: コンテキストウィンドウ使用率が',
        warningMessage: '古い会話履歴が削除される可能性があります。',
        note: '注意: コンテキストウィンドウ使用率が',
        languageDetection: '言語判定',
        japaneseContent: '日本語コンテンツ',
        calculatedAs: '(',
        calculatedAsSuffix: 'として計算)',
        japanese: '日本語',
        english: '英語',
        detailedBreakdown: '詳細内訳',
        userInputs: 'ユーザー入力',
        filesReadList: '読み込みファイル',
        filesWrittenList: '書き込みファイル',
        estimated: '推定'
      }
    };
    
    const lang = this.config.outputLanguage || 'en';
    return messages[lang] || messages.en;
  }

  /**
   * 言語を判定（日本語の割合を計算）
   */
  detectLanguage(text) {
    if (!text) return { language: 'en', japaneseRatio: 0 };
    
    // 日本語文字（ひらがな、カタカナ、漢字）を検出
    const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g;
    const japaneseMatches = text.match(japanesePattern) || [];
    const japaneseCount = japaneseMatches.length;
    const totalCount = text.length;
    
    const japaneseRatio = totalCount > 0 ? (japaneseCount / totalCount) : 0;
    const language = japaneseRatio >= this.config.languageDetection.japaneseThreshold ? 'ja' : 'en';
    
    return { language, japaneseRatio };
  }

  /**
   * トークン数を計算
   */
  countTokens(text) {
    if (!text) return 0;
    
    const { language } = this.detectLanguage(text);
    
    // 言語に応じた換算率（設定ファイルから取得）
    const charsPerToken = language === 'ja' 
      ? this.config.languageDetection.tokensPerCharacter.japanese
      : this.config.languageDetection.tokensPerCharacter.english;
    
    return Math.ceil(text.length / charsPerToken);
  }

  /**
   * ファイル内容を読み込んでトークン数を計算
   */
  async getFileTokens(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { tokens: 0, size: 0, language: 'unknown' };
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      const tokens = this.countTokens(content);
      const { language, japaneseRatio } = this.detectLanguage(content);
      
      return {
        tokens,
        size: stats.size,
        language,
        japaneseRatio
      };
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
      return { tokens: 0, size: 0, language: 'unknown' };
    }
  }

  /**
   * ログファイルを解析
   */
  async parseLogFile() {
    if (!fs.existsSync(this.logFile)) {
      throw new Error(`Log file not found: ${this.logFile}`);
    }

    const fileStream = fs.createReadStream(this.logFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      try {
        const event = JSON.parse(line);
        await this.processEvent(event);
      } catch (error) {
        // 不正なJSONはスキップ
        console.error('Skipping invalid JSON line:', error.message);
      }
    }
  }

  /**
   * イベントを処理
   */
  async processEvent(event) {
    switch (event.event_type) {
      case 'SessionStart':
        this.sessionData.sessionId = event.session_id;
        this.sessionData.startTime = event.timestamp;
        break;

      case 'UserPromptSubmit':
        const userInput = event.data.user_input || '';
        const userTokens = this.countTokens(userInput);
        this.sessionData.userInputs.push({
          timestamp: event.timestamp,
          text: userInput,
          tokens: userTokens
        });
        this.sessionData.totals.userInputTokens += userTokens;
        break;

      case 'PostToolUse':
        if (event.data.tool_name === 'Read' && event.data.parameters) {
          // ファイルパスを抽出
          const fileMatch = event.data.parameters.match(/file:\s*(.+)/);
          if (fileMatch) {
            const filePath = fileMatch[1].trim();
            const fileInfo = await this.getFileTokens(filePath);
            
            this.sessionData.filesRead.push({
              timestamp: event.timestamp,
              filePath,
              ...fileInfo
            });
            this.sessionData.totals.fileReadTokens += fileInfo.tokens;
          }
        } else if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(event.data.tool_name)) {
          // Write系ツールの処理
          const fileMatch = event.data.parameters.match(/file:\s*(.+)/);
          if (fileMatch) {
            const filePath = fileMatch[1].trim();
            const fileInfo = await this.getFileTokens(filePath);
            
            this.sessionData.filesWritten.push({
              timestamp: event.timestamp,
              filePath,
              ...fileInfo
            });
            this.sessionData.totals.fileWriteTokens += fileInfo.tokens;
          }
        } else if (event.data.tool_name === 'WebFetch') {
          // WebFetchの推定トークン数（設定ファイルから取得）
          const ESTIMATED_WEBFETCH_TOKENS = this.config.tokenEstimates.webFetch.tokens;
          this.sessionData.totals.fileReadTokens += ESTIMATED_WEBFETCH_TOKENS;
          
          // URLを抽出して記録
          const urlMatch = event.data.parameters.match(/url:\s*(.+)/);
          if (urlMatch) {
            this.sessionData.filesRead.push({
              timestamp: event.timestamp,
              filePath: urlMatch[1].trim(),
              tokens: ESTIMATED_WEBFETCH_TOKENS,
              size: 0,
              language: 'web',
              estimated: true
            });
          }
        } else if (event.data.tool_name === 'WebSearch') {
          // WebSearchの推定トークン数（設定ファイルから取得）
          const ESTIMATED_WEBSEARCH_TOKENS = this.config.tokenEstimates.webSearch.tokens;
          this.sessionData.totals.fileReadTokens += ESTIMATED_WEBSEARCH_TOKENS;
          
          // クエリを抽出して記録
          const queryMatch = event.data.parameters.match(/query:\s*(.+)/);
          if (queryMatch) {
            this.sessionData.filesRead.push({
              timestamp: event.timestamp,
              filePath: `Search: ${queryMatch[1].trim()}`,
              tokens: ESTIMATED_WEBSEARCH_TOKENS,
              size: 0,
              language: 'search',
              estimated: true
            });
          }
        }
        break;
    }
  }

  /**
   * 初期コンテキスト（CLAUDE.md）を処理
   */
  async processInitialContext() {
    if (fs.existsSync(this.claudeMdPath)) {
      const contextInfo = await this.getFileTokens(this.claudeMdPath);
      this.sessionData.initialContext = {
        filePath: this.claudeMdPath,
        ...contextInfo
      };
      this.sessionData.totals.contextTokens = contextInfo.tokens;
    }
  }

  /**
   * 統計情報を計算
   */
  calculateStatistics() {
    // 合計トークン数
    const { userInputTokens, fileReadTokens, fileWriteTokens, contextTokens } = this.sessionData.totals;
    this.sessionData.totals.totalTokens = userInputTokens + fileReadTokens + fileWriteTokens + contextTokens;

    // 全体の言語統計
    let totalJapaneseChars = 0;
    let totalChars = 0;

    // ユーザー入力のテキストを集計
    this.sessionData.userInputs.forEach(input => {
      const { japaneseRatio } = this.detectLanguage(input.text);
      totalJapaneseChars += input.text.length * japaneseRatio;
      totalChars += input.text.length;
    });

    // 全体の日本語割合
    if (totalChars > 0) {
      this.sessionData.languageStats.japaneseRatio = totalJapaneseChars / totalChars;
      this.sessionData.languageStats.primaryLanguage = 
        this.sessionData.languageStats.japaneseRatio >= this.config.languageDetection.japaneseThreshold ? 'ja' : 'en';
    }
  }

  /**
   * 結果を出力
   */
  formatOutput(verbose = false) {
    const separator = '='.repeat(50);
    const lines = [];

    lines.push(separator);
    lines.push(this.messages.title);
    lines.push(separator);
    
    if (this.sessionData.sessionId) {
      lines.push(`${this.messages.sessionId}: ${this.sessionData.sessionId}`);
      lines.push(`${this.messages.startTime}: ${this.sessionData.startTime}`);
      lines.push('');
    }

    lines.push(`${this.messages.tokenUsageSummary}:`);
    lines.push(`- ${this.messages.userInput}:        ${this.formatNumber(this.sessionData.totals.userInputTokens)} ${this.messages.tokens}`);
    lines.push(`- ${this.messages.filesRead}:        ${this.formatNumber(this.sessionData.totals.fileReadTokens)} ${this.messages.tokens}`);
    lines.push(`- ${this.messages.filesWritten}:     ${this.formatNumber(this.sessionData.totals.fileWriteTokens)} ${this.messages.tokens}`);
    lines.push(`- ${this.messages.initialContext}:   ${this.formatNumber(this.sessionData.totals.contextTokens)} ${this.messages.tokens}`);
    lines.push('-'.repeat(33));
    lines.push(`${this.messages.totalTokens}:        ${this.formatNumber(this.sessionData.totals.totalTokens)} ${this.messages.tokens}`);
    lines.push('');

    // コンテキストウィンドウ使用率
    const CONTEXT_WINDOW_SIZE = this.config.contextWindow.size;
    const usagePercent = ((this.sessionData.totals.totalTokens / CONTEXT_WINDOW_SIZE) * 100).toFixed(1);
    lines.push(`${this.messages.contextWindowUsage}:`);
    lines.push(`- ${usagePercent}% ${this.messages.ofTokens} ${this.formatNumber(CONTEXT_WINDOW_SIZE)} ${this.messages.tokens}`);
    
    // プログレスバー表示
    const barWidth = 30;
    const filledWidth = Math.round((this.sessionData.totals.totalTokens / CONTEXT_WINDOW_SIZE) * barWidth);
    const emptyWidth = barWidth - filledWidth;
    const progressBar = '[' + '#'.repeat(filledWidth) + '.'.repeat(emptyWidth) + ']';
    lines.push(`  ${progressBar}`);
    
    // 警告表示（設定ファイルの闾値に基づく）
    const usageRatio = this.sessionData.totals.totalTokens / CONTEXT_WINDOW_SIZE;
    if (usageRatio > this.config.contextWindow.warningThreshold) {
      lines.push('');
      lines.push(`⚠️  ${this.messages.warning} ${this.config.contextWindow.warningThreshold * 100}%!`);
      lines.push(`   ${this.messages.warningMessage}`);
    } else if (usageRatio > this.config.contextWindow.cautionThreshold) {
      lines.push('');
      lines.push(`📝 ${this.messages.note} ${this.config.contextWindow.cautionThreshold * 100}%.`);
    }
    
    lines.push('');

    // 言語統計
    const japanesePercent = Math.round(this.sessionData.languageStats.japaneseRatio * 100);
    lines.push(`${this.messages.languageDetection}:`);
    const langCalc = this.sessionData.languageStats.primaryLanguage === 'ja' ? this.messages.japanese : this.messages.english;
    lines.push(`- ${this.messages.japaneseContent}: ${japanesePercent}% ${this.messages.calculatedAs}${langCalc}${this.messages.calculatedAsSuffix}`);
    
    // 詳細表示
    if (verbose) {
      lines.push('');
      lines.push(`${this.messages.detailedBreakdown}:`);
      lines.push('');
      
      // ユーザー入力
      if (this.sessionData.userInputs.length > 0) {
        lines.push(`${this.messages.userInputs}:`);
        this.sessionData.userInputs.slice(-5).forEach((input, index) => {
          const preview = input.text.substring(0, 50).replace(/\n/g, ' ');
          lines.push(`  ${index + 1}. ${preview}... (${input.tokens} ${this.messages.tokens})`);
        });
        lines.push('');
      }
      
      // 読み込みファイル
      if (this.sessionData.filesRead.length > 0) {
        lines.push(`${this.messages.filesReadList}:`);
        const uniqueFiles = this.getUniqueFiles(this.sessionData.filesRead);
        uniqueFiles.slice(-10).forEach(file => {
          const fileName = path.basename(file.filePath);
          if (file.estimated) {
            // 推定値の場合は(推定)を表示
            lines.push(`  - ${fileName}: ${file.tokens} ${this.messages.tokens} (${this.messages.estimated})`);
          } else {
            lines.push(`  - ${fileName}: ${file.tokens} ${this.messages.tokens} (${this.formatBytes(file.size)}, ${file.language})`);
          }
        });
        lines.push('');
      }
      
      // 書き込みファイル
      if (this.sessionData.filesWritten.length > 0) {
        lines.push(`${this.messages.filesWrittenList}:`);
        const uniqueFiles = this.getUniqueFiles(this.sessionData.filesWritten);
        uniqueFiles.slice(-10).forEach(file => {
          const fileName = path.basename(file.filePath);
          lines.push(`  - ${fileName}: ${file.tokens} ${this.messages.tokens} (${this.formatBytes(file.size)})`);
        });
      }
    }
    
    lines.push(separator);
    
    return lines.join('\n');
  }

  /**
   * 重複ファイルを除去（最新のみ保持）
   */
  getUniqueFiles(files) {
    const fileMap = new Map();
    files.forEach(file => {
      fileMap.set(file.filePath, file);
    });
    return Array.from(fileMap.values());
  }

  /**
   * 数値をフォーマット
   */
  formatNumber(num) {
    return num.toLocaleString();
  }

  /**
   * バイト数をフォーマット
   */
  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * メイン処理
   */
  async calculate(options = {}) {
    try {
      // ログファイル解析
      await this.parseLogFile();
      
      // 初期コンテキスト処理
      await this.processInitialContext();
      
      // 統計計算
      this.calculateStatistics();
      
      // 結果出力
      const output = this.formatOutput(options.verbose);
      console.log(output);
      
      // JSON形式での出力（オプション）
      if (options.format === 'json') {
        console.log('\nJSON Output:');
        console.log(JSON.stringify(this.sessionData, null, 2));
      }
      
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
}

// コマンドライン引数の処理
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    verbose: false,
    format: 'text',
    sessionId: null
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--format':
        if (args[i + 1]) {
          options.format = args[i + 1];
          i++;
        }
        break;
      case '--session-id':
        if (args[i + 1]) {
          options.sessionId = args[i + 1];
          i++;
        }
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: calculate-tokens.sh [OPTIONS]

Options:
  --verbose, -v          Show detailed breakdown
  --format <format>      Output format (text|json)
  --session-id <id>      Analyze specific session
  --help, -h            Show this help message

Examples:
  calculate-tokens.sh                      # Basic usage
  calculate-tokens.sh --verbose           # Detailed output
  calculate-tokens.sh --format json       # JSON output
`);
        process.exit(0);
    }
  }

  return options;
}

// メイン実行
async function main() {
  const options = parseArgs();
  const projectRoot = path.resolve(__dirname, '..', '..');
  const calculator = new TokenCalculator(projectRoot);
  await calculator.calculate(options);
}

// エントリーポイント
if (require.main === module) {
  main();
}