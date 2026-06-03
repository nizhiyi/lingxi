import { DollarSign } from 'lucide-react';
import { cn } from '../../ui/cn';

export function CostIndicator({ cost, modelUsage }) {
  if (!cost && !modelUsage) return null;

  const totalCost = cost || 0;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--cx-surface-2)] border border-[var(--cx-border)]">
      <DollarSign size={11} className="text-[var(--cx-success)]" />
      <span className="text-[10px] font-mono text-[var(--cx-text-2)] tabular-nums">
        ${totalCost.toFixed(4)}
      </span>
      {modelUsage && Object.keys(modelUsage).length > 0 && (
        <div className="flex items-center gap-1 ml-1">
          {Object.entries(modelUsage).slice(0, 2).map(([model, usage]) => (
            <span key={model} className="text-[9px] text-[var(--cx-text-3)] font-mono">
              {model.split('/').pop()?.slice(0, 8)}: ${(usage.cost || 0).toFixed(3)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
