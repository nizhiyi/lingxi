package handler

import (
	"net/http"
	"strconv"

	"lingxi-agent/db"

	"github.com/gin-gonic/gin"
)

// ListP2PWatchTargetsHandler GET /api/p2p-watch/targets
func ListP2PWatchTargetsHandler(c *gin.Context) {
	connectorID, _ := strconv.ParseInt(c.Query("connector_id"), 10, 64)
	targets, err := db.ListP2PWatchTargets(connectorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if targets == nil {
		targets = []db.P2PWatchTarget{}
	}
	c.JSON(http.StatusOK, targets)
}

// CreateP2PWatchTargetHandler POST /api/p2p-watch/targets
func CreateP2PWatchTargetHandler(c *gin.Context) {
	var t db.P2PWatchTarget
	if err := c.ShouldBindJSON(&t); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if t.ChatID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "chat_id is required"})
		return
	}
	id, err := db.CreateP2PWatchTarget(&t)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	t.ID = id

	// 如果已启用，立即启动监听
	if t.Enabled && globalP2PWatcher != nil {
		globalP2PWatcher.AddTarget(t)
	}

	c.JSON(http.StatusOK, gin.H{"id": id})
}

// DeleteP2PWatchTargetHandler DELETE /api/p2p-watch/targets/:id
func DeleteP2PWatchTargetHandler(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	// 先停止监听
	if globalP2PWatcher != nil {
		globalP2PWatcher.RemoveTarget(id)
	}

	if err := db.DeleteP2PWatchTarget(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// UpdateP2PWatchTargetHandler PUT /api/p2p-watch/targets/:id
func UpdateP2PWatchTargetHandler(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var body struct {
		ChatName        *string `json:"chat_name"`
		PollIntervalSec *int    `json:"poll_interval_sec"`
		ConnectorID     *int64  `json:"connector_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	t, err := db.GetP2PWatchTarget(id)
	if err != nil || t == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "target not found"})
		return
	}

	if body.ChatName != nil {
		t.ChatName = *body.ChatName
	}
	if body.PollIntervalSec != nil {
		t.PollIntervalSec = *body.PollIntervalSec
	}
	if body.ConnectorID != nil {
		t.ConnectorID = *body.ConnectorID
	}

	if err := db.UpdateP2PWatchTarget(t); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	RestartP2PTarget(id)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ToggleP2PWatchTargetHandler PUT /api/p2p-watch/targets/:id/toggle
func ToggleP2PWatchTargetHandler(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := db.ToggleP2PWatchTarget(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 重启该目标的监听
	RestartP2PTarget(id)

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GetP2PWatchStatusHandler GET /api/p2p-watch/status
func GetP2PWatchStatusHandler(c *gin.Context) {
	status := GetP2PWatchStatus()
	c.JSON(http.StatusOK, status)
}

// TestP2PWatchHandler POST /api/p2p-watch/test
func TestP2PWatchHandler(c *gin.Context) {
	var body struct {
		ChatID string `json:"chat_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.ChatID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "chat_id is required"})
		return
	}

	msgs, err := TestP2PPoll(body.ChatID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"messages": msgs, "count": len(msgs)})
}
