import { useState, useMemo } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, X } from 'lucide-react';
import { cn } from '../ui/cn';

export function DiffViewer({ filePath, oldContent, newContent, onClose }) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('unified');

  const shortPath = filePath ? filePath.split('/').pop() : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(filePath || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const diffLines = useMemo(() => computeDiff(oldContent || '', newContent || ''), [oldContent, newContent]);

  const added = diffLines.filter(l => l.type === 'add').length;
  const removed = diffLines.filter(l => l.type === 'remove').length;

  return (
    <div className="rounded-xl border border-[#e8e4e0] overflow-hidden bg-white my-3">
      {/* 文件路径头部 */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#faf8f6] border-b border-[#e8e4e0]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[12px] font-mono text-[#999] truncate">{filePath}</span>
          <button
            onClick={handleCopy}
            className="p-0.5 rounded text-[#bbb] hover:text-[#666] transition shrink-0"
            title="Copy path"
          >
            {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
          </button>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-green-600">+{added}</span>
            <span className="text-red-500">-{removed}</span>
          </div>
          <div className="flex items-center gap-0.5 ml-1">
            {Array.from({ length: Math.min(added, 15) }).map((_, i) => (
              <span key={`a${i}`} className="w-1 h-2.5 bg-green-500 rounded-[1px]" />
            ))}
            {Array.from({ length: Math.min(removed, 15) }).map((_, i) => (
              <span key={`r${i}`} className="w-1 h-2.5 bg-red-400 rounded-[1px]" />
            ))}
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded text-[#bbb] hover:text-[#666] transition">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Diff 内容 */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollable">
        <table className="w-full text-[12px] font-mono leading-5">
          <tbody>
            {diffLines.map((line, i) => (
              <tr
                key={i}
                className={cn(
                  line.type === 'add' && 'bg-green-50',
                  line.type === 'remove' && 'bg-red-50',
                  line.type === 'context' && 'bg-white',
                  line.type === 'hunk' && 'bg-blue-50',
                )}
              >
                <td className="w-10 text-right pr-2 text-[#ccc] select-none border-r border-[#f0ebe6] align-top">
                  {line.oldNum || ''}
                </td>
                <td className="w-10 text-right pr-2 text-[#ccc] select-none border-r border-[#f0ebe6] align-top">
                  {line.newNum || ''}
                </td>
                <td className="w-5 text-center select-none align-top">
                  <span className={cn(
                    line.type === 'add' && 'text-green-600',
                    line.type === 'remove' && 'text-red-500',
                    line.type === 'hunk' && 'text-blue-500',
                  )}>
                    {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : line.type === 'hunk' ? '@@' : ' '}
                  </span>
                </td>
                <td className={cn(
                  'px-3 whitespace-pre-wrap break-all',
                  line.type === 'add' && 'text-green-800',
                  line.type === 'remove' && 'text-red-700',
                  line.type === 'context' && 'text-[#555]',
                  line.type === 'hunk' && 'text-blue-600 italic',
                )}>
                  {line.text}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* "Added line" 标注悬浮 */}
      {added > 0 && (
        <div className="px-4 py-1.5 bg-[#faf8f6] border-t border-[#e8e4e0] text-[11px] text-[#999]">
          {added} line{added > 1 ? 's' : ''} added, {removed} line{removed > 1 ? 's' : ''} removed
        </div>
      )}
    </div>
  );
}

function computeDiff(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result = [];

  const maxOld = oldLines.length;
  const maxNew = newLines.length;
  const maxLen = Math.max(maxOld, maxNew);

  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < maxOld || newIdx < maxNew) {
    if (oldIdx < maxOld && newIdx < maxNew && oldLines[oldIdx] === newLines[newIdx]) {
      result.push({
        type: 'context',
        text: oldLines[oldIdx],
        oldNum: oldIdx + 1,
        newNum: newIdx + 1,
      });
      oldIdx++;
      newIdx++;
    } else if (newIdx < maxNew && (oldIdx >= maxOld || oldLines[oldIdx] !== newLines[newIdx])) {
      if (oldIdx < maxOld && newIdx < maxNew) {
        result.push({
          type: 'remove',
          text: oldLines[oldIdx],
          oldNum: oldIdx + 1,
          newNum: '',
        });
        result.push({
          type: 'add',
          text: newLines[newIdx],
          oldNum: '',
          newNum: newIdx + 1,
        });
        oldIdx++;
        newIdx++;
      } else if (newIdx < maxNew) {
        result.push({
          type: 'add',
          text: newLines[newIdx],
          oldNum: '',
          newNum: newIdx + 1,
        });
        newIdx++;
      } else {
        result.push({
          type: 'remove',
          text: oldLines[oldIdx],
          oldNum: oldIdx + 1,
          newNum: '',
        });
        oldIdx++;
      }
    }
  }

  return result;
}

export function InlineDiffView({ diffText, filePath }) {
  const lines = (diffText || '').split('\n');
  const added = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
  const removed = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length;

  return (
    <div className="rounded-xl border border-[#e8e4e0] overflow-hidden bg-white my-2">
      {filePath && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#faf8f6] border-b border-[#e8e4e0]">
          <span className="text-[11px] font-mono text-[#999] truncate">{filePath}</span>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-green-600">+{added}</span>
            <span className="text-red-500">-{removed}</span>
          </div>
        </div>
      )}
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto scrollable">
        {lines.map((line, i) => {
          let cls = 'text-[#555] bg-white';
          if (line.startsWith('+') && !line.startsWith('+++')) cls = 'text-green-700 bg-green-50';
          else if (line.startsWith('-') && !line.startsWith('---')) cls = 'text-red-600 bg-red-50';
          else if (line.startsWith('@@')) cls = 'text-blue-500 bg-blue-50';
          return (
            <div key={i} className={cn('flex leading-5 px-1 text-[12px] font-mono', cls)}>
              <span className="inline-block w-8 text-right mr-1 text-[#ccc] select-none text-[11px] shrink-0">{i + 1}</span>
              <span className="flex-1 whitespace-pre-wrap">{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
