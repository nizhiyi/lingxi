package db

import "time"

type EvolutionLog struct {
	ID             int64  `json:"id"`
	AgentID        int64  `json:"agent_id"`
	SessionID      int64  `json:"session_id"`
	Trigger        string `json:"trigger"`
	Action         string `json:"action"`
	TargetType     string `json:"target_type"`
	TargetID       int64  `json:"target_id"`
	Summary        string `json:"summary"`
	Detail         string `json:"detail"`
	Status         string `json:"status"`
	RawLLMResponse string `json:"raw_llm_response,omitempty"`
	StepsJSON      string `json:"steps_json,omitempty"`
	CreatedAt      string `json:"created_at"`
}

func InsertEvolutionLog(log *EvolutionLog) (int64, error) {
	status := log.Status
	if status == "" {
		status = "active"
	}
	res, err := DB.Exec(`INSERT INTO evolution_logs (agent_id, session_id, trigger, action, target_type, target_id, summary, detail, status, raw_llm_response, steps_json)
		VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		log.AgentID, log.SessionID, log.Trigger, log.Action, log.TargetType, log.TargetID, log.Summary, log.Detail, status, log.RawLLMResponse, log.StepsJSON)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func ListEvolutionLogs(agentID int64, limit int) ([]EvolutionLog, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := DB.Query(`SELECT id, agent_id, session_id, trigger, action, target_type, target_id, summary, detail, status, raw_llm_response, steps_json, created_at
		FROM evolution_logs WHERE agent_id=? ORDER BY created_at DESC LIMIT ?`, agentID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var logs []EvolutionLog
	for rows.Next() {
		var l EvolutionLog
		if err := rows.Scan(&l.ID, &l.AgentID, &l.SessionID, &l.Trigger, &l.Action, &l.TargetType, &l.TargetID, &l.Summary, &l.Detail, &l.Status, &l.RawLLMResponse, &l.StepsJSON, &l.CreatedAt); err != nil {
			continue
		}
		logs = append(logs, l)
	}
	return logs, nil
}

func GetAgentEvolutionEnabled(agentID int64) bool {
	var enabled int
	DB.QueryRow(`SELECT evolution_enabled FROM agents WHERE id=?`, agentID).Scan(&enabled)
	return enabled == 1
}

func SetAgentEvolutionEnabled(agentID int64, enabled bool) error {
	v := 0
	if enabled {
		v = 1
	}
	_, err := DB.Exec(`UPDATE agents SET evolution_enabled=?, updated_at=? WHERE id=?`, v, time.Now().Format("2006-01-02 15:04:05"), agentID)
	return err
}

func InsertMemory(agentID int64, content, category string) (int64, error) {
	res, err := DB.Exec(`INSERT INTO memories (agent_id, content, category) VALUES (?,?,?)`, agentID, content, category)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func DeleteEvolutionLog(id int64) error {
	_, err := DB.Exec(`DELETE FROM evolution_logs WHERE id=?`, id)
	return err
}

func UpdateEvolutionLogStatus(id int64, status string) error {
	_, err := DB.Exec(`UPDATE evolution_logs SET status=? WHERE id=?`, status, id)
	return err
}

func GetEvolutionLog(id int64) (*EvolutionLog, error) {
	var l EvolutionLog
	err := DB.QueryRow(`SELECT id, agent_id, session_id, trigger, action, target_type, target_id, summary, detail, status, raw_llm_response, steps_json, created_at
		FROM evolution_logs WHERE id=?`, id).Scan(
		&l.ID, &l.AgentID, &l.SessionID, &l.Trigger, &l.Action, &l.TargetType, &l.TargetID, &l.Summary, &l.Detail, &l.Status, &l.RawLLMResponse, &l.StepsJSON, &l.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func ClearEvolutionLogs(agentID int64) error {
	_, err := DB.Exec(`DELETE FROM evolution_logs WHERE agent_id=?`, agentID)
	return err
}

func ListAllEvolutionLogs(limit, offset int) ([]EvolutionLog, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := DB.Query(`SELECT id, agent_id, session_id, trigger, action, target_type, target_id, summary, detail, status, raw_llm_response, steps_json, created_at
		FROM evolution_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var logs []EvolutionLog
	for rows.Next() {
		var l EvolutionLog
		if err := rows.Scan(&l.ID, &l.AgentID, &l.SessionID, &l.Trigger, &l.Action, &l.TargetType, &l.TargetID, &l.Summary, &l.Detail, &l.Status, &l.RawLLMResponse, &l.StepsJSON, &l.CreatedAt); err != nil {
			continue
		}
		logs = append(logs, l)
	}
	return logs, nil
}

type EvolutionStats struct {
	Total      int            `json:"total"`
	ByAction   map[string]int `json:"by_action"`
	ByTrigger  map[string]int `json:"by_trigger"`
	RecentDays map[string]int `json:"recent_days"`
}

func GetEvolutionStats() (*EvolutionStats, error) {
	stats := &EvolutionStats{
		ByAction:   make(map[string]int),
		ByTrigger:  make(map[string]int),
		RecentDays: make(map[string]int),
	}

	DB.QueryRow(`SELECT COUNT(*) FROM evolution_logs`).Scan(&stats.Total)

	rows, err := DB.Query(`SELECT action, COUNT(*) FROM evolution_logs GROUP BY action`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var k string
			var c int
			rows.Scan(&k, &c)
			stats.ByAction[k] = c
		}
	}

	rows2, err := DB.Query(`SELECT trigger, COUNT(*) FROM evolution_logs GROUP BY trigger`)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var k string
			var c int
			rows2.Scan(&k, &c)
			stats.ByTrigger[k] = c
		}
	}

	rows3, err := DB.Query(`SELECT DATE(created_at) as d, COUNT(*) FROM evolution_logs WHERE created_at >= DATE('now', '-30 days') GROUP BY d ORDER BY d`)
	if err == nil {
		defer rows3.Close()
		for rows3.Next() {
			var k string
			var c int
			rows3.Scan(&k, &c)
			stats.RecentDays[k] = c
		}
	}

	return stats, nil
}
