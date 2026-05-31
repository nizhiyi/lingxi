import { useState } from 'react';
import {
  FileText, Pencil, Terminal, Search, FolderOpen, Wrench, Code2,
  ChevronDown, ChevronRight, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { cn } from '../ui/cn';

const TOOL_META = {
  Read:      { icon: FileText, color: 'blue',   label: '读取文件' },
  Glob:      { icon: FolderOpen, color: 'blue',  label: '搜索文件' },
  Grep:      { icon: Search, color: 'amber',     label: '搜索内容' },
  LS:        { icon: FolderOpen, color: 'blue',  label: '列出目录' },
  Edit:      { icon: Pencil, color: 'purple',    label: '编辑文件' },
  MultiEdit: { icon: Pencil, color: 'purple',    label: '批量编辑' },
  Write:     { icon: Pencil, color: 'purple',    label: '写入文件' },
  Bash:      { icon: Terminal, color: 'emerald',  label: '执行命令' },
};

const COLOR_MAP = {
  blue:    { border: 'border-l-blue-500', bg: 'bg-blue-500/5', icon: 'text-blue-400', head: 'text-blue-300' },
  purple:  { border: 'border-l-purple-500', bg: 'bg-purple-500/5', icon: 'text-purple-400', head: 'text-purple-300' },
  emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-500/5', icon: 'text-emerald-400', head: 'text-emerald-300' },
  amber:   { border: 'border-l-amber-500', bg: 'bg-amber-500/5', icon: 'text-amber-400', head: 'text-amber-300' },
  gray:    { border: 'border-l-[#555]', bg: 'bg-white/[.02]', icon: 'text-[#888]', head: 'text-[#999]' },
};

function getMeta(name) {
  if (TOOL_META[name]) return TOOL_META[name];
  if (name?.startsWith('mcp__')) return { icon: Wrench, color: 'gray', label: name };
  return { icon: Code2, color: 'gray', label: name || '工具' };
}

export function CodeToolCard({ name, label, done, input, status, ms }) {
  const [open, setOpen] = useState(false);
  const meta = getMeta(name);
  const colors = COLOR_MAP[meta.color] || COLOR_MAP.gray;
  const Icon = meta.icon;
  const failed = status === 'failed';
  const showDetail = Boolean(input);

  const summary = buildSummary(name, input);

  return (
    <div className={cn(
      'my-1.5 ml-4 border-l-2 rounded-r-md overflow-hidden transition-colors',
      colors.border, colors.bg,
    )}>
      <button
        type="button"
        onClick={() => showDetail && setOpen(v => !v)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs',
          showDetail && 'hover:bg-white/[.03] cursor-pointer',
        )}
      >
        <span className={cn('shrink-0', colors.icon)}>
          {!done && !failed ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Icon size={13} />
          )}
        </span>

        <span className={cn('font-medium font-mono', colors.head)}>
          {meta.label}
        </span>

        {summary && (
          <span className="text-[#666] truncate font-mono flex-1">{summary}</span>
        )}

        <span className="flex items-center gap-1.5 shrink-0 ml-auto">
          {failed ? (
            <span className="text-red-400 flex items-center gap-1">
              <AlertCircle size={12} /> 失败
            </span>
          ) : done ? (
            <span className="text-emerald-500 flex items-center gap-1">
              <CheckCircle2 size={12} />
              {ms ? `${(ms / 1000).toFixed(1)}s` : '完成'}
            </span>
          ) : (
            <span className="text-[#555]">执行中</span>
          )}
          {showDetail && (
            open ? <ChevronDown size={12} className="text-[#555]" />
                 : <ChevronRight size={12} className="text-[#555]" />
          )}
        </span>
      </button>

      {open && showDetail && (
        <div className="border-t border-[#2a2a2a] px-3 py-2 text-[11px] font-mono text-[#777] whitespace-pre-wrap break-all max-h-80 overflow-y-auto scrollable">
          {renderDetail(name, input)}
        </div>
      )}
    </div>
  );
}

function buildSummary(name, input) {
  if (!input) return '';
  if (name === 'Read' || name === 'Write' || name === 'Edit' || name === 'MultiEdit') {
    const match = input.match(/(?:file_path|path)['":\s]+([^\s'",$}]+)/);
    return match ? match[1] : input.slice(0, 60);
  }
  if (name === 'Bash') {
    const match = input.match(/(?:command)['":\s]+(.+?)(?:['"}]|$)/);
    return match ? `$ ${match[1].slice(0, 80)}` : input.slice(0, 80);
  }
  if (name === 'Grep') {
    const match = input.match(/(?:pattern)['":\s]+(.+?)(?:['"}]|$)/);
    return match ? `/${match[1]}/` : input.slice(0, 60);
  }
  if (name === 'Glob') {
    const match = input.match(/(?:pattern|glob)['":\s]+(.+?)(?:['"}]|$)/);
    return match ? match[1] : input.slice(0, 60);
  }
  return input.length > 80 ? input.slice(0, 80) + '…' : input;
}

function renderDetail(name, input) {
  if (name === 'Edit' || name === 'MultiEdit' || name === 'Write') {
    return <DiffPreview input={input} />;
  }
  if (name === 'Bash') {
    return <BashPreview input={input} />;
  }
  return input;
}

function DiffPreview({ input }) {
  const lines = (input || '').split('\n');
  return (
    <div className="space-y-0">
      {lines.map((line, i) => {
        const trimmed = line.trimStart();
        let lineClass = 'text-[#666]';
        if (trimmed.startsWith('+') && !trimmed.startsWith('+++')) lineClass = 'text-emerald-400 bg-emerald-500/10';
        else if (trimmed.startsWith('-') && !trimmed.startsWith('---')) lineClass = 'text-red-400 bg-red-500/10';
        else if (trimmed.startsWith('@@')) lineClass = 'text-cyan-400';
        return <div key={i} className={cn('px-1 leading-5', lineClass)}>{line}</div>;
      })}
    </div>
  );
}

function BashPreview({ input }) {
  const match = input?.match(/(?:command)['":\s]+(.+?)(?:['"}]|$)/s);
  const cmd = match ? match[1] : input;
  return (
    <div>
      <div className="text-emerald-400">$ {cmd}</div>
    </div>
  );
}
