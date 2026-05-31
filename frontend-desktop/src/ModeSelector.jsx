import { motion } from 'framer-motion';
import { MessageSquare, Code2, ArrowRight } from 'lucide-react';
import { useStore } from './state/useStore';

export default function ModeSelector() {
  const setAppMode = useStore((s) => s.setAppMode);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f8f6f4] to-[#efe9e3]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <img src="/logo.png" alt="灵犀" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg" />
        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">欢迎使用灵犀</h1>
        <p className="text-sm text-[#888]">选择你的工作模式</p>
      </motion.div>

      <div className="flex gap-6 px-6 max-w-3xl w-full">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          onClick={() => setAppMode('main')}
          className="flex-1 group relative p-8 rounded-2xl bg-white border-2 border-[#e8e4e0] hover:border-[#c4a882] shadow-sm hover:shadow-xl transition-all duration-300 text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f0e6d9] to-[#e8d5c0] flex items-center justify-center mb-5">
            <MessageSquare size={24} className="text-[#a07850]" />
          </div>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-2">灵犀智能体</h2>
          <p className="text-sm text-[#888] leading-relaxed mb-6">
            通用桌面 AI 助手，支持多模型对话、智能体工厂、知识库、技能管理、Agent 协作等完整能力。
          </p>
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#a07850] group-hover:gap-2.5 transition-all">
            <span>进入</span>
            <ArrowRight size={14} />
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          onClick={() => setAppMode('coding')}
          className="flex-1 group relative p-8 rounded-2xl bg-white border-2 border-[#e8e4e0] hover:border-[#c4a882] shadow-sm hover:shadow-xl transition-all duration-300 text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f0e6d9] to-[#e8d5c0] flex items-center justify-center mb-5">
            <Code2 size={24} className="text-[#a07850]" />
          </div>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-2">Coding Agent</h2>
          <p className="text-sm text-[#888] leading-relaxed mb-6">
            专业编程助手，帮你构建、调试和架构项目。支持文件编辑、终端执行、代码审查和 Agent 团队协作。
          </p>
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#a07850] group-hover:gap-2.5 transition-all">
            <span>进入</span>
            <ArrowRight size={14} />
          </div>
        </motion.button>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-xs text-[#bbb]"
      >
        随时可以在应用内切换模式
      </motion.p>
    </div>
  );
}
