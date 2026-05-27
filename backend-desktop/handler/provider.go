package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"lingxi-agent/db"
	"lingxi-agent/router"
)

// ─── 激活档案运行时缓存 ──────────────────────────────────────────
//
// Electron 在启动时通过 POST /api/runtime/active-secret 把激活档案的明文 token
// 一次性下发到后端进程内存（不落盘），后端 spawn claude CLI 时优先使用该明文。
// 切换激活档案时，前端调用 /api/api-profiles/:id/activate，由 Electron 监听
// profile_changed WS 事件后再次下发新的明文。

type activeProfileRuntime struct {
	mu           sync.RWMutex
	id           int64
	name         string
	model        string
	baseURL      string
	token        string // 明文，仅内存
	protocol     string // anthropic | openai
	transformer  string // 仅 openai 协议下使用
	providerCode string // 供应商代码（用于 provider-specific 逻辑）
	providerMeta string // 供应商 meta JSON（含 context_windows / auth_strategy / default_env）
}

var activeRuntime activeProfileRuntime

// SetActiveSecret 由 Electron 通过 IPC HTTP 调用，下发当前激活档案明文
func SetActiveSecret(c *gin.Context) {
	var body struct {
		ID           int64  `json:"id"`
		Name         string `json:"name"`
		Model        string `json:"model"`
		BaseURL      string `json:"base_url"`
		Token        string `json:"token"`
		Protocol     string `json:"protocol"`
		Transformer  string `json:"transformer"`
		ProviderCode string `json:"provider_code"`
		ProviderMeta string `json:"provider_meta"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	// 如果 Electron 未传 provider_code/meta，从 DB 补全
	if body.ProviderCode == "" && body.ID > 0 {
		if ap, err := db.GetAPIProfile(body.ID, false); err == nil {
			body.ProviderCode = ap.ProviderCode
			if prov, err := db.GetProvider(ap.ProviderID); err == nil {
				body.ProviderMeta = prov.UsageAPIMeta
			}
		}
	}

	activeRuntime.mu.Lock()
	activeRuntime.id = body.ID
	activeRuntime.name = body.Name
	activeRuntime.model = body.Model
	activeRuntime.baseURL = body.BaseURL
	activeRuntime.token = body.Token
	activeRuntime.protocol = body.Protocol
	activeRuntime.transformer = body.Transformer
	activeRuntime.providerCode = body.ProviderCode
	activeRuntime.providerMeta = body.ProviderMeta
	activeRuntime.mu.Unlock()
	slog.Info("SetActiveSecret", "id", body.ID, "protocol", body.Protocol, "model", body.Model, "baseURL", body.BaseURL, "providerCode", body.ProviderCode, "tokenLen", len(body.Token))

	// OpenAI 协议时预启动 Go 代理，不等第一次对话
	if body.Protocol == "openai" && body.Token != "" && body.BaseURL != "" && body.Model != "" {
		go func() {
			url, err := router.EnsureRunning(router.Profile{
				ID:          body.ID,
				Name:        body.Name,
				BaseURL:     body.BaseURL,
				Model:       body.Model,
				Token:       body.Token,
				Transformer: body.Transformer,
			})
			if err != nil {
				slog.Warn("pre-start bridge failed", "err", err)
			} else {
				slog.Info("bridge pre-started", "url", url)
			}
		}()
	} else if body.Protocol != "openai" {
		router.Stop()
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// activeRuntimeSnapshot 在 chat.go buildClaudeEnv 中调用
func activeRuntimeSnapshot() (id int64, model, baseURL, token string) {
	activeRuntime.mu.RLock()
	defer activeRuntime.mu.RUnlock()
	return activeRuntime.id, activeRuntime.model, activeRuntime.baseURL, activeRuntime.token
}

// activeProfileSnapshot 返回完整的激活档案信息（含协议、供应商代码、供应商 meta）
func activeProfileSnapshot() (id int64, name, model, baseURL, token, protocol, transformer, providerCode, providerMeta string) {
	activeRuntime.mu.RLock()
	defer activeRuntime.mu.RUnlock()
	return activeRuntime.id, activeRuntime.name, activeRuntime.model, activeRuntime.baseURL,
		activeRuntime.token, activeRuntime.protocol, activeRuntime.transformer,
		activeRuntime.providerCode, activeRuntime.providerMeta
}

// clearActiveRuntimeIf 当内存中激活档案匹配指定 id 时清空（删除档案 / 切换激活时调用）
func clearActiveRuntimeIf(id int64) bool {
	activeRuntime.mu.Lock()
	defer activeRuntime.mu.Unlock()
	if activeRuntime.id != id {
		return false
	}
	activeRuntime.id = 0
	activeRuntime.name = ""
	activeRuntime.model = ""
	activeRuntime.baseURL = ""
	activeRuntime.token = ""
	activeRuntime.protocol = ""
	activeRuntime.transformer = ""
	activeRuntime.providerCode = ""
	activeRuntime.providerMeta = ""
	return true
}

// ─── HTTP 接口 ───────────────────────────────────────────────────

// ListProviders GET /api/providers
func ListProviders(c *gin.Context) {
	if cached, ok := apiCache.Get("providers"); ok {
		c.JSON(http.StatusOK, cached)
		return
	}
	list, err := db.ListProviders()
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	apiCache.Set("providers", list)
	c.JSON(http.StatusOK, list)
}

// ListAPIProfiles GET /api/api-profiles
func ListAPIProfiles(c *gin.Context) {
	includeCipher := c.Query("include_cipher") == "1"
	list, err := db.ListAPIProfiles(includeCipher)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	c.JSON(http.StatusOK, list)
}

// UpsertAPIProfile POST /api/api-profiles
// body: { id?, name, provider_id, base_url, model, auth_token_cipher, auth_token_mask, extra }
func UpsertAPIProfile(c *gin.Context) {
	var body struct {
		ID              int64  `json:"id"`
		Name            string `json:"name"`
		ProviderID      int64  `json:"provider_id"`
		BaseURL         string `json:"base_url"`
		Model           string `json:"model"`
		AuthTokenCipher string `json:"auth_token_cipher"`
		AuthTokenMask   string `json:"auth_token_mask"`
		Extra           string `json:"extra"`
		Transformer    string `json:"transformer"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Name == "" || body.ProviderID == 0 {
		c.Status(http.StatusBadRequest)
		return
	}
	if body.Extra == "" {
		body.Extra = "{}"
	}
	// 如果是更新且未提供新的 cipher，则保留旧值
	if body.ID > 0 && body.AuthTokenCipher == "" {
		old, err := db.GetAPIProfile(body.ID, true)
		if err == nil {
			body.AuthTokenCipher = old.AuthTokenCipher
			if body.AuthTokenMask == "" {
				body.AuthTokenMask = old.AuthTokenMask
			}
		}
	}
	ap := &db.APIProfile{
		ID:              body.ID,
		Name:            body.Name,
		ProviderID:      body.ProviderID,
		BaseURL:         body.BaseURL,
		Model:           body.Model,
		AuthTokenCipher: body.AuthTokenCipher,
		AuthTokenMask:   body.AuthTokenMask,
		Extra:           body.Extra,
		Transformer:     body.Transformer,
	}
	id, err := db.UpsertAPIProfile(ap)
	if err != nil {
		slog.Warn("upsert error", "err", err)
		c.Status(http.StatusInternalServerError)
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": id})
}

// DeleteAPIProfile DELETE /api/api-profiles/:id
func DeleteAPIProfile(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}
	if err := db.DeleteAPIProfile(id); err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	// 如果删的恰好是当前激活档案：清内存 + 关闭 bridge + 通知前端刷新
	if clearActiveRuntimeIf(id) {
		router.Stop()
		slog.Info("active profile  deleted, runtime cleared", "value", id)
		payload, _ := json.Marshal(map[string]interface{}{
			"id":      id,
			"deleted": true,
		})
		globalHub.BroadcastAll("profile_changed", string(payload))
	}
	c.Status(http.StatusOK)
}

// ActivateAPIProfile POST /api/api-profiles/:id/activate
func ActivateAPIProfile(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}
	if err := db.ActivateAPIProfile(id); err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	// 切换激活档案：先清掉旧档案在内存中残留的明文 token，
	// 并停掉旧 bridge；新 token 将由 Electron 在收到 profile_changed 事件后重新下发。
	curID, _, _, _, _, _, _, _, _ := activeProfileSnapshot()
	if curID != 0 && curID != id {
		clearActiveRuntimeIf(curID)
		router.Stop()
	}
	// 通知 Electron 重新下发明文
	ap, _ := db.GetAPIProfile(id, false)
	payload, _ := json.Marshal(map[string]interface{}{
		"id":                      id,
		"name":                    ap.Name,
		"model":                   ap.Model,
		"base_url":                ap.BaseURL,
		"provider_id":             ap.ProviderID,
		"protocol":                ap.ProviderProtocol,
		"transformer":             ap.Transformer,
		"requires_secret_refresh": true,
	})
	globalHub.BroadcastAll("profile_changed", string(payload))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// TestAPIProfile POST /api/api-profiles/:id/test
// body: { token? }  token 由前端解密后临时传入用于真实请求；不传则使用当前激活内存 token（仅当 id 是激活档案时）
// 返回两阶段结果：connectivity（直连上游验证）+ proxy（仅 OpenAI 协议时，验证 Bridge 管道）
func TestAPIProfile(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}
	var body struct {
		Token string `json:"token"`
	}
	_ = c.ShouldBindJSON(&body)

	ap, err := db.GetAPIProfile(id, false)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	token := body.Token
	if token == "" {
		actID, _, _, t := activeRuntimeSnapshot()
		if actID == id {
			token = t
		}
	}
	if token == "" {
		c.JSON(http.StatusOK, gin.H{"ok": false, "error": "缺少 token：请先保存档案或刷新激活档案"})
		return
	}

	baseURL := strings.TrimRight(ap.BaseURL, "/")
	if baseURL == "" {
		c.JSON(http.StatusOK, gin.H{"ok": false, "error": "base_url 为空"})
		return
	}

	isOpenAI := ap.ProviderProtocol == "openai"

	// ── 第一步：直连上游验证（connectivity）──────────────────────
	connResult := testConnectivity(baseURL, ap.Model, token, isOpenAI)

	// 非 OpenAI 协议：不需要第二步 Bridge 管道测试
	if !isOpenAI {
		c.JSON(http.StatusOK, gin.H{
			"ok":           connResult.Success,
			"connectivity": connResult,
			"status":       connResult.Status,
			"latency":      connResult.Latency,
			"error":        connResult.Error,
		})
		return
	}

	// ── 第二步：Bridge 管道验证（仅 OpenAI 协议）─────────────────
	var proxyResult *testStep
	if connResult.Success {
		pr := testBridgePipeline(id, ap, token)
		proxyResult = &pr
	}

	allOK := connResult.Success && (proxyResult == nil || proxyResult.Success)
	c.JSON(http.StatusOK, gin.H{
		"ok":           allOK,
		"connectivity": connResult,
		"proxy":        proxyResult,
		"status":       connResult.Status,
		"latency":      connResult.Latency,
		"error": func() string {
			if !connResult.Success {
				return connResult.Error
			}
			if proxyResult != nil && !proxyResult.Success {
				return proxyResult.Error
			}
			return ""
		}(),
	})
}

