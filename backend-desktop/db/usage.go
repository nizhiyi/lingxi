package db

import (
	"strconv"
	"time"
)

// ─── Usage ───────────────────────────────────────────────────────

type UsageRecord struct {
	ID               int64     `json:"id"`
	SessionID        int64     `json:"session_id"`
	MessageID        int64     `json:"message_id"`
	ProfileID        int64     `json:"profile_id"`
	Model            string    `json:"model"`
	InputTokens      int64     `json:"input_tokens"`
	OutputTokens     int64     `json:"output_tokens"`
	CacheReadTokens  int64     `json:"cache_read_tokens"`
	CacheWriteTokens int64     `json:"cache_write_tokens"`
	CostUSD          float64   `json:"cost_usd"`
	Estimated        bool      `json:"estimated"`
	DurationMs       int64     `json:"duration_ms"`
	CreatedAt        time.Time `json:"created_at"`
}

func InsertUsageRecord(r *UsageRecord) (int64, error) {
	est := 0
	if r.Estimated {
		est = 1
	}
	res, err := DB.Exec(`
		INSERT INTO usage_records
			(session_id, message_id, profile_id, model,
			 input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
			 cost_usd, estimated, duration_ms)
		VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		r.SessionID, r.MessageID, r.ProfileID, r.Model,
		r.InputTokens, r.OutputTokens, r.CacheReadTokens, r.CacheWriteTokens,
		r.CostUSD, est, r.DurationMs)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

type UsageSummary struct {
	InputTokens      int64   `json:"input_tokens"`
	OutputTokens     int64   `json:"output_tokens"`
	CacheReadTokens  int64   `json:"cache_read_tokens"`
	CacheWriteTokens int64   `json:"cache_write_tokens"`
	CostUSD          float64 `json:"cost_usd"`
	Requests         int64   `json:"requests"`
}

func SumUsageSince(since time.Time) (UsageSummary, error) {
	var s UsageSummary
	row := DB.QueryRow(`
		SELECT COALESCE(SUM(input_tokens),0), COALESCE(SUM(output_tokens),0),
		       COALESCE(SUM(cache_read_tokens),0), COALESCE(SUM(cache_write_tokens),0),
		       COALESCE(SUM(cost_usd),0), COUNT(1)
		FROM usage_records WHERE created_at >= ?`, since)
	err := row.Scan(&s.InputTokens, &s.OutputTokens, &s.CacheReadTokens, &s.CacheWriteTokens, &s.CostUSD, &s.Requests)
	return s, err
}

func GroupUsageByDay(days int) ([]map[string]interface{}, error) {
	rows, err := DB.Query(`
		SELECT date(created_at) AS d,
		       COALESCE(SUM(input_tokens),0), COALESCE(SUM(output_tokens),0),
		       COALESCE(SUM(cache_read_tokens),0), COALESCE(SUM(cache_write_tokens),0),
		       COALESCE(SUM(cost_usd),0), COUNT(1)
		FROM usage_records
		WHERE created_at >= datetime('now', ?)
		GROUP BY d ORDER BY d ASC`, "-"+strconv.Itoa(days)+" days")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]map[string]interface{}, 0)
	for rows.Next() {
		var d string
		var in, outT, cr, cw, n int64
		var cost float64
		if err := rows.Scan(&d, &in, &outT, &cr, &cw, &cost, &n); err != nil {
			continue
		}
		out = append(out, map[string]interface{}{
			"date": d, "input_tokens": in, "output_tokens": outT,
			"cache_read_tokens": cr, "cache_write_tokens": cw,
			"cost_usd": cost, "requests": n,
		})
	}
	return out, nil
}

func GroupUsageByModel(days int) ([]map[string]interface{}, error) {
	rows, err := DB.Query(`
		SELECT model,
		       COALESCE(SUM(input_tokens),0), COALESCE(SUM(output_tokens),0),
		       COALESCE(SUM(cost_usd),0), COUNT(1)
		FROM usage_records
		WHERE created_at >= datetime('now', ?)
		GROUP BY model ORDER BY 4 DESC`, "-"+strconv.Itoa(days)+" days")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]map[string]interface{}, 0)
	for rows.Next() {
		var model string
		var in, outT, n int64
		var cost float64
		if err := rows.Scan(&model, &in, &outT, &cost, &n); err != nil {
			continue
		}
		out = append(out, map[string]interface{}{
			"model": model, "input_tokens": in, "output_tokens": outT,
			"cost_usd": cost, "requests": n,
		})
	}
	return out, nil
}

func ListRecentUsage(limit int) ([]map[string]interface{}, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := DB.Query(`
		SELECT u.id, u.session_id, COALESCE(s.title,''), u.model, u.input_tokens, u.output_tokens,
		       u.cache_read_tokens, u.cache_write_tokens, u.cost_usd, u.estimated, u.duration_ms, u.created_at
		FROM usage_records u LEFT JOIN sessions s ON s.id=u.session_id
		ORDER BY u.id DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, sid, in, outT, cr, cw, est, dur int64
		var title, model string
		var cost float64
		var createdAt time.Time
		if err := rows.Scan(&id, &sid, &title, &model, &in, &outT, &cr, &cw, &cost, &est, &dur, &createdAt); err != nil {
			continue
		}
		rec := map[string]interface{}{
			"id": id, "session_id": sid, "session_title": title,
			"model": model, "input_tokens": in, "output_tokens": outT,
			"cache_read_tokens": cr, "cache_write_tokens": cw,
			"cost_usd": cost, "duration_ms": dur, "created_at": createdAt,
		}
		if est == 1 {
			rec["estimated"] = true
		}
		out = append(out, rec)
	}
	return out, nil
}

func SaveUsageQuotaSnapshot(profileID int64, snapshot string) {
	DB.Exec(`
		INSERT INTO usage_quota_cache (profile_id, snapshot)
		VALUES (?, ?)
		ON CONFLICT(profile_id) DO UPDATE SET
			snapshot=excluded.snapshot,
			fetched_at=CURRENT_TIMESTAMP`, profileID, snapshot)
}

func GetUsageQuotaCache(profileID int64) (string, time.Time, bool) {
	var snap string
	var t time.Time
	err := DB.QueryRow(`SELECT snapshot, fetched_at FROM usage_quota_cache WHERE profile_id=?`, profileID).Scan(&snap, &t)
	if err != nil {
		return "", time.Time{}, false
	}
	return snap, t, true
}
