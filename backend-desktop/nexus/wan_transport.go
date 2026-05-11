package nexus

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"time"
)

// WANTransport 基于信令服务器中继的广域网传输层
type WANTransport struct {
	PeerID string
}

func NewWANTransport(peerID string) *WANTransport {
	return &WANTransport{PeerID: peerID}
}

func (t *WANTransport) Send(path string, payload interface{}) ([]byte, error) {
	data, err := json.Marshal(map[string]interface{}{
		"path":    path,
		"payload": payload,
	})
	if err != nil {
		return nil, err
	}

	msg := SignalMessage{
		Type: "relay",
		To:   t.PeerID,
		Data: data,
	}

	sc := GetSignalingClient()
	const maxRetries = 3

	for attempt := 0; attempt < maxRetries; attempt++ {
		if !sc.IsConnected() {
			if attempt == maxRetries-1 {
				return nil, fmt.Errorf("signaling server not connected after %d retries", maxRetries)
			}
		delay := time.Duration(attempt+1) * 2 * time.Second
		slog.Warn("signaling not connected, retrying", "delay", delay, "attempt", attempt+1, "maxRetries", maxRetries, "path", path)
		time.Sleep(delay)
			continue
		}

		if err := sc.sendMsg(msg); err != nil {
			if attempt == maxRetries-1 {
				return nil, fmt.Errorf("send relay: %w (after %d retries)", err, maxRetries)
			}
			delay := time.Duration(attempt+1) * time.Second
			slog.Warn("send failed, retrying in  (/)", "err", err, "value", delay, "value", attempt+1, "value", maxRetries)
			time.Sleep(delay)
			continue
		}

		payloadBytes, _ := json.Marshal(payload)
		payloadPreview := string(payloadBytes)
		if len(payloadPreview) > 300 {
			payloadPreview = payloadPreview[:300] + "..."
		}
		slog.Debug("WAN relay sent", "peerID", t.PeerID, "path", path, "dataLen", len(data))
		return []byte(`{"ok":true}`), nil
	}

	return nil, fmt.Errorf("send relay failed after %d retries", maxRetries)
}

func (t *WANTransport) Get(path string) ([]byte, error) {
	return t.Send(path, nil)
}

func (t *WANTransport) Type() string {
	return "wan"
}

// GetTransportForContact 根据传输类型返回对应的 Transport
func GetTransportForContact(host string, port int, transportType string, peerID string) Transport {
	if transportType == "wan" {
		return NewWANTransport(peerID)
	}
	return NewLANTransport(host, port)
}
