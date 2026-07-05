package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"lingxi-agent/connector"
	"lingxi-agent/db"
)

// P2PWatcher 管理所有 P2P 单聊消息的轮询监听
type P2PWatcher struct {
	mu       sync.Mutex
	watchers map[int64]*p2pTargetWatcher // target.ID -> watcher
	stopCh   chan struct{}
	larkCLI  string // lark-cli 可执行文件路径
}

type p2pTargetWatcher struct {
	target db.P2PWatchTarget
	stopCh chan struct{}

	// channel 串行化：pollOnce 生产消息 → processLoop 串行消费
	// 容量 100 防止 poll 被阻塞，processLoop 保证严格串行处理
	msgCh chan []larkMessage
}

// P2PWatchStatus 运行状态
type P2PWatchStatus struct {
	Running       bool              `json:"running"`
	ActiveTargets int               `json:"active_targets"`
	Targets       []P2PTargetStatus `json:"targets"`
}

type P2PTargetStatus struct {
	ID            int64  `json:"id"`
	ChatID        string `json:"chat_id"`
	ChatName      string `json:"chat_name"`
	Running       bool   `json:"running"`
	LastSeenMsgID string `json:"last_seen_msg_id"`
	Buffered      int    `json:"buffered"` // 缓冲中的消息数
}

var globalP2PWatcher *P2PWatcher

// InitP2PWatcher 初始化全局 P2P 监听器
func InitP2PWatcher() {
	larkCLI := findLarkCLI()
	globalP2PWatcher = &P2PWatcher{
		watchers: make(map[int64]*p2pTargetWatcher),
		stopCh:   make(chan struct{}),
		larkCLI:  larkCLI,
	}
	if larkCLI == "" {
		slog.Warn("[p2p-watcher] lark-cli not found, P2P message polling will be disabled")
	} else {
		slog.Info("[p2p-watcher] initialized", "lark_cli", larkCLI)
	}
}

// StartP2PWatcher 启动所有已启用的监听目标
func StartP2PWatcher() {
	if globalP2PWatcher == nil {
		return
	}
	targets, err := db.ListEnabledP2PWatchTargets()
	if err != nil {
		slog.Warn("[p2p-watcher] list enabled targets error", "err", err)
		return
	}
	for _, t := range targets {
		globalP2PWatcher.startTarget(t)
	}
	slog.Info("[p2p-watcher] started", "count", len(targets))
}

// StopP2PWatcher 停止所有监听
func StopP2PWatcher() {
	if globalP2PWatcher == nil {
		return
	}
	close(globalP2PWatcher.stopCh)
	globalP2PWatcher.mu.Lock()
	for _, w := range globalP2PWatcher.watchers {
		close(w.stopCh)
	}
	globalP2PWatcher.watchers = make(map[int64]*p2pTargetWatcher)
	globalP2PWatcher.mu.Unlock()
	slog.Info("[p2p-watcher] stopped all")
}

// GetP2PWatchStatus 获取运行状态
func GetP2PWatchStatus() P2PWatchStatus {
	if globalP2PWatcher == nil {
		return P2PWatchStatus{}
	}
	globalP2PWatcher.mu.Lock()
	defer globalP2PWatcher.mu.Unlock()

	status := P2PWatchStatus{
		Running:       true,
		ActiveTargets: len(globalP2PWatcher.watchers),
	}
	for _, w := range globalP2PWatcher.watchers {
		status.Targets = append(status.Targets, P2PTargetStatus{
			ID:            w.target.ID,
			ChatID:        w.target.ChatID,
			ChatName:      w.target.ChatName,
			Running:       true,
			LastSeenMsgID: w.target.LastSeenMsgID,
			Buffered:      len(w.msgCh),
		})
	}
	return status
}

// AddTarget 添加并启动新目标
func (pw *P2PWatcher) AddTarget(target db.P2PWatchTarget) {
	pw.startTarget(target)
}

// RemoveTarget 停止并移除目标
func (pw *P2PWatcher) RemoveTarget(targetID int64) {
	pw.mu.Lock()
	if w, ok := pw.watchers[targetID]; ok {
		close(w.stopCh)
		delete(pw.watchers, targetID)
	}
	pw.mu.Unlock()
}

