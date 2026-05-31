package handler

import (
	"net/http"
	"strconv"
	"time"

	"lingxi-agent/db"
	"lingxi-agent/dream"

	"github.com/gin-gonic/gin"
)

// GetDreamConfig GET /api/dream/config
func GetDreamConfig(c *gin.Context) {
	cfg := dream.GetConfig()
	c.JSON(http.StatusOK, gin.H{
		"enabled":        cfg.Enabled,
		"interval_hours": int(cfg.Interval / time.Hour),
		"min_memories":   cfg.MinMemories,
		"cooldown_hours": cfg.CooldownHrs,
		"quiet_start":    cfg.QuietStart,
		"quiet_end":      cfg.QuietEnd,
		"max_sessions":   cfg.MaxSessions,
		"running":        dream.IsRunning(),
	})
}

// UpdateDreamConfig PUT /api/dream/config
func UpdateDreamConfig(c *gin.Context) {
	var body struct {
		Enabled       *bool `json:"enabled"`
		IntervalHours *int  `json:"interval_hours"`
		MinMemories   *int  `json:"min_memories"`
		CooldownHours *int  `json:"cooldown_hours"`
		QuietStart    *int  `json:"quiet_start"`
		QuietEnd      *int  `json:"quiet_end"`
		MaxSessions   *int  `json:"max_sessions"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cfg := dream.GetConfig()
	if body.Enabled != nil {
		cfg.Enabled = *body.Enabled
	}
	if body.IntervalHours != nil && *body.IntervalHours > 0 {
		cfg.Interval = time.Duration(*body.IntervalHours) * time.Hour
	}
	if body.MinMemories != nil {
		cfg.MinMemories = *body.MinMemories
	}
	if body.CooldownHours != nil {
		cfg.CooldownHrs = *body.CooldownHours
	}
	if body.QuietStart != nil {
		cfg.QuietStart = *body.QuietStart
	}
	if body.QuietEnd != nil {
		cfg.QuietEnd = *body.QuietEnd
	}
	if body.MaxSessions != nil {
		cfg.MaxSessions = *body.MaxSessions
	}
	dream.SetConfig(cfg)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// TriggerDream POST /api/dream/trigger
func TriggerDream(c *gin.Context) {
	var body struct {
		AgentID int64 `json:"agent_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.AgentID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "agent_id is required"})
		return
	}
	if dream.IsRunning() {
		c.JSON(http.StatusConflict, gin.H{"error": "记忆巩固正在进行中，请稍后再试"})
		return
	}

	go func() {
		result, err := dream.ManualDream(body.AgentID)
		if err != nil {
			BroadcastEvent("dream_error", map[string]interface{}{
				"agent_id": body.AgentID,
				"error":    err.Error(),
			})
		} else if result != nil {
			BroadcastEvent("dream_done", map[string]interface{}{
				"agent_id": body.AgentID,
				"added":    result.Added,
				"updated":  result.Updated,
				"removed":  result.Removed,
			})
		}
	}()

	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "记忆巩固已开始..."})
}

// GetDreamStatus GET /api/dream/status
func GetDreamStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"running": dream.IsRunning(),
	})
}

// GetAgentDreamHistory GET /api/agents/:id/dream/history
func GetAgentDreamHistory(c *gin.Context) {
	agentID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit <= 0 {
		limit = 20
	}

	logs, err := listDreamLogs(agentID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

// CallActiveLLMExternal 导出 callActiveLLM 供 dream 包使用
func CallActiveLLMExternal(prompt string) string {
	return callActiveLLM(prompt)
}

func listDreamLogs(agentID int64, limit int) ([]map[string]interface{}, error) {
	rows, err := db.DB.Query(`
		SELECT id, agent_id, session_id, trigger, action, target_type, target_id, summary, detail, status, created_at
		FROM evolution_logs
		WHERE agent_id=? AND trigger='dream'
		ORDER BY created_at DESC
		LIMIT ?
	`, agentID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []map[string]interface{}
	for rows.Next() {
		var id, agentID2, sessionID, targetID int64
		var trigger, action, targetType, summary, detail, status, createdAt string
		if err := rows.Scan(&id, &agentID2, &sessionID, &trigger, &action, &targetType, &targetID, &summary, &detail, &status, &createdAt); err != nil {
			continue
		}
		logs = append(logs, map[string]interface{}{
			"id":          id,
			"agent_id":    agentID2,
			"session_id":  sessionID,
			"trigger":     trigger,
			"action":      action,
			"target_type": targetType,
			"target_id":   targetID,
			"summary":     summary,
			"detail":      detail,
			"status":      status,
			"created_at":  createdAt,
		})
	}
	if logs == nil {
		logs = []map[string]interface{}{}
	}
	return logs, nil
}
