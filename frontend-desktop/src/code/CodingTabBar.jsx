import { useCallback } from 'react';
import { X, Plus, Settings, Clock } from 'lucide-react';
import { cn } from '../ui/cn';
import { useStore } from '../state/useStore';

export function CodingTabBar() {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const setActiveSession = useStore((s) => s.setActiveSession);
  const createSession = useStore((s) => s.createSession);
  const deleteSession = useStore((s) => s.deleteSession);
  const codingView = useStore((s) => s.codingView);
  const setCodingView = useStore((s) => s.setCodingView);

  const openSessions = sessions.slice(0, 8);

  const handleNew = useCallback(() => {
    createSession('编程会话');
    setCodingView('chat');
  }, [createSession, setCodingView]);

  const handleClose = useCallback((e, id) => {
    e.stopPropagation();
    deleteSession(id);
  }, [deleteSession]);

  return (
    <div className="h-9 flex items-center bg-[#faf8f6] border-b border-[#e8e4e0] shrink-0 select-none app-drag overflow-hidden">
      <div className="flex items-center h-full overflow-x-auto no-scrollbar app-no-drag">
        {codingView === 'settings' && (
          <div className={cn(
            'h-full flex items-center gap-1.5 px-4 text-[12px] font-medium border-r border-[#e8e4e0] shrink-0',
            'bg-white text-[#3a2f24] border-b-2 border-b-[#c4a882]'
          )}>
            <Settings size={12} />
            <span>Settings</span>
            <button
              onClick={() => setCodingView('chat')}
              className="ml-1 p-0.5 rounded hover:bg-[#f0ebe6] text-[#bbb] hover:text-[#666] transition"
            >
              <X size={11} />
            </button>
          </div>
        )}
        {codingView === 'scheduled' && (
          <div className={cn(
            'h-full flex items-center gap-1.5 px-4 text-[12px] font-medium border-r border-[#e8e4e0] shrink-0',
            'bg-white text-[#3a2f24] border-b-2 border-b-[#c4a882]'
          )}>
            <Clock size={12} />
            <span>Scheduled</span>
            <button
              onClick={() => setCodingView('chat')}
              className="ml-1 p-0.5 rounded hover:bg-[#f0ebe6] text-[#bbb] hover:text-[#666] transition"
            >
              <X size={11} />
            </button>
          </div>
        )}
        {openSessions.map((s) => {
          const active = codingView === 'chat' && s.id === activeSessionId;
          return (
            <button
              key={s.id}
              onClick={() => { setActiveSession(s.id); setCodingView('chat'); }}
              className={cn(
                'h-full flex items-center gap-1.5 px-4 text-[12px] border-r border-[#e8e4e0] shrink-0 max-w-[180px] transition-all app-no-drag',
                active
                  ? 'bg-white text-[#3a2f24] font-medium border-b-2 border-b-[#c4a882]'
                  : 'text-[#888] hover:bg-[#f5f0eb] hover:text-[#555]'
              )}
            >
              {active && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
              <span className="truncate">{s.title || 'Untitled Session'}</span>
              <span
                onClick={(e) => handleClose(e, s.id)}
                className="ml-0.5 p-0.5 rounded hover:bg-[#ede5dc] text-[#ccc] hover:text-[#666] transition shrink-0"
              >
                <X size={11} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex-1 app-drag" />
      <div className="flex items-center gap-1 pr-2 app-no-drag shrink-0">
        <button
          onClick={handleNew}
          className="p-1.5 rounded-md text-[#aaa] hover:text-[#666] hover:bg-[#f0ebe6] transition"
          title="新建会话"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