// RestartTarget 重启单个目标（配置变更后调用）
func RestartP2PTarget(targetID int64) {
	if globalP2PWatcher == nil {
		return
	}
	globalP2PWatcher.RemoveTarget(targetID)
	t, err := db.GetP2PWatchTarget(targetID)
	if err != nil || !t.Enabled {
		return
	}
	globalP2PWatcher.startTarget(*t)
}

func (pw *P2PWatcher) startTarget(target db.P2PWatchTarget) {
	pw.mu.Lock()
	if _, exists := pw.watchers[target.ID]; exists {
		pw.mu.Unlock()
		return
	}
	w := &p2pTargetWatcher{
		target: target,
		stopCh: make(chan struct{}),
		msgCh:  make(chan []larkMessage, 100),
	}
	pw.watchers[target.ID] = w
	pw.mu.Unlock()

	go pw.pollLoop(w)
	go pw.processLoop(w)
}

// findLarkCLI 搜索 lark-cli 可执行文件
func findLarkCLI() string {
	candidates := []string{
		filepath.Join(os.Getenv("HOME"), ".local", "bin", "lark-cli"),
		"/usr/local/bin/lark-cli",
		"/opt/homebrew/bin/lark-cli",
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	if p, err := exec.LookPath("lark-cli"); err == nil {
		return p
	}
	return ""
}

func (pw *P2PWatcher) pollLoop(w *p2pTargetWatcher) {
	interval := time.Duration(w.target.PollIntervalSec) * time.Second
	if interval < 5*time.Second {
		interval = 5 * time.Second
	}

	slog.Info("[p2p-watcher] poll loop started",
		"target_id", w.target.ID, "chat_id", w.target.ChatID,
		"chat_name", w.target.ChatName, "interval", interval)

	// 首次拉取：初始化 last_seen_msg_id（不触发通知）
	if w.target.LastSeenMsgID == "" {
		msgs := pw.fetchMessagesLarkCLI(w)
		if len(msgs) > 0 {
			latest := msgs[len(msgs)-1]
			w.target.LastSeenMsgID = latest.MsgID
			db.UpdateP2PWatchLastSeen(w.target.ID, latest.MsgID)
			slog.Info("[p2p-watcher] initialized last_seen", "target_id", w.target.ID, "msg_id", latest.MsgID)
		}
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-w.stopCh:
			slog.Info("[p2p-watcher] poll loop stopped", "target_id", w.target.ID)
			return
		case <-pw.stopCh:
			return
		case <-ticker.C:
			pw.pollOnce(w)
		}
	}
}

func (pw *P2PWatcher) pollOnce(w *p2pTargetWatcher) {
	msgs := pw.fetchMessagesLarkCLI(w)
	if len(msgs) == 0 {
		return
	}

	// 找出 last_seen_msg_id 之后的新消息
	var newMsgs []larkMessage
	foundLast := false
	if w.target.LastSeenMsgID == "" {
		foundLast = true
	}
	for _, m := range msgs {
		if m.MsgID == w.target.LastSeenMsgID {
			foundLast = true
			continue
		}
		if foundLast {
			newMsgs = append(newMsgs, m)
		}
	}

	// last_seen_msg_id 不在最近 50 条中（历史积压太深），只处理最近几条避免重放风暴
	if !foundLast && w.target.LastSeenMsgID != "" {
		const maxCatchUp = 10
		if len(msgs) > maxCatchUp {
			newMsgs = msgs[len(msgs)-maxCatchUp:]
		} else {
			newMsgs = msgs
		}
		slog.Info("[p2p-watcher] last_seen not found in recent page, catching up recent messages",
			"target_id", w.target.ID, "last_seen", w.target.LastSeenMsgID,
			"page_count", len(msgs), "catch_up", len(newMsgs))
	}

	if len(newMsgs) == 0 {
		return
	}

	// 更新 last_seen_msg_id 为最新一条
	latest := newMsgs[len(newMsgs)-1]
	w.target.LastSeenMsgID = latest.MsgID
	db.UpdateP2PWatchLastSeen(w.target.ID, latest.MsgID)

	slog.Info("[p2p-watcher] new messages detected, enqueuing",
		"target_id", w.target.ID, "count", len(newMsgs), "queue_len", len(w.msgCh))

	// 非阻塞发送到 channel（容量 100 足够缓冲）
	select {
	case w.msgCh <- newMsgs:
	default:
		slog.Warn("[p2p-watcher] message queue full, dropping batch",
			"target_id", w.target.ID, "count", len(newMsgs))
	}
}