type testStep struct {
	Success bool   `json:"success"`
	Latency string `json:"latency"`
	Status  int    `json:"status,omitempty"`
	Error   string `json:"error,omitempty"`
	Model   string `json:"model_used,omitempty"`
}

func testConnectivity(baseURL, model, token string, isOpenAI bool) testStep {
	var reqURL string
	var reqBody []byte

	if isOpenAI {
		reqURL = baseURL
		if !strings.Contains(reqURL, "/chat/completions") {
			reqURL = strings.TrimRight(reqURL, "/") + "/v1/chat/completions"
		}
		reqBody, _ = json.Marshal(map[string]interface{}{
			"model":      model,
			"max_tokens": 16,
			"stream":     false,
			"messages":   []map[string]string{{"role": "user", "content": "ping"}},
		})
	} else {
		reqURL = baseURL + "/v1/messages"
		reqBody, _ = json.Marshal(map[string]interface{}{
			"model":      model,
			"max_tokens": 16,
			"messages":   []map[string]string{{"role": "user", "content": "ping"}},
		})
	}

	httpReq, err := http.NewRequest("POST", reqURL, bytes.NewReader(reqBody))
	if err != nil {
		return testStep{Error: err.Error()}
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if isOpenAI {
		httpReq.Header.Set("Authorization", "Bearer "+token)
	} else {
		httpReq.Header.Set("anthropic-version", "2023-06-01")
		httpReq.Header.Set("x-api-key", token)
		httpReq.Header.Set("Authorization", "Bearer "+token)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	startTs := time.Now()
	resp, err := client.Do(httpReq)
	if err != nil {
		return testStep{Error: err.Error()}
	}
	defer resp.Body.Close()
	bodyBytes, _ := io.ReadAll(resp.Body)
	latency := fmt.Sprintf("%dms", time.Since(startTs).Milliseconds())

	if resp.StatusCode >= 400 {
		return testStep{Status: resp.StatusCode, Latency: latency, Error: truncateStr(string(bodyBytes), 400)}
	}
	return testStep{Success: true, Status: resp.StatusCode, Latency: latency, Model: model}
}

func testBridgePipeline(profileID int64, ap *db.APIProfile, token string) testStep {
	bridgeURL, err := router.EnsureRunning(router.Profile{
		ID:          profileID,
		Name:        ap.Name,
		BaseURL:     ap.BaseURL,
		Model:       ap.Model,
		Token:       token,
		Transformer: ap.Transformer,
	})
	if err != nil {
		return testStep{Error: "代理启动失败: " + err.Error()}
	}

	// 通过代理的 Anthropic /v1/messages 端点发送测试请求
	reqBody, _ := json.Marshal(map[string]interface{}{
		"model":      ap.Model,
		"max_tokens": 16,
		"messages":   []map[string]string{{"role": "user", "content": "ping"}},
	})
	reqURL := bridgeURL + "/v1/messages"
	httpReq, err := http.NewRequest("POST", reqURL, bytes.NewReader(reqBody))
	if err != nil {
		return testStep{Error: err.Error()}
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("anthropic-version", "2023-06-01")
	httpReq.Header.Set("Authorization", "Bearer sk-lingxi-bridge")

	client := &http.Client{Timeout: 30 * time.Second}
	startTs := time.Now()
	resp, err := client.Do(httpReq)
	if err != nil {
		return testStep{Error: "代理管道请求失败: " + err.Error()}
	}
	defer resp.Body.Close()
	bodyBytes, _ := io.ReadAll(resp.Body)
	latency := fmt.Sprintf("%dms", time.Since(startTs).Milliseconds())

	if resp.StatusCode >= 400 {
		return testStep{Status: resp.StatusCode, Latency: latency, Error: "代理管道错误: " + truncateStr(string(bodyBytes), 400)}
	}
	return testStep{Success: true, Status: resp.StatusCode, Latency: latency, Model: ap.Model}
}

func truncateStr(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

// FetchModels POST /api/api-profiles/fetch-models
// body: { base_url, token, protocol }
// 根据供应商 API 获取该 key 可用的模型列表
func FetchModels(c *gin.Context) {
	var body struct {
		BaseURL  string `json:"base_url"`
		Token    string `json:"token"`
		Protocol string `json:"protocol"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token required"})
		return
	}

	baseURL := strings.TrimRight(body.BaseURL, "/")
	if baseURL == "" {
		c.JSON(http.StatusOK, gin.H{"ok": false, "models": []string{}, "error": "base_url 为空"})
		return
	}

	// 构造 /models 端点 URL
	var modelsURL string
	if body.Protocol == "openai" {
		// 去掉 /chat/completions 后缀再追加 /models
		clean := baseURL
		for _, suffix := range []string{"/chat/completions", "/chat/completion"} {
			if strings.HasSuffix(clean, suffix) {
				clean = strings.TrimRight(clean[:len(clean)-len(suffix)], "/")
				break
			}
		}
		if !strings.HasSuffix(clean, "/v1") && !strings.HasSuffix(clean, "/v2") && !strings.HasSuffix(clean, "/v3") && !strings.HasSuffix(clean, "/v4") {
			// 某些供应商可能 base_url 不带版本号（如 https://api.deepseek.com）
			clean = clean + "/v1"
		}
		modelsURL = clean + "/models"
	} else {
		modelsURL = baseURL + "/v1/models"
	}

	req, _ := http.NewRequest("GET", modelsURL, nil)
	req.Header.Set("Authorization", "Bearer "+body.Token)
	if body.Protocol == "anthropic" {
		req.Header.Set("x-api-key", body.Token)
		req.Header.Set("anthropic-version", "2023-06-01")
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"ok": false, "models": []string{}, "error": err.Error()})
		return
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 400 {
		c.JSON(http.StatusOK, gin.H{"ok": false, "models": []string{}, "error": truncateStr(string(respBody), 300)})
		return
	}

	// 解析 OpenAI 格式的 /models 返回
	var result struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		c.JSON(http.StatusOK, gin.H{"ok": false, "models": []string{}, "error": "解析模型列表失败"})
		return
	}

	models := make([]string, 0, len(result.Data))
	for _, m := range result.Data {
		if m.ID != "" {
			models = append(models, m.ID)
		}
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "models": models})
}
