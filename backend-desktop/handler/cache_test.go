package handler

import (
	"testing"
	"time"
)

func TestTTLCache_GetSet(t *testing.T) {
	c := newTTLCache(100 * time.Millisecond)

	if _, ok := c.Get("miss"); ok {
		t.Fatal("expected cache miss")
	}

	c.Set("key", []string{"a", "b"})
	v, ok := c.Get("key")
	if !ok {
		t.Fatal("expected cache hit")
	}
	if len(v.([]string)) != 2 {
		t.Fatal("unexpected value")
	}

	time.Sleep(150 * time.Millisecond)
	if _, ok := c.Get("key"); ok {
		t.Fatal("expected cache expiry")
	}
}

func TestTTLCache_Invalidate(t *testing.T) {
	c := newTTLCache(10 * time.Second)
	c.Set("a", 1)
	c.Set("b", 2)

	c.Invalidate("a")
	if _, ok := c.Get("a"); ok {
		t.Fatal("expected a to be invalidated")
	}
	if _, ok := c.Get("b"); !ok {
		t.Fatal("expected b to still exist")
	}

	c.InvalidateAll()
	if _, ok := c.Get("b"); ok {
		t.Fatal("expected all invalidated")
	}
}