// processLoop 串行消费 msgCh 中的消息批次。
// 严格保证同一时间只有一个 Agent dispatch 在进行，
// Agent 完成后才处理下一批，彻底消除并发竞态。
func (pw *P2PWatcher) processLoop(w *p2pTargetWatcher) {
	for {
		select {
		case <-w.stopCh:
			slog.Info("[p2p-watcher] process loop stopped", "target_id", w.target.ID)
			return
		case <-pw.stopCh:
			return
		case msgs := <-w.msgCh:
			slog.Info("[p2p-watcher] processing batch",
				"target_id", w.target.ID, "count", len(msgs))
			pw.processBatchSync(w, msgs)
		}
	}
}

// processBatchSync 同步处理一批消息（阻塞直到 Agent 完成）
func (pw *P2PWatcher) processBatchSync(w *p2pTargetWatcher, msgs []larkMessage) {
	doneCh := pw.processBatchMessagesV2(w, msgs)
	if doneCh == nil {
		// 同步完成（desktop_notify/silent/无规则匹配），直接返回
		return
	}
	// 异步派发：阻塞等待 Agent 完成
	select {
	case <-doneCh:
		slog.Info("[p2p-watcher] agent done (sync wait)", "target_id", w.target.ID)
	case <-time.After(5 * time.Minute):
		slog.Warn("[p2p-watcher] agent timeout (5min)", "target_id", w.target.ID)
	case <-w.stopCh:
		slog.Info("[p2p-watcher] watcher stopped during processing", "target_id", w.target.ID)
	}
}

type larkMessage struct {
	MsgID      string `json:"message_id"`
	MsgType    string `json:"msg_type"`
	CreateTime string `json:"create_time"`
	Content    string `json:"content"`
	SenderID   string `json:"sender_id"`
}

// fetchMessagesLarkCLI 使用 lark-cli 拉取聊天消息（user identity，支持 P2P 单聊）
// 使用 --order desc（最新在前）+ 反转，确保拿到最近的消息而不是历史积压
func (pw *P2PWatcher) fetchMessagesLarkCLI(w *p2pTargetWatcher) []larkMessage {
	if pw.larkCLI == "" {
		return nil
	}

	args := []string{
		"im", "+chat-messages-list",
		"--chat-id", w.target.ChatID,
		"--page-size", "50",
		"--order", "desc",
		"--format", "json",
		"--no-reactions",
	}

	cmd := exec.Command(pw.larkCLI, args...)
	cmd.Env = append(os.Environ(), "NO_COLOR=1")
	out, err := cmd.Output()
	if err != nil {
		slog.Warn("[p2p-watcher] lark-cli exec error",
			"target_id", w.target.ID, "chat_id", w.target.ChatID, "err", err)
		return nil
	}

	var resp struct {
		OK   bool `json:"ok"`
		Data struct {
			Messages []cliMessage `json:"messages"`
		} `json:"data"`
	}
	if err := json.Unmarshal(out, &resp); err != nil {
		slog.Warn("[p2p-watcher] lark-cli parse error",
			"target_id", w.target.ID, "err", err, "output_len", len(out))
		return nil
	}
	if !resp.OK || len(resp.Data.Messages) == 0 {
		return nil
	}

	// desc 返回最新在前，反转为 asc（最早在前）以便 pollOnce 做增量判断
	raw := resp.Data.Messages
	for i, j := 0, len(raw)-1; i < j; i, j = i+1, j-1 {
		raw[i], raw[j] = raw[j], raw[i]
	}

	var msgs []larkMessage
	for _, m := range raw {
		msgs = append(msgs, larkMessage{
			MsgID:      m.MessageID,
			MsgType:    m.MsgType,
			CreateTime: m.CreateTime,
			Content:    m.Content,
			SenderID:   m.Sender.ID,
		})
	}

	slog.Debug("[p2p-watcher] fetched messages via lark-cli",
		"target_id", w.target.ID, "count", len(msgs))
	return msgs
}

