package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"lingxi-agent/db"
)

const (
	chunkSize    = 500
	chunkOverlap = 50
)

func splitIntoChunks(text string) []string {
	runes := []rune(strings.TrimSpace(text))
	if len(runes) == 0 {
		return nil
	}
	if len(runes) <= chunkSize {
		return []string{string(runes)}
	}
	var chunks []string
	for i := 0; i < len(runes); {
		end := i + chunkSize
		if end > len(runes) {
			end = len(runes)
		}
		chunks = append(chunks, string(runes[i:end]))
		i += chunkSize - chunkOverlap
		if i >= len(runes) {
			break
		}
	}
	return chunks
}

type embeddingRequest struct {
	Model string   `json:"model"`
	Input []string `json:"input"`
}

type embeddingResponse struct {
	Data []struct {
		Embedding []float32 `json:"embedding"`
		Index     int       `json:"index"`
	} `json:"data"`
}

func callEmbeddingAPI(texts []string) ([][]float32, error) {
	_, model, baseURL, token := activeRuntimeSnapshot()
	if token == "" || baseURL == "" {
		return nil, fmt.Errorf("no active API profile configured")
	}

	embModel := "text-embedding-3-small"
	if strings.Contains(strings.ToLower(model), "gemini") {
		embModel = "text-embedding-004"
	}

	url := strings.TrimRight(baseURL, "/") + "/v1/embeddings"

	reqBody := embeddingRequest{
		Model: embModel,
		Input: texts,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("embedding API returned %d: %s", resp.StatusCode, string(b))
	}

	var embResp embeddingResponse
	if err := json.NewDecoder(resp.Body).Decode(&embResp); err != nil {
		return nil, err
	}

	results := make([][]float32, len(texts))
	for _, d := range embResp.Data {
		if d.Index < len(results) {
			results[d.Index] = d.Embedding
		}
	}
	return results, nil
}

func EmbedKnowledgeItem(knowledgeID int64, content string) {
	db.DeleteChunksByKnowledgeID(knowledgeID)

	chunks := splitIntoChunks(content)
	if len(chunks) == 0 {
		return
	}

	const batchSize = 20
	for i := 0; i < len(chunks); i += batchSize {
		end := i + batchSize
		if end > len(chunks) {
			end = len(chunks)
		}
		batch := chunks[i:end]

		embeddings, err := callEmbeddingAPI(batch)
		if err != nil {
			slog.Warn("embedding API call failed, chunks stored without vectors", "knowledgeID", knowledgeID, "err", err)
			for j, chunk := range batch {
				db.CreateKBChunk(knowledgeID, i+j, chunk, nil)
			}
			continue
		}

		for j, chunk := range batch {
			var emb []float32
			if j < len(embeddings) {
				emb = embeddings[j]
			}
			db.CreateKBChunk(knowledgeID, i+j, chunk, emb)
		}
	}

	slog.Info("knowledge embedded", "knowledgeID", knowledgeID, "chunks", len(chunks))
}

func QueryEmbedding(text string) []float32 {
	embeddings, err := callEmbeddingAPI([]string{text})
	if err != nil {
		slog.Debug("query embedding failed", "err", err)
		return nil
	}
	if len(embeddings) > 0 {
		return embeddings[0]
	}
	return nil
}
