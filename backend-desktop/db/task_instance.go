package db

import "database/sql"

// ─── 飞书 Agent Teams 任务实例 ─────────────────────────────────────

// FeishuTaskInstance 任务协调实例
type FeishuTaskInstance struct {
	ID                   int64  `json:"id"`
	RuleID               int64  `json:"rule_id"`
	ConnectorID          int64  `json:"connector_id"`
	SourceChatID         string `json:"source_chat_id"`
	TargetChatID         string `json:"target_chat_id"`
	TriggerMsgID         string `json:"trigger_msg_id"`
	TriggerContent       string `json:"trigger_content"`
	TriggerSenderID      string `json:"trigger_sender_id"`
	TriggerSenderName    string `json:"trigger_sender_name"`
	RootMessageID        string `json:"root_message_id"`
	ThreadID             string `json:"thread_id"`
	StreamingCardID      string `json:"streaming_card_id"`
	StreamingElementID   string `json:"streaming_element_id"`
	StreamingSequence    int    `json:"streaming_sequence"`
	ProgressMsgID        string `json:"progress_msg_id"`
	Status               string `json:"status"`
	DispatchTargets      string `json:"dispatch_targets"`
	DispatchHistory      string `json:"dispatch_history"`
	AccumulatedContext   string `json:"accumulated_context"`
	CurrentRound         int    `json:"current_round"`
	MaxRounds            int    `json:"max_rounds"`
	ReplyTimeoutMinutes  int    `json:"reply_timeout_minutes"`
	ReplyDebounceSeconds int    `json:"reply_debounce_seconds"`
	ErrorMsg             string `json:"error_msg"`
	CreatedAt            string `json:"created_at"`
	UpdatedAt            string `json:"updated_at"`
}