type cliMessage struct {
	MessageID  string `json:"message_id"`
	MsgType    string `json:"msg_type"`
	CreateTime string `json:"create_time"`
	Content    string `json:"content"`
	Sender     struct {
		ID string `json:"id"`
	} `json:"sender"`
}

// processBatchMessagesV2 将同一轮的所有新消息合并为一条，统一交给 Agent 分析。
// 返回一个 doneCh（Agent 完成时关闭），nil 表示同步完成无需等待。
func (pw *P2PWatcher) processBatchMessagesV2(w *p2pTargetWatcher, msgs []larkMessage) <-chan struct{} {
	if len(msgs) == 0 {
		return nil
	}

	// 提取所有消息的文本
	var textParts []string
	for i, m := range msgs {
		text := extractTextFromContent(m.Content, m.MsgType)
		if text == "" {
			continue
		}
		if len(msgs) > 1 {
			textParts = append(textParts, fmt.Sprintf("--- 消息 %d ---\n%s", i+1, text))
		} else {
			textParts = append(textParts, text)
		}
	}
	if len(textParts) == 0 {
		return nil
	}

	mergedText := strings.Join(textParts, "\n\n")

	// 加载该 connector 关联的监听规则
	rules, err := db.ListEnabledMonitorRules(w.target.ConnectorID)
	if err != nil {
		slog.Warn("[p2p-watcher] load rules error", "err", err)
		return nil
	}

	// 没有规则，默认弹桌面通知
	if len(rules) == 0 {
		pw.sendDesktopNotify(w.target.ChatName, mergedText)
		pw.logMonitor(w, 0, "default", "desktop_notify", "", mergedText, nil)
		return nil
	}

	firstMsg := msgs[0]
	firstText := extractTextFromContent(firstMsg.Content, firstMsg.MsgType)

	for _, rule := range rules {
		if matchP2PRule(rule, firstText, firstMsg.SenderID, w.target.ChatID, firstMsg.MsgType) {
			slog.Info("[p2p-watcher] rule matched (batch)",
				"rule_id", rule.ID, "rule_name", rule.Name,
				"target_id", w.target.ID, "msg_count", len(msgs))
			doneCh := pw.executeP2PActionV2(rule, w, mergedText, len(msgs), firstMsg)
			pw.logMonitor(w, rule.ID, rule.Name, rule.ActionType, rule.ActionTarget, mergedText, nil)
			return doneCh
		}
	}

	// 没有规则匹配，默认弹桌面通知
	slog.Info("[p2p-watcher] no rule matched (batch), sending default desktop notify",
		"target_id", w.target.ID, "msg_count", len(msgs))
	pw.sendDesktopNotify(w.target.ChatName, mergedText)
	pw.logMonitor(w, 0, "default_fallback", "desktop_notify", "", mergedText, nil)
	return nil
}

// matchP2PRule 检查 P2P 消息是否命中规则
func matchP2PRule(rule db.FeishuMonitorRule, text, senderID, chatID, msgType string) bool {
	// 发送者过滤
	if rule.SenderIDs != "" && rule.SenderIDs != "[]" {
		var senderIDs []string
		if json.Unmarshal([]byte(rule.SenderIDs), &senderIDs) == nil && len(senderIDs) > 0 {
			found := false
			for _, id := range senderIDs {
				if id == senderID {
					found = true
					break
				}
			}
			if !found {
				return false
			}
		}
	}

	// 消息类型过滤
	if rule.MsgTypes != "" && rule.MsgTypes != "[]" {
		var msgTypes []string
		if json.Unmarshal([]byte(rule.MsgTypes), &msgTypes) == nil && len(msgTypes) > 0 {
			found := false
			for _, t := range msgTypes {
				if t == msgType {
					found = true
					break
				}
			}
			if !found {
				return false
			}
		}
	}

	// 关键词过滤
	if rule.Keywords != "" && rule.Keywords != "[]" {
		var keywords []string
		if json.Unmarshal([]byte(rule.Keywords), &keywords) == nil && len(keywords) > 0 {
			textLower := strings.ToLower(text)
			mode := rule.KeywordMode
			if mode == "" {
				mode = "any"
			}
			if mode == "any" {
				anyMatch := false
				for _, kw := range keywords {
					if strings.Contains(textLower, strings.ToLower(kw)) {
						anyMatch = true
						break
					}
				}
				if !anyMatch {
					return false
				}
			} else {
				for _, kw := range keywords {
					if !strings.Contains(textLower, strings.ToLower(kw)) {
						return false
					}
				}
			}
		}
	}

	return true
}

