package connector

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"
)

// ── 全局 tenant_access_token 缓存 ────────────────────────────────

var (
	globalTokenMu  sync.Mutex
	globalTokenMap = make(map[string]*tokenEntry) // appID -> entry
)

type tokenEntry struct {
	token  string
	expire time.Time
}

// GetTenantToken 获取 tenant_access_token（全局缓存，跨 sender 共享）
func GetTenantToken(appID, appSecret string) (string, error) {
	globalTokenMu.Lock()
	defer globalTokenMu.Unlock()

	if entry, ok := globalTokenMap[appID]; ok && time.Now().Before(entry.expire) {
		return entry.token, nil
	}

	body, _ := json.Marshal(map[string]string{
		"app_id":     appID,
		"app_secret": appSecret,
	})
	resp, err := http.Post(
		"https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
		"application/json", bytes.NewReader(body),
	)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Code              int    `json:"code"`
		Msg               string `json:"msg"`
		TenantAccessToken string `json:"tenant_access_token"`
		Expire            int    `json:"expire"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if result.Code != 0 {
		return "", fmt.Errorf("feishu auth error: code=%d msg=%s", result.Code, result.Msg)
	}

	globalTokenMap[appID] = &tokenEntry{
		token:  result.TenantAccessToken,
		expire: time.Now().Add(time.Duration(result.Expire-120) * time.Second),
	}
	return result.TenantAccessToken, nil
}

// PrewarmTenantToken 启动时预热 token（非阻塞）
func PrewarmTenantToken(appID, appSecret string) {
	go func() {
		if _, err := GetTenantToken(appID, appSecret); err != nil {
			slog.Warn("[feishu] prewarm token failed", "err", err)
		} else {
			slog.Info("[feishu] token prewarmed", "app_id", appID)
		}
	}()
}

// ── feishuStreamSender 封装飞书卡片流式更新 ────────────────────────

type feishuStreamSender struct {
	appID     string
	appSecret string
	chatID    string
	msgID     string // 原消息 ID

	mu         sync.Mutex
	cardID     string
	replyMsgID string // 卡片消息的 message_id
	ackMsgID   string // "💭 正在思考..." 消息的 ID
	sequence   int

	// 严格追加式内容管理：lastFlushed 保存上一次成功 flush 到飞书的内容，
	// pendingAppend 保存自上次 flush 以来新增的内容。
	// 每次 flush 时发送 lastFlushed + pendingAppend，成功后把 pendingAppend 合并进 lastFlushed。
	// 这样确保每次发给飞书的内容一定是上次的前缀扩展，不会触发重新渲染。
	lastFlushed   string
	pendingAppend string

	// 阶段状态：用于格式化不同类型的内容
	currentPhase string // "thinking" | "tool" | "text" | ""

	// 思考阶段已输出标记（只输出一次提示，不累积思考原文）
	thinkingEmitted bool
	// 工具调用阶段已输出标记（tool 进入后输出一次分隔，避免多余空行）
	toolSectionStarted bool

	pendingFlush  bool
	flushTimer    *time.Timer
	flushInterval time.Duration

	cardTitle string
	done      bool
}

func newFeishuStreamSender(appID, appSecret, chatID, msgID string, cfg FeishuConfig) *feishuStreamSender {
	title := cfg.StreamingCardTitle
	if title == "" {
		title = "灵犀"
	}
	interval := time.Duration(cfg.StreamingFlushMs) * time.Millisecond
	if interval < 50*time.Millisecond {
		interval = 80 * time.Millisecond
	}
	return &feishuStreamSender{
		appID:         appID,
		appSecret:     appSecret,
		chatID:        chatID,
		msgID:         msgID,
		flushInterval: interval,
		cardTitle:     title,
	}
}

// SendAck 立即发送"💭 正在思考..."文本提示，减少用户等待感知
func (s *feishuStreamSender) SendAck() {
	token, err := GetTenantToken(s.appID, s.appSecret)
	if err != nil {
		return
	}
	msgID, err := s.sendTextMessage(token, "💭 正在思考...")
	if err != nil {
		slog.Warn("[feishu-stream] send ack failed", "err", err)
		return
	}
	s.mu.Lock()
	s.ackMsgID = msgID
	s.mu.Unlock()
}

// OnStreamCallback 多类型流式回调。
// 飞书卡片展示思考提示、工具调用概要和正文文本。
// - thinking：首次进入思考阶段时追加一行提示，不输出原始思考内容
// - tool：每次工具调用追加一行简洁标记
// - text：直接追加正文
// 所有内容严格前缀扩展，不覆盖已有内容。
func (s *feishuStreamSender) OnStreamCallback(kind StreamKind, payload string, done bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	switch kind {
	case KindThinking:
		if !s.thinkingEmitted {
			s.thinkingEmitted = true
			s.pendingAppend += "> 💭 正在分析问题...\n\n"
			s.currentPhase = "thinking"
		}

	case KindTool:
		s.currentPhase = "tool"
		// payload 格式为 "🔧 工具名"，直接用引用块展示
		toolLine := payload
		if toolLine == "" {
			toolLine = "🔧 调用工具"
		}
		if !s.toolSectionStarted {
			s.toolSectionStarted = true
		}
		s.pendingAppend += "> " + toolLine + "\n"

	case KindText:
		if payload != "" {
			// 从非文本阶段首次进入文本阶段时，追加一个空行作为分隔
			if s.currentPhase != "text" && (s.thinkingEmitted || s.toolSectionStarted) {
				s.pendingAppend += "\n"
			}
			s.currentPhase = "text"
			s.pendingAppend += payload
		}
	}

	if done {
		s.done = true
		if s.flushTimer != nil {
			s.flushTimer.Stop()
			s.flushTimer = nil
		}
		return s.flushLocked()
	}

	// 有新内容待 flush 时初始化卡片并触发定时 flush
	if s.pendingAppend != "" {
		if s.cardID == "" {
			if err := s.initCard(); err != nil {
				return err
			}
			s.deleteAck()
		}

		s.pendingFlush = true
		if s.flushTimer == nil {
			s.flushTimer = time.AfterFunc(s.flushInterval, func() {
				s.mu.Lock()
				defer s.mu.Unlock()
				if err := s.flushLocked(); err != nil {
					slog.Warn("[feishu-stream] flush error", "err", err)
				}
			})
		}
	}
	return nil
}

// OnChunk 兼容旧版接口
func (s *feishuStreamSender) OnChunk(chunk string, done bool) error {
	return s.OnStreamCallback(KindText, chunk, done)
}

func (s *feishuStreamSender) deleteAck() {
	if s.ackMsgID == "" {
		return
	}
	go func() {
		token, err := GetTenantToken(s.appID, s.appSecret)
		if err != nil {
			return
		}
		s.deleteMessage(token, s.ackMsgID)
	}()
	s.ackMsgID = ""
}

func (s *feishuStreamSender) initCard() error {
	token, err := GetTenantToken(s.appID, s.appSecret)
	if err != nil {
		return fmt.Errorf("get tenant token: %w", err)
	}

	cardJSON := s.buildCardJSON()
	cardID, err := s.createCardEntity(token, cardJSON)
	if err != nil {
		return fmt.Errorf("create card: %w", err)
	}
	s.cardID = cardID

	replyMsgID, err := s.sendCardMessage(token, cardID)
	if err != nil {
		return fmt.Errorf("send card message: %w", err)
	}
	s.replyMsgID = replyMsgID
	slog.Info("[feishu-stream] card created", "cardID", cardID, "replyMsgID", replyMsgID)
	return nil
}

func (s *feishuStreamSender) flushLocked() error {
	if s.cardID == "" {
		if s.pendingAppend == "" {
			return nil
		}
		if err := s.initCard(); err != nil {
			return err
		}
		s.deleteAck()
	}

	s.flushTimer = nil
	s.pendingFlush = false

	if s.pendingAppend == "" && !s.done {
		return nil
	}

	token, err := GetTenantToken(s.appID, s.appSecret)
	if err != nil {
		return err
	}

	// 严格前缀扩展：新内容 = 上次已确认的内容 + 本次新增
	content := s.lastFlushed + s.pendingAppend
	if content == "" {
		content = "✅ 完成"
	}

	s.sequence++
	if err := s.updateElement(token, content, s.sequence); err != nil {
		return err
	}

	// flush 成功，合并 pendingAppend 到 lastFlushed
	s.lastFlushed = content
	s.pendingAppend = ""
	return nil
}

// ── 飞书 API 调用 ────────────────────────────────────────────

func (s *feishuStreamSender) buildCardJSON() string {
	card := map[string]interface{}{
		"schema": "2.0",
		"config": map[string]interface{}{
			"streaming_mode": true,
			"streaming_config": map[string]interface{}{
				"print_frequency_ms": map[string]interface{}{"default": 50},
				"print_step":         map[string]interface{}{"default": 2},
				"print_strategy":     "fast",
			},
			"update_multi": true,
			"width_mode":   "default",
			"summary": map[string]interface{}{
				"content": "",
			},
		},
		"header": map[string]interface{}{
			"title":    map[string]interface{}{"tag": "plain_text", "content": s.cardTitle},
			"template": "blue",
		},
		"body": map[string]interface{}{
			"elements": []map[string]interface{}{
				{
					"tag":        "markdown",
					"element_id": "streaming_md",
					"content":    "思考中...",
				},
			},
		},
	}
	b, _ := json.Marshal(card)
	return string(b)
}

func (s *feishuStreamSender) createCardEntity(token, cardDataJSON string) (string, error) {
	body, _ := json.Marshal(map[string]string{
		"type": "card_json",
		"data": cardDataJSON,
	})

	req, _ := http.NewRequest("POST", "https://open.feishu.cn/open-apis/cardkit/v1/cards", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
		Data struct {
			CardID string `json:"card_id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("parse create card response: %w, body: %s", err, string(respBody))
	}
	if result.Code != 0 {
		return "", fmt.Errorf("create card error: code=%d msg=%s", result.Code, result.Msg)
	}
	return result.Data.CardID, nil
}

