package handler

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"lingxi-agent/config"
	"lingxi-agent/db"

	"github.com/gin-gonic/gin"
)

func backupDir() string {
	dir := filepath.Join(filepath.Dir(config.Get().DB.Path), "backups")
	os.MkdirAll(dir, 0755)
	return dir
}

func backupPath() string {
	ts := time.Now().Format("2006-01-02")
	return filepath.Join(backupDir(), fmt.Sprintf("smart-agent-%s.db", ts))
}

func doVacuumBackup() error {
	dst := backupPath()
	_, err := db.DB.Exec(fmt.Sprintf(`VACUUM INTO '%s'`, filepath.ToSlash(dst)))
	if err != nil {
		slog.Warn("vacuum backup failed", "dst", dst, "err", err)
		return err
	}
	slog.Info("vacuum backup done", "dst", dst)
	pruneOldBackups(7)
	return nil
}

func pruneOldBackups(keepDays int) {
	dir := backupDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	cutoff := time.Now().AddDate(0, 0, -keepDays)
	for _, e := range entries {
		info, err := e.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			os.Remove(filepath.Join(dir, e.Name()))
		}
	}
}

// StartDailyBackup runs VACUUM INTO once per 24h in background.
func StartDailyBackup(stop <-chan struct{}) {
	doVacuumBackup()
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			doVacuumBackup()
		case <-stop:
			return
		}
	}
}

// ExportBackup GET /api/backup/export — download a fresh backup copy.
func ExportBackup(c *gin.Context) {
	dst := filepath.Join(os.TempDir(), fmt.Sprintf("lingxi-export-%d.db", time.Now().UnixMilli()))
	_, err := db.DB.Exec(fmt.Sprintf(`VACUUM INTO '%s'`, filepath.ToSlash(dst)))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "备份失败: " + err.Error()})
		return
	}
	defer os.Remove(dst)
	c.FileAttachment(dst, "lingxi-backup.db")
}
