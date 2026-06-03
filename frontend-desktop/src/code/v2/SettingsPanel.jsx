import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X, Settings, Palette, Shield, User, Puzzle, Code2,
  GitBranch, Keyboard, Globe, Monitor, Archive, CreditCard,
  FolderTree, Smartphone, Wifi, WifiOff, Copy, Check,
  RefreshCw, QrCode, Terminal, Plus, Trash2, ToggleLeft,
} from 'lucide-react';
import { cn } from '../../ui/cn';
import { useStore } from '../../state/useStore';
import { api } from '../../api/client';
import { CODEX_THEMES, applyCodexTheme, getCodexTheme } from './codexTheme';

const TABS = [
  { id: 'general', label: '常规', icon: Settings },
  { id: 'appearance', label: '外观', icon: Palette },
  { id: 'permissions', label: '权限', icon: Shield },
  { id: 'personalization', label: '个性化', icon: User },
  { id: 'shortcuts', label: '键盘快捷键', icon: Keyboard },
  { id: 'mcp', label: 'MCP 服务器', icon: Globe },
  { id: 'hooks', label: '钩子', icon: Code2 },
  { id: 'connection', label: '连接', icon: Wifi },
  { id: 'git', label: 'Git', icon: GitBranch },
  { id: 'environment', label: '环境', icon: Terminal },
  { id: 'filetree', label: '工作树', icon: FolderTree },
  { id: 'remote', label: '远程访问', icon: Smartphone },
  { id: 'archived', label: '已归档对话', icon: Archive },
  { id: 'usage', label: '使用情况和计费', icon: CreditCard },
];

function Section({ title, description, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-[13px] font-semibold text-[var(--cx-text)] mb-1">{title}</h3>
      {description && <p className="text-[11px] text-[var(--cx-text-3)] mb-3">{description}</p>}
      {children}
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-[var(--cx-border)] last:border-b-0">
      <div className="flex-1 min-w-0 mr-4">
        <div className="text-[12px] font-medium text-[var(--cx-text)]">{label}</div>
        {description && <div className="text-[10px] text-[var(--cx-text-3)] mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'w-[36px] h-[20px] rounded-full transition-all duration-200 relative',
        checked ? 'bg-[var(--cx-accent)]' : 'bg-[var(--cx-surface-3)]'
      )}
    >
      <div className={cn(
        'absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white shadow transition-transform duration-200',
        checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
      )} />
    </button>
  );
}