// feishuSendFunc 由 main.go 注入飞书消息发送能力
var feishuSendFunc func(connectorID int64, targetType, targetID, text string) error

// SetFeishuSendFunc 注入飞书发送回调（connector 包提供）
func SetFeishuSendFunc(fn func(connectorID int64, targetType, targetID, text string) error) {
	feishuSendFunc = fn
}

// executeP2PActionV2 执行规则动作。
// 返回一个 doneCh 供调用方阻塞等待 Agent 完成，nil 表示同步完成无需等待。
func (pw *P2PWatcher) executeP2PActionV2(rule db.FeishuMonitorRule, w *p2pTargetWatcher, text string, msgCount int, m larkMessage) <-chan struct{} {
	title := w.target.ChatName
	if title == "" {
		title = "P2P 消息"
	}

	switch rule.ActionType {
	case "desktop_notify":
		pw.sendDesktopNotify(title, text)
		return nil
	case "silent":
		return nil
	case "agent_teams":
		slog.Info("[p2p-watcher] launching agent_teams task",
			"rule_id", rule.ID, "rule_name", rule.Name, "chat_id", w.target.ChatID,
			"target_chat_id", rule.TargetChatID)
		if f, err := os.OpenFile("/tmp/lingxi-task-debug.log", os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644); err == nil {
			fmt.Fprintf(f, "[%s] p2p-watcher agent_teams: rule=%d target=%s connector=%d\n",
				time.Now().Format("15:04:05"), rule.ID, rule.TargetChatID, w.target.ConnectorID)
			f.Close()
		}
		ruleCopy := rule
		if err := connector.LaunchAgentTeamsFromP2P(&ruleCopy, w.target.ConnectorID, text, m.SenderID, w.target.ChatName, w.target.ChatID, m.MsgID); err != nil {
			slog.Error("[p2p-watcher] agent_teams launch failed", "err", err)
			pw.sendDesktopNotify(title, "Agent Teams 启动失败: "+err.Error())
		}
		return nil
	}

	doneCh := make(chan struct{}, 1)

	params := connector.P2PDispatchParams{
		ConnectorID:  w.target.ConnectorID,
		ActionType:   rule.ActionType,
		ActionTarget: rule.ActionTarget,
		CustomPrompt: rule.CustomPrompt,
		ReplyPrefix:  rule.ReplyPrefix,
		MessageText:  text,
		MsgCount:     msgCount,
		SenderID:     m.SenderID,
		ChatID:       w.target.ChatID,
		ChatName:     w.target.ChatName,
		OnDone: sync.OnceFunc(func() {
			select {
			case doneCh <- struct{}{}:
			default:
			}
		}),
	}

	slog.Info("[p2p-watcher] dispatching to agent",
		"target_id", w.target.ID, "action", rule.ActionType, "action_target", rule.ActionTarget)

	if err := connector.DispatchP2PMessage(params); err != nil {
		slog.Warn("[p2p-watcher] dispatch error, fallback to desktop notify", "err", err)
		pw.sendDesktopNotify(title, text)
		return nil
	}

	return doneCh
}

func (pw *P2PWatcher) sendDesktopNotify(title, body string) {
	if len([]rune(body)) > 200 {
		body = string([]rune(body)[:200]) + "..."
	}
	notif := map[string]string{
		"title": fmt.Sprintf("🔔 %s", title),
		"body":  body,
	}
	payload, _ := json.Marshal(notif)
	BroadcastWSEvent("desktop_notify", string(payload))
}

