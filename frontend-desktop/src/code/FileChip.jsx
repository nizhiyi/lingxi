import { useState, useCallback } from 'react';
import { FileText, X } from 'lucide-react';
import { cn } from '../ui/cn';

export function FileChip({ name, path, onRemove, onClick, size = 'md' }) {
  const [hover, setHover] = useState(false);

  const ext = name?.split('.').pop()?.toLowerCase() || '';
  const iconColor = getFileColor(ext);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border transition cursor-default',
        'bg-[#f5f0eb] border-[#e0dbd5] text-[#666] hover:border-[#c4a882]',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]',
      )}
      title={path}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <FileText size={size === 'sm' ? 10 : 12} className={iconColor} />
      <span
        className={cn('truncate', onClick && 'cursor-pointer hover:underline', size === 'sm' ? 'max-w-[100px]' : 'max-w-[150px]')}
        onClick={onClick}
      >
        {name}
      </span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className={cn(
            'p-0.5 rounded transition',
            hover ? 'text-[#999] hover:text-red-400' : 'text-transparent'
          )}
        >
          <X size={size === 'sm' ? 8 : 10} />
        </button>
      )}
    </div>
  );
}

function getFileColor(ext) {
  const colors = {
    js: 'text-yellow-500', jsx: 'text-yellow-500', ts: 'text-blue-500', tsx: 'text-blue-500',
    go: 'text-cyan-500', py: 'text-green-500', rs: 'text-orange-500',
    css: 'text-purple-500', html: 'text-orange-500', json: 'text-yellow-600',
    md: 'text-gray-500', txt: 'text-gray-400',
    sh: 'text-green-600', yaml: 'text-red-400', yml: 'text-red-400',
  };
  return colors[ext] || 'text-[#c4a882]';
}
