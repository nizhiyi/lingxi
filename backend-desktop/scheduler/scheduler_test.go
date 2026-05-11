package scheduler

import (
	"testing"
	"time"
)

func TestCalcNextRun_EveryMinutes(t *testing.T) {
	base := time.Date(2025, 6, 1, 10, 0, 0, 0, time.Local)
	next := CalcNextRun("every_30m", base)
	if next == nil {
		t.Fatal("expected non-nil result")
	}
	expected := base.Add(30 * time.Minute)
	if !next.Equal(expected) {
		t.Errorf("expected %v, got %v", expected, *next)
	}
}

func TestCalcNextRun_EveryHours(t *testing.T) {
	base := time.Date(2025, 6, 1, 10, 0, 0, 0, time.Local)
	next := CalcNextRun("every_2h", base)
	if next == nil {
		t.Fatal("expected non-nil result")
	}
	expected := base.Add(2 * time.Hour)
	if !next.Equal(expected) {
		t.Errorf("expected %v, got %v", expected, *next)
	}
}

func TestCalcNextRun_Daily(t *testing.T) {
	base := time.Date(2025, 6, 1, 8, 0, 0, 0, time.Local)
	next := CalcNextRun("daily_09:30", base)
	if next == nil {
		t.Fatal("expected non-nil result")
	}
	expected := time.Date(2025, 6, 1, 9, 30, 0, 0, time.Local)
	if !next.Equal(expected) {
		t.Errorf("expected %v, got %v", expected, *next)
	}
}

func TestCalcNextRun_DailyPast(t *testing.T) {
	base := time.Date(2025, 6, 1, 11, 0, 0, 0, time.Local)
	next := CalcNextRun("daily_09:30", base)
	if next == nil {
		t.Fatal("expected non-nil result")
	}
	expected := time.Date(2025, 6, 2, 9, 30, 0, 0, time.Local)
	if !next.Equal(expected) {
		t.Errorf("expected %v, got %v", expected, *next)
	}
}

func TestCalcNextRun_Weekly(t *testing.T) {
	// 2025-06-01 is a Sunday (weekday 0)
	base := time.Date(2025, 6, 1, 10, 0, 0, 0, time.Local)
	// weekly_1_09:00 means Monday at 09:00
	next := CalcNextRun("weekly_1_09:00", base)
	if next == nil {
		t.Fatal("expected non-nil result")
	}
	expected := time.Date(2025, 6, 2, 9, 0, 0, 0, time.Local)
	if !next.Equal(expected) {
		t.Errorf("expected %v (Monday), got %v (%s)", expected, *next, next.Weekday())
	}
}

func TestCalcNextRun_Monthly(t *testing.T) {
	base := time.Date(2025, 6, 1, 10, 0, 0, 0, time.Local)
	next := CalcNextRun("monthly_15_08:00", base)
	if next == nil {
		t.Fatal("expected non-nil result")
	}
	expected := time.Date(2025, 6, 15, 8, 0, 0, 0, time.Local)
	if !next.Equal(expected) {
		t.Errorf("expected %v, got %v", expected, *next)
	}
}

func TestCalcNextRun_SimpleCron(t *testing.T) {
	base := time.Date(2025, 6, 1, 10, 0, 0, 0, time.Local)
	// "0 12 * * *" means every day at 12:00
	next := CalcNextRun("0 12 * * *", base)
	if next == nil {
		t.Fatal("expected non-nil result")
	}
	expected := time.Date(2025, 6, 1, 12, 0, 0, 0, time.Local)
	if !next.Equal(expected) {
		t.Errorf("expected %v, got %v", expected, *next)
	}
}

func TestCalcNextRun_Empty(t *testing.T) {
	next := CalcNextRun("", time.Now())
	if next != nil {
		t.Errorf("expected nil for empty cron, got %v", *next)
	}
}

func TestMatchField(t *testing.T) {
	tests := []struct {
		field    string
		val      int
		expected bool
	}{
		{"*", 5, true},
		{"5", 5, true},
		{"5", 6, false},
		{"1,3,5", 3, true},
		{"1,3,5", 4, false},
		{"1-5", 3, true},
		{"1-5", 6, false},
		{"*/15", 30, true},
		{"*/15", 7, false},
	}
	for _, tt := range tests {
		got := matchField(tt.field, tt.val)
		if got != tt.expected {
			t.Errorf("matchField(%q, %d) = %v, want %v", tt.field, tt.val, got, tt.expected)
		}
	}
}

func TestParseInterval(t *testing.T) {
	tests := []struct {
		input    string
		expected time.Duration
	}{
		{"30m", 30 * time.Minute},
		{"2h", 2 * time.Hour},
		{"0m", 0},
		{"", 0},
	}
	for _, tt := range tests {
		got := parseInterval(tt.input)
		if got != tt.expected {
			t.Errorf("parseInterval(%q) = %v, want %v", tt.input, got, tt.expected)
		}
	}
}
