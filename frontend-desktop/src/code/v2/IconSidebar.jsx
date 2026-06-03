import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquarePlus, Search, Puzzle, Zap, Smartphone,
  FolderOpen, FolderTree, Settings, ArrowLeftRight, Terminal,
} from 'lucide-react';
import { cn } from '../../ui/cn';
import { useStore } from '../../state/useStore';

const ICON_SIZE = 18;

const NAV_ITEMS = [
  { id: 'new', icon: MessageSquarePlus, label: '新对话', action: 'new' },
  { id: 'search', icon: Search, label: '搜索', action: 'search' },
  { id: 'files', icon: FolderTree, label: '文件树', action: 'files' },
  { id: 'terminal', icon: Terminal, label: '终端', action: 'terminal' },
  { id: 'plugins', icon: Puzzle, label: '插件', action: 'plugins' },
  { id: 'automation', icon: Zap, label: '自动化', action: 'automation' },
  { id: 'mobile', icon: Smartphone, label: '远程访问', action: 'mobile' },
];

const BOTTOM_ITEMS = [
  { id: 'project', icon: FolderOpen, label: '项目', action: 'project' },
  { id: 'settings', icon: Settings, label: '设置', action: 'settings' },
  { id: 'switch', icon: ArrowLeftRight, label: '切换模式', action: 'switch' },
];

export function IconSidebar({ onAction, activeAction }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="w-[48px] h-full flex flex-col items-center py-3 gap-1 border-r border-[var(--cx-border)] bg-[var(--cx-bg)] shrink-0 select-none">
      {/* Logo */}
      <div className="w-8 h-8 rounded-lg bg-[var(--cx-accent-soft)] flex items-center justify-center mb-4">
        <span className="text-[var(--cx-accent)] font-bold text-sm font-mono">&gt;_</span>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col items-center gap-0.5 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeAction === item.action;
          return (
            <button
              key={item.id}
              onClick={() => onAction(item.action)}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                'relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-[var(--cx-accent-soft)] text-[var(--cx-accent)]'
                  : 'text-[var(--cx-text-3)] hover:text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-2)]'
              )}
            >
              <Icon size={ICON_SIZE} strokeWidth={1.8} />
              {isActive && (
                <motion.div
                  layoutId="icon-indicator"
                  className="absolute left-0 w-[3px] h-4 rounded-r-full bg-[var(--cx-accent)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              {/* Tooltip */}
              {hovered === item.id && (
                <div className="absolute left-[52px] top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 text-[11px] font-medium text-[var(--cx-text)] bg-[var(--cx-surface-2)] border border-[var(--cx-border)] rounded-md shadow-lg whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="flex flex-col items-center gap-0.5">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeAction === item.action;
          return (
            <button
              key={item.id}
              onClick={() => onAction(item.action)}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                'relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-[var(--cx-accent-soft)] text-[var(--cx-accent)]'
                  : 'text-[var(--cx-text-3)] hover:text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-2)]'
              )}
            >
              <Icon size={ICON_SIZE} strokeWidth={1.8} />
              {hovered === item.id && (
                <div className="absolute left-[52px] top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 text-[11px] font-medium text-[var(--cx-text)] bg-[var(--cx-surface-2)] border border-[var(--cx-border)] rounded-md shadow-lg whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
