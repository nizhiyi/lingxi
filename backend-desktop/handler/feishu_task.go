package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"lingxi-agent/db"

	"github.com/gin-gonic/gin"
)

// ListFeishuTasks GET /api/feishu-tasks?connector_id=X&status=MONITORING
func ListFeishuTasks(c *gin.Context) {
	connID, _ := strconv.ParseInt(c.Query("connector_id"), 10, 64)
	status := c.Query("status")
	limit, _ := strconv.Atoi(c.Query("limit"))
	if limit <= 0 {
		limit = 50
	}

	instances, err := db.ListTaskInstances(connID, status, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, instances)
}

// GetFeishuTask GET /api/feishu-tasks/:id
func GetFeishuTask(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	inst, err := db.GetTaskInstance(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, inst)
}

// CloseFeishuTask POST /api/feishu-tasks/:id/close
func CloseFeishuTask(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	inst, err := db.GetTaskInstance(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	// 通过 coordinator 的 CloseByAPI 优雅关闭
	if inst.RootMessageID != "" {
		if tc := lookupCoordinatorByRootMsg(inst.RootMessageID); tc != nil {
			tc.CloseByAPI("用户手动关闭")
			c.JSON(http.StatusOK, gin.H{"ok": true, "message": "task closed"})
			return
		}
	}

	// 无活跃 coordinator，直接更新 DB 状态
	inst.Status = "DONE"
	inst.ErrorMsg = "用户手动关闭（无活跃协调器）"
	_ = db.UpdateTaskInstance(inst)
	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "task closed (no active coordinator)"})
}

// lookupCoordinatorByRootMsg 调用 connector 包的查找函数
var lookupCoordinatorByRootMsg func(rootMsgID string) interface{ CloseByAPI(reason string) }

// SetCoordinatorLookup 由 main.go 注入
func SetCoordinatorLookup(fn func(rootMsgID string) interface{ CloseByAPI(reason string) }) {
	lookupCoordinatorByRootMsg = fn
}

// ListChatMembers GET /api/feishu-tasks/chat-members?connector_id=X&chat_id=Y
// 使用 HTTP 直接调用飞书 API（SDK 的 ListMember 结构体缺少 member_type 字段）
func ListChatMembers(c *gin.Context) {
	connID, _ := strconv.ParseInt(c.Query("connector_id"), 10, 64)
	chatID := c.Query("chat_id")
	if connID == 0 || chatID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "connector_id and chat_id are required"})
		return
	}

	conn, err := db.GetIMConnectorByID(connID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "connector not found"})
		return
	}

	var cfg struct {
		AppID     string `json:"app_id"`
		AppSecret string `json:"app_secret"`
	}
	if err := json.Unmarshal([]byte(conn.Config), &cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid config"})
		return
	}

	// 获取 tenant_access_token
	token, err := getTenantAccessToken(cfg.AppID, cfg.AppSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get token: " + err.Error()})
		return
	}

	type MemberInfo struct {
		MemberID   string `json:"member_id"`
		MemberType string `json:"member_type"` // user / bot
		Name       string `json:"name"`
		TenantKey  string `json:"tenant_key,omitempty"`
	}

	var members []MemberInfo
	pageToken := ""
	for {
		url := "https://open.feishu.cn/open-apis/im/v1/chats/" + chatID + "/members?member_id_type=open_id&page_size=50"
		if pageToken != "" {
			url += "&page_token=" + pageToken
		}

		req, _ := http.NewRequest("GET", url, nil)
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			slog.Warn("[feishu-task] list chat members HTTP error", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "HTTP error: " + err.Error()})
			return
		}

		var result struct {
			Code int    `json:"code"`
			Msg  string `json:"msg"`
			Data struct {
				Items []struct {
					MemberID     string `json:"member_id"`
					MemberIDType string `json:"member_id_type"`
					MemberType   string `json:"member_type"` // user / bot
					Name         string `json:"name"`
					TenantKey    string `json:"tenant_key"`
				} `json:"items"`
				PageToken string `json:"page_token"`
				HasMore   bool   `json:"has_more"`
			} `json:"data"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			resp.Body.Close()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "decode error"})
			return
		}
		resp.Body.Close()

		if result.Code != 0 {
			c.JSON(http.StatusInternalServerError, gin.H{"error": result.Msg})
			return
		}

		for _, item := range result.Data.Items {
			members = append(members, MemberInfo{
				MemberID:   item.MemberID,
				MemberType: item.MemberType,
				Name:       item.Name,
				TenantKey:  item.TenantKey,
			})
		}

		if result.Data.HasMore && result.Data.PageToken != "" {
			pageToken = result.Data.PageToken
		} else {
			break
		}
	}

	if members == nil {
		members = []MemberInfo{}
	}
	c.JSON(http.StatusOK, members)
}

// getTenantAccessToken 通过 app_id/app_secret 获取 tenant_access_token
func getTenantAccessToken(appID, appSecret string) (string, error) {
	body, _ := json.Marshal(map[string]string{"app_id": appID, "app_secret": appSecret})
	resp, err := http.Post("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
		"application/json", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var result struct {
		Code              int    `json:"code"`
		Msg               string `json:"msg"`
		TenantAccessToken string `json:"tenant_access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if result.Code != 0 {
		return "", fmt.Errorf("code %d: %s", result.Code, result.Msg)
	}
	return result.TenantAccessToken, nil
}
