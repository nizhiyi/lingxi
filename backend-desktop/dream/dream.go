package dream

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"lingxi-agent/db"
)

// LLMCaller 由 main 包注入，调用活跃 LLM 返回纯文本
type LLMCaller func(prompt string) string

// Broadcaster 由 main 包注入，向 WebSocket 广播事件
type Broadcaster func(event, data string)

// ContextBuilder 由 main 包注入，根据会话 ID 构建对话上下文文本
type ContextBuilder func(sessionID int64, beforeMsgID int64) string

// DreamConfig 记忆巩固配置
type DreamConfig struct {
	Enabled      bool          `json:"enabled"`
	Interval     time.Duration `json:"interval"`      // 巡检间隔（默认 8h）
	MinMemories  int           `json:"min_memories"`   // 至少多少条记忆才触发（默认 5）
	CooldownHrs  int           `json:"cooldown_hours"` // 冷却小时数（默认 48）
	QuietStart   int           `json:"quiet_start"`    // 安静时段开始 -1=禁用
	QuietEnd     int           `json:"quiet_end"`
	MaxSessions  int           `json:"max_sessions"`  // 每次巩固最多扫描多少个近期会话（默认 20）
}

// DreamResult 单次 Dream 的结果
type DreamResult struct {
	AgentID  int64        `json:"agent_id"`
	Added    int          `json:"added"`
	Updated  int          `json:"updated"`
	Removed  int          `json:"removed"`
	Actions  []dreamAction `json:"actions"`
	Duration time.Duration `json:"duration_ms"`
}

type dreamAction struct {
	Op       string `json:"op"`       // add / update / remove
	MemoryID int64  `json:"memory_id,omitempty"` // update/remove 时的原 ID
	Content  string `json:"content"`
	OldContent string `json:"old_content,omitempty"`
	Reason   string `json:"reason"`
	Category string `json:"category,omitempty"`
}

var (
	llmCall   LLMCaller
	broadcast Broadcaster
	ctxBuild  ContextBuilder
	cfg       = DreamConfig{
		Enabled:     true,
		Interval:    8 * time.Hour,
		MinMemories: 5,
		CooldownHrs: 48,
		QuietStart:  -1,
		QuietEnd:    -1,
		MaxSessions: 20,
	}
	stopCh   chan struct{}
	mu       sync.Mutex
	running  bool // 防止并发 Dream
	lastDreamAt map[int64]time.Time // agentID -> lastDreamTime
)

func init() {
	lastDreamAt = make(map[int64]time.Time)
}

// Init 注入依赖
func Init(caller LLMCaller, cb ContextBuilder, b Broadcaster) {
	llmCall = caller
	ctxBuild = cb
	broadcast = b
}

// SetConfig 更新配置
func SetConfig(c DreamConfig) {
	if c.Interval < 1*time.Hour {
		c.Interval = 1 * time.Hour
	}
	if c.MinMemories < 2 {
		c.MinMemories = 2
	}
	if c.CooldownHrs < 1 {
		c.CooldownHrs = 1
	}
	if c.MaxSessions < 5 {
		c.MaxSessions = 5
	}
	cfg = c
}

// GetConfig 返回当前配置
func GetConfig() DreamConfig {
	return cfg
}

// IsRunning 返回是否正在执行 Dream
func IsRunning() bool {
	mu.Lock()
	defer mu.Unlock()
	return running
}

// StartScanner 启动 Dream 定时巡检
func StartScanner() {
	stopCh = make(chan struct{})
	go func() {
		// 启动后等 2 分钟再首扫
		select {
		case <-time.After(2 * time.Minute):
		case <-stopCh:
			return
		}
		runScan()
		ticker := time.NewTicker(cfg.Interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if cfg.Enabled && !inQuietHours() {
					runScan()
				}
				ticker.Reset(cfg.Interval)
			case <-stopCh:
				slog.Info("dream scanner stopped")
				return
			}
		}
	}()
	slog.Info("dream scanner started", "interval", cfg.Interval.String())
}

// Stop 停止扫描器
func Stop() {
	if stopCh != nil {
		close(stopCh)
	}
}

// ManualDream 手动触发某个 Agent 的记忆巩固
func ManualDream(agentID int64) (*DreamResult, error) {
	if llmCall == nil {
		return nil, fmt.Errorf("LLM caller not initialized")
	}
	return runDreamForAgent(agentID)
}

func inQuietHours() bool {
	if cfg.QuietStart < 0 || cfg.QuietEnd < 0 {
		return false
	}
	h := time.Now().Hour()
	if cfg.QuietStart < cfg.QuietEnd {
		return h >= cfg.QuietStart && h < cfg.QuietEnd
	}
	return h >= cfg.QuietStart || h < cfg.QuietEnd
}

func runScan() {
	if llmCall == nil || ctxBuild == nil {
		return
	}
	mu.Lock()
	if running {
		mu.Unlock()
		return
	}
	running = true
	mu.Unlock()
	defer func() {
		mu.Lock()
		running = false
		mu.Unlock()
	}()

	emitEvent("dream_scan_start", map[string]interface{}{
		"message": "开始记忆巩固巡检...",
	})

	rows, err := db.DB.Query(`SELECT id FROM agents`)
	if err != nil {
		slog.Warn("dream scan: list agents failed", "err", err)
		return
	}
	var agentIDs []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err == nil {
			agentIDs = append(agentIDs, id)
		}
	}
	rows.Close()

	// 只处理启用了进化的 agent
	var enabled []int64
	for _, aid := range agentIDs {
		if db.GetAgentEvolutionEnabled(aid) {
			enabled = append(enabled, aid)
		}
	}

	cooldown := time.Duration(cfg.CooldownHrs) * time.Hour
	dispatched := 0

	for _, aid := range enabled {
		// 检查记忆数量门槛
		var memCount int
		db.DB.QueryRow(`SELECT COUNT(*) FROM memories WHERE agent_id=?`, aid).Scan(&memCount)
		if memCount < cfg.MinMemories {
			continue
		}

		// 检查冷却
		if last, ok := lastDreamAt[aid]; ok && time.Since(last) < cooldown {
			continue
		}
		var lastDreamDB string
		db.DB.QueryRow(`SELECT MAX(created_at) FROM evolution_logs WHERE agent_id=? AND trigger='dream'`, aid).Scan(&lastDreamDB)
		if lastDreamDB != "" {
			if t, err := time.Parse("2006-01-02 15:04:05", lastDreamDB); err == nil {
				if time.Since(t) < cooldown {
					lastDreamAt[aid] = t
					continue
				}
			}
		}

		result, err := runDreamForAgent(aid)
		if err != nil {
			slog.Warn("dream: agent dream failed", "agent_id", aid, "err", err)
			continue
		}
		dispatched++
		slog.Info("dream: agent dream completed", "agent_id", aid, "added", result.Added, "updated", result.Updated, "removed", result.Removed)

		if dispatched >= 3 {
			break
		}
	}

	emitEvent("dream_scan_done", map[string]interface{}{
		"message":    "记忆巩固巡检完成",
		"dispatched": dispatched,
	})
	slog.Info("dream scan done", "agents_checked", len(enabled), "dispatched", dispatched)
}

func runDreamForAgent(agentID int64) (*DreamResult, error) {
	start := time.Now()

	emitEvent("dream_progress", map[string]interface{}{
		"agent_id": agentID,
		"phase":    "collecting",
		"message":  "正在收集记忆和近期对话...",
	})

	// 1. 收集现有记忆
	mRows, err := db.DB.Query(
		`SELECT id, content, category, created_at FROM memories WHERE agent_id=? ORDER BY created_at DESC LIMIT 200`, agentID)
	if err != nil {
		return nil, fmt.Errorf("query memories: %w", err)
	}
	type memEntry struct {
		ID        int64  `json:"id"`
		Content   string `json:"content"`
		Category  string `json:"category"`
		CreatedAt string `json:"created_at"`
	}
	var memories []memEntry
	for mRows.Next() {
		var m memEntry
		if err := mRows.Scan(&m.ID, &m.Content, &m.Category, &m.CreatedAt); err == nil {
			memories = append(memories, m)
		}
	}
	mRows.Close()

	if len(memories) < cfg.MinMemories {
		return &DreamResult{AgentID: agentID}, nil
	}

	// 2. 收集近期会话摘要
	sRows, err := db.DB.Query(`
		SELECT id, title, message_count, updated_at FROM sessions
		WHERE agent_id=? AND COALESCE(is_a2a, 0)=0 AND message_count >= 3
		ORDER BY updated_at DESC LIMIT ?
	`, agentID, cfg.MaxSessions)
	if err != nil {
		return nil, fmt.Errorf("query sessions: %w", err)
	}
	type sessionSummary struct {
		Title    string `json:"title"`
		MsgCount int    `json:"msg_count"`
		Updated  string `json:"updated_at"`
		Context  string `json:"context,omitempty"`
	}
	var sessions []sessionSummary
	var sessionIDs []int64
	for sRows.Next() {
		var sid int64
		var s sessionSummary
		var mc int
		var updated string
		if sRows.Scan(&sid, &s.Title, &mc, &updated) == nil {
			s.MsgCount = mc
			s.Updated = updated
			sessions = append(sessions, s)
			sessionIDs = append(sessionIDs, sid)
		}
	}
	sRows.Close()

	// 提取最近 5 个会话的简要上下文
	for i := 0; i < len(sessionIDs) && i < 5; i++ {
		if ctxBuild != nil {
			ctx := ctxBuild(sessionIDs[i], 0)
			if len([]rune(ctx)) > 2000 {
				ctx = string([]rune(ctx)[:2000]) + "..."
			}
			sessions[i].Context = ctx
		}
	}

	emitEvent("dream_progress", map[string]interface{}{
		"agent_id":  agentID,
		"phase":     "analyzing",
		"message":   fmt.Sprintf("正在分析 %d 条记忆和 %d 个近期会话...", len(memories), len(sessions)),
		"memories":  len(memories),
		"sessions":  len(sessions),
	})

	// 3. 构建 Dream prompt
	memoriesJSON, _ := json.MarshalIndent(memories, "", "  ")
	sessionsJSON, _ := json.MarshalIndent(sessions, "", "  ")

	// 获取 Agent 信息
	var agentName, agentRole string
	db.DB.QueryRow(`SELECT name, role FROM agents WHERE id=?`, agentID).Scan(&agentName, &agentRole)

	prompt := buildDreamPrompt(agentName, agentRole, string(memoriesJSON), string(sessionsJSON))

	// 4. 调用 LLM
	emitEvent("dream_progress", map[string]interface{}{
		"agent_id": agentID,
		"phase":    "dreaming",
		"message":  "正在进行记忆巩固（Dream）...",
	})

	result := llmCall(prompt)
	if result == "" {
		db.InsertEvolutionLog(&db.EvolutionLog{
			AgentID: agentID,
			Trigger: "dream",
			Action:  "failed",
			Summary: "记忆巩固失败：LLM 无响应",
			Status:  "failed",
		})
		return nil, fmt.Errorf("LLM returned empty result")
	}

	// 5. 解析结果
	emitEvent("dream_progress", map[string]interface{}{
		"agent_id": agentID,
		"phase":    "applying",
		"message":  "正在应用记忆变更...",
	})

	actions := parseDreamActions(result)
	dr := &DreamResult{AgentID: agentID}

	// 6. 执行变更
	for _, a := range actions {
		switch a.Op {
		case "add":
			cat := a.Category
			if cat == "" {
				cat = "dream"
			}
			memID, err := db.InsertMemory(agentID, a.Content, cat)
			if err != nil {
				slog.Warn("dream: add memory failed", "err", err)
				continue
			}
			a.MemoryID = memID
			dr.Added++
			db.InsertEvolutionLog(&db.EvolutionLog{
				AgentID:    agentID,
				Trigger:    "dream",
				Action:     "create_memory",
				TargetType: "memory",
				TargetID:   memID,
				Summary:    truncStr(a.Content, 200),
				Detail:     mustJSON(a),
				RawLLMResponse: truncStr(result, 5000),
			})

		case "update":
			if a.MemoryID <= 0 {
				continue
			}
			var oldContent string
			db.DB.QueryRow(`SELECT content FROM memories WHERE id=? AND agent_id=?`, a.MemoryID, agentID).Scan(&oldContent)
			if oldContent == "" {
				continue
			}
			a.OldContent = oldContent
			cat := a.Category
			if cat == "" {
				cat = "dream"
			}
			_, err := db.DB.Exec(`UPDATE memories SET content=?, category=? WHERE id=? AND agent_id=?`,
				a.Content, cat, a.MemoryID, agentID)
			if err != nil {
				slog.Warn("dream: update memory failed", "id", a.MemoryID, "err", err)
				continue
			}
			dr.Updated++
			db.InsertEvolutionLog(&db.EvolutionLog{
				AgentID:    agentID,
				Trigger:    "dream",
				Action:     "update_memory",
				TargetType: "memory",
				TargetID:   a.MemoryID,
				Summary:    fmt.Sprintf("更新记忆 #%d: %s", a.MemoryID, truncStr(a.Content, 100)),
				Detail:     mustJSON(map[string]interface{}{"old": oldContent, "new": a.Content, "reason": a.Reason}),
				RawLLMResponse: truncStr(result, 5000),
			})

		case "remove":
			if a.MemoryID <= 0 {
				continue
			}
			var oldContent string
			db.DB.QueryRow(`SELECT content FROM memories WHERE id=? AND agent_id=?`, a.MemoryID, agentID).Scan(&oldContent)
			if oldContent == "" {
				continue
			}
			a.OldContent = oldContent
			_, err := db.DB.Exec(`DELETE FROM memories WHERE id=? AND agent_id=?`, a.MemoryID, agentID)
			if err != nil {
				slog.Warn("dream: remove memory failed", "id", a.MemoryID, "err", err)
				continue
			}
			dr.Removed++
			db.InsertEvolutionLog(&db.EvolutionLog{
				AgentID:    agentID,
				Trigger:    "dream",
				Action:     "delete_memory",
				TargetType: "memory",
				TargetID:   a.MemoryID,
				Summary:    fmt.Sprintf("删除记忆 #%d: %s", a.MemoryID, truncStr(oldContent, 100)),
				Detail:     mustJSON(map[string]interface{}{"deleted": oldContent, "reason": a.Reason}),
				RawLLMResponse: truncStr(result, 5000),
			})
		}
	}

	dr.Actions = actions
	dr.Duration = time.Since(start)

	// 记录时间
	lastDreamAt[agentID] = time.Now()

	emitEvent("dream_done", map[string]interface{}{
		"agent_id": agentID,
		"added":    dr.Added,
		"updated":  dr.Updated,
		"removed":  dr.Removed,
		"duration": dr.Duration.Milliseconds(),
		"message":  fmt.Sprintf("记忆巩固完成：新增 %d / 更新 %d / 清理 %d", dr.Added, dr.Updated, dr.Removed),
	})

	slog.Info("dream completed",
		"agent_id", agentID,
		"added", dr.Added,
		"updated", dr.Updated,
		"removed", dr.Removed,
		"duration", dr.Duration.String())

	return dr, nil
}