func (s *feishuStreamSender) sendCardMessage(token, cardID string) (string, error) {
	content, _ := json.Marshal(map[string]interface{}{
		"type": "card",
		"data": map[string]string{"card_id": cardID},
	})

	receiveType := "chat_id"
	if !strings.HasPrefix(s.chatID, "oc_") {
		receiveType = "open_id"
	}

	var url string
	var reqBody []byte

	if s.msgID != "" {
		// 回复原消息（线程模式）
		url = fmt.Sprintf("https://open.feishu.cn/open-apis/im/v1/messages/%s/reply", s.msgID)
		reqBody, _ = json.Marshal(map[string]string{
			"msg_type": "interactive",
			"content":  string(content),
		})
	} else {
		url = fmt.Sprintf("https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=%s", receiveType)
		reqBody, _ = json.Marshal(map[string]string{
			"receive_id": s.chatID,
			"msg_type":   "interactive",
			"content":    string(content),
		})
	}

	req, _ := http.NewRequest("POST", url, bytes.NewReader(reqBody))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
		Data struct {
			MessageID string `json:"message_id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("parse send message response: %w, body: %s", err, string(respBody))
	}
	if result.Code != 0 {
		return "", fmt.Errorf("send card message error: code=%d msg=%s", result.Code, result.Msg)
	}
	return result.Data.MessageID, nil
}

func (s *feishuStreamSender) updateElement(token, content string, seq int) error {
	body, _ := json.Marshal(map[string]interface{}{
		"content":  content,
		"sequence": seq,
	})

	url := fmt.Sprintf("https://open.feishu.cn/open-apis/cardkit/v1/cards/%s/elements/%s/content", s.cardID, "streaming_md")
	req, _ := http.NewRequest("PUT", url, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("update element error: status=%d body=%s", resp.StatusCode, string(respBody))
	}
	return nil
}

func (s *feishuStreamSender) sendTextMessage(token, text string) (string, error) {
	content, _ := json.Marshal(map[string]string{"text": text})

	receiveType := "chat_id"
	if !strings.HasPrefix(s.chatID, "oc_") {
		receiveType = "open_id"
	}

	var url string
	var reqBody []byte

	if s.msgID != "" {
		url = fmt.Sprintf("https://open.feishu.cn/open-apis/im/v1/messages/%s/reply", s.msgID)
		reqBody, _ = json.Marshal(map[string]string{
			"msg_type": "text",
			"content":  string(content),
		})
	} else {
		url = fmt.Sprintf("https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=%s", receiveType)
		reqBody, _ = json.Marshal(map[string]string{
			"receive_id": s.chatID,
			"msg_type":   "text",
			"content":    string(content),
		})
	}

	req, _ := http.NewRequest("POST", url, bytes.NewReader(reqBody))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
		Data struct {
			MessageID string `json:"message_id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", err
	}
	if result.Code != 0 {
		return "", fmt.Errorf("send text message error: code=%d msg=%s", result.Code, result.Msg)
	}
	return result.Data.MessageID, nil
}

func (s *feishuStreamSender) deleteMessage(token, messageID string) {
	url := fmt.Sprintf("https://open.feishu.cn/open-apis/im/v1/messages/%s", messageID)
	req, _ := http.NewRequest("DELETE", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		slog.Warn("[feishu-stream] delete message failed", "msgID", messageID, "err", err)
		return
	}
	resp.Body.Close()
}
