import { useState, useEffect, useCallback } from 'react';
import { Smartphone, Plus, Copy, Trash2, PowerOff, ExternalLink, Clock, QrCode, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/client';
import { Button, Card, Input, Modal } from '../ui/primitives';
import { cn } from '../ui/cn';

export default function RemoteAccessPage() {
  const [settings, setSettings] = useState({ enabled: false, permission_mode: 'readonly', allowed_origins: '' });
  const [tokens, setTokens] = useState([]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [qrToken, setQrToken] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([api.getH5Settings(), api.listH5Tokens()]);
      setSettings(s || { enabled: false, permission_mode: 'readonly', allowed_origins: '' });
      setTokens(Array.isArray(t) ? t : (t?.tokens || []));
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggle = async () => {
    const next = { ...settings, enabled: !settings.enabled };
    setSaving(true);
    try { await api.updateH5Settings(next); setSettings(next); } catch {} finally { setSaving(false); }
  };

  const handleRevoke = async (id) => { try { await api.revokeH5Token(id); loadData(); } catch {} };
  const handleDelete = async (id) => { try { await api.deleteH5Token(id); loadData(); } catch {} };

  const activeTokens = tokens.filter((t) => t.enabled);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text)] flex items-center gap-2">
          <Smartphone size={20} /> 远程访问
        </h2>
        <p className="text-sm text-[color:var(--text-soft)] mt-1">
          生成令牌后扫描二维码，在手机上查看桌面端的会话
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[color:var(--text)]">远程访问总开关</div>
            <div className="text-xs text-[color:var(--text-faint)] mt-0.5">
              {settings.enabled ? '已启用 — 可通过令牌从其他设备访问会话' : '已关闭 — 不接受任何远程访问'}
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={saving}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              settings.enabled ? 'bg-[color:var(--accent)]' : 'bg-gray-300'
            )}
          >
            <span className={cn(
              'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
              settings.enabled ? 'translate-x-6' : 'translate-x-1'
            )} />
          </button>
        </div>
      </Card>

      {settings.enabled && (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-[color:var(--text)]">
              访问令牌
              {activeTokens.length > 0 && (
                <span className="ml-2 text-xs text-[color:var(--text-faint)]">{activeTokens.length} 个有效</span>
              )}
            </div>
            <Button size="sm" onClick={() => setShowGenerate(true)}>
              <Plus size={14} className="mr-1" /> 生成令牌
            </Button>
          </div>

          {tokens.length === 0 ? (
            <Card className="p-6 text-center">
              <QrCode size={32} className="mx-auto text-[color:var(--text-faint)] mb-2" />
              <p className="text-sm text-[color:var(--text-faint)]">暂无令牌，点击"生成令牌"创建一个</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {tokens.map((t) => (
                <Card key={t.id} className={cn('p-3', !t.enabled && 'opacity-50')}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[color:var(--text)]">{t.label || '未命名'}</span>
                        {t.enabled ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">有效</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">已禁用</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[color:var(--text-faint)]">
                        <span className="font-mono">{t.token_preview}</span>
                        <span className="flex items-center gap-0.5">
                          <Clock size={10} />
                          {t.expires_at ? new Date(t.expires_at).toLocaleString('zh-CN') : '永不过期'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      {t.enabled && t.access_url && (
                        <button
                          className="p-1.5 rounded-md hover:bg-[color:var(--accent-soft)] text-[color:var(--text-faint)] hover:text-[color:var(--accent)] transition"
                          title="查看二维码"
                          onClick={() => setQrToken(t)}
                        >
                          <QrCode size={14} />
                        </button>
                      )}
                      {t.enabled && (
                        <button
                          className="p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 text-[color:var(--text-faint)] hover:text-amber-600 transition"
                          title="禁用"
                          onClick={() => handleRevoke(t.id)}
                        >
                          <PowerOff size={14} />
                        </button>
                      )}
                      <button
                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-[color:var(--text-faint)] hover:text-red-500 transition"
                        title="删除"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card className="p-4 bg-[color:var(--bg-soft)]">
            <div className="text-xs text-[color:var(--text-faint)] space-y-1">
              <p>• 生成令牌后可扫描二维码直接在手机上访问</p>
              <p>• 手机和电脑需在同一局域网（Wi-Fi）</p>
              <p>• 有效令牌的二维码可随时点击 <QrCode size={10} className="inline" /> 图标重新查看</p>
            </div>
          </Card>
        </>
      )}

      {showGenerate && <GenerateTokenModal onClose={() => setShowGenerate(false)} onCreated={loadData} />}
      {qrToken && <QRViewModal token={qrToken} onClose={() => setQrToken(null)} />}
    </div>
  );
}

function QRViewModal({ token, onClose }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(token.access_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal open title="扫码访问" onClose={onClose} width={360}>
      <div className="flex flex-col items-center space-y-4">
        <div className="p-4 bg-white rounded-2xl shadow-sm">
          <QRCodeSVG value={token.access_url} size={200} level="M" />
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-[color:var(--text)]">{token.label || '远程访问'}</div>
          <div className="text-xs text-[color:var(--text-faint)] mt-1">
            用手机相机或浏览器扫描上方二维码
          </div>
        </div>
        <div className="w-full flex items-center gap-2 p-2 rounded-lg bg-[color:var(--bg-soft)] border border-[color:var(--line)]">
          <code className="flex-1 text-[11px] font-mono text-[color:var(--text-soft)] break-all select-all">{token.access_url}</code>
          <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-[color:var(--accent-soft)] text-[color:var(--text-faint)] hover:text-[color:var(--accent)] transition shrink-0">
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        {token.expires_at && (
          <div className="text-[11px] text-[color:var(--text-faint)] flex items-center gap-1">
            <Clock size={10} /> 有效期至 {new Date(token.expires_at).toLocaleString('zh-CN')}
          </div>
        )}
      </div>
    </Modal>
  );
}

function GenerateTokenModal({ onClose, onCreated }) {
  const [label, setLabel] = useState('');
  const [expiresHours, setExpiresHours] = useState(24);
  const [token, setToken] = useState('');
  const [accessUrl, setAccessUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');

  const handleGenerate = async () => {
    setCreating(true);
    try {
      const result = await api.generateH5Token({ label: label || '远程访问', ttl_hours: expiresHours });
      setToken(result.token || result.full_token || '');
      setAccessUrl(result.access_url || '');
      onCreated();
    } catch {} finally { setCreating(false); }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  return (
    <Modal open title="生成访问令牌" onClose={onClose} width={420} footer={
      token ? (
        <Button onClick={onClose}>完成</Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={handleGenerate} disabled={creating}>{creating ? '生成中…' : '生成'}</Button>
        </div>
      )
    }>
      {token ? (
        <div className="flex flex-col items-center space-y-4">
          {accessUrl && (
            <>
              <div className="p-4 bg-white rounded-2xl shadow-sm">
                <QRCodeSVG value={accessUrl} size={200} level="M" />
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-[color:var(--text)]">扫码即可在手机上访问</div>
                <div className="text-xs text-[color:var(--text-faint)] mt-1">
                  确保手机和电脑在同一 Wi-Fi 网络
                </div>
              </div>
              <div className="w-full flex items-center gap-2 p-2 rounded-lg bg-[color:var(--bg-soft)] border border-[color:var(--line)]">
                <code className="flex-1 text-[11px] font-mono text-[color:var(--text-soft)] break-all select-all">{accessUrl}</code>
                <button onClick={() => handleCopy(accessUrl, 'url')} className="p-1.5 rounded-md hover:bg-[color:var(--accent-soft)] text-[color:var(--text-faint)] hover:text-[color:var(--accent)] transition shrink-0">
                  {copied === 'url' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </>
          )}
          <div className="w-full text-xs text-[color:var(--text-faint)] text-center">
            关闭后可在令牌列表点击 <QrCode size={10} className="inline" /> 图标重新查看二维码
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[color:var(--text)] mb-1">令牌标签</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="例如：iPhone 远程查看" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[color:var(--text)] mb-1">有效期（小时）</label>
            <Input type="number" value={expiresHours} onChange={(e) => setExpiresHours(Number(e.target.value))} min={1} max={720} />
            <p className="text-xs text-[color:var(--text-faint)] mt-1">建议 24 小时内，最长 30 天</p>
          </div>
          <div className="p-2.5 rounded-lg bg-[color:var(--bg-soft)] text-xs text-[color:var(--text-faint)] space-y-1">
            <p>生成后会显示二维码，用手机扫码即可访问会话。</p>
            <p>需要手机和电脑在同一 Wi-Fi 网络。</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
