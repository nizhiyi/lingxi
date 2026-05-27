// Package proxy 实现纯 Go 的 Anthropic ↔ OpenAI 协议转换代理，
// 替代外部 Python LiteLLM 进程，启动零延迟、无 Python 依赖。
package proxy

// ── Anthropic Messages API 类型 ─────────────────────────────────

type AnthropicRequest struct {
	Model         string             `json:"model"`
	Messages      []AnthropicMessage `json:"messages"`
	System        interface{}        `json:"system,omitempty"`
	MaxTokens     int                `json:"max_tokens,omitempty"`
	Temperature   *float64           `json:"temperature,omitempty"`
	TopP          *float64           `json:"top_p,omitempty"`
	TopK          *int               `json:"top_k,omitempty"`
	StopSequences []string           `json:"stop_sequences,omitempty"`
	Stream        bool               `json:"stream,omitempty"`
	Tools         []AnthropicTool    `json:"tools,omitempty"`
	ToolChoice    interface{}        `json:"tool_choice,omitempty"`
	Thinking      *ThinkingConfig    `json:"thinking,omitempty"`
	Metadata      interface{}        `json:"metadata,omitempty"`
}

type AnthropicMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"`
}

type AnthropicTool struct {
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	InputSchema interface{} `json:"input_schema,omitempty"`
}

type ThinkingConfig struct {
	Type         string `json:"type"`
	BudgetTokens int    `json:"budget_tokens,omitempty"`
}

// ── OpenAI Chat Completions API 类型 ────────────────────────────

type OpenAIRequest struct {
	Model            string          `json:"model"`
	Messages         []OpenAIMessage `json:"messages"`
	MaxTokens        *int            `json:"max_tokens,omitempty"`
	MaxCompletionTok *int            `json:"max_completion_tokens,omitempty"`
	Temperature      *float64        `json:"temperature,omitempty"`
	TopP             *float64        `json:"top_p,omitempty"`
	Stop             interface{}     `json:"stop,omitempty"`
	Stream           bool            `json:"stream"`
	StreamOptions    *StreamOptions  `json:"stream_options,omitempty"`
	Tools            []OpenAITool    `json:"tools,omitempty"`
	ToolChoice       interface{}     `json:"tool_choice,omitempty"`
	ReasoningEffort  string          `json:"reasoning_effort,omitempty"`
	Thinking         *ThinkingToggle `json:"thinking,omitempty"`
	IncludeReasoning *bool           `json:"include_reasoning,omitempty"`
}

type StreamOptions struct {
	IncludeUsage bool `json:"include_usage"`
}

type ThinkingToggle struct {
	Type string `json:"type"`
}

type OpenAIMessage struct {
	Role             string      `json:"role"`
	Content          interface{} `json:"content"`
	Name             string      `json:"name,omitempty"`
	ToolCalls        interface{} `json:"tool_calls,omitempty"`
	ToolCallID       string      `json:"tool_call_id,omitempty"`
	ReasoningContent string      `json:"reasoning_content,omitempty"`
}

type OpenAITool struct {
	Type     string         `json:"type"`
	Function OpenAIFunction `json:"function"`
}

type OpenAIFunction struct {
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	Parameters  interface{} `json:"parameters,omitempty"`
}

// ── Anthropic SSE 响应事件 ──────────────────────────────────────

type AnthropicSSEEvent struct {
	Type string      `json:"type"`
	Data interface{} `json:"-"`
}

type MessageStartBody struct {
	Type  string               `json:"type"`
	Model string               `json:"model"`
	ID    string               `json:"id"`
	Role  string               `json:"role"`
	Usage *AnthropicUsageStart `json:"usage,omitempty"`
}

type AnthropicUsageStart struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type ContentBlockStart struct {
	Type  string      `json:"type"`
	Index int         `json:"index"`
	Block interface{} `json:"content_block"`
}

type ContentBlockDelta struct {
	Type  string      `json:"type"`
	Index int         `json:"index"`
	Delta interface{} `json:"delta"`
}

type TextDelta struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type ThinkingDelta struct {
	Type     string `json:"type"`
	Thinking string `json:"thinking"`
}

type ToolInputDelta struct {
	Type         string `json:"type"`
	PartialJSON  string `json:"partial_json"`
}

type MessageDelta struct {
	Type  string                `json:"type"`
	Delta map[string]interface{} `json:"delta"`
	Usage *AnthropicUsageDelta  `json:"usage,omitempty"`
}

type AnthropicUsageDelta struct {
	OutputTokens int `json:"output_tokens"`
}
