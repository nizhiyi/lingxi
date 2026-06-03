import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, X, Sparkles, ChevronRight, Play, Bot } from 'lucide-react';
import { cn } from '../../ui/cn';
import { useStore } from '../../state/useStore';

function RolePicker({ roles, onChange, agents }) {
  const [showAdd, setShowAdd] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  const addFromFactory = (agent) => {
    onChange([...roles, {
      id: `role_${Date.now()}`,
      name: agent.name,
      description: agent.system_prompt?.slice(0, 100) || '',
      agentId: agent.id,
      tools: 'full',
    }]);
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    onChange([...roles, {
      id: `role_${Date.now()}`,
      name: customName,
      description: customDesc,
      tools: 'full',
    }]);
    setCustomName('');
    setCustomDesc('');
    setShowAdd(false);
  };

  const removeRole = (idx) => {
    onChange(roles.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {/* Current roles */}
      <div className="space-y-1.5">
        {roles.map((role, i) => (
          <div key={role.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--cx-border)] bg-[var(--cx-surface-2)]">
            <Bot size={14} className="text-[var(--cx-accent)] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-[var(--cx-text)]">{role.name}</div>
              {role.description && (
                <div className="text-[10px] text-[var(--cx-text-3)] truncate">{role.description}</div>
              )}
            </div>
            <button onClick={() => removeRole(i)} className="p-1 rounded hover:bg-[var(--cx-surface-3)] text-[var(--cx-text-3)]">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Add role */}
      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-[var(--cx-border)] text-[12px] text-[var(--cx-text-3)] hover:border-[var(--cx-accent)] hover:text-[var(--cx-accent)] transition-colors"
        >
          <Plus size={13} />
          Add Agent
        </button>
      ) : (
        <div className="p-3 rounded-lg border border-[var(--cx-border)] bg-[var(--cx-bg)] space-y-2">
          {/* From factory */}
          {(agents || []).length > 0 && (
            <div>
              <div className="text-[10px] text-[var(--cx-text-3)] font-semibold uppercase mb-1">From Factory</div>
              <div className="flex flex-wrap gap-1">
                {agents.slice(0, 6).map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => addFromFactory(agent)}
                    className="px-2 py-1 rounded-md text-[10px] bg-[var(--cx-surface-2)] text-[var(--cx-text-2)] hover:bg-[var(--cx-accent-soft)] hover:text-[var(--cx-accent)] border border-[var(--cx-border)] transition-colors"
                  >
                    {agent.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Custom */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--cx-border)]">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Role name (e.g. Frontend Dev)"
              className="w-full px-2.5 py-1.5 rounded-md border border-[var(--cx-border)] bg-[var(--cx-surface)] text-[11px] text-[var(--cx-text)] placeholder:text-[var(--cx-text-3)] focus:outline-none focus:border-[var(--cx-border-active)]"
            />
            <input
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="Role description (optional)"
              className="w-full px-2.5 py-1.5 rounded-md border border-[var(--cx-border)] bg-[var(--cx-surface)] text-[11px] text-[var(--cx-text)] placeholder:text-[var(--cx-text-3)] focus:outline-none focus:border-[var(--cx-border-active)]"
            />
            <div className="flex items-center gap-1.5">
              <button onClick={addCustom} disabled={!customName.trim()} className="px-3 py-1 rounded-md text-[11px] font-medium bg-[var(--cx-accent)] text-white hover:opacity-90 disabled:opacity-50">
                Add
              </button>
              <button onClick={() => setShowAdd(false)} className="px-3 py-1 rounded-md text-[11px] text-[var(--cx-text-3)] hover:bg-[var(--cx-surface-2)]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TeamSetupWizard({ onStart, onCancel }) {
  const [step, setStep] = useState(0);
  const [requirement, setRequirement] = useState('');
  const [roles, setRoles] = useState([]);
  const agents = useStore((s) => s.agents);

  const handleStart = () => {
    if (!requirement.trim() || roles.length < 2) return;
    onStart({
      requirement,
      roles,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[90vw] max-w-lg bg-[var(--cx-surface)] border border-[var(--cx-border)] rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--cx-border)] bg-gradient-to-r from-[var(--cx-purple)]/10 to-[var(--cx-accent)]/10">
          <div className="w-10 h-10 rounded-xl bg-[var(--cx-purple)]/15 flex items-center justify-center">
            <Users size={20} className="text-[var(--cx-purple)]" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-[var(--cx-text)]">Agent Teams</h2>
            <p className="text-[11px] text-[var(--cx-text-3)]">Assemble a team to work on your task in parallel</p>
          </div>
          <button onClick={onCancel} className="ml-auto p-1.5 rounded-lg hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-3)]">
            <X size={16} />
          </button>
        </div>

        {/* Steps */}
        <div className="px-5 py-5 space-y-5">
          {/* Step 1: Requirement */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--cx-text-2)] uppercase tracking-wider mb-2 block">
              1. Describe the task
            </label>
            <textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="What do you want the team to build?"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--cx-bg)] border border-[var(--cx-border)] text-[12px] text-[var(--cx-text)] placeholder:text-[var(--cx-text-3)] focus:outline-none focus:border-[var(--cx-border-active)] resize-none"
            />
          </div>

          {/* Step 2: Team composition */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--cx-text-2)] uppercase tracking-wider mb-2 block">
              2. Team composition ({roles.length} agents)
            </label>
            <RolePicker roles={roles} onChange={setRoles} agents={agents} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--cx-border)] bg-[var(--cx-surface-2)]">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[12px] text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-3)] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!requirement.trim() || roles.length < 2}
            className={cn(
              'flex items-center gap-1.5 px-5 py-2 rounded-lg text-[12px] font-medium transition-all',
              requirement.trim() && roles.length >= 2
                ? 'bg-[var(--cx-purple)] text-white hover:opacity-90'
                : 'bg-[var(--cx-surface-3)] text-[var(--cx-text-3)] cursor-not-allowed'
            )}
          >
            <Play size={12} />
            Start Team ({roles.length} agents)
          </button>
        </div>
      </div>
    </motion.div>
  );
}
