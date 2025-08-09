#!/bin/bash

# プロジェクトディレクトリを自動検出
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

LOG_DIR="${PROJECT_DIR}/logs"
JSONL_FILE="${LOG_DIR}/events.jsonl"

mkdir -p "${LOG_DIR}"

EVENT_TYPE="${1:-unknown}"
shift

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
ISO_TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')

# Helper function to escape JSON strings
escape_json() {
    echo "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g; s/\n/\\n/g; s/\r/\\r/g'
}

# Read JSON from stdin if available
if [ ! -t 0 ]; then
    INPUT_JSON=$(cat)
fi

case "${EVENT_TYPE}" in
    "UserPromptSubmit")
        # JSONからデータを抽出
        if [ -n "${INPUT_JSON}" ]; then
            USER_INPUT=$(echo "${INPUT_JSON}" | grep -o '"prompt":"[^"]*' | sed 's/"prompt":"//' || echo "")
            SESSION_ID=$(echo "${INPUT_JSON}" | grep -o '"session_id":"[^"]*' | sed 's/"session_id":"//' || echo "")
        else
            # フォールバック: 引数から取得
            USER_INPUT="$1"
            SESSION_ID="${2:-}"
        fi
        ESCAPED_INPUT=$(escape_json "${USER_INPUT}")
        
        # JSONL形式で記録（会話データを含む）
        JSON_ENTRY="{\"timestamp\":\"${ISO_TIMESTAMP}\",\"event_type\":\"UserPromptSubmit\",\"session_id\":\"${SESSION_ID}\",\"data\":{\"user_input\":\"${ESCAPED_INPUT}\",\"input_length\":${#USER_INPUT}}}"
        echo "${JSON_ENTRY}" >> "${JSONL_FILE}"
        ;;
        
    "PreToolUse"|"PostToolUse")
        # JSONからデータを抽出
        FILE_SIZE=""
        LANG_TYPE=""
        
        if [ -n "${INPUT_JSON}" ]; then
            TOOL_NAME=$(echo "${INPUT_JSON}" | grep -o '"tool_name":"[^"]*' | sed 's/"tool_name":"//' || echo "")
            # パラメータを抽出（エスケープされたJSON文字列として渡される場合が多い）
            PARAMS=$(echo "${INPUT_JSON}" | sed 's/.*"parameters":"\(.*\)".*/\1/' | sed 's/}",.*$/}/')
            SESSION_ID=$(echo "${INPUT_JSON}" | grep -o '"session_id":"[^"]*' | sed 's/"session_id":"//' || echo "")
            
            # Readツールの場合、file_pathを抽出
            if [ "${TOOL_NAME}" = "Read" ]; then
                FILE_PATH=$(echo "${PARAMS}" | sed 's/\\"/"/g' | grep -o '"file_path":"[^"]*' | sed 's/"file_path":"//' || echo "")
                PARAMS_INFO="file: ${FILE_PATH}"
                
                # ファイルサイズと言語判定（PostToolUseの場合のみ）
                if [ "${EVENT_TYPE}" = "PostToolUse" ] && [ -f "${FILE_PATH}" ]; then
                    # ファイルサイズを取得（バイト単位）
                    FILE_SIZE=$(stat -f%z "${FILE_PATH}" 2>/dev/null || stat -c%s "${FILE_PATH}" 2>/dev/null || echo "0")
                    
                    # ファイル内容の言語判定（最初の1000文字で判定）
                    SAMPLE_TEXT=$(head -c 1000 "${FILE_PATH}" 2>/dev/null || echo "")
                    if [ -n "${SAMPLE_TEXT}" ]; then
                        # 日本語文字の数をカウント
                        JP_CHARS=$(echo "${SAMPLE_TEXT}" | grep -o '[ぁ-んァ-ヶー一-龠]' | wc -l | tr -d ' ')
                        TOTAL_CHARS=${#SAMPLE_TEXT}
                        
                        if [ ${TOTAL_CHARS} -gt 0 ]; then
                            JP_RATIO=$((JP_CHARS * 100 / TOTAL_CHARS))
                            if [ ${JP_RATIO} -ge 20 ]; then
                                LANG_TYPE="ja"
                            else
                                LANG_TYPE="en"
                            fi
                        fi
                    fi
                fi
            # Write/Edit系ツールの場合
            elif [[ "${TOOL_NAME}" =~ ^(Write|Edit|MultiEdit|NotebookEdit)$ ]]; then
                FILE_PATH=$(echo "${PARAMS}" | sed 's/\\"/"/g' | grep -o '"file_path":"[^"]*' | sed 's/"file_path":"//' || echo "")
                if [ -z "${FILE_PATH}" ]; then
                    # NotebookEditの場合はnotebook_pathを使用
                    FILE_PATH=$(echo "${PARAMS}" | sed 's/\\"/"/g' | grep -o '"notebook_path":"[^"]*' | sed 's/"notebook_path":"//' || echo "")
                fi
                PARAMS_INFO="file: ${FILE_PATH}"
                
                # ファイルサイズを記録（PostToolUseの場合のみ）
                if [ "${EVENT_TYPE}" = "PostToolUse" ] && [ -f "${FILE_PATH}" ]; then
                    FILE_SIZE=$(stat -f%z "${FILE_PATH}" 2>/dev/null || stat -c%s "${FILE_PATH}" 2>/dev/null || echo "0")
                fi
            # WebSearchツールの場合、queryを抽出
            elif [ "${TOOL_NAME}" = "WebSearch" ]; then
                QUERY=$(echo "${PARAMS}" | sed 's/\\"/"/g' | grep -o '"query":"[^"]*' | sed 's/"query":"//' || echo "")
                PARAMS_INFO="query: ${QUERY}"
            # WebFetchツールの場合、URLを抽出
            elif [ "${TOOL_NAME}" = "WebFetch" ]; then
                URL=$(echo "${PARAMS}" | sed 's/\\"/"/g' | grep -o '"url":"[^"]*' | sed 's/"url":"//' || echo "")
                PARAMS_INFO="url: ${URL}"
            # Grepツールの場合、patternを抽出
            elif [ "${TOOL_NAME}" = "Grep" ]; then
                PATTERN=$(echo "${PARAMS}" | sed 's/\\"/"/g' | grep -o '"pattern":"[^"]*' | sed 's/"pattern":"//' || echo "")
                PARAMS_INFO="pattern: ${PATTERN}"
            # Globツールの場合、patternを抽出
            elif [ "${TOOL_NAME}" = "Glob" ]; then
                PATTERN=$(echo "${PARAMS}" | sed 's/\\"/"/g' | grep -o '"pattern":"[^"]*' | sed 's/"pattern":"//' || echo "")
                PARAMS_INFO="pattern: ${PATTERN}"
            else
                PARAMS_INFO="${PARAMS}"
            fi
        else
            # フォールバック: 引数から取得
            TOOL_NAME="$1"
            PARAMS="$2"
            SESSION_ID="${3:-}"
            PARAMS_INFO="${PARAMS}"
        fi
        ESCAPED_PARAMS=$(escape_json "${PARAMS_INFO}")
        
        # JSON_ENTRYの構築（ファイルサイズと言語タイプを含む）
        DATA_JSON="{\"tool_name\":\"${TOOL_NAME}\",\"parameters\":\"${ESCAPED_PARAMS}\""
        if [ -n "${FILE_SIZE}" ]; then
            DATA_JSON="${DATA_JSON},\"file_size\":${FILE_SIZE}"
        fi
        if [ -n "${LANG_TYPE}" ]; then
            DATA_JSON="${DATA_JSON},\"language\":\"${LANG_TYPE}\""
        fi
        DATA_JSON="${DATA_JSON}}"
        
        # JSONL形式で記録
        JSON_ENTRY="{\"timestamp\":\"${ISO_TIMESTAMP}\",\"event_type\":\"${EVENT_TYPE}\",\"session_id\":\"${SESSION_ID}\",\"data\":${DATA_JSON}}"
        echo "${JSON_ENTRY}" >> "${JSONL_FILE}"
        ;;
        
    "SessionStart")
        # JSONからデータを抽出
        if [ -n "${INPUT_JSON}" ]; then
            SESSION_ID=$(echo "${INPUT_JSON}" | grep -o '"session_id":"[^"]*' | sed 's/"session_id":"//' || echo "")
            ACTION="startup"
        else
            # フォールバック: 引数から取得
            ACTION="${1}"
            SESSION_ID="${2:-}"
        fi
        
        # セッション開始時の処理
        if [ "${ACTION}" = "startup" ] || [ -z "${ACTION}" ]; then
            # 既存のログファイルをバックアップ（ファイルが存在し、かつ空でない場合）
            if [ -f "${JSONL_FILE}" ] && [ -s "${JSONL_FILE}" ]; then
                BACKUP_DIR="${LOG_DIR}/backups/$(date '+%Y-%m-%d')"
                mkdir -p "${BACKUP_DIR}"
                
                # タイムスタンプ付きのバックアップファイル名
                BACKUP_TIMESTAMP=$(date '+%Y-%m-%dT%H-%M-%S-%3N')
                BACKUP_FILE="${BACKUP_DIR}/events-${BACKUP_TIMESTAMP}.jsonl"
                
                # バックアップを作成
                mv "${JSONL_FILE}" "${BACKUP_FILE}"
                echo "[${TIMESTAMP}] Backed up previous session log to: ${BACKUP_FILE}" >&2
            fi
            
            # 新しいセッションのために空のファイルを作成
            : > "${JSONL_FILE}"
        fi
        
        # JSONL形式で記録（新しいファイルの最初のエントリ）
        JSON_ENTRY="{\"timestamp\":\"${ISO_TIMESTAMP}\",\"event_type\":\"SessionStart\",\"session_id\":\"${SESSION_ID}\",\"data\":{\"action\":\"${ACTION}\",\"project_root\":\"${PROJECT_DIR}\"}}"
        echo "${JSON_ENTRY}" >> "${JSONL_FILE}"
        ;;
        
    "Stop")
        # JSONからデータを抽出
        if [ -n "${INPUT_JSON}" ]; then
            SESSION_ID=$(echo "${INPUT_JSON}" | grep -o '"session_id":"[^"]*' | sed 's/"session_id":"//' || echo "")
        else
            # フォールバック: 引数から取得
            SESSION_ID="${1:-}"
        fi
        
        # JSONL形式で記録
        JSON_ENTRY="{\"timestamp\":\"${ISO_TIMESTAMP}\",\"event_type\":\"Stop\",\"session_id\":\"${SESSION_ID}\",\"data\":{\"timestamp\":\"${ISO_TIMESTAMP}\"}}"
        echo "${JSON_ENTRY}" >> "${JSONL_FILE}"
        ;;
        
    *)
        # 未知のイベントタイプは無視
        ;;
esac

echo "Event logged: ${EVENT_TYPE}" >&2