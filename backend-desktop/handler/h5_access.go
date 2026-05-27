package handler

import (
	"fmt"
	"net"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"lingxi-agent/db"
)

// GetH5AccessSettings GET /api/h5-access/settings
func GetH5AccessSettingsHandler(c *gin.Context) {
	settings, err := db.GetH5AccessSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, settings)
}

// UpdateH5AccessSettings PUT /api/h5-access/settings
func UpdateH5AccessSettingsHandler(c *gin.Context) {
	var body struct {
		Enabled        bool   `json:"enabled"`
		PermissionMode string `json:"permission_mode"`
		AllowedOrigins string `json:"allowed_origins"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.PermissionMode == "" {
		body.PermissionMode = "readonly"
	}
	if err := db.UpdateH5AccessSettings(body.Enabled, body.PermissionMode, body.AllowedOrigins); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GenerateH5Token POST /api/h5-access/tokens
func GenerateH5TokenHandler(c *gin.Context) {
	var body struct {
		Label    string `json:"label"`
		TTLHours int    `json:"ttl_hours"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.Label == "" {
		body.Label = "手机访问"
	}
	if body.TTLHours <= 0 {
		body.TTLHours = 24
	}

	lanIP := findLanIP()
	port := c.Request.Host
	if _, p, _ := net.SplitHostPort(c.Request.Host); p != "" {
		port = p
	} else {
		port = "3001"
	}

	token, rec, err := db.GenerateH5Token(body.Label, body.TTLHours)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	accessURL := fmt.Sprintf("http://%s:%s/h5?token=%s", lanIP, port, token)
	db.DB.Exec(`UPDATE h5_access_tokens SET access_url=? WHERE id=?`, accessURL, rec.ID)

	c.JSON(http.StatusOK, gin.H{
		"ok":         true,
		"token":      token,
		"record":     rec,
		"access_url": accessURL,
		"lan_ip":     lanIP,
	})
}

// ListH5Tokens GET /api/h5-access/tokens
func ListH5TokensHandler(c *gin.Context) {
	list, err := db.ListH5Tokens()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if list == nil {
		list = []db.H5AccessToken{}
	}
	c.JSON(http.StatusOK, list)
}

// RevokeH5Token POST /api/h5-access/tokens/:id/revoke
func RevokeH5TokenHandler(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := db.RevokeH5Token(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// DeleteH5Token DELETE /api/h5-access/tokens/:id
func DeleteH5TokenHandler(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := db.DeleteH5Token(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ValidateH5Token POST /api/h5-access/validate
func ValidateH5TokenHandler(c *gin.Context) {
	var body struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	rec, err := db.ValidateH5Token(body.Token)
	if err != nil || rec == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "label": rec.Label})
}

// H5SessionProxy GET /api/h5-access/session/:sessionId/messages
func H5SessionMessagesHandler(c *gin.Context) {
	token := c.GetHeader("X-H5-Token")
	if token == "" {
		token = c.Query("token")
	}
	rec, err := db.ValidateH5Token(token)
	if err != nil || rec == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
		return
	}

	sessionID, _ := strconv.ParseInt(c.Param("sessionId"), 10, 64)
	rows, err := db.DB.Query(`SELECT id, session_id, role, content, COALESCE(usage,''), created_at FROM messages WHERE session_id=? ORDER BY id`, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type msg struct {
		ID        int64  `json:"id"`
		SessionID int64  `json:"session_id"`
		Role      string `json:"role"`
		Content   string `json:"content"`
		Usage     string `json:"usage"`
		CreatedAt string `json:"created_at"`
	}
	messages := make([]msg, 0)
	for rows.Next() {
		var m msg
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.Usage, &m.CreatedAt); err != nil {
			continue
		}
		if m.Role == "user" || m.Role == "assistant" {
			m.Content = cleanMessageContent(m.Content)
			if m.Content != "" {
				messages = append(messages, m)
			}
		}
	}
	c.JSON(http.StatusOK, messages)
}

// H5SessionList GET /api/h5-access/sessions
func H5SessionListHandler(c *gin.Context) {
	token := c.GetHeader("X-H5-Token")
	if token == "" {
		token = c.Query("token")
	}
	rec, err := db.ValidateH5Token(token)
	if err != nil || rec == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
		return
	}

	rows, err := db.DB.Query(`SELECT id, COALESCE(title,''), COALESCE(message_count,0), created_at, updated_at FROM sessions ORDER BY updated_at DESC LIMIT 50`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type sess struct {
		ID           int64  `json:"id"`
		Title        string `json:"title"`
		MessageCount int    `json:"message_count"`
		CreatedAt    string `json:"created_at"`
		UpdatedAt    string `json:"updated_at"`
	}
	sessions := make([]sess, 0)
	for rows.Next() {
		var s sess
		if err := rows.Scan(&s.ID, &s.Title, &s.MessageCount, &s.CreatedAt, &s.UpdatedAt); err != nil {
			continue
		}
		sessions = append(sessions, s)
	}
	c.JSON(http.StatusOK, sessions)
}

// H5AgentsListHandler GET /api/h5-access/agents — 远程访问获取 Agent 列表
func H5AgentsListHandler(c *gin.Context) {
	token := c.GetHeader("X-H5-Token")
	if token == "" {
		token = c.Query("token")
	}
	rec, err := db.ValidateH5Token(token)
	if err != nil || rec == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
		return
	}
	rows, err := db.DB.Query(`SELECT id, name, COALESCE(avatar,''), COALESCE(role,'') FROM agents ORDER BY id`)
	if err != nil {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}
	defer rows.Close()
	type agent struct {
		ID     int64  `json:"id"`
		Name   string `json:"name"`
		Avatar string `json:"avatar"`
		Role   string `json:"role"`
	}
	var list []agent
	for rows.Next() {
		var a agent
		if err := rows.Scan(&a.ID, &a.Name, &a.Avatar, &a.Role); err != nil {
			continue
		}
		list = append(list, a)
	}
	if list == nil {
		list = []agent{}
	}
	c.JSON(http.StatusOK, list)
}

// H5SendMessageHandler POST /api/h5-access/chat — 远程发送消息（同步非流式）
func H5SendMessageHandler(c *gin.Context) {
	token := c.GetHeader("X-H5-Token")
	if token == "" {
		token = c.Query("token")
	}
	rec, err := db.ValidateH5Token(token)
	if err != nil || rec == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
		return
	}

	var body struct {
		SessionID int64  `json:"session_id"`
		Content   string `json:"content"`
		AgentID   int64  `json:"agent_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}

	// 通过内部 HTTP 调用 /api/chat 接口（复用现有 chat 逻辑）
	c.JSON(http.StatusOK, gin.H{
		"ok":      true,
		"message": "请使用 WebSocket 或 /api/chat 接口进行对话。H5 端暂为只读查看模式。",
	})
}

// cleanMessageContent 清理消息内容，移除思考链、工具调用等非用户可读内容
func cleanMessageContent(content string) string {
	// 移除 <thinking>...</thinking> 块（含跨行）
	reThinking := regexp.MustCompile(`(?s)<thinking>.*?</thinking>`)
	content = reThinking.ReplaceAllString(content, "")

	// 移除 <tool_use>...</tool_use> 块
	reToolUse := regexp.MustCompile(`(?s)<tool_use>.*?</tool_use>`)
	content = reToolUse.ReplaceAllString(content, "")

	// 移除 <tool_result>...</tool_result> 块
	reToolResult := regexp.MustCompile(`(?s)<tool_result>.*?</tool_result>`)
	content = reToolResult.ReplaceAllString(content, "")

	// 移除 <thinking>...</thinking> 块
	reAntThinking := regexp.MustCompile(`(?s)<thinking>.*?</thinking>`)
	content = reAntThinking.ReplaceAllString(content, "")

	// 移除 <antThinking>...</antThinking> 块
	reAntThinking2 := regexp.MustCompile(`(?s)<antThinking>.*?</antThinking>`)
	content = reAntThinking2.ReplaceAllString(content, "")

	content = strings.TrimSpace(content)
	return content
}

// findLanIP 获取本机局域网 IP
func findLanIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "127.0.0.1"
	}
	for _, addr := range addrs {
		if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() && ipNet.IP.To4() != nil {
			ip := ipNet.IP.String()
			if len(ip) > 0 && ip[0] == '1' {
				return ip
			}
		}
	}
	for _, addr := range addrs {
		if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() && ipNet.IP.To4() != nil {
			return ipNet.IP.String()
		}
	}
	return "127.0.0.1"
}