// CreateTaskInstance 创建任务实例
func CreateTaskInstance(inst *FeishuTaskInstance) (int64, error) {
	if inst.Status == "" {
		inst.Status = "CREATED"
	}
	if inst.DispatchHistory == "" {
		inst.DispatchHistory = `{"rounds":[]}`
	}
	if inst.StreamingElementID == "" {
		inst.StreamingElementID = "stream_md_01"
	}
	if inst.MaxRounds <= 0 {
		inst.MaxRounds = 10
	}
	if inst.ReplyTimeoutMinutes <= 0 {
		inst.ReplyTimeoutMinutes = 10
	}
	if inst.ReplyDebounceSeconds <= 0 {
		inst.ReplyDebounceSeconds = 30
	}
	res, err := DB.Exec(`
		INSERT INTO feishu_task_instances
		(rule_id, connector_id, source_chat_id, target_chat_id,
		 trigger_msg_id, trigger_content, trigger_sender_id, trigger_sender_name,
		 root_message_id, thread_id, streaming_card_id, streaming_element_id, streaming_sequence,
		 progress_msg_id, status, dispatch_targets, dispatch_history, accumulated_context,
		 current_round, max_rounds, reply_timeout_minutes, reply_debounce_seconds, error_msg)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		inst.RuleID, inst.ConnectorID, inst.SourceChatID, inst.TargetChatID,
		inst.TriggerMsgID, inst.TriggerContent, inst.TriggerSenderID, inst.TriggerSenderName,
		inst.RootMessageID, inst.ThreadID, inst.StreamingCardID, inst.StreamingElementID, inst.StreamingSequence,
		inst.ProgressMsgID, inst.Status, inst.DispatchTargets, inst.DispatchHistory, inst.AccumulatedContext,
		inst.CurrentRound, inst.MaxRounds, inst.ReplyTimeoutMinutes, inst.ReplyDebounceSeconds, inst.ErrorMsg,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// UpdateTaskInstance 更新任务实例
func UpdateTaskInstance(inst *FeishuTaskInstance) error {
	_, err := DB.Exec(`
		UPDATE feishu_task_instances SET
			root_message_id=?, thread_id=?, streaming_card_id=?, streaming_element_id=?,
			streaming_sequence=?, progress_msg_id=?, status=?, dispatch_targets=?,
			dispatch_history=?, accumulated_context=?, current_round=?,
			error_msg=?, updated_at=CURRENT_TIMESTAMP
		WHERE id=?`,
		inst.RootMessageID, inst.ThreadID, inst.StreamingCardID, inst.StreamingElementID,
		inst.StreamingSequence, inst.ProgressMsgID, inst.Status, inst.DispatchTargets,
		inst.DispatchHistory, inst.AccumulatedContext, inst.CurrentRound,
		inst.ErrorMsg, inst.ID,
	)
	return err
}

const taskInstanceCols = `id, rule_id, connector_id, source_chat_id, target_chat_id,
	trigger_msg_id, trigger_content, trigger_sender_id, trigger_sender_name,
	root_message_id, thread_id, streaming_card_id, streaming_element_id, streaming_sequence,
	progress_msg_id, status, dispatch_targets, dispatch_history, accumulated_context,
	current_round, max_rounds, reply_timeout_minutes, reply_debounce_seconds, error_msg,
	created_at, updated_at`

func scanTaskInstance(scanner interface {
	Scan(dest ...interface{}) error
}) (*FeishuTaskInstance, error) {
	inst := &FeishuTaskInstance{}
	err := scanner.Scan(
		&inst.ID, &inst.RuleID, &inst.ConnectorID, &inst.SourceChatID, &inst.TargetChatID,
		&inst.TriggerMsgID, &inst.TriggerContent, &inst.TriggerSenderID, &inst.TriggerSenderName,
		&inst.RootMessageID, &inst.ThreadID, &inst.StreamingCardID, &inst.StreamingElementID, &inst.StreamingSequence,
		&inst.ProgressMsgID, &inst.Status, &inst.DispatchTargets, &inst.DispatchHistory, &inst.AccumulatedContext,
		&inst.CurrentRound, &inst.MaxRounds, &inst.ReplyTimeoutMinutes, &inst.ReplyDebounceSeconds, &inst.ErrorMsg,
		&inst.CreatedAt, &inst.UpdatedAt,
	)
	return inst, err
}

// GetTaskInstance 按 ID 获取
func GetTaskInstance(id int64) (*FeishuTaskInstance, error) {
	return scanTaskInstance(DB.QueryRow(`SELECT `+taskInstanceCols+` FROM feishu_task_instances WHERE id=?`, id))
}

// GetTaskInstanceByRootMsgID 按主卡片消息 ID 查找（话题路由主 key）
func GetTaskInstanceByRootMsgID(rootMsgID string) (*FeishuTaskInstance, error) {
	return scanTaskInstance(DB.QueryRow(`SELECT `+taskInstanceCols+` FROM feishu_task_instances WHERE root_message_id=? AND status NOT IN ('DONE','ERROR')`, rootMsgID))
}

// GetTaskInstanceByThreadID 按 thread_id 查找（辅助查询）
func GetTaskInstanceByThreadID(threadID string) (*FeishuTaskInstance, error) {
	return scanTaskInstance(DB.QueryRow(`SELECT `+taskInstanceCols+` FROM feishu_task_instances WHERE thread_id=? AND status NOT IN ('DONE','ERROR')`, threadID))
}

// ListActiveTaskInstances 列出所有活跃（非终态）的任务实例
func ListActiveTaskInstances() ([]FeishuTaskInstance, error) {
	rows, err := DB.Query(`SELECT `+taskInstanceCols+` FROM feishu_task_instances WHERE status NOT IN ('DONE','ERROR') ORDER BY id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []FeishuTaskInstance
	for rows.Next() {
		inst, err := scanTaskInstance(rows)
		if err != nil {
			continue
		}
		result = append(result, *inst)
	}
	return result, nil
}

// ListTaskInstances 按连接器 ID 列出任务实例
func ListTaskInstances(connectorID int64, status string, limit int) ([]FeishuTaskInstance, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	var rows *sql.Rows
	var err error
	if status != "" {
		rows, err = DB.Query(`SELECT `+taskInstanceCols+` FROM feishu_task_instances WHERE connector_id=? AND status=? ORDER BY id DESC LIMIT ?`, connectorID, status, limit)
	} else {
		rows, err = DB.Query(`SELECT `+taskInstanceCols+` FROM feishu_task_instances WHERE connector_id=? ORDER BY id DESC LIMIT ?`, connectorID, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []FeishuTaskInstance
	for rows.Next() {
		inst, err := scanTaskInstance(rows)
		if err != nil {
			continue
		}
		result = append(result, *inst)
	}
	return result, nil
}
