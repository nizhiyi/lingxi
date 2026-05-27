---
name: architecture-prompt
description: 灵犀 AI Agent 项目架构图绘制提示词
type: reference
---

# 灵犀 AI Agent 架构图绘制提示词

## 概述

本提示词用于指导 GPT img2 绘制「灵犀 AI Agent」项目的整体架构图和多个核心业务流程图。项目是一个本地优先的桌面 AI Agent 工作台，采用 Electron + React + Go 三层架构。

---

## 一、整体架构图（System Architecture Overview）

### 绘制要求

- **视角**：系统全景，从用户视角到底层存储
- **布局**：自顶向下分层，清晰展示三层架构 + 特殊子系统
- **颜色方案**：
  - Electron 桌面壳层：深蓝色 (#2563EB)
  - React 前端层：紫色 (#9333EA)
  - Go 后端层：绿色 (#16A34A)
  - 数据存储层：灰色 (#6B7280)
  - 特殊子系统（Nexus/VectorDB/Evolution）：橙色 (#F97316)
  - 外部系统（AI引擎/信令服务器）：浅蓝色 (#60A5FA)

### 层次结构

```
┌─────────────────────────────────────────────────────────────┐
│ 第一层：Electron 桌面壳（Desktop Shell）                      │
├─────────────────────────────────────────────────────────────┤
│ • BrowserWindow 管理（主窗口 + Spotlight 悬浮窗）              │
│ • Go 后端进程启动与生命周期管理                                 │
│ • 内置 AI 引擎（Claude CLI + LiteLLM Bridge 模型协议转换）      │
│ • 全局快捷键监听（Cmd+Shift+S 截屏、Cmd+Shift+Space Spotlight）│
│ • Screen Controller（桌面操控引擎：截屏/鼠标/键盘）             │
│ • Clipboard Monitor（剪贴板智能监控）                          │
│ • Context Sensor（活跃窗口 + 浏览器 URL 上下文感知）            │
└─────────────────────────────────────────────────────────────┘
          ↕ IPC 通信
┌─────────────────────────────────────────────────────────────┐
│ 第二层：React 前端（SPA 界面）                                 │
├─────────────────────────────────────────────────────────────┤
│ • AppShell（主布局：顶部导航 + 侧边栏 + 主区域）                │
│ • ChatView（对话界面：流式气泡 + 虚拟滚动 + Composer）          │
│ • AgentFactoryPage（智能体工厂：五步向导 + 人格蒸馏）           │
│ • KnowledgePage（知识库管理：上传/预览/语义搜索）               │
│ • NexusPage（Agent 对话界面：双栏布局 + A2A 观察视图）          │
│ • GroupChatView（群聊界面：微信风 UI + 成员列表 + @提及）        │
│ • SkillsPage（技能市场：Smithery 集成 + 安装/编辑）             │
│ • WorkflowPage（可视化编排：拖拽节点式编辑器）                  │
│ • ScheduledTasksPage（定时任务管理：Cron + 执行记录）           │
│ • SettingsPage（设置：主题/接入点/记忆/用量）                   │
│ ─────────────────────────────────────────────────────────────│
│ 状态管理：Zustand（模块化切片：auth/ui/session/chat/nexus）    │
│ API 通信：fetch client + WebSocket 流式                       │
└─────────────────────────────────────────────────────────────┘
          ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│ 第三层：Go 后端（核心引擎）                                    │
├─────────────────────────────────────────────────────────────┤
│ HTTP API Server（Gin 框架）                                   │
│ ├── Handler 层（150+ API 端点）                               │
│ │   • chat.go（对话核心：流式 WebSocket + 知识库注入）          │
│ │   • agent.go（智能体 CRUD：技能/MCP/知识库绑定）              │
│ │   • knowledge.go（知识库：PDF/DOCX 提取 + 向量索引）          │
│ │   • skill.go（技能管理：市场搜索 + 安装/导出）                │
│ │   • nexus.go（Agent 间对话：邀请/接受/消息转发）              │
│ │   • group_chat.go（群聊：创建/发言/撤回/成员管理）            │
│ │   • screen_agent.go（Screen Agent：截屏分析 + 规划执行）      │
│ │   • evolution.go（自我进化：分析/提取/日志）                 │
│ │   • scheduled.go（定时任务：Cron 调度 + 执行记录）            │
│ │   • auth.go（SSO 登录：OAuth + 游客模式）                    │
│ ├── 特殊子系统                                                │
│ │   • nexus/（Agent 间对话引擎）                               │
│ │     • discovery.go（mDNS LAN 发现 + WAN 信令客户端）          │
│ │     • conversation.go（第一人称自然对话 + 流式转发）          │
│ │     • transport.go（Transport 接口：LANTransport/WANTransport）│
│ │   • groupbehavior/（群聊行为引擎）                           │
│ │     • engine.go（并发评估发言概率 + PickSpeakers）            │
│ │     • quirks.go（微观人格：错别字/复读/Emoji后缀）            │
│ │     • watcher.go（冷场守望者：60s 巡检 + 救场触发）            │
│ │   • vectordb/（向量数据库）                                  │
│ │     • vectordb.go（SQLite 存储 768 维向量 + cosine 搜索）    │
│ │     • chunker.go（递归分块 512 字符/128 重叠）                │
│ │     • retriever.go（混合检索：向量 + BM25 + RRF 融合）        │
│ │   • evolution/（自我进化引擎）                               │
│ │     • scanner.go（全局扫描器：6h 巡检 + 冷却控制）            │
│ │   • scheduler/（定时任务调度器）                              │
│ │   • watcher/（文件夹监控：fsnotify + 增量索引）               │
│ │   • router/（AI 引擎路由：CCR 多模型切换）                    │
│ ├── Connector（IM 平台对接：企微/钉钉/飞书）                   │
└─────────────────────────────────────────────────────────────┘
          ↕ SQLite + 文件系统
┌─────────────────────────────────────────────────────────────┐
│ 第四层：数据存储与外部系统                                     │
├─────────────────────────────────────────────────────────────┤
│ SQLite 数据库（~/Library/Application Support/灵犀/）          │
│ ├── smart-agent.db（主数据库）                                │
│ │   • sessions（会话 + pinned + folder）                      │
│ │   • agents（智能体 + 技能/MCP/知识库绑定）                    │
│ │   • knowledge（知识库元数据 + 分类）                         │
│ │   • skills（技能清单 + manifest）                            │
│ │   • mcp_servers（MCP 服务配置）                              │
│ │   • memories（长期记忆 + 分类）                              │
│ │   • scheduled_tasks（定时任务 + Cron）                       │
│ │   • nexus_peers（LAN 发现的实例）                            │
│ │   • a2a_conversations（Agent 对话记录）                      │
│ │   • group_chats（群聊元数据）                                │
│ │   • group_members（群成员）                                 │
│ │   • group_messages（群消息 + reply_to + 撤回标记）            │
│ │   • agent_personalities（群聊人格 + 标签/兴趣/概率）          │
│ │   • screen_actions（Screen Agent 操作审计）                  │
│ │   • evolution_logs（进化日志 + 知识/记忆提取）                │
│ │   • users（用户身份 + OAuth）                                │
│ ├── vectors.db（向量数据库）                                  │
│ │   • chunks（知识库分块 + embedding blob）                    │
│ │   • index_status（索引进度）                                │
│ │   • watched_dirs（监控目录）                                │
│ ├── 知识库文件（~/.../knowledge/）                            │
│ │   • docs/qa/data 分类存储                                   │
│ ├── 上传图片（~/.../uploads/）                                │
│ ─────────────────────────────────────────────────────────────│
│ 外部系统                                                      │
│ ├── AI 引擎（Claude CLI / LiteLLM Bridge）                    │
│ │   • 本地模型（whisper.cpp 离线语音识别）                      │
│ │   • 远端 API（Anthropic/OpenAI 兼容）                        │
│ ├── 信令服务器（wss://lingxi-singaling-server.onrender.com/ws）│
│ │   • WebSocket 信令（注册/发现/消息中继）                      │
│ │   • 多播支持（relay_multi：to_list 字段）                    │
│ ├── 第三方平台                                                │
│ │   • Smithery.ai（技能市场）                                 │
│ │   • IM 平台（企微/钉钉/飞书 Webhook）                        │
│ │   • OAuth 供应商（微信/QQ/Google/钉钉/抖音）                  │
└─────────────────────────────────────────────────────────────┘
```

### 关键数据流标注

在架构图中用箭头标注以下数据流：

1. **对话流**：用户 → React Composer → WebSocket → Go chat.go → AI引擎 → 流式响应 → WebSocket → React Bubble
2. **知识库检索流**：用户消息 → Go chat.go → vectordb retriever → chunks 检索 → [知识库参考资料] 块 → 注入 system prompt → AI引擎
3. **Agent Nexus 流**：本地 Agent → nexus transport → 信令服务器 → 远端 transport → 远端 Agent → 流式对话 → 双向转发
4. **群聊流**：用户发言 → Go group_chat.go → groupbehavior engine → 多 Agent 并发评估 → 延迟发言 → Nexus 广播 → 所有成员
5. **Screen Agent 流**：Electron screen-controller 截屏 → Go screen_agent.go → 多模态模型 → 操作规划 → AppleScript 执行 → OTA 循环
6. **自我进化流**：负面反馈 → evolution analyzer → LLM 分析 → 提取知识/记忆 → db evolution_logs → 持久化

---

## 二、对话流程图（Conversation Flow）

### 绘制要求

- **视角**：单次对话完整生命周期
- **布局**：横向流程图，从左到右
- **节点**：用矩形表示组件，用菱形表示决策点
- **箭头**：标注数据类型（HTTP/WebSocket/SQLite）

### 流程步骤

```
用户输入 → React Composer
  ↓ (WebSocket connect)
Go chat.go 接收消息
  ↓
加载会话上下文（db sessions/messages）
  ↓
知识库检索（vectordb retriever）
  ├─ 向量检索（cosine KNN）
  ├─ BM25 关键词检索
  ├─ RRF 融合排序
  └─ 构建 [知识库参考资料] 块
  ↓
构建 System Prompt（模板 + 知识库 + 长期记忆 + 技能清单）
  ↓
调用 AI 引擎（router CCR 选择模型）
  ├─ Claude CLI（Anthropic 协议）
  └─ LiteLLM Bridge（OpenAI 兼容 → Anthropic 翻译）
  ↓
流式响应（token 级）
  ├─ thinking_block（思考过程）
  ├─ text_block（正文）
  ├─ tool_use_block（工具调用）
  └─ 引用标注（[1][2] + KB_CITATIONS）
  ↓ (WebSocket stream)
React MessageList 渲染
  ├─ Bubble（Markdown + 代码高亮）
  ├─ BlocksRenderer（思考块/工具块）
  ├─ 引用卡片（hover 弹出）
  └─ 消息反馈（thumbs up/down）
  ↓
持久化（db messages 表）
  ↓
触发自我进化检测（evolution scanner）
  ├─ 消息数 ≥ 6
  ├─ 距上次进化 > 30min
  └─ 自动 TryAutoEvolution
```

### 特殊标注

- **流式响应**：用波浪线箭头表示 WebSocket 流式传输
- **知识库注入**：用虚线框标注 [知识库参考资料] 块构建过程
- **引用标注**：标注 KB_CITATIONS HTML 注释块的生成位置

---

## 三、知识库检索流程图（Knowledge Retrieval Flow）

### 绘制要求

- **视角**：知识库文件从上传到检索注入的全生命周期
- **布局**：纵向流程图，从上到下
- **分支**：展示向量索引 vs 关键词索引两条路径

### 流程步骤

```
用户上传文件（PDF/DOCX/MD/TXT/CSV/JSON）
  ↓
Go knowledge.go 接收
  ↓
文件提取
  ├─ PDF（ledongthuc/pdf）
  ├─ DOCX（nguyenthenguyen/docx）
  └─ 文本文件（直接读取）
  ↓
提取摘要（前 300 字）
  ↓
分类存储（docs/qa/data）
  ↓
持久化元数据（db knowledge 表）
  ↓
触发向量索引（vectordb indexer）
  ↓
文本分块（chunker.go）
  ├─ 递归分块（512 字符/块）
  ├─ 128 重叠
  └─ 段落/句子/字符边界
  ↓
嵌入生成（embedder.go）
  ├─ API 模式（OpenAI 兼容 /embeddings）
  └─ 本地模式（离线嵌入模型）
  ↓
向量存储（vectordb chunks 表）
  ├─ knowledge_id
  ├─ chunk_text
  ├─ token_count
  └─ embedding blob（768 维）
  ↓
用户消息触发检索
  ↓
混合检索（retriever.go）
  ├─ 向量检索（cosine KNN）
  │   └─ SELECT chunk_text, embedding FROM chunks ORDER BY cosine_similarity
  ├─ BM25 关键词检索
  │   └─ 全文索引匹配
  └─ RRF 融合排序
      └─ (1/(k+rank_vector) + 1/(k+rank_bm25))
  ↓
构建 [知识库参考资料] 块
  ├─ 来源编号（[1]、[2]...）
  ├─ 文件路径 + 标题
  └─ 原文片段（50-100 字）
  ↓
注入 System Prompt
  ↓
AI引擎生成回答
  ↓
引用标注（KB_CITATIONS）
  ↓
前端渲染引用卡片
```

### 特殊标注

- **分块策略**：标注 512 字符/块 + 128 重叠的分块参数
- **混合检索**：用双分支展示向量检索和 BM25 检索两条路径
- **RRF 融合**：标注融合公式

---

## 四、Agent Nexus 跨实例对话流程图（Agent Nexus Cross-Instance Conversation）

### 绘制要求

- **视角**：两个灵犀实例的 Agent 进行跨实例对话
- **布局**：双泳道流程图（左侧实例A，右侧实例B）
- **中间**：信令服务器作为中继节点
- **箭头**：标注 Nexus 协议消息类型

### 流程步骤

```
实例 A（发起方）                信令服务器                实例 B（接收方）
────────────────              ────────────              ─────────────────
用户点击"发起对话"
  ↓
选择本地 Agent
  ↓
输入 topic + goal
  ↓
CreateA2AConversation
  ↓ (HTTP)
创建 conv 记录
  ├─ status: pending_remote
  ├─ conv_uuid: 生成
  └─ initiated_by: local
  ↓
发送 conversation_invite
  ├─ conv_id
  ├─ conv_uuid
  ├─ peer_id（A 的 instance_id）
  ├─ agent_name
  ├─ topic + goal
  └─ max_rounds
  ↓ (WebSocket)
注册 → 发现 → 中继
  ↓ (WebSocket)
接收 invite
  ↓
前端显示邀请卡片
  ├─ 显示 topic + goal
  ├─ 显示对方 Agent 名称
  └─ 用户选择己方 Agent
  ↓
AcceptRemoteConversation
  ↓
更新 conv 记录
  ├─ status: accepted
  ├─ remote_agent_id
  └─ accepted_at
  ↓
发送 conversation_accept
  ├─ conv_id
  ├─ conv_uuid
  ├─ remote_agent_id
  └─ remote_agent_name
  ↓ (WebSocket)
中继 → 通知发起方
  ↓ (WebSocket)
接收 accept
  ↓
更新 conv 状态 → in_progress
  ↓
开始对话循环
  ├─ 本地 Agent 调用 LLM
  ├─ 流式生成回复
  └─ 实时转发 stream_token
      ├─ event: text/thinking
      └─ data: token 字符串
  ↓ (WebSocket)
中继 → 接收方
  ↓ (WebSocket)
实时渲染
  ├─ A2AMessageBubble
  └─ 流式展示对方 Agent 思考和回复
  ↓
接收方 Agent 回复
  ├─ 本地 Agent 调用 LLM
  ├─ 流式生成回复
  └─ 实时转发 stream_token
  ↓ (WebSocket)
中继 → 发起方
  ↓ (WebSocket)
实时渲染
  ↓
严格轮次控制
  ├─ stream_done 同步发送
  ├─ 500ms 缓冲延迟
  └─ 确保一来一回不抢话
  ↓
对话进行到 max_rounds 或用户中止
  ↓
发送 conversation_terminate
  ├─ conv_id
  ├─ conv_uuid
  └─ reason: completed/terminated
  ↓ (WebSocket)
中继 → 双方
  ↓ (WebSocket)
接收 terminate
  ↓
更新 conv 状态 → completed/terminated
  ↓
持久化对话记录（db a2a_conversations）
```

### 特殊标注

- **Transport 抽象**：标注 LANTransport（mDNS）vs WANTransport（信令）
- **流式转发**：用波浪线箭头表示 stream_token 实时转发
- **严格轮次**：标注 stream_done + 500ms 缓冲机制

---

## 五、Screen Agent 操作流程图（Screen Agent OTA Loop）

### 绘制要求

- **视角**：Screen Agent 从截屏到执行的单次 OTA 循环
- **布局**：环形流程图，展示 Observe-Think-Act 循环
- **决策点**：标注用户确认/中止节点

### 流程步骤

```
用户触发截屏（Cmd+Shift+S 或按钮）
  ↓
Electron screen-controller 截屏
  ├─ desktopCapturer.capture()
  ├─ 获取 base64 图片
  └─ 增强上下文
      ├─ 活跃窗口（AppleScript）
      ├─ 鼠标位置（screen.getCursorScreenPoint）
      ├─ 剪贴板预览（前 500 字）
      └─ 屏幕 DPI（scaleFactor）
  ↓ (IPC → HTTP)
Go screen_agent.go ScreenAgentAnalyze
  ├─ 构建分析提示词
  ├─ 调用多模态模型（vision LLM）
  └─ 返回屏幕内容描述
  ↓
用户输入操作指令
  ↓
Go screen_agent.go ScreenAgentPlan
  ├─ 构建规划提示词
  ├─ 调用多模态模型
  └─ 返回操作计划
      ├─ 步骤列表（JSON）
      ├─ 每步操作类型（click/input/scroll/open_app）
      ├─ 坐标/按键参数
      └─ 风险评估（高/中/低）
  ↓
持久化到 screen_actions 表
  ↓
执行操作计划（OTA 循环）
  ↓
对每个步骤：
  ├─ 检查危险操作黑名单
  │   ├─ 删除文件、清空数据、系统命令 → 强制用户确认
  │   └─ 其他操作 → 根据风险评估决定是否确认
  ├─ 用户确认/拒绝（前端 Modal）
  ├─ 若拒绝 → 中止循环
  ├─ 若确认 → Electron screen-controller 执行
  │   ├─ click（x, y）→ AppleScript 鼠标点击
  │   ├─ input（text）→ AppleScript 键盘输入
  │   ├─ scroll（direction）→ AppleScript 滚动
  │   ├─ open_app（name）→ AppleScript 打开应用
  │   └─ 速率限制（500ms 最小间隔，60 次/分钟上限）
  ├─ 执行结果反馈
  │   ├─ 成功 → 截屏观察变化
  │   ├─ 失败 → 记录错误 + 询问用户
  │   └─ 中止（用户按 Cmd+Shift+Esc）→ 停止循环
  ├─ Go screen_agent.go ScreenAgentStepResult
  │   └─ 记录执行结果到 screen_actions
  ├─ 判断是否需要调整计划
  │   ├─ 若观察结果与预期不符 → 调用 LLM 重新规划（OTA）
  │   └─ 若符合预期 → 继续下一步
  ↓
完成所有步骤或中止
  ↓
Go screen_agent.go ScreenAgentReset
  └─ 清除中止状态
  ↓
审计日志（db screen_actions）
```

### 特殊标注

- **OTA 循环**：用环形箭头表示 Observe-Think-Act 循环
- **安全机制**：标注危险操作黑名单 + 强制确认 + 速率限制 + 紧急中止
- **速率限制**：标注 500ms 最小间隔 + 60 次/分钟上限

---

## 六、群聊流程图（Group Chat Flow）

### 绘制要求

- **视角**：群聊中单条用户消息触发多 Agent 并发发言的完整流程
- **布局**：横向流程图 + 分支展示多个 Agent 并发评估
- **时间线**：标注延迟发言的时序

### 流程步骤

```
用户发言（前端 GroupComposer）
  ├─ 输入文本
  ├─ @提及（选择 Agent）
  ├─ 引用消息（reply_to_id）
  └─ 图片上传（multipart）
  ↓ (HTTP POST)
Go group_chat.go GroupPost
  ├─ 持久化消息（db group_messages）
  │   ├─ msg_type: user_post
  │   ├─ sender_agent_id: NULL
  │   ├─ sender_agent_name: 用户昵称
  │   ├─ content
  │   ├─ reply_to_id（引用）
  │   ├─ images（JSON 数组）
  │   └─ client_msg_id（前端生成）
  ├─ 加载群成员（db group_members WHERE status=joined）
  ├─ 加载最近消息（最近 15 条，用于上下文）
  └─ 触发并发评估
  ↓
Go groupbehavior engine PickSpeakers
  ├─ 提取 @提及名称（正则 @([\p{Han}\w_-]{1,40})）
  ├─ 计算最近发言者（反刷屏）
  ├─ 计算连续 Agent 消息数（链式衰减）
  ├─ 提取 reply_to 目标（判断"被怼"）
  ↓
对每个本地 Agent 并发评估：
  ├─ 加载人格参数（db agent_personalities）
  │   ├─ speak_probability（发言概率）
  │   ├─ min_delay_ms / max_delay_ms（延迟范围）
  │   ├─ emoji_freq（Emoji 频率）
  │   ├─ typo_rate（错别字率）
  │   ├─ echo_rate（复读率）
  │   ├─ ghost_minutes（消失时长）
  │   ├─ cold_start_eligible（冷场救场资格）
  │   └─ style_hint（风格提示）
  ├─ 计算发言概率（概率评分）
  │   ├─ @提及我 → 强制发言（probability=100%）
  │   ├─ 被怼（reply_to 我的消息）→ +50%
  │   ├─ 兴趣匹配（标签/兴趣关键词）→ +30%
  │   ├─ 冷场触发（IsColdStart=true）→ +40%
  │   ├─ 安静时段（quiet_start~quiet_end）→ ×0.1
  │   ├─ 最近刚说过（距当前 < 5 条）→ ×0.2（反刷屏）
  │   └─ 默认 → speak_probability
  ├─ 摇骰子（rand.Intn(100) < probability）
  │   ├─ 不通过 → 不发言
  │   └─ 通过 → 计算延迟
  ├─ 计算延迟（毫秒）
  │   ├─ 基础延迟：min_delay_ms ~ max_delay_ms
  │   ├─ 高分加速：probability 越高延迟越短
  │   ├─ @提及：500~1500ms 秒回
  │   ├─ 抖动：±20% 随机
  │   └─ 返回 SpeakDecision
  ↓
返回所有"摇到"的 Agent 决策列表（按延迟升序）
  ↓
对每个决策的 Agent：
  ├─ 延迟等待（time.Sleep(delay_ms)）
  ├─ 调用 LLM 生成回复
  │   ├─ 构建群聊 System Prompt（WeChat 铁律 + 人格 + 标签 + 兴趣 + style_hint）
  │   ├─ 构建群聊 User Prompt（成员名单 + 最近 15 条消息 + 引用映射）
  │   ├─ 流式生成回复
  │   └─ 可能包含 @reply:<id> 协议标记
  ├─ quirks 微观人格处理
  │   ├─ MaybeAddTypo（错别字）
  │   ├─ MaybeEcho（"+1" 复读）
  │   ├─ MaybeEmpty（0.5% 直接 [SKIP]）
  │   └─ EmojiSuffix（根据 emoji_freq 添加 Emoji）
  ├─ 解析 @reply:<id> 协议
  │   ├─ 提取 reply_to_id
  │   └─ 剥离标记后持久化
  ├─ 持久化消息（db group_messages）
  │   ├─ msg_type: agent_post
  │   ├─ sender_agent_id
  │   ├─ sender_agent_name
  │   ├─ content（处理后）
  │   ├─ reply_to_id（解析后）
  │   └─ is_recalled=false
  ├─ WebSocket 广播（group_message）
  │   ├─ 发送给本实例所有前端
  │   └─ 若群主 → Nexus 广播给所有远端成员
  └─ 前端渲染
      ├─ GroupMessageBubble
      │   ├─ 绿色自己 (#95ec69)
      │   ├─ 白色他人
      │   ├─ 引用块（灰色左竖线）
      │   ├─ 合并气泡（相同发送者连续消息）
      │   └─ 时间戳胶囊（≥3min 间隔）
      └─ 成员列表实时更新
  ↓
冷场守望者（groupbehavior watcher）
  ├─ 每 60s 巡检活跃群
  ├─ 检查 >5min 无消息 + 4min 冷却内未触发
  ├─ 若符合 → 触发冷场救场
  │   └─ PickSpeakers(IsColdStart=true)
  │       └─ 仅 cold_start_eligible=true 的 Agent 参评
  └─ 记录触发时间（防重复）
```

### 特殊标注

- **并发评估**：用分支箭头表示多个 Agent 独立评估发言概率
- **延迟发言**：标注时间线（500ms~5000ms 延迟）
- **Nexus 广播**：标注群主转发消息给所有远端成员的流程
- **@reply 协议**：标注 Agent 回复开头写 @reply:142 的协议机制

---

## 七、自我进化流程图（Evolution Flow）

### 绘制要求

- **视角**：从触发到持久化的完整进化流程
- **布局**：纵向流程图 + 三条触发路径（负面反馈/自动检测/手动触发）
- **结果**：标注知识/记忆提取两条分支

### 流程步骤

```
触发源（三种）
  ├─ 负面反馈（用户 thumbs down）
  ├─ 自动检测（evolution scanner）
  │   ├─ 每 6h 巡检所有启用进化的 Agent
  │   ├─ 检查条件
  │   │   ├─ 会话消息数 ≥ 10
  │   │   ├─ 距上次进化 > 24h（CooldownHours）
  │   │   └─ 安静时段外（QuietStart~QuietEnd 之外）
  │   └─ 符合 → 触发进化分析
  └─ 手动触发（用户点击"提取知识"）
  ↓
handler.evolution ManualExtract / TryAutoEvolution
  ↓
加载对话上下文（ContextBuilder）
  ├─ 会话最近 N 条消息
  ├─ 提取用户纠正/有价值对话片段
  └─ 构建分析文本
  ↓
调用 LLM 进化分析（AnalyzeFunc）
  ├─ System Prompt：进化分析规则
  │   ├─ 提取有价值信息（知识/经验/偏好）
  │   ├─ 检测用户纠正（修正 Agent 行为）
  │   └─ 检测负面模式（避免重复错误）
  ├─ User Prompt：对话上下文
  └─ LLM 返回分析结果（JSON）
      ├─ 提取的知识点（数组）
      │   ├─ category（知识类型）
      │   ├─ content（知识内容）
      │   └─ confidence（置信度）
      ├─ 提取的记忆片段（数组）
      │   ├─ type（偏好/习惯/约束）
      │   ├─ content（记忆内容）
      │   └─ importance（重要度）
      └─ 进化建议（数组）
          ├─ action（动作类型）
          └─ reason（原因）
  ↓
WebSocket 广播进度（evolution_progress）
  ├─ step: analyzing / extracting / saving
  ├─ progress: 0~100
  └─ 前端 EvolutionProgressPanel 实时展示
  ↓
持久化进化日志（db evolution_logs）
  ├─ agent_id
  ├─ session_id
  ├─ trigger（feedback/auto/manual）
  ├─ analysis_result（JSON）
  ├─ extracted_knowledge（JSON 数组）
  ├─ extracted_memories（JSON 数组）
  ├─ created_at
  └─ reverted（是否已撤销）
  ↓
分支处理
  ├─ 提取的知识 → 写入 knowledge 表
  │   ├─ category: "auto_evolved"
  │   ├─ content（知识内容）
  │   ├─ tags（自动生成）
  │   └─ summary（摘要）
  │   └─ 触发向量索引（vectordb indexer）
  ├─ 提取的记忆 → 写入 memories 表
  │   ├─ agent_id
  │   ├─ type（偏好/习惯/约束）
  │   ├─ content（记忆内容）
  │   └─ category（自动分类）
  └─ 进化建议 → 记录但不自动执行（需人工审核）
  ↓
WebSocket 广播完成（evolution_done）
  ├─ agent_id
  ├─ log_id
  └─ 前端 Toast 提示用户
  ↓
用户可在 EvolutionPage 查看进化日志
  ├─ 查看提取的知识/记忆
  ├─ 撤销单条进化（RevertEvolutionLog）
  │   ├─ 删除 knowledge/memories 记录
  │   ├─ 更新 evolution_logs.reverted=true
  │   └─ 不会删除向量索引（需手动清理）
  └─ 清空所有进化日志（ClearEvolutionLogs）
```

### 特殊标注

- **三条触发路径**：用分支箭头表示负面反馈/自动检测/手动触发三种触发源
- **进化扫描器**：标注 6h 巡检 + 冷却控制 + 安静时段
- **撤销机制**：标注 RevertEvolutionLog 的恢复流程

---

## 八、绘图技术细节

### 推荐绘图工具

- **架构图**：Mermaid `flowchart TB` 或 `graph LR/TD`
- **流程图**：Mermaid `flowchart LR` 或 `sequenceDiagram`
- **复杂流程**：PlantUML `@startuml` 活动图带泳道

### Mermaid 语法建议

1. **节点形状**：
   - 矩形 `[Node]` 表示组件/服务
   - 菱形 `{Node}` 表示决策点
   - 圆形 `((Node))` 表示外部系统

2. **箭头样式**：
   - 实线 `-->` 表示 HTTP/API 调用
   - 波浪线 `~~>` 表示 WebSocket 流式
   - 虚线 `-.->` 表示可选/异步流程

3. **颜色方案**：
   - Electron 层：`fill:#2563EB,stroke:#1E40AF,color:#fff`
   - React 层：`fill:#9333EA,stroke:#7C3AED,color:#fff`
   - Go 层：`fill:#16A34A,stroke:#15803D,color:#fff`
   - 数据层：`fill:#6B7280,stroke:#4B5563,color:#fff`
   - 特殊子系统：`fill:#F97316,stroke:#EA580C,color:#fff`

4. **子图分组**：
   - 用 `subgraph` 包裹同一层的组件
   - 标注层次名称（Electron Shell / React Frontend / Go Backend）

### PlantUML 语法建议

1. **泳道图**：
   ```plantuml
   @startuml
   |实例 A|
   |信令服务器|
   |实例 B|
   ```

2. **活动节点**：
   - 用 `:` 开头标注活动名称
   - 用 `#` 标注颜色（#AliceBlue/#Lavender/#LightGreen）

3. **箭头标注**：
   - 用 `->` 标注同步调用
   - 用 `->>` 标注异步消息
   - 用 `note right of` 标注注释

### 绘图优化建议

1. **简化冗长流程**：
   - 合并相邻的同类节点
   - 用 `...` 省略中间细节步骤
   - 重点展示关键决策点和数据流

2. **统一术语**：
   - Electron Shell → 桌面壳
   - React Frontend → 前端界面
   - Go Backend → 后端引擎
   - WebSocket → 流式通信
   - SQLite → 本地数据库

3. **增加视觉层次**：
   - 不同层次的节点用不同大小
   - 外部系统用虚线框
   - 数据存储用圆柱形

---

## 九、绘制优先级建议

### 高优先级（必须绘制）

1. **整体架构图** — 展示系统全景，用户快速理解层次结构
2. **对话流程图** — 核心功能，用户最常接触的流程
3. **知识库检索流程图** — 展示深度 RAG 能力，技术亮点
4. **Agent Nexus 流程图** — 展示跨实例对话，创新功能

### 中优先级（建议绘制）

5. **Screen Agent 流程图** — 展示桌面操控能力，安全机制
6. **群聊流程图** — 展示微信风 UI + 并发评估，复杂子系统

### 低优先级（可选绘制）

7. **自我进化流程图** — 展示自动进化机制，AI 自我改进
8. **IM 集成流程图** — 展示企微/钉钉/飞书对接（如有需求）

---

## 十、绘图输出建议

### 输出格式

- **SVG**：矢量图，可缩放，适合嵌入文档
- **PNG**：位图，适合分享和打印
- **Mermaid 代码**：可嵌入 Markdown 文档动态渲染
- **PlantUML 代码**：可嵌入技术文档

### 文件命名建议

- `architecture-overview.svg` — 整体架构图
- `conversation-flow.svg` — 对话流程图
- `knowledge-retrieval-flow.svg` — 知识库检索流程图
- `agent-nexus-flow.svg` — Agent Nexus 流程图
- `screen-agent-flow.svg` — Screen Agent 流程图
- `group-chat-flow.svg` — 群聊流程图
- `evolution-flow.svg` — 自我进化流程图

### 存放位置建议

- `/docs/architecture/` — 架构设计文档目录
- `/README.md` — 嵌入整体架构图（介绍系统）
- `/CLAUDE.md` — 嵌入各流程图（AI 助手理解）

---

## 总结

本提示词提供了灵犀 AI Agent 项目的完整架构视图和 7 个核心业务流程的详细绘制指导。建议按优先级依次绘制，使用 Mermaid/PlantUML 生成可嵌入文档的动态图表，最终产出 SVG/PNG 图片用于分享和展示。

关键绘图要点：
1. **层次清晰**：Electron/React/Go 三层架构 + 特殊子系统
2. **数据流明确**：标注 HTTP/WebSocket/SQLite 通信方式
3. **流程完整**：从触发到持久化的全生命周期
4. **颜色区分**：不同模块用不同颜色，视觉易识别
5. **中文标注**：所有节点和箭头用中文标注，便于理解
6. **技术亮点**：重点展示向量检索/流式对话/并发评估/OTA 循环等创新功能