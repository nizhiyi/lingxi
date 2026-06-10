import { api } from '../../api/client';

export const createCodingSlice = (set, get) => ({
  // Coding 模式的项目路径
  codingProjectPath: localStorage.getItem('lingxi-code-project-path') || '',
  setCodingProjectPath: (p) => {
    localStorage.setItem('lingxi-code-project-path', p);
    set({ codingProjectPath: p });
  },

  // 工作区文件变更
  workspaceChanges: [],
  loadingChanges: false,
  refreshWorkspaceChanges: async () => {
    const path = get().codingProjectPath;
    if (!path) return;
    set({ loadingChanges: true });
    try {
      const res = await api.getCodingChanges(path);
      set({ workspaceChanges: res.changes || [] });
    } catch {
      set({ workspaceChanges: [] });
    }
    set({ loadingChanges: false });
  },

  // Diff 查看
  activeDiff: null,
  loadDiff: async (file) => {
    const path = get().codingProjectPath;
    if (!path) return;
    try {
      const res = await api.getCodingDiff(path, file);
      set({ activeDiff: res });
    } catch {
      set({ activeDiff: null });
    }
  },
  clearDiff: () => set({ activeDiff: null }),

  // 实时文件修改 diff 列表
  liveDiffs: [],
  clearLiveDiffs: () => set({ liveDiffs: [] }),

  // Task Todo List 状态
  codingTasks: [],
  addCodingTask: (task) => set((s) => ({
    codingTasks: [...s.codingTasks, { id: Date.now(), status: 'pending', ...task }],
  })),
  updateCodingTask: (id, updates) => set((s) => ({
    codingTasks: s.codingTasks.map(t => t.id === id ? { ...t, ...updates } : t),
  })),
  clearCodingTasks: () => set({ codingTasks: [] }),

  // Agent Team 状态
  codingTeam: null,
  setCodingTeam: (team) => set({ codingTeam: team }),

  // 交互模式切换（normal=直接执行, plan=先规划再执行）
  codingMode: localStorage.getItem('lingxi-coding-mode') || 'normal',
  setCodingMode: (mode) => {
    localStorage.setItem('lingxi-coding-mode', mode);
    set({ codingMode: mode });
  },

  // 思考模式独立开关（与 codingMode 解耦，任何模式下都可以打开/关闭）
  codingThinkingEnabled: localStorage.getItem('lingxi-coding-thinking') === 'true',
  setCodingThinkingEnabled: (v) => {
    localStorage.setItem('lingxi-coding-thinking', v ? 'true' : 'false');
    set({ codingThinkingEnabled: v });
  },

  // SDK 原生权限模式（直通到 sdk-runner options.permissionMode）
  // default: 只读工具自动批准，写入/执行需确认
  // acceptEdits: 文件编辑自动批准，Bash/Shell 需确认
  // bypassPermissions: 所有工具自动批准
  // plan: 只读模式，不执行写入
  codingPermissionMode: localStorage.getItem('lingxi-coding-permission-mode') || 'default',
  setCodingPermissionMode: (mode) => {
    localStorage.setItem('lingxi-coding-permission-mode', mode);
    set({ codingPermissionMode: mode });
  },

  // "Always Allow" 记忆白名单（本会话内持久化）
  codingAlwaysAllowTools: JSON.parse(localStorage.getItem('lingxi-coding-always-allow') || '[]'),
  addAlwaysAllowTool: (toolName) => {
    const list = get().codingAlwaysAllowTools;
    if (!list.includes(toolName)) {
      const updated = [...list, toolName];
      localStorage.setItem('lingxi-coding-always-allow', JSON.stringify(updated));
      set({ codingAlwaysAllowTools: updated });
    }
  },
  clearAlwaysAllowTools: () => {
    localStorage.removeItem('lingxi-coding-always-allow');
    set({ codingAlwaysAllowTools: [] });
  },

  // Coding View 主题
  codingTheme: localStorage.getItem('lingxi-coding-theme') || 'warm',
  setCodingTheme: (themeId) => {
    localStorage.setItem('lingxi-coding-theme', themeId);
    set({ codingTheme: themeId });
  },

  // Diff 预览（右侧 Drawer 自动弹出）
  codingActiveDiff: null, // { filePath, diffText }
  setCodingActiveDiff: (diff) => set({ codingActiveDiff: diff }),
  clearCodingActiveDiff: () => set({ codingActiveDiff: null }),

  // 文件树动态高亮（Agent 正在操作的文件路径集合）
  codingActiveFiles: new Set(),
  addCodingActiveFile: (path) => set((s) => {
    const next = new Set(s.codingActiveFiles);
    next.add(path);
    return { codingActiveFiles: next };
  }),
  removeCodingActiveFile: (path) => set((s) => {
    const next = new Set(s.codingActiveFiles);
    next.delete(path);
    return { codingActiveFiles: next };
  }),
  clearCodingActiveFiles: () => set({ codingActiveFiles: new Set() }),

  // Git 分支
  gitBranch: '',
  refreshGitBranch: async () => {
    const path = get().codingProjectPath;
    if (!path) return;
    try {
      const res = await api.getCodingBranch(path);
      set({ gitBranch: res.branch || '' });
    } catch {
      set({ gitBranch: '' });
    }
  },
});
