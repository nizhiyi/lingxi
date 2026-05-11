package db

import "time"

// ─── Knowledge ───────────────────────────────────────────────────

func InsertKnowledge(title, filePath, category, tags, summary string, size int64) (int64, error) {
	res, err := DB.Exec(
		`INSERT INTO knowledge (title, file_path, category, tags, summary, size)
		 VALUES (?,?,?,?,?,?)`,
		title, filePath, category, tags, summary, size,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func ListKnowledge() ([]map[string]interface{}, error) {
	rows, err := DB.Query(
		`SELECT id, title, file_path, category, tags, summary, size, created_at
		 FROM knowledge ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, size int64
		var title, filePath, category, tags, summary string
		var createdAt time.Time
		if err := rows.Scan(&id, &title, &filePath, &category, &tags, &summary, &size, &createdAt); err != nil {
			continue
		}
		result = append(result, map[string]interface{}{
			"id":         id,
			"title":      title,
			"file_path":  filePath,
			"category":   category,
			"tags":       tags,
			"summary":    summary,
			"size":       size,
			"created_at": createdAt,
		})
	}
	return result, nil
}

func GetKnowledgeByID(id int64) (map[string]interface{}, error) {
	var kbID, size int64
	var title, filePath, category, tags, summary string
	var createdAt time.Time
	err := DB.QueryRow(
		`SELECT id, title, file_path, category, tags, summary, size, created_at
		 FROM knowledge WHERE id=?`, id,
	).Scan(&kbID, &title, &filePath, &category, &tags, &summary, &size, &createdAt)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"id":         kbID,
		"title":      title,
		"file_path":  filePath,
		"category":   category,
		"tags":       tags,
		"summary":    summary,
		"size":       size,
		"created_at": createdAt,
	}, nil
}

func DeleteKnowledge(id int64) (string, error) {
	var filePath string
	err := DB.QueryRow(`SELECT file_path FROM knowledge WHERE id=?`, id).Scan(&filePath)
	if err != nil {
		return "", err
	}
	DB.Exec(`DELETE FROM knowledge WHERE id=?`, id)
	return filePath, nil
}

func UpdateKnowledge(id int64, title, category, tags, summary string) error {
	_, err := DB.Exec(`UPDATE knowledge SET title=?, category=?, tags=?, summary=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		title, category, tags, summary, id)
	return err
}

// ─── Knowledge Categories ────────────────────────────────────────

type KnowledgeCategory struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Icon      string `json:"icon"`
	SortOrder int    `json:"sort_order"`
}

func ListKnowledgeCategories() ([]KnowledgeCategory, error) {
	rows, err := DB.Query(`SELECT id, name, icon, sort_order FROM knowledge_categories ORDER BY sort_order ASC, id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]KnowledgeCategory, 0)
	for rows.Next() {
		var c KnowledgeCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.Icon, &c.SortOrder); err != nil {
			continue
		}
		out = append(out, c)
	}
	return out, nil
}

func CreateKnowledgeCategory(name, icon string) (int64, error) {
	var maxOrder int
	DB.QueryRow(`SELECT COALESCE(MAX(sort_order),0) FROM knowledge_categories`).Scan(&maxOrder)
	res, err := DB.Exec(`INSERT INTO knowledge_categories (name, icon, sort_order) VALUES (?,?,?)`, name, icon, maxOrder+1)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func DeleteKnowledgeCategory(id int64) error {
	_, err := DB.Exec(`DELETE FROM knowledge_categories WHERE id=?`, id)
	return err
}

func UpdateKnowledgeCategory(id int64, name, icon string) error {
	_, err := DB.Exec(`UPDATE knowledge_categories SET name=?, icon=? WHERE id=?`, name, icon, id)
	return err
}

func UpdateKnowledgeItemCategory(id int64, category string) error {
	_, err := DB.Exec(`UPDATE knowledge SET category=? WHERE id=?`, category, id)
	return err
}
