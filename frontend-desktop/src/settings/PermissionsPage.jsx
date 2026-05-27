import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Plus, Trash2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { Button, Card, Input, Select, Badge, Modal } from '../ui/primitives';
import { cn } from '../ui/cn';

const BEHAVIORS = [
  { value: 'allow', label: '自动放行', color: 'text-emerald-600' },
  { value: 'ask',   label: '需要确认', color: 'text-amber-600' },
  { value: 'deny',  label: '禁止执行', color: 'text-red-600' },
];

const RISK_COLORS = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  auto_approved: CheckCircle,
};

const STATUS_LABELS = {
  pending: '待审批',
  approved: '已放行',
  rejected: '已拒绝',
  auto_approved: '自动放行',
};

export default function PermissionsPage() {
  const [rules, setRules] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [pending, setPending] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState('rules');

  const loadData = useCallback(async () => {
    try {
      const [r, a, p] = await Promise.all([
        api.listPermissionRules(),
        api.listRecentApprovals(100),
        api.listPendingApprovals(),
      ]);
      setRules(Array.isArray(r) ? r : (r?.rules || []));
      setApprovals(Array.isArray(a) ? a : (a?.approvals || []));
      setPending(Array.isArray(p) ? p : (p?.approvals || []));
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReview = async (id, action) => {
    try {
      await api.reviewApproval(id, action);
      loadData();
    } catch {}
  };

  const handleDeleteRule = async (id) => {
    try {
      await api.deletePermissionRule(id);
      loadData();
    } catch {}
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text)] flex items-center gap-2">
          <ShieldCheck size={20} /> 权限与审批
        </h2>
        <p className="text-sm text-[color:var(--text-soft)] mt-1">
          管理工具调用权限规则，审核危险操作请求
        </p>
      </div>

      {pending.length > 0 && (
        <Card className="p-4 border-l-4 border-amber-500">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-500" />
            <span className="text-sm font-semibold text-[color:var(--text)]">
              {pending.length} 项待审批
            </span>
          </div>
          <div className="space-y-2">
            {pending.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-[color:var(--bg-soft)]">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[color:var(--text)] truncate">{a.tool_name}</div>
                  <div className="text-xs text-[color:var(--text-faint)] truncate">{a.tool_input?.slice(0, 80)}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-3">
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', RISK_COLORS[a.risk_level] || RISK_COLORS.low)}>
                    {a.risk_level}
                  </span>
                  <Button size="sm" className="text-xs" onClick={() => handleReview(a.id, 'approved')}>放行</Button>
                  <Button size="sm" variant="ghost" className="text-xs text-red-600" onClick={() => handleReview(a.id, 'rejected')}>拒绝</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-1 border-b border-[color:var(--line)]">
        {[{ id: 'rules', label: '权限规则' }, { id: 'history', label: '审批记录' }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm border-b-2 transition-colors',
              tab === t.id
                ? 'border-[color:var(--accent)] text-[color:var(--accent)] font-medium'
                : 'border-transparent text-[color:var(--text-soft)] hover:text-[color:var(--text)]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'rules' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus size={14} className="mr-1" /> 添加规则
            </Button>
          </div>

          {rules.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-[color:var(--text-faint)]">暂无自定义规则，系统将使用默认安全策略</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {rules.map((r) => {
                const beh = BEHAVIORS.find((b) => b.value === r.behavior) || BEHAVIORS[1];
                return (
                  <Card key={r.id} className="p-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[color:var(--text)]">{r.tool_name || '*'}</span>
                        {r.pattern && <span className="text-xs text-[color:var(--text-faint)]">匹配: {r.pattern}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn('text-xs font-medium', beh.color)}>{beh.label}</span>
                        <span className="text-[10px] text-[color:var(--text-faint)]">来源: {r.source}</span>
                      </div>
                    </div>
                    <button
                      className="p-1.5 rounded-md hover:bg-red-50 text-[color:var(--text-faint)] hover:text-red-500 transition"
                      onClick={() => handleDeleteRule(r.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {approvals.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-[color:var(--text-faint)]">暂无审批记录</p>
            </Card>
          ) : (
            approvals.map((a) => {
              const StatusIcon = STATUS_ICONS[a.status] || Clock;
              return (
                <Card key={a.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[color:var(--text)]">{a.tool_name}</span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', RISK_COLORS[a.risk_level] || RISK_COLORS.low)}>
                          {a.risk_level}
                        </span>
                      </div>
                      <div className="text-xs text-[color:var(--text-faint)] truncate mt-1">
                        {a.tool_input?.slice(0, 120)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      <StatusIcon size={14} className={
                        a.status === 'approved' || a.status === 'auto_approved' ? 'text-emerald-500' :
                        a.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                      } />
                      <span className="text-xs text-[color:var(--text-soft)]">{STATUS_LABELS[a.status]}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-[color:var(--text-faint)] mt-1">
                    {a.created_at}
                    {a.reason && <> · {a.reason}</>}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {showAdd && <AddRuleModal onClose={() => setShowAdd(false)} onSaved={loadData} />}
    </div>
  );
}

function AddRuleModal({ onClose, onSaved }) {
  const [toolName, setToolName] = useState('');
  const [pattern, setPattern] = useState('');
  const [behavior, setBehavior] = useState('ask');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.createPermissionRule({ tool_name: toolName, pattern, behavior, agent_id: 0 });
      onSaved();
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Modal open title="添加权限规则" onClose={onClose} width={420} footer={
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
      </div>
    }>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[color:var(--text)] mb-1">工具名称</label>
          <Input value={toolName} onChange={(e) => setToolName(e.target.value)} placeholder="留空表示匹配所有工具" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[color:var(--text)] mb-1">匹配模式</label>
          <Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="正则表达式（可选）" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[color:var(--text)] mb-1">行为</label>
          <Select value={behavior} onChange={(e) => setBehavior(e.target.value)}>
            {BEHAVIORS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </Select>
        </div>
      </div>
    </Modal>
  );
}