function GeneralTab() {
  const profiles = useStore((s) => s.profiles) || [];
  const activeProfile = useStore((s) => s.activeProfile);
  const activateProfile = useStore((s) => s.activateProfile);
  const [workMode, setWorkMode] = useState('coding');
  const [preventSleep, setPreventSleep] = useState(false);

  return (
    <div className="space-y-6">
      <Section title="工作模式" description="选择显示多少技术细节">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setWorkMode('coding')}
            className={cn(
              'flex flex-col items-center gap-2 px-4 py-4 rounded-xl border transition-all',
              workMode === 'coding'
                ? 'border-[var(--cx-accent)] bg-[var(--cx-accent-soft)]'
                : 'border-[var(--cx-border)] hover:border-[var(--cx-border-active)]'
            )}
          >
            <Monitor size={20} className="text-[var(--cx-accent)]" />
            <div className="text-center">
              <div className="text-[12px] font-medium text-[var(--cx-text)]">适用于编程</div>
              <div className="text-[10px] text-[var(--cx-text-3)]">更具技术性的回复和控制</div>
            </div>
            {workMode === 'coding' && <div className="w-2 h-2 rounded-full bg-[var(--cx-accent)]" />}
          </button>
          <button
            onClick={() => setWorkMode('general')}
            className={cn(
              'flex flex-col items-center gap-2 px-4 py-4 rounded-xl border transition-all',
              workMode === 'general'
                ? 'border-[var(--cx-accent)] bg-[var(--cx-accent-soft)]'
                : 'border-[var(--cx-border)] hover:border-[var(--cx-border-active)]'
            )}
          >
            <User size={20} className="text-[var(--cx-text-2)]" />
            <div className="text-center">
              <div className="text-[12px] font-medium text-[var(--cx-text)]">适用于日常工作</div>
              <div className="text-[10px] text-[var(--cx-text-3)]">同样强大，技术细节更少</div>
            </div>
            {workMode === 'general' && <div className="w-2 h-2 rounded-full bg-[var(--cx-accent)]" />}
          </button>
        </div>
      </Section>

      <Section title="权限">
        <div className="border border-[var(--cx-border)] rounded-xl overflow-hidden">
          <SettingRow label="默认权限" description="默认情况下，可以读取并编辑其工作区中的文件。必要时，它可以请求额外的访问权限">
            <Toggle checked={true} onChange={() => {}} />
          </SettingRow>
          <SettingRow label="自动审核" description="可以读取和编辑其工作区中的文件，会自动审核额外访问权限请求。自动审核可能会出错。">
            <Toggle checked={false} onChange={() => {}} />
          </SettingRow>
          <SettingRow label="完全访问权限" description="以完全访问权限运行时，无需你批准，即可编辑你的电脑上的任何文件并运行联网命令。">
            <Toggle checked={false} onChange={() => {}} />
          </SettingRow>
        </div>
      </Section>

      <Section title="常规">
        <div className="border border-[var(--cx-border)] rounded-xl overflow-hidden">
          <SettingRow label="运行时防止系统休眠" description="在运行对话时，让电脑保持唤醒状态">
            <Toggle checked={preventSleep} onChange={setPreventSleep} />
          </SettingRow>
        </div>
      </Section>

      <Section title="模型接入点">
        <div className="space-y-1.5">
          {profiles.length === 0 ? (
            <div className="text-center py-6 text-[11px] text-[var(--cx-text-3)]">
              暂无配置接入点，请在灵犀主模式中配置
            </div>
          ) : profiles.map(p => (
            <button
              key={p.id}
              onClick={() => activateProfile(p.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                p.id === activeProfile?.id
                  ? 'border-[var(--cx-accent)] bg-[var(--cx-accent-soft)]'
                  : 'border-[var(--cx-border)] hover:border-[var(--cx-border-active)]'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-[var(--cx-text)]">{p.name || p.model}</div>
                <div className="text-[10px] text-[var(--cx-text-3)]">{p.provider} — {p.model}</div>
              </div>
              {p.id === activeProfile?.id && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--cx-accent)]/20 text-[var(--cx-accent)]">活跃</span>
              )}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function AppearanceTab() {
  const [theme, setTheme] = useState(getCodexTheme());

  const handleThemeChange = (id) => {
    setTheme(id);
    applyCodexTheme(id);
  };

  return (
    <div className="space-y-6">
      <Section title="主题" description="使用浅色、深色，或匹配系统设置">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => handleThemeChange('light')}
            className={cn('px-3 py-1.5 text-[11px] rounded-lg border transition-all',
              theme === 'light' ? 'border-[var(--cx-accent)] bg-[var(--cx-accent-soft)] text-[var(--cx-accent)]' : 'border-[var(--cx-border)] text-[var(--cx-text-2)]'
            )}
          >浅色</button>
          <button
            onClick={() => handleThemeChange('dark')}
            className={cn('px-3 py-1.5 text-[11px] rounded-lg border transition-all',
              theme === 'dark' ? 'border-[var(--cx-accent)] bg-[var(--cx-accent-soft)] text-[var(--cx-accent)]' : 'border-[var(--cx-border)] text-[var(--cx-text-2)]'
            )}
          >深色</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(CODEX_THEMES).map(t => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg border transition-all',
                theme === t.id
                  ? 'border-[var(--cx-accent)] bg-[var(--cx-accent-soft)]'
                  : 'border-[var(--cx-border)] hover:border-[var(--cx-border-active)]'
              )}
            >
              <div
                className="w-8 h-8 rounded-lg border border-[var(--cx-border)] shrink-0"
                style={{ backgroundColor: t.vars['--cx-bg'] }}
              />
              <span className="text-[11px] font-medium text-[var(--cx-text)]">{t.name}</span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function PermissionsTab() {
  const mode = useStore((s) => s.codingPermissionMode);
  const setMode = useStore((s) => s.setCodingPermissionMode);

  const modes = [
    { id: 'default', label: '默认权限', desc: '必要时请求额外的访问权限', risk: 'low' },
    { id: 'acceptEdits', label: '自动审核', desc: '自动审核额外访问权限请求，自动审核可能会出错', risk: 'medium' },
    { id: 'bypassPermissions', label: '完全访问权限', desc: '无需批准即可编辑文件并运行联网命令（风险较高）', risk: 'high' },
    { id: 'plan', label: '仅规划', desc: '只读分析和规划，不做任何修改', risk: 'none' },
  ];

  return (
    <div className="space-y-6">
      <Section title="权限模式" description="控制 Agent 执行操作时的权限级别">
        <div className="border border-[var(--cx-border)] rounded-xl overflow-hidden">
          {modes.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b border-[var(--cx-border)] last:border-b-0',
                mode === m.id ? 'bg-[var(--cx-accent-soft)]' : 'hover:bg-[var(--cx-surface-2)]'
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                mode === m.id ? 'border-[var(--cx-accent)]' : 'border-[var(--cx-text-3)]'
              )}>
                {mode === m.id && <div className="w-2 h-2 rounded-full bg-[var(--cx-accent)]" />}
              </div>
              <div className="flex-1">
                <div className="text-[12px] font-medium text-[var(--cx-text)]">{m.label}</div>
                <div className="text-[10px] text-[var(--cx-text-3)] mt-0.5">{m.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function PersonalizationTab() {
  const [instructions, setInstructions] = useState('');
  const [personality, setPersonality] = useState('friendly');
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [skipToolMemory, setSkipToolMemory] = useState(false);

  return (
    <div className="space-y-6">
      <Section title="个性" description="选择回复的默认语气">
        <select
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          className="w-full px-3 py-2 text-[12px] rounded-lg border border-[var(--cx-border)] bg-[var(--cx-surface-2)] text-[var(--cx-text)] focus:outline-none focus:border-[var(--cx-border-active)]"
        >
          <option value="friendly">亲和</option>
          <option value="concise">简洁</option>
          <option value="formal">正式</option>
          <option value="creative">创意</option>
        </select>
      </Section>

      <Section title="自定义指令" description="为你的项目向 Agent 提供额外说明和上下文。">
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="添加自定义指令..."
          className="w-full h-36 px-3 py-2.5 text-[12px] rounded-lg border border-[var(--cx-border)] bg-[var(--cx-surface-2)] text-[var(--cx-text)] placeholder-[var(--cx-text-3)] resize-y focus:outline-none focus:border-[var(--cx-border-active)]"
        />
        <div className="flex justify-end mt-2">
          <button className="px-3 py-1.5 text-[11px] rounded-lg bg-[var(--cx-surface-3)] text-[var(--cx-text-2)] hover:bg-[var(--cx-accent)] hover:text-white transition-colors">
            保存
          </button>
        </div>
      </Section>

      <Section title="记忆（实验性）" description="设置如何收集、保留和整合记忆。">
        <div className="border border-[var(--cx-border)] rounded-xl overflow-hidden">
          <SettingRow label="启用记忆" description="从聊天中生成新记忆，并将其带入新聊天">
            <Toggle checked={memoryEnabled} onChange={setMemoryEnabled} />
          </SettingRow>
          <SettingRow label="跳过工具辅助对话" description="请勿从使用了 MCP 工具或网页搜索的对话中生成记忆">
            <Toggle checked={skipToolMemory} onChange={setSkipToolMemory} />
          </SettingRow>
          <SettingRow label="重置记忆" description="删除所有记忆">
            <button className="px-3 py-1 text-[11px] rounded-lg text-red-500 hover:bg-red-50 transition-colors font-medium">
              重置
            </button>
          </SettingRow>
        </div>
      </Section>
    </div>
  );
}

function ShortcutsTab() {
  const shortcuts = [
    { key: '⌘ K', desc: '搜索对话' },
    { key: '⌘ N', desc: '新建对话' },
    { key: '⌘ /', desc: '快捷键面板' },
    { key: '⌘ ,', desc: '设置' },
    { key: '⌘ ⇧ F', desc: '全局文件搜索' },
    { key: '⌘ `', desc: '终端' },
    { key: '⌘ B', desc: '侧边栏' },
    { key: '⌘ Enter', desc: '发送消息' },
    { key: 'Escape', desc: '取消/关闭' },
  ];

  return (
    <div className="space-y-6">
      <Section title="键盘快捷键">
        <div className="border border-[var(--cx-border)] rounded-xl overflow-hidden">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--cx-border)] last:border-b-0">
              <span className="text-[12px] text-[var(--cx-text)]">{s.desc}</span>
              <kbd className="px-2 py-0.5 text-[10px] font-mono rounded bg-[var(--cx-surface-3)] text-[var(--cx-text-2)] border border-[var(--cx-border)]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function MCPTab() {
  const [mcpServers, setMcpServers] = useState([]);

  useEffect(() => {
    api.listMCPServers?.().then(data => setMcpServers(data || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <Section title="MCP 服务器" description="连接外部工具和数据源。">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] text-[var(--cx-text-2)] font-medium">服务器</span>
          <button className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-lg border border-[var(--cx-border)] text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-2)] transition-colors">
            <Plus size={12} /> 添加服务器
          </button>
        </div>
        <div className="border border-[var(--cx-border)] rounded-xl overflow-hidden">
          {mcpServers.length === 0 ? (
            <div className="text-center py-8 text-[11px] text-[var(--cx-text-3)]">暂无 MCP 服务器</div>
          ) : mcpServers.map(s => (
            <div key={s.id} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--cx-border)] last:border-b-0">
              <span className="text-[12px] text-[var(--cx-text)]">{s.name}</span>
              <div className="flex items-center gap-2">
                <Settings size={12} className="text-[var(--cx-text-3)] cursor-pointer hover:text-[var(--cx-text-2)]" />
                <Toggle checked={s.enabled !== false} onChange={() => {}} />
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function HooksTab() {
  return (
    <div className="space-y-6">
      <Section title="钩子" description="在 Agent 执行操作前后运行自定义逻辑。">
        <div className="border border-[var(--cx-border)] rounded-xl overflow-hidden">
          <SettingRow label="PreToolUse 拦截" description="在工具执行前检查和拦截敏感文件操作（.env、密钥等）">
            <Toggle checked={true} onChange={() => {}} />
          </SettingRow>
          <SettingRow label="PostToolUse 审计" description="记录所有工具调用的审计日志">
            <Toggle checked={true} onChange={() => {}} />
          </SettingRow>
        </div>
      </Section>

      <Section title="敏感文件路径" description="以下路径的文件将被 PreToolUse 钩子拦截">
        <div className="border border-[var(--cx-border)] rounded-xl p-3">
          <div className="space-y-1.5 text-[11px] font-mono text-[var(--cx-text-2)]">
            <div className="px-2 py-1 rounded bg-[var(--cx-surface-2)]">.env*</div>
            <div className="px-2 py-1 rounded bg-[var(--cx-surface-2)]">*.pem</div>
            <div className="px-2 py-1 rounded bg-[var(--cx-surface-2)]">*.key</div>
            <div className="px-2 py-1 rounded bg-[var(--cx-surface-2)]">credentials.json</div>
            <div className="px-2 py-1 rounded bg-[var(--cx-surface-2)]">id_rsa*</div>
            <div className="px-2 py-1 rounded bg-[var(--cx-surface-2)]">.ssh/config</div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function ConnectionTab() {
  return (
    <div className="space-y-6">
      <Section title="连接" description="管理与外部服务的连接状态">
        <div className="border border-[var(--cx-border)] rounded-xl overflow-hidden">
          <SettingRow label="GitHub CLI" description="用于 git 操作和 PR 管理">
            <span className="text-[10px] text-[var(--cx-text-3)]">未连接</span>
          </SettingRow>
          <SettingRow label="信令服务器" description="广域网 Agent 发现和通信">
            <span className="flex items-center gap-1 text-[10px] text-[var(--cx-success)]">
              <Wifi size={10} /> 已连接
            </span>
          </SettingRow>
        </div>
      </Section>
    </div>
  );
}

function GitTab() {
  const gitBranch = useStore((s) => s.gitBranch);
  return (
    <div className="space-y-6">
      <Section title="Git" description="查看和管理当前仓库信息">
        <div className="border border-[var(--cx-border)] rounded-xl overflow-hidden">
          <SettingRow label="当前分支">
            <span className="text-[11px] font-mono text-[var(--cx-accent)]">{gitBranch || 'main'}</span>
          </SettingRow>
          <SettingRow label="自动提交" description="Agent 完成修改后自动 git commit">
            <Toggle checked={false} onChange={() => {}} />
          </SettingRow>
        </div>
      </Section>
    </div>
  );
}

function RemoteAccessTab() {
  const [pairingCode, setPairingCode] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [expiresIn, setExpiresIn] = useState(0);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [localIP, setLocalIP] = useState('');

  useEffect(() => {
    if (window.electronAPI?.getLocalIP) {
      window.electronAPI.getLocalIP().then(ip => { if (ip) setLocalIP(ip); });
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setPairingCode(code);
    setExpiresIn(300);
    setIsActive(true);

    const port = window.location.port || '3001';
    let host = localIP || window.location.hostname || 'localhost';
    if (host === 'localhost' || host === '127.0.0.1') {
      if (window.electronAPI?.getLocalIP) {
        const ip = await window.electronAPI.getLocalIP();
        if (ip) { host = ip; setLocalIP(ip); }
      }
    }
    const url = `http://${host}:${port}/mobile?code=${code}`;
    try {
      const QRCode = (await import('qrcode')).default;
      const dataUrl = await QRCode.toDataURL(url, { width: 240, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl('');
    }
  }, [localIP]);

  useEffect(() => {
    if (!isActive || expiresIn <= 0) return;
    const timer = setInterval(() => {
      setExpiresIn(v => {
        if (v <= 1) { setIsActive(false); setPairingCode(''); setQrDataUrl(''); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, expiresIn]);

  const handleCopy = useCallback(() => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [pairingCode]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <Section title="远程访问" description="通过手机扫描二维码，远程查看 Agent 状态和审批权限请求。">
        <div className="border border-[var(--cx-border)] rounded-xl p-8 text-center space-y-5">
          {!isActive ? (
            <>
              <div className="w-20 h-20 rounded-2xl bg-[var(--cx-accent-soft)] flex items-center justify-center mx-auto">
                <Smartphone size={36} className="text-[var(--cx-accent)]" />
              </div>
              <div className="space-y-2">
                <h4 className="text-[14px] font-semibold text-[var(--cx-text)]">连接移动设备</h4>
                <p className="text-[12px] text-[var(--cx-text-2)] max-w-[300px] mx-auto">
                  生成二维码后，使用手机扫码即可远程查看 Agent 实时状态、审批权限请求
                </p>
              </div>
              <button
                onClick={handleGenerate}
                className="px-6 py-2.5 rounded-lg bg-[var(--cx-accent)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity shadow-lg shadow-[var(--cx-accent)]/20"
              >
                生成二维码
              </button>
            </>
          ) : (
            <>
              {/* QR Code large display */}
              <div className="flex flex-col items-center gap-4">
                {qrDataUrl ? (
                  <div className="p-3 bg-white rounded-2xl shadow-lg">
                    <img src={qrDataUrl} alt="QR Code" className="w-[200px] h-[200px]" />
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] rounded-2xl bg-[var(--cx-surface-2)] flex items-center justify-center">
                    <QrCode size={48} className="text-[var(--cx-text-3)]" />
                  </div>
                )}

                <p className="text-[12px] text-[var(--cx-text-2)]">使用手机扫描二维码连接</p>

                {/* Pairing code display */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--cx-surface-2)] border border-[var(--cx-border)]">
                  <span className="text-[10px] text-[var(--cx-text-3)]">配对码：</span>
                  <span className="text-[20px] font-mono font-bold text-[var(--cx-text)] tracking-[0.2em]">
                    {pairingCode}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg hover:bg-[var(--cx-surface-3)] text-[var(--cx-text-3)] transition-colors"
                  >
                    {copied ? <Check size={14} className="text-[var(--cx-success)]" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 px-4 py-2 text-[12px] rounded-lg border border-[var(--cx-border)] text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-2)] transition-colors"
                >
                  <RefreshCw size={13} /> 刷新二维码
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--cx-text-3)]">
                <div className="w-2 h-2 rounded-full bg-[var(--cx-success)] animate-pulse" />
                有效期剩余：{formatTime(expiresIn)}
              </div>
            </>
          )}
        </div>
      </Section>
    </div>
  );
}

function EnvironmentTab() {
  return (
    <div className="space-y-6">
      <Section title="环境" description="运行时环境信息">
        <div className="border border-[var(--cx-border)] rounded-xl overflow-hidden">
          <SettingRow label="Node.js">
            <span className="text-[11px] font-mono text-[var(--cx-text-2)]">v22.x</span>
          </SettingRow>
          <SettingRow label="Go">
            <span className="text-[11px] font-mono text-[var(--cx-text-2)]">1.24</span>
          </SettingRow>
          <SettingRow label="Claude SDK">
            <span className="text-[11px] font-mono text-[var(--cx-text-2)]">已加载</span>
          </SettingRow>
        </div>
      </Section>
    </div>
  );
}

function ArchivedTab() {
  return (
    <div className="space-y-6">
      <Section title="已归档对话" description="被归档或删除的对话记录">
        <div className="text-center py-12 text-[11px] text-[var(--cx-text-3)]">暂无归档对话</div>
      </Section>
    </div>
  );
}

function UsageTab() {
  return (
    <div className="space-y-6">
      <Section title="使用情况和计费" description="查看当前会话和历史用量">
        <div className="border border-[var(--cx-border)] rounded-xl overflow-hidden">
          <SettingRow label="本次会话费用">
            <span className="text-[12px] font-mono font-medium text-[var(--cx-accent)]">$0.00</span>
          </SettingRow>
          <SettingRow label="本月累计">
            <span className="text-[12px] font-mono text-[var(--cx-text-2)]">$0.00</span>
          </SettingRow>
        </div>
      </Section>
    </div>
  );
}

function FileTreeTab() {
  return (
    <div className="space-y-6">
      <Section title="工作树" description="管理工作目录和文件监控">
        <div className="border border-[var(--cx-border)] rounded-xl overflow-hidden">
          <SettingRow label="自动监控文件变更" description="检测文件修改并自动更新状态">
            <Toggle checked={true} onChange={() => {}} />
          </SettingRow>
          <SettingRow label="忽略 node_modules" description="排除 node_modules 目录">
            <Toggle checked={true} onChange={() => {}} />
          </SettingRow>
          <SettingRow label="忽略 .git" description="排除 .git 目录">
            <Toggle checked={true} onChange={() => {}} />
          </SettingRow>
        </div>
      </Section>
    </div>
  );
}

export function SettingsPanel({ onClose, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'general');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[90vw] max-w-3xl h-[80vh] flex bg-[var(--cx-surface)] border border-[var(--cx-border)] rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Left nav */}
        <div className="w-[180px] border-r border-[var(--cx-border)] bg-[var(--cx-bg)] py-3 px-2 overflow-y-auto scrollable shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 mb-2 text-[11px] text-[var(--cx-text-3)] hover:text-[var(--cx-text-2)] transition-colors"
          >
            ← 返回应用
          </button>
          <div className="space-y-0.5">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-[var(--cx-accent-soft)] text-[var(--cx-accent)]'
                      : 'text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-2)]'
                  )}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--cx-border)] shrink-0">
            <h3 className="text-[14px] font-bold text-[var(--cx-text)]">
              {TABS.find(t => t.id === activeTab)?.label}
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-3)]">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 scrollable">
            {activeTab === 'general' && <GeneralTab />}
            {activeTab === 'appearance' && <AppearanceTab />}
            {activeTab === 'permissions' && <PermissionsTab />}
            {activeTab === 'personalization' && <PersonalizationTab />}
            {activeTab === 'shortcuts' && <ShortcutsTab />}
            {activeTab === 'mcp' && <MCPTab />}
            {activeTab === 'hooks' && <HooksTab />}
            {activeTab === 'connection' && <ConnectionTab />}
            {activeTab === 'git' && <GitTab />}
            {activeTab === 'environment' && <EnvironmentTab />}
            {activeTab === 'filetree' && <FileTreeTab />}
            {activeTab === 'remote' && <RemoteAccessTab />}
            {activeTab === 'archived' && <ArchivedTab />}
            {activeTab === 'usage' && <UsageTab />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
