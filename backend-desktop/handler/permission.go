package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"lingxi-agent/db"
)

// 危险命令关键字模式（不可逆操作）
var dangerousPatterns = []string{
	"rm -rf", "rm -r", "rmdir", "del /s", "format ",
	"DROP TABLE", "DROP DATABASE", "TRUNCATE ",
	"mkfs", "dd if=", "fdisk",
	"chmod 777", "chmod -R 777",
	"kill -9", "killall",
	"shutdown", "reboot", "halt",
	":(){ :|:& };:",
	"> /dev/", "sudo rm",
}

// 高风险工具名
var highRiskTools = map[string]bool{
	"Bash":           true,
	"Execute":        true,
	"RunCommand":     true,
	"WriteFile":      true,
	"DeleteFile":     true,
	"computer_use":   true,
	"screen_control": true,
}

// ClassifyRisk 根据工具名和输入内容判断风险等级
func ClassifyRisk(toolName, toolInput string) string {
	inputLower := strings.ToLower(toolInput)
	for _, pat := range dangerousPatterns {
		if strings.Contains(inputLower, strings.ToLower(pat)) {
			return "high"
		}
	}
	if highRiskTools[toolName] {
		return "medium"
	}
	return "low"
}

// ListPermissionRules GET /api/permission-rules
func ListPermissionRulesHandler(c *gin.Context) {
	agentID, _ := strconv.ParseInt(c.DefaultQuery("agent_id", "0"), 10, 64)
	rules, err := db.ListPermissionRules(agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if rules == nil {
		rules = []db.PermissionRule{}
	}
	c.JSON(http.StatusOK, rules)
}

// CreatePermissionRule POST /api/permission-rules
func CreatePermissionRuleHandler(c *gin.Context) {
	var body struct {
		AgentID  int64  `json:"agent_id"`
		ToolName string `json:"tool_name"`
		Pattern  string `json:"pattern"`
		Behavior string `json:"behavior"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.Behavior == "" {
		body.Behavior = "ask"
	}
	if body.Behavior != "allow" && body.Behavior != "deny" && body.Behavior != "ask" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "behavior must be allow/deny/ask"})
		return
	}
	id, err := db.UpsertPermissionRule(body.AgentID, body.ToolName, body.Pattern, body.Behavior, "user")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "id": id})
}

// DeletePermissionRule DELETE /api/permission-rules/:id
func DeletePermissionRuleHandler(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := db.DeletePermissionRule(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ListPendingApprovals GET /api/approvals/pending
func ListPendingApprovalsHandler(c *gin.Context) {
	list, err := db.ListPendingApprovals()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if list == nil {
		list = []db.ToolApproval{}
	}
	c.JSON(http.StatusOK, list)
}

// ListRecentApprovals GET /api/approvals
func ListRecentApprovalsHandler(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	list, err := db.ListRecentApprovals(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if list == nil {
		list = []db.ToolApproval{}
	}
	c.JSON(http.StatusOK, list)
}

// ReviewApproval POST /api/approvals/:id/review
func ReviewApprovalHandler(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var body struct {
		Action string `json:"action" binding:"required"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.Action != "approved" && body.Action != "rejected" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "action must be approved/rejected"})
		return
	}
	if err := db.ReviewApproval(id, body.Action, body.Reason); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	BroadcastEvent("approval_reviewed", gin.H{
		"id":     id,
		"action": body.Action,
	})
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
