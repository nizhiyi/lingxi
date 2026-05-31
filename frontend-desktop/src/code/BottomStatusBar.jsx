import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, GitBranch, ChevronDown, Monitor } from 'lucide-react';
import { cn } from '../ui/cn';

const STORAGE_KEY = 'lingxi-code-project-path';

export function BottomStatusBar({ projectPath, onChangeProject }) {
  const [gitBranch, setGitBranch] = useState('');
  const shortPath = projectPath
    ? projectPath.split('/').pop() || projectPath.replace(/^\/Users\/[^/]+/, '~')
    : '未选择项目';

  useEffect(() => {
    if (!projectPath) return;
    fetch(`/api/files/project?path=${encodeURIComponent(projectPath)}`)
      .then(r => r.json())
      .then(d => {
        if (d.git_branch) setGitBranch(d.git_branch);
      })
      .catch(() => {});
  }, [projectPath]);

  return (
    <div className="h-7 flex items-center gap-3 px-3 bg-[#faf8f6] border-t border-[#e8e4e0] text-[11px] text-[#999] select-none shrink-0">
      <button
        onClick={onChangeProject}
        className="flex items-center gap-1.5 hover:text-[#666] transition"
        title="切换项目目录"
      >
        <FolderOpen size={12} className="text-[#c4a882]" />
        <span className="font-medium text-[#666]">{shortPath}</span>
        <ChevronDown size={10} />
      </button>

      {gitBranch && (
        <>
          <span className="text-[#ddd]">|</span>
          <div className="flex items-center gap-1">
            <GitBranch size={11} />
            <span>{gitBranch}</span>
          </div>
        </>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Monitor size={11} />
        <span>当前工作树</span>
        <ChevronDown size={10} />
      </div>
    </div>
  );
}
