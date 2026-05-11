import { api, wsClient } from '../../api/client';

export const createNexusSlice = (set, get) => ({
  nexusNotifications: [],
  addNexusNotif: (notif) => set((s) => ({
    nexusNotifications: [...s.nexusNotifications, { ...notif, id: Date.now() + Math.random() }],
  })),
  removeNexusNotif: (id) => set((s) => ({
    nexusNotifications: s.nexusNotifications.filter((n) => n.id !== id),
  })),
  clearNexusNotifs: () => set({ nexusNotifications: [] }),

  nexusPeers: [],
  nexusContacts: [],
  a2aConversations: [],
  pendingConnectRequests: [],

  activeA2ASessionId: null,
  activeA2AConvId: null,
  a2aLiveBlocks: [],
  a2aIsStreaming: false,
  a2aRemoteLiveBlocks: [],
  a2aRemoteIsStreaming: false,
  a2aMessages: [],

  setActiveA2ASession: async (sessionId) => {
    set({
      activeA2ASessionId: sessionId,
      a2aLiveBlocks: [], a2aIsStreaming: false,
      a2aRemoteLiveBlocks: [], a2aRemoteIsStreaming: false,
      a2aMessages: [],
    });
    if (sessionId) {
      wsClient.subscribe(sessionId);
      const msgs = await api.listMessages(sessionId).catch(() => []);
      set({ a2aMessages: msgs });
    }
  },

  refreshA2AMessages: async () => {
    const sid = get().activeA2ASessionId;
    if (sid) {
      const msgs = await api.listMessages(sid).catch(() => []);
      set({ a2aMessages: msgs });
    }
  },

  refreshNexusPeers: async () => {
    try {
      const data = await api.listPeers();
      set({ nexusPeers: data || [] });
    } catch {}
  },
  refreshNexusContacts: async () => {
    try {
      const data = await api.listContacts();
      set({ nexusContacts: data || [] });
    } catch {}
  },
  refreshA2AConversations: async () => {
    try {
      const data = await api.listA2AConversations();
      set({ a2aConversations: data || [] });
    } catch {}
  },
});
