package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// TranscribeAudio POST /api/transcribe
// 优先使用本地 whisper.cpp 离线识别，若不可用则回退到远端 OpenAI Whisper API
func TranscribeAudio(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "未收到音频文件"})
		return
	}
	defer file.Close()

	audioData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "读取音频失败"})
		return
	}
	if len(audioData) < 1000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "音频太短"})
		return
	}

	filename := header.Filename
	if filename == "" {
		filename = "audio.wav"
	}

	// 优先：本地 whisper.cpp
	whisperBin := os.Getenv("WHISPER_BIN")
	whisperModel := os.Getenv("WHISPER_MODEL")
	if whisperBin != "" && whisperModel != "" {
		text, err := transcribeLocal(whisperBin, whisperModel, audioData, filename)
		if err != nil {
			slog.Warn("local whisper error, falling back to remote", "err", err)
		} else {
			c.JSON(http.StatusOK, gin.H{"text": text})
			return
		}
	}

	// 回退：远端 Whisper API
	_, _, _, baseURL, token, protocol, _, _, _ := activeProfileSnapshot()
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "语音识别不可用：请先激活一个模型接入点（设置 > 连接与接入点）"})
		return
	}

	whisperURL := buildWhisperURL(baseURL, protocol)
	if whisperURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "语音识别不可用：当前接入点未提供 Base URL，无法回退到远端语音识别"})
		return
	}

	text, err := callWhisperAPI(whisperURL, token, audioData, filename)
	if err != nil {
		slog.Warn("remote error", "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"text": text})
}

// transcribeLocal 使用本地 whisper.cpp CLI 进行离线语音识别
func transcribeLocal(whisperBin, modelPath string, audioData []byte, filename string) (string, error) {
	tmpDir := os.TempDir()
	inputPath := filepath.Join(tmpDir, "lingxi-asr-input.wav")

	ext := strings.ToLower(filepath.Ext(filename))
	if ext == "" {
		ext = ".wav"
	}

	// 如果输入是 webm/ogg，需要先转换为 wav（16kHz mono）
	if ext == ".webm" || ext == ".ogg" {
		inputWebm := filepath.Join(tmpDir, "lingxi-asr-input"+ext)
		if err := os.WriteFile(inputWebm, audioData, 0644); err != nil {
			return "", fmt.Errorf("写入临时音频失败: %w", err)
		}
		defer os.Remove(inputWebm)

		// 尝试用 ffmpeg 转换
		ffmpegBin, _ := exec.LookPath("ffmpeg")
		if ffmpegBin == "" {
			// 也检查常用路径
			for _, p := range []string{"/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"} {
				if _, err := os.Stat(p); err == nil {
					ffmpegBin = p
					break
				}
			}
		}
		if ffmpegBin == "" {
			return "", fmt.Errorf("需要 ffmpeg 将 %s 转换为 wav 格式", ext)
		}

		cmd := exec.Command(ffmpegBin, "-y", "-i", inputWebm, "-ar", "16000", "-ac", "1", "-f", "wav", inputPath)
		if out, err := cmd.CombinedOutput(); err != nil {
			return "", fmt.Errorf("ffmpeg 转换失败: %s", string(out))
		}
		defer os.Remove(inputPath)
	} else {
		// wav 或其他格式直接写入
		if err := os.WriteFile(inputPath, audioData, 0644); err != nil {
			return "", fmt.Errorf("写入临时音频失败: %w", err)
		}
		defer os.Remove(inputPath)
	}

	// 调用 whisper.cpp CLI
	cmd := exec.Command(whisperBin,
		"-m", modelPath,
		"-f", inputPath,
		"-l", "zh",
		"--prompt", "以下是普通话的句子。",
		"--no-timestamps",
		"-nt",
	)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	slog.Info("running whisper", "string()", cmd.String())
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("whisper 执行失败: %v, stderr: %s", err, stderr.String())
	}

	text := strings.TrimSpace(stdout.String())
	// whisper 有时会输出 [BLANK_AUDIO] 之类的标记
	text = strings.ReplaceAll(text, "[BLANK_AUDIO]", "")
	text = strings.TrimSpace(text)

	if text == "" {
		return "", fmt.Errorf("whisper 未识别到有效文本")
	}

	text = traditionalToSimplified(text)

	slog.Info("local whisper result", "text", truncateStr(text, 100))
	return text, nil
}