func (pw *P2PWatcher) logMonitor(w *p2pTargetWatcher, ruleID int64, ruleName, actionType, actionTarget, text string, execErr error) {
	logEntry := &db.FeishuMonitorLog{
		ConnectorID:  w.target.ConnectorID,
		RuleID:       ruleID,
		RuleName:     ruleName,
		ChatID:       w.target.ChatID,
		SenderID:     "",
		SenderName:   w.target.ChatName,
		MessageText:  text,
		ActionType:   actionType,
		ActionTarget: actionTarget,
		Result:       "success",
	}
	if execErr != nil {
		logEntry.Result = "error"
		logEntry.ErrorMsg = execErr.Error()
	}
	db.InsertMonitorLog(logEntry)
}

// TestP2PPoll 手动测试拉取一次消息（供 API 调用）
func TestP2PPoll(chatID string) ([]map[string]string, error) {
	if globalP2PWatcher == nil {
		return nil, fmt.Errorf("p2p watcher not initialized")
	}
	if globalP2PWatcher.larkCLI == "" {
		return nil, fmt.Errorf("lark-cli not found, cannot poll messages")
	}

	args := []string{
		"im", "+chat-messages-list",
		"--chat-id", chatID,
		"--page-size", "20",
		"--order", "desc",
		"--format", "json",
		"--no-reactions",
	}

	cmd := exec.Command(globalP2PWatcher.larkCLI, args...)
	cmd.Env = append(os.Environ(), "NO_COLOR=1")
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("lark-cli exec error: %w", err)
	}

	var resp struct {
		OK   bool `json:"ok"`
		Data struct {
			Messages []struct {
				MessageID  string `json:"message_id"`
				MsgType    string `json:"msg_type"`
				CreateTime string `json:"create_time"`
				Content    string `json:"content"`
			} `json:"messages"`
		} `json:"data"`
	}
	if err := json.Unmarshal(out, &resp); err != nil {
		return nil, fmt.Errorf("parse lark-cli output: %w", err)
	}
	if !resp.OK {
		return nil, fmt.Errorf("lark-cli returned ok=false")
	}

	var result []map[string]string
	for _, m := range resp.Data.Messages {
		text := m.Content
		if text == "" {
			continue
		}
		result = append(result, map[string]string{
			"msg_id":      m.MessageID,
			"msg_type":    m.MsgType,
			"create_time": m.CreateTime,
			"text":        text,
		})
	}
	return result, nil
}

// extractTextFromContent 从飞书消息 content JSON 中提取纯文本
func extractTextFromContent(content, msgType string) string {
	if content == "" {
		return ""
	}

	switch msgType {
	case "text":
		var textMsg struct {
			Text string `json:"text"`
		}
		if json.Unmarshal([]byte(content), &textMsg) == nil {
			return textMsg.Text
		}
	case "interactive":
		var card interface{}
		if json.Unmarshal([]byte(content), &card) == nil {
			return extractCardTexts(card)
		}
	case "post":
		var post struct {
			ZhCN struct {
				Title   string          `json:"title"`
				Content json.RawMessage `json:"content"`
			} `json:"zh_cn"`
		}
		if json.Unmarshal([]byte(content), &post) == nil {
			texts := []string{}
			if post.ZhCN.Title != "" {
				texts = append(texts, post.ZhCN.Title)
			}
			var paragraphs [][]map[string]interface{}
			if json.Unmarshal(post.ZhCN.Content, &paragraphs) == nil {
				for _, para := range paragraphs {
					for _, elem := range para {
						if t, ok := elem["text"].(string); ok && t != "" {
							texts = append(texts, t)
						}
					}
				}
			}
			return strings.Join(texts, "\n")
		}
	}

	return content
}

func extractCardTexts(v interface{}) string {
	var texts []string
	var walk func(interface{})
	walk = func(o interface{}) {
		switch val := o.(type) {
		case map[string]interface{}:
			for _, key := range []string{"content", "text", "name"} {
				if s, ok := val[key].(string); ok && s != "" {
					texts = append(texts, s)
				}
			}
			for _, child := range val {
				walk(child)
			}
		case []interface{}:
			for _, child := range val {
				walk(child)
			}
		}
	}
	walk(v)
	return strings.Join(texts, "\n")
}
