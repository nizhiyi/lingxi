package db

import (
	"database/sql"
	"log/slog"
	"time"
)

// PermissionMode 权限审批模式
type PermissionMode string

const (
	PermissionModeDefault  PermissionMode = "default"  // 默认：危险操作需确认
	PermissionModeStrict   PermissionMode = "strict"   // 严格：所有工具调用需确认
	PermissionModeTrust    PermissionMode = "trust"     // 信任：自动放行，仅记录
	PermissionModeReadonly PermissionMode = "readonly"  // 只读：禁止所有写操作
)

// PermissionRule 权限规则
type PermissionRule struct {
	ID        int64  `json:"id"`
	AgentID   int64  `json:"agent_id"`
	ToolName  string `json:"tool_name"`
	Pattern   string `json:"pattern"`
	Behavior  string `json:"behavior"` // allow / deny / ask
	Source    string `json:"source"`   // user / system / session
	CreatedAt string `json:"created_at"`
}

// ToolApproval 工具调用审批记录
type ToolApproval struct {
	ID         int64  `json:"id"`
	SessionID  int64  `json:"session_id"`
	MessageID  int64  `json:"message_id"`
	AgentID    int64  `json:"agent_id"`
	ToolName   string `json:"tool_name"`
	ToolInput  string `json:"tool_input"`
	RiskLevel  string `json:"risk_level"` // low / medium / high
	Status     string `json:"status"`     // pending / approved / rejected / auto_approved
	Reason     string `json:"reason"`
	ReviewedAt string `json:"reviewed_at,omitempty"`
	CreatedAt  string `json:"created_at"`
}

// MigratePermission 创建权限相关表
func MigratePermission() {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS permission_rules (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			agent_id   INTEGER NOT NULL DEFAULT 0,
			tool_name  TEXT    NOT NULL DEFAULT '',
			pattern    TEXT    NOT NULL DEFAULT '',
			behavior   TEXT    NOT NULL DEFAULT 'ask',
			source     TEXT    NOT NULL DEFAULT 'user',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_perm_rules_agent ON permission_rules(agent_id)`,

		`CREATE TABLE IF NOT EXISTS tool_approvals (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id  INTEGER NOT NULL DEFAULT 0,
			message_id  INTEGER NOT NULL DEFAULT 0,
			agent_id    INTEGER NOT NULL DEFAULT 0,
			tool_name   TEXT    NOT NULL DEFAULT '',
			tool_input  TEXT    NOT NULL DEFAULT '{}',
			risk_level  TEXT    NOT NULL DEFAULT 'low',
			status      TEXT    NOT NULL DEFAULT 'pending',
			reason      TEXT    NOT NULL DEFAULT '',
			reviewed_at DATETIME,
			created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_approvals_session ON tool_approvals(session_id)`,
		`CREATE INDEX IF NOT EXISTS idx_approvals_status ON tool_approvals(status)`,
	}
	for _, s := range stmts {
		if _, err := DB.Exec(s); err != nil {
			slog.Warn("permission migrate error", "err", err)
		}
	}
}

// ListPermissionRules 列出权限规则（按 agent 过滤，0=全局）
func ListPermissionRules(agentID int64) ([]PermissionRule, error) {
	q := `SELECT id, agent_id, tool_name, pattern, behavior, source, created_at FROM permission_rules WHERE agent_id=? OR agent_id=0 ORDER BY id`
	rows, err := DB.Query(q, agentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []PermissionRule
	for rows.Next() {
		var r PermissionRule
		if err := rows.Scan(&r.ID, &r.AgentID, &r.ToolName, &r.Pattern, &r.Behavior, &r.Source, &r.CreatedAt); err != nil {
			continue
		}
		list = append(list, r)
	}
	return list, nil
}

// UpsertPermissionRule 新增或更新权限规则
func UpsertPermissionRule(agentID int64, toolName, pattern, behavior, source string) (int64, error) {
	res, err := DB.Exec(`INSERT INTO permission_rules (agent_id, tool_name, pattern, behavior, source) VALUES (?,?,?,?,?)`,
		agentID, toolName, pattern, behavior, source)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// DeletePermissionRule 删除权限规则
func DeletePermissionRule(id int64) error {
	_, err := DB.Exec(`DELETE FROM permission_rules WHERE id=?`, id)
	return err
}

// CreateToolApproval 创建待审批记录
func CreateToolApproval(sessionID, messageID, agentID int64, toolName, toolInput, riskLevel string) (int64, error) {
	res, err := DB.Exec(`INSERT INTO tool_approvals (session_id, message_id, agent_id, tool_name, tool_input, risk_level) VALUES (?,?,?,?,?,?)`,
		sessionID, messageID, agentID, toolName, toolInput, riskLevel)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// ListPendingApprovals 列出待审批项
func ListPendingApprovals() ([]ToolApproval, error) {
	return listApprovalsByStatus("pending")
}

// ListRecentApprovals 列出最近的审批记录
func ListRecentApprovals(limit int) ([]ToolApproval, error) {
	q := `SELECT id, session_id, message_id, agent_id, tool_name, tool_input, risk_level, status, reason, COALESCE(reviewed_at,''), created_at
		FROM tool_approvals ORDER BY id DESC LIMIT ?`
	rows, err := DB.Query(q, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []ToolApproval
	for rows.Next() {
		var a ToolApproval
		if err := rows.Scan(&a.ID, &a.SessionID, &a.MessageID, &a.AgentID, &a.ToolName, &a.ToolInput, &a.RiskLevel, &a.Status, &a.Reason, &a.ReviewedAt, &a.CreatedAt); err != nil {
			continue
		}
		list = append(list, a)
	}
	return list, nil
}

// ReviewApproval 审批（approve / reject）
func ReviewApproval(id int64, status, reason string) error {
	_, err := DB.Exec(`UPDATE tool_approvals SET status=?, reason=?, reviewed_at=? WHERE id=? AND status='pending'`,
		status, reason, time.Now().UTC().Format("2006-01-02 15:04:05"), id)
	return err
}

// GetToolApprovalByID 获取单条审批记录
func GetToolApprovalByID(id int64) (*ToolApproval, error) {
	var a ToolApproval
	var reviewedAt sql.NullString
	err := DB.QueryRow(`SELECT id, session_id, message_id, agent_id, tool_name, tool_input, risk_level, status, reason, reviewed_at, created_at FROM tool_approvals WHERE id=?`, id).
		Scan(&a.ID, &a.SessionID, &a.MessageID, &a.AgentID, &a.ToolName, &a.ToolInput, &a.RiskLevel, &a.Status, &a.Reason, &reviewedAt, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	if reviewedAt.Valid {
		a.ReviewedAt = reviewedAt.String
	}
	return &a, nil
}

func listApprovalsByStatus(status string) ([]ToolApproval, error) {
	q := `SELECT id, session_id, message_id, agent_id, tool_name, tool_input, risk_level, status, reason, COALESCE(reviewed_at,''), created_at
		FROM tool_approvals WHERE status=? ORDER BY id DESC`
	rows, err := DB.Query(q, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []ToolApproval
	for rows.Next() {
		var a ToolApproval
		if err := rows.Scan(&a.ID, &a.SessionID, &a.MessageID, &a.AgentID, &a.ToolName, &a.ToolInput, &a.RiskLevel, &a.Status, &a.Reason, &a.ReviewedAt, &a.CreatedAt); err != nil {
			continue
		}
		list = append(list, a)
	}
	return list, nil
}