// traditionalToSimplified 将常见繁体字转为简体（高频字覆盖日常对话）
func traditionalToSimplified(s string) string {
	// 繁->简 对照（去重，每个繁体字只出现一次）
	const trad = "國會這為來與從個對開時過動機關點長問學實電東場業經體員後報書進發當將義產總結華讓說還區應號車設變軍間運農無頭計處話條辦連達認際議門觀論統馬師節級邊幾準轉團調環確據讀寫廣類億樣務龍歲豐飛風雲魚鳥備復夠係歡決規許構優傳禮濟戰歷護麗藝衛雜雞隊險雙離難響額飯驗聯聲職態願視訊記須價質錢錄鐵銀腦臉壞塊夢專歸極樂費禪遠適選遲鄰醫稱種積稅筆簡紅給線終組練細緊綠網廳劍創勞勝壓夾導層帶廠歐齊齒戲撐擊擔擾損換搶掃撿搖檢樓標殘滅滿漢燈獎獨獲瑣療盡監鑰鑑噹嗎嘗嚇嚴圍園圖壇夥奪詞詩該詳語誤課談請負貨責貼賓贏趙輕輪輸辯鄉鄭釋鎮閃閉閒閱陣陰陽隨隱靈買賣麼黃"
	const simp = "国会这为来与从个对开时过动机关点长问学实电东场业经体员后报书进发当将义产总结华让说还区应号车设变军间运农无头计处话条办连达认际议门观论统马师节级边几准转团调环确据读写广类亿样务龙岁丰飞风云鱼鸟备复够系欢决规许构优传礼济战历护丽艺卫杂鸡队险双离难响额饭验联声职态愿视讯记须价质钱录铁银脑脸坏块梦专归极乐费禅远适选迟邻医称种积税笔简红给线终组练细紧绿网厅剑创劳胜压夹导层带厂欧齐齿戏撑击担扰损换抢扫捡摇检楼标残灭满汉灯奖独获琐疗尽监钥鉴当吗尝吓严围园图坛伙夺词诗该详语误课谈请负货责贴宾赢赵轻轮输辩乡郑释镇闪闭闲阅阵阴阳随隐灵买卖么黄"
	tradRunes := []rune(trad)
	simpRunes := []rune(simp)
	t2s := make(map[rune]rune, len(tradRunes))
	for i := 0; i < len(tradRunes) && i < len(simpRunes); i++ {
		t2s[tradRunes[i]] = simpRunes[i]
	}
	runes := []rune(s)
	for i, r := range runes {
		if simplified, ok := t2s[r]; ok {
			runes[i] = simplified
		}
	}
	return string(runes)
}

// buildWhisperURL 根据 baseURL 和协议构建 Whisper API 地址
func buildWhisperURL(baseURL, protocol string) string {
	baseURL = strings.TrimRight(baseURL, "/")
	if baseURL == "" {
		return ""
	}

	// 不管协议是 openai 还是 anthropic，都尝试构建 whisper URL
	// 大多数 OpenAI 兼容服务和代理都支持 /v1/audio/transcriptions
	if idx := strings.Index(baseURL, "/v1"); idx >= 0 {
		return baseURL[:idx] + "/v1/audio/transcriptions"
	}
	return baseURL + "/v1/audio/transcriptions"
}

// callWhisperAPI 调用 OpenAI 兼容的 /v1/audio/transcriptions
func callWhisperAPI(url, token string, audioData []byte, filename string) (string, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return "", fmt.Errorf("创建表单失败: %w", err)
	}
	if _, err := part.Write(audioData); err != nil {
		return "", fmt.Errorf("写入音频数据失败: %w", err)
	}

	_ = writer.WriteField("model", "whisper-1")
	_ = writer.WriteField("language", "zh")
	_ = writer.WriteField("response_format", "json")

	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("关闭 multipart writer 失败: %w", err)
	}

	req, err := http.NewRequest("POST", url, &buf)
	if err != nil {
		return "", fmt.Errorf("创建请求失败: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("API 错误 %d: %s", resp.StatusCode, truncateStr(string(body), 300))
	}

	var result struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return strings.TrimSpace(string(body)), nil
	}

	return strings.TrimSpace(result.Text), nil
}
