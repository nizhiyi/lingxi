// Package router 负责把 OpenAI 协议的供应商通过内置 Go 代理
// 暴露成 Anthropic 协议本地端点，给底层 Claude CLI 使用。
//
// 新架构（v2）：
//   使用 backend-desktop/proxy 包实现的纯 Go HTTP 代理，
//   启动零延迟、无 Python 依赖、无外部子进程。
//
// 工作流程：
//   UI → 激活 protocol=openai 的 profile
//      → Go proxy.Server 在 127.0.0.1 随机端口启动
//      → 接收 Anthropic /v1/messages → 转换为 OpenAI /v1/chat/completions → 上游
//      → 流式转换 OpenAI SSE → Anthropic SSE 格式返回
//      → Claude CLI 正常使用
//
// 当激活的是 protocol=anthropic 时，proxy 会被 Stop()，恢复直连 Anthropic 上游。
package router

import (
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"lingxi-agent/proxy"
)

// Profile 描述一个待路由的 OpenAI 协议档案
type Profile struct {
	ID          int64
	Name        string
	BaseURL     string
	Model       string
	Token       string
	Transformer string // 保留字段
}

// Status 返回代理当前状态供前端展示
type Status struct {
	Running   bool   `json:"running"`
	Port      int    `json:"port,omitempty"`
	ProfileID int64  `json:"profile_id,omitempty"`
	StartedAt string `json:"started_at,omitempty"`
	LastErr   string `json:"last_err,omitempty"`
	Engine    string `json:"engine"`
}

// ── 单例 ────────────────────────────────────────────────────────

var (
	mgr       = &manager{}
	proxyServer = proxy.NewServer()
)

type manager struct {
	mu        sync.Mutex
	port      int
	profileID int64
	configSig string
	startedAt time.Time
	lastErr   string
}

// EnsureRunning 保证代理已为指定 profile 启动，返回本地 baseURL。
func EnsureRunning(p Profile) (string, error) {
	if p.Token == "" {
		return "", fmt.Errorf("代理需要 profile 明文 token")
	}
	if p.BaseURL == "" {
		return "", fmt.Errorf("OpenAI 档案的 base_url 不能为空")
	}
	if p.Model == "" {
		return "", fmt.Errorf("OpenAI 档案的 model 不能为空")
	}

	mgr.mu.Lock()
	defer mgr.mu.Unlock()

	sig := profileSignature(p)

	// 复用
	if proxyServer.Running() && mgr.configSig == sig {
		return fmt.Sprintf("http://127.0.0.1:%d", mgr.port), nil
	}

	baseURL := normalizeBaseURL(p.BaseURL)

	var providerType proxy.Provider
	baseLower := strings.ToLower(baseURL)
	switch {
	case strings.Contains(baseLower, "deepseek"):
		providerType = proxy.ProviderDeepSeek
	case strings.Contains(baseLower, "openrouter"):
		providerType = proxy.ProviderOpenRouter
	case strings.Contains(baseLower, "gemini") || strings.Contains(baseLower, "generativelanguage"):
		providerType = proxy.ProviderGemini
	case strings.Contains(baseLower, "ollama"):
		providerType = proxy.ProviderOllama
	default:
		providerType = proxy.ProviderGeneric
	}

	cfg := proxy.Config{
		UpstreamBaseURL: baseURL,
		Model:           p.Model,
		Token:           p.Token,
		Provider:        providerType,
	}

	port, err := proxyServer.Start(cfg)
	if err != nil {
		mgr.lastErr = err.Error()
		return "", fmt.Errorf("start go-proxy: %w", err)
	}

	mgr.port = port
	mgr.profileID = p.ID
	mgr.configSig = sig
	mgr.startedAt = time.Now()
	mgr.lastErr = ""

	slog.Info("go-proxy ready", "port", port, "profile_id", p.ID, "model", p.Model, "upstream", baseURL)
	return fmt.Sprintf("http://127.0.0.1:%d", port), nil
}

// Stop 关闭代理
func Stop() {
	mgr.mu.Lock()
	defer mgr.mu.Unlock()
	proxyServer.Stop()
	mgr.port = 0
	mgr.profileID = 0
	mgr.configSig = ""
	mgr.lastErr = ""
}

// GetStatus 返回当前代理状态
func GetStatus() Status {
	mgr.mu.Lock()
	defer mgr.mu.Unlock()
	s := Status{Engine: "go-proxy"}
	if proxyServer.Running() {
		s.Running = true
		s.Port = mgr.port
		s.ProfileID = mgr.profileID
		s.StartedAt = mgr.startedAt.Format(time.RFC3339)
	}
	s.LastErr = mgr.lastErr
	return s
}

// ── 内部 ────────────────────────────────────────────────────────

func profileSignature(p Profile) string {
	return fmt.Sprintf("%d\x00%s\x00%s\x00%s", p.ID, p.BaseURL, p.Model, p.Token)
}

func normalizeBaseURL(url string) string {
	url = strings.TrimSpace(url)
	url = strings.TrimRight(url, "/")
	for _, suffix := range []string{"/chat/completions", "/chat/completion"} {
		if strings.HasSuffix(url, suffix) {
			url = strings.TrimSuffix(url, suffix)
			url = strings.TrimRight(url, "/")
			break
		}
	}
	// Gemini OpenAI 兼容端点已包含完整路径，跳过 /v1 追加
	lower := strings.ToLower(url)
	if strings.Contains(lower, "generativelanguage.googleapis.com") {
		if !strings.HasSuffix(url, "/v1beta") && !strings.HasSuffix(url, "/v1") {
			url += "/v1beta"
		}
		return url
	}
	// 确保有 /v1 路径
	if !strings.HasSuffix(url, "/v1") && !strings.Contains(url, "/v1/") {
		url += "/v1"
	}
	return url
}
