package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"lingxi-agent/connector"
	"lingxi-agent/crypto"
	"lingxi-agent/db"
)

// TestFeishuCard POST /api/feishu/test-card
// body: { "chat_id": "oc_xxx" }
func TestFeishuCard(c *gin.Context) {
	var req struct {
		ChatID string `json:"chat_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.ChatID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "chat_id is required"})
		return
	}

	connectors, err := db.ListIMConnectors()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var appID, appSecret string
	for _, conn := range connectors {
		if conn.Platform == "feishu" {
			cfgJSON := conn.Config
			decrypted, err := crypto.Decrypt(cfgJSON)
			if err == nil && decrypted != "" {
				cfgJSON = decrypted
			}
			var cfg struct {
				AppID     string `json:"app_id"`
				AppSecret string `json:"app_secret"`
			}
			if json.Unmarshal([]byte(cfgJSON), &cfg) == nil {
				appID = cfg.AppID
				appSecret = cfg.AppSecret
			}
			break
		}
	}
	if appID == "" || appSecret == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "飞书连接器未配置或未找到"})
		return
	}

	token, err := connector.GetTenantToken(appID, appSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 token 失败: " + err.Error()})
		return
	}

	testContent := "## 灵犀 AI 卡片测试\n\n这是一条来自 **灵犀 AI Agent** 的精美卡片消息。\n\n### 功能亮点\n\n- 流式思考过程折叠展示\n- Markdown 富文本排版\n- 代码块语法高亮\n- 精美的 indigo 主题色\n\n### 示例代码\n\n```python\ndef hello():\n    print(\"Hello from 灵犀!\")\n```\n\n> 这条消息用于验证飞书卡片排版效果。"

	var elements []map[string]interface{}

	// 思考过程折叠面板
	elements = append(elements, map[string]interface{}{
		"tag":        "collapsible_panel",
		"element_id": "thinking_panel",
		"expanded":   false,
		"header": map[string]interface{}{
			"title": map[string]interface{}{
				"tag":     "plain_text",
				"content": "💭 思考过程",
			},
			"vertical_align": "center",
			"icon": map[string]interface{}{
				"tag":   "standard_icon",
				"token": "down-small-ccm_outlined",
				"size":  "16px 16px",
			},
			"icon_position":       "follow_text",
			"icon_expanded_angle": -180,
		},
		"border": map[string]interface{}{
			"color":         "grey",
			"corner_radius": "5px",
		},
		"vertical_spacing": "4px",
		"padding":          "8px",
		"elements": []map[string]interface{}{
			{
				"tag":     "markdown",
				"content": "用户想要测试飞书卡片的排版效果。我需要生成一条包含多种 Markdown 元素的测试消息，包括标题、列表、代码块、引用等。这样可以验证卡片在飞书客户端中的渲染效果。",
			},
		},
	})

	// 主内容
	elements = append(elements, map[string]interface{}{
		"tag":        "markdown",
		"element_id": "streaming_md",
		"content":    testContent,
	})

	card := connector.BuildPrettyCard("AI 卡片排版测试", elements, false)
	cardJSON, _ := json.Marshal(card)

	err = connector.SendCardToChat(token, req.ChatID, string(cardJSON))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "测试卡片已发送"})
}
