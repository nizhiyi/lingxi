package handler

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// GetWorkspaceChanges GET /api/coding/changes?path=xxx
// 通过 git status 获取工作目录的文件变更列表
func GetWorkspaceChanges(c *gin.Context) {
	dirPath := c.Query("path")
	if dirPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}
	dirPath = expandHome(dirPath)

	if _, err := os.Stat(dirPath); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "目录不存在"})
		return
	}

	cmd := exec.Command("git", "status", "--porcelain")
	cmd.Dir = dirPath
	out, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"changes": []interface{}{}, "error": "非 Git 仓库"})
		return
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	var changes []gin.H
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if len(line) < 3 {
			continue
		}
		statusCode := strings.TrimSpace(line[:2])
		filePath := strings.TrimSpace(line[3:])

		status := "M"
		switch {
		case strings.Contains(statusCode, "?"):
			status = "U"
		case strings.Contains(statusCode, "D"):
			status = "D"
		case strings.Contains(statusCode, "A"):
			status = "A"
		case strings.Contains(statusCode, "M"):
			status = "M"
		}

		added, removed := countDiffLines(dirPath, filePath)

		changes = append(changes, gin.H{
			"path":    filePath,
			"status":  status,
			"added":   added,
			"removed": removed,
		})
	}
	if changes == nil {
		changes = []gin.H{}
	}

	c.JSON(http.StatusOK, gin.H{"changes": changes})
}

// GetFileDiff GET /api/coding/diff?path=xxx&file=xxx
// 获取指定文件的 git diff
func GetFileDiff(c *gin.Context) {
	dirPath := c.Query("path")
	filePath := c.Query("file")
	if dirPath == "" || filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path and file are required"})
		return
	}
	dirPath = expandHome(dirPath)

	cmd := exec.Command("git", "diff", "--", filePath)
	cmd.Dir = dirPath
	out, err := cmd.Output()
	if err != nil {
		// 尝试 untracked 文件
		full := filepath.Join(dirPath, filePath)
		content, readErr := os.ReadFile(full)
		if readErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "无法读取文件"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"file":      filePath,
			"diff":      "",
			"new_content": string(content),
			"is_new":    true,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"file": filePath,
		"diff": string(out),
	})
}

// GetGitBranch GET /api/coding/branch?path=xxx
func GetGitBranch(c *gin.Context) {
	dirPath := c.Query("path")
	if dirPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}
	dirPath = expandHome(dirPath)

	cmd := exec.Command("git", "branch", "--show-current")
	cmd.Dir = dirPath
	out, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"branch": ""})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"branch": strings.TrimSpace(string(out)),
	})
}

func countDiffLines(dir, file string) (int, int) {
	cmd := exec.Command("git", "diff", "--numstat", "--", file)
	cmd.Dir = dir
	out, err := cmd.Output()
	if err != nil {
		return 0, 0
	}
	parts := strings.Fields(strings.TrimSpace(string(out)))
	if len(parts) < 2 {
		return 0, 0
	}
	var added, removed int
	fmt.Sscanf(parts[0], "%d", &added)
	fmt.Sscanf(parts[1], "%d", &removed)
	return added, removed
}