func buildDreamPrompt(agentName, agentRole, memoriesJSON, sessionsJSON string) string {
	return fmt.Sprintf(`你是一个记忆巩固专家（Memory Consolidation Agent）。你的任务是整理和优化一个 AI 助手的长期记忆库。

## 助手信息
- 名称: %s
- 角色: %s

## 当前记忆库（JSON 数组，每条记忆有 id、content、category、created_at）
%s

## 近期会话摘要（JSON 数组，包含会话标题、消息数、部分上下文）
%s

## 任务
请对记忆库进行巩固整理，具体包括：

### 1. 合并（Merge）
- 找出内容重复或高度相似的记忆条目
- 将它们合并为一条更精炼、更完整的记忆
- 输出: 保留一个 id 做 "update"，其余做 "remove"

### 2. 精炼（Refine）
- 找出表述模糊、过于冗长、或可以更精确的记忆
- 用更简洁准确的语言改写
- 输出: "update" 操作

### 3. 补充（Supplement）
- 根据近期会话，发现有价值但尚未被记忆的新知识、偏好、模式
- 补充为新记忆条目
- 输出: "add" 操作

### 4. 清理（Prune）
- 找出已经过时、矛盾、或不再相关的记忆
- 标记为删除
- 输出: "remove" 操作

## 输出格式
返回一个 JSON 数组，每个元素：
{
  "op": "add" | "update" | "remove",
  "memory_id": 123,       // update/remove 时必填，必须使用记忆库中存在的 id
  "content": "记忆内容",  // add/update 时必填
  "category": "分类",     // add 时可选，默认 "dream"
  "reason": "变更原因"    // 必填，简述为什么做这个变更
}

## 原则
- 保守优先：不确定的不要删除，宁可保留
- 合并时保留原始 ID 中较早创建的那个做 update
- 每次巩固的变更总数建议控制在 10 条以内
- 如果记忆库已经很整洁，返回空数组 []
- 仅输出 JSON，不要输出任何其他内容

`, agentName, agentRole, memoriesJSON, sessionsJSON)
}

