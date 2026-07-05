package db

// ─── P2P 机器人消息监听目标 ────────────────────────────────────────────

// P2PWatchTarget P2P 单聊监听目标
type P2PWatchTarget struct {
	ID              int64  `json:"id"`
	ConnectorID     int64  `json:"connector_id"`
	ChatID          string `json:"chat_id"`
	ChatName        string `json:"chat_name"`
	Enabled         bool   `json:"enabled"`
	PollIntervalSec int    `json:"poll_interval_sec"`
	LastSeenMsgID   string `json:"last_seen_msg_id"`
	CreatedAt       string `json:"created_at"`
	UpdatedAt       string `json:"updated_at"`
}

// CreateP2PWatchTarget 创建监听目标
func CreateP2PWatchTarget(t *P2PWatchTarget) (int64, error) {
	if t.PollIntervalSec <= 0 {
		t.PollIntervalSec = 20
	}
	res, err := DB.Exec(`
		INSERT INTO p2p_watch_targets (connector_id, chat_id, chat_name, enabled, poll_interval_sec)
		VALUES (?, ?, ?, ?, ?)`,
		t.ConnectorID, t.ChatID, t.ChatName, boolToInt(t.Enabled), t.PollIntervalSec,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// UpdateP2PWatchTarget 更新监听目标
func UpdateP2PWatchTarget(t *P2PWatchTarget) error {
	_, err := DB.Exec(`
		UPDATE p2p_watch_targets SET
			chat_name=?, enabled=?, poll_interval_sec=?, updated_at=CURRENT_TIMESTAMP
		WHERE id=?`,
		t.ChatName, boolToInt(t.Enabled), t.PollIntervalSec, t.ID,
	)
	return err
}

// DeleteP2PWatchTarget 删除监听目标
func DeleteP2PWatchTarget(id int64) error {
	_, err := DB.Exec(`DELETE FROM p2p_watch_targets WHERE id=?`, id)
	return err
}

// ToggleP2PWatchTarget 切换启用/禁用
func ToggleP2PWatchTarget(id int64) error {
	_, err := DB.Exec(`UPDATE p2p_watch_targets SET enabled = 1 - enabled, updated_at=CURRENT_TIMESTAMP WHERE id=?`, id)
	return err
}

// ListP2PWatchTargets 列出所有监听目标
func ListP2PWatchTargets(connectorID int64) ([]P2PWatchTarget, error) {
	query := `SELECT id, connector_id, chat_id, chat_name, enabled, poll_interval_sec, last_seen_msg_id, created_at, updated_at
		FROM p2p_watch_targets`
	var args []interface{}
	if connectorID > 0 {
		query += ` WHERE connector_id=?`
		args = append(args, connectorID)
	}
	query += ` ORDER BY id ASC`

	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []P2PWatchTarget
	for rows.Next() {
		var t P2PWatchTarget
		var enabled int
		if err := rows.Scan(&t.ID, &t.ConnectorID, &t.ChatID, &t.ChatName, &enabled, &t.PollIntervalSec, &t.LastSeenMsgID, &t.CreatedAt, &t.UpdatedAt); err != nil {
			continue
		}
		t.Enabled = enabled == 1
		result = append(result, t)
	}
	return result, nil
}

// ListEnabledP2PWatchTargets 列出所有启用的监听目标
func ListEnabledP2PWatchTargets() ([]P2PWatchTarget, error) {
	rows, err := DB.Query(`
		SELECT id, connector_id, chat_id, chat_name, enabled, poll_interval_sec, last_seen_msg_id, created_at, updated_at
		FROM p2p_watch_targets WHERE enabled=1 ORDER BY id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []P2PWatchTarget
	for rows.Next() {
		var t P2PWatchTarget
		var enabled int
		if err := rows.Scan(&t.ID, &t.ConnectorID, &t.ChatID, &t.ChatName, &enabled, &t.PollIntervalSec, &t.LastSeenMsgID, &t.CreatedAt, &t.UpdatedAt); err != nil {
			continue
		}
		t.Enabled = enabled == 1
		result = append(result, t)
	}
	return result, nil
}

// UpdateP2PWatchLastSeen 更新最后一次看到的消息 ID
func UpdateP2PWatchLastSeen(id int64, msgID string) error {
	_, err := DB.Exec(`UPDATE p2p_watch_targets SET last_seen_msg_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, msgID, id)
	return err
}

// GetP2PWatchTarget 获取单条记录
func GetP2PWatchTarget(id int64) (*P2PWatchTarget, error) {
	t := &P2PWatchTarget{}
	var enabled int
	err := DB.QueryRow(`
		SELECT id, connector_id, chat_id, chat_name, enabled, poll_interval_sec, last_seen_msg_id, created_at, updated_at
		FROM p2p_watch_targets WHERE id=?`, id).Scan(
		&t.ID, &t.ConnectorID, &t.ChatID, &t.ChatName, &enabled, &t.PollIntervalSec, &t.LastSeenMsgID, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	t.Enabled = enabled == 1
	return t, nil
}
