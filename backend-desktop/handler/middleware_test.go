package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestLocalOriginCORS_AllowsLocalhost(t *testing.T) {
	r := gin.New()
	r.Use(LocalOriginCORS())
	r.GET("/test", func(c *gin.Context) { c.String(200, "ok") })

	origins := []string{
		"http://localhost:3001",
		"http://127.0.0.1:3001",
		"file://",
		"app://.",
	}
	for _, origin := range origins {
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Origin", origin)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != 200 {
			t.Errorf("origin %q: expected 200, got %d", origin, w.Code)
		}
		if w.Header().Get("Access-Control-Allow-Origin") != origin {
			t.Errorf("origin %q: ACAO header = %q", origin, w.Header().Get("Access-Control-Allow-Origin"))
		}
	}
}

func TestLocalOriginCORS_BlocksExternalOrigin(t *testing.T) {
	r := gin.New()
	r.Use(LocalOriginCORS())
	r.GET("/test", func(c *gin.Context) { c.String(200, "ok") })

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "https://evil.com")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Errorf("expected no ACAO header for external origin, got %q", w.Header().Get("Access-Control-Allow-Origin"))
	}
}

func TestLocalOriginCORS_PreflightReturnsNoContent(t *testing.T) {
	r := gin.New()
	r.Use(LocalOriginCORS())
	r.POST("/test", func(c *gin.Context) { c.String(200, "ok") })

	req := httptest.NewRequest("OPTIONS", "/test", nil)
	req.Header.Set("Origin", "http://localhost:3001")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("preflight: expected %d, got %d", http.StatusNoContent, w.Code)
	}
}

func TestRateLimiter_AllowsBurst(t *testing.T) {
	rl := NewRateLimiter(10, 5) // 10/min, burst 5
	for i := 0; i < 5; i++ {
		if !rl.Allow("testkey") {
			t.Errorf("request %d should be allowed within burst", i+1)
		}
	}
	if rl.Allow("testkey") {
		t.Error("request beyond burst should be rejected")
	}
}

func TestRateLimiter_DifferentKeys(t *testing.T) {
	rl := NewRateLimiter(10, 2)
	rl.Allow("a")
	rl.Allow("a")
	if rl.Allow("a") {
		t.Error("key 'a' should be exhausted")
	}
	if !rl.Allow("b") {
		t.Error("key 'b' should still have tokens")
	}
}
