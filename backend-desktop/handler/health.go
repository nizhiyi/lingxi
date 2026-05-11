package handler

import (
	"net/http"
	"runtime"
	"time"

	"lingxi-agent/db"

	"github.com/gin-gonic/gin"
)

var startTime = time.Now()

// HealthCheck GET /api/health — structured health check
func HealthCheck(c *gin.Context) {
	status := "ok"
	dbOk := true
	if err := db.DB.Ping(); err != nil {
		status = "degraded"
		dbOk = false
	}

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	c.JSON(http.StatusOK, gin.H{
		"status":     status,
		"uptime_sec": int(time.Since(startTime).Seconds()),
		"db":         dbOk,
		"goroutines": runtime.NumGoroutine(),
		"mem_alloc_mb": float64(m.Alloc) / 1024 / 1024,
		"go_version": runtime.Version(),
	})
}