func parseDreamActions(result string) []dreamAction {
	cleaned := stripFences(result)
	var actions []dreamAction
	if err := json.Unmarshal([]byte(cleaned), &actions); err == nil {
		return actions
	}
	// 尝试提取 JSON 数组
	idx := findChar(cleaned, '[')
	end := lastChar(cleaned, ']')
	if idx >= 0 && end > idx {
		if err := json.Unmarshal([]byte(cleaned[idx:end+1]), &actions); err == nil {
			return actions
		}
	}
	slog.Warn("dream: failed to parse LLM response", "len", len(result), "preview", truncStr(result, 200))
	return nil
}

func stripFences(s string) string {
	s = trimSpace(s)
	if len(s) < 3 || s[:3] != "```" {
		return s
	}
	if i := indexOf(s, '\n'); i > 0 {
		s = s[i+1:]
	}
	if len(s) >= 3 && s[len(s)-3:] == "```" {
		s = s[:len(s)-3]
	}
	return trimSpace(s)
}

func emitEvent(event string, payload map[string]interface{}) {
	if broadcast == nil {
		return
	}
	b, _ := json.Marshal(payload)
	broadcast(event, string(b))
}

func truncStr(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n]) + "..."
}

func mustJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func trimSpace(s string) string {
	i, j := 0, len(s)
	for i < j && (s[i] == ' ' || s[i] == '\t' || s[i] == '\n' || s[i] == '\r') {
		i++
	}
	for j > i && (s[j-1] == ' ' || s[j-1] == '\t' || s[j-1] == '\n' || s[j-1] == '\r') {
		j--
	}
	return s[i:j]
}

func indexOf(s string, ch byte) int {
	for i := 0; i < len(s); i++ {
		if s[i] == ch {
			return i
		}
	}
	return -1
}

func findChar(s string, ch byte) int {
	for i := 0; i < len(s); i++ {
		if s[i] == ch {
			return i
		}
	}
	return -1
}

func lastChar(s string, ch byte) int {
	for i := len(s) - 1; i >= 0; i-- {
		if s[i] == ch {
			return i
		}
	}
	return -1
}
