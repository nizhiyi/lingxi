package db

import (
	"database/sql"
	"encoding/json"
	"log/slog"
	"math"
)

type KBChunk struct {
	ID          int64
	KnowledgeID int64
	ChunkIndex  int
	Content     string
	Embedding   []float32
}

func CreateKBChunk(knowledgeID int64, chunkIndex int, content string, embedding []float32) (int64, error) {
	embJSON, _ := json.Marshal(embedding)
	r, err := DB.Exec(
		`INSERT INTO kb_chunks (knowledge_id, chunk_index, content, embedding) VALUES (?, ?, ?, ?)`,
		knowledgeID, chunkIndex, content, string(embJSON),
	)
	if err != nil {
		return 0, err
	}
	return r.LastInsertId()
}

func DeleteChunksByKnowledgeID(knowledgeID int64) error {
	_, err := DB.Exec(`DELETE FROM kb_chunks WHERE knowledge_id = ?`, knowledgeID)
	return err
}

func HasChunksForKnowledge(knowledgeID int64) bool {
	var count int
	err := DB.QueryRow(`SELECT COUNT(*) FROM kb_chunks WHERE knowledge_id = ?`, knowledgeID).Scan(&count)
	return err == nil && count > 0
}

type ScoredChunk struct {
	KnowledgeID int64
	ChunkIndex  int
	Content     string
	Score       float64
}

func SearchChunksByVector(queryEmbedding []float32, knowledgeIDs []int64, topK int) ([]ScoredChunk, error) {
	var rows *sql.Rows
	var err error

	if len(knowledgeIDs) > 0 {
		placeholders := ""
		args := make([]interface{}, len(knowledgeIDs))
		for i, id := range knowledgeIDs {
			if i > 0 {
				placeholders += ","
			}
			placeholders += "?"
			args[i] = id
		}
		rows, err = DB.Query(
			`SELECT knowledge_id, chunk_index, content, embedding FROM kb_chunks WHERE knowledge_id IN (`+placeholders+`)`,
			args...,
		)
	} else {
		rows, err = DB.Query(`SELECT knowledge_id, chunk_index, content, embedding FROM kb_chunks`)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []ScoredChunk
	for rows.Next() {
		var kid int64
		var idx int
		var content, embStr string
		if err := rows.Scan(&kid, &idx, &content, &embStr); err != nil {
			continue
		}
		var emb []float32
		if json.Unmarshal([]byte(embStr), &emb) != nil {
			continue
		}
		score := cosineSimilarity(queryEmbedding, emb)
		results = append(results, ScoredChunk{
			KnowledgeID: kid,
			ChunkIndex:  idx,
			Content:     content,
			Score:       score,
		})
	}

	// Sort by score descending (simple bubble sort for small result sets)
	for i := 0; i < len(results)-1; i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].Score > results[i].Score {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	if len(results) > topK {
		results = results[:topK]
	}
	return results, nil
}

func CountChunks() int {
	var count int
	err := DB.QueryRow(`SELECT COUNT(*) FROM kb_chunks`).Scan(&count)
	if err != nil {
		slog.Warn("count chunks error", "err", err)
		return 0
	}
	return count
}

func cosineSimilarity(a, b []float32) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0
	}
	var dot, normA, normB float64
	for i := range a {
		dot += float64(a[i]) * float64(b[i])
		normA += float64(a[i]) * float64(a[i])
		normB += float64(b[i]) * float64(b[i])
	}
	denom := math.Sqrt(normA) * math.Sqrt(normB)
	if denom == 0 {
		return 0
	}
	return dot / denom
}
