<p align="center">
  <img src="logo.jpg" width="140" alt="Lingxi Logo" />
</p>

<h1 align="center">Lingxi AI Agent</h1>

<p align="center">
  <strong>Local-first · Multi-model · Multi-agent · Agent Collaboration · Zero Config</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg" alt="Platform" />
  <img src="https://img.shields.io/badge/Electron-36-47848F.svg?logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/React-19-61DAFB.svg?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Go-1.24-00ADD8.svg?logo=go" alt="Go" />
</p>

<p align="center">
  <a href="README.md">中文</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-why-lingxi">Why Lingxi</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-features">Features</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-screenshots">Screenshots</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-quick-start">Quick Start</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-architecture">Architecture</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-license">License</a>
</p>

<br/>

> **More than a chatbot.** Build your own AI agent team, equip them with skills and knowledge, design automated workflows, even let agents on different machines talk to each other — all running locally.

<br/>

<p align="center">
  <img src="images/首页.png" alt="Lingxi Workbench" width="900" />
</p>

<br/>

---

## ✨ Why Lingxi

<table>
<tr>
<td width="50%">

**🔒 Your Data Stays Yours**

Conversations, configs, and API keys live in local SQLite. Keys encrypted via macOS Keychain / Windows DPAPI. Zero cloud dependency — works offline with local models.

</td>
<td width="50%">

**🔌 14+ Model Providers**

Anthropic · OpenAI · DeepSeek · Qwen · Gemini · Doubao · GLM · Kimi · Groq · Ollama … Built-in Bridge layer auto-translates protocols. Switch freely.

</td>
</tr>
<tr>
<td>

**🤖 Beyond Chat — An Agent Workbench**

Create agents with custom roles, skills, knowledge bases, and MCP tools. AI doesn't just answer questions — it **gets work done**: write code, query data, read docs, operate web pages.

</td>
<td>

**🌐 Agent-to-Agent Conversations (Project Nexus)**

LAN + WAN. Agents across machines auto-discover and stream bidirectionally. Your code reviewer discusses architecture with a colleague's architect — humans oversee anytime.

</td>
</tr>
<tr>
<td>

**📦 Double-Click to Run, Zero Dependencies**

Download `.dmg` on macOS — done. Bundles Go backend + Node.js + whisper.cpp. No Python, Docker, or backend setup needed.

</td>
<td>

**🎨 6 Beautiful Themes**

Light · Dark · Midnight · Cyber · Aurora · Cosmos. CSS variable-driven zero-flicker switching, Framer Motion silky page transitions.

</td>
</tr>
</table>

---

## 🚀 Features

### 🏭 Agent Factory

> Each agent has **8 dimensions of customization** — far more than swapping a system prompt.

<p align="center">
  <img src="images/智能体工厂.png" alt="Agent Factory" width="900" />
</p>

<table>
<tr><td width="22%">🎭 <b>Identity & Role</b></td><td>Name, avatar, description, full system prompt</td></tr>
<tr><td>🧩 <b>Capabilities</b></td><td>Independently bind skills, knowledge bases, MCP tools per agent</td></tr>
<tr><td>🎛️ <b>Parameters</b></td><td>temperature · max_tokens — independent controls</td></tr>
<tr><td>🌐 <b>External Collab</b></td><td>Public toggle · capability tags · authorization levels · forbidden info</td></tr>
<tr><td>📋 <b>17 Templates</b></td><td>Business · Development · Creative · Productivity — plus a 5-step creation wizard</td></tr>
</table>

<details>
<summary><b>View built-in templates →</b></summary>
<br/>

| Category | Templates |
|----------|-----------|
| 🏢 Business | Sales Assistant · Business Analyst · HR · Legal Advisor |
| 💻 Development | Code Reviewer · Architect · DevOps Expert · Security Engineer · DBA |
| ✍️ Creative | Content Creator · Copywriter · Translation Expert · Academic Writer |
| 🌈 Productivity | Product Manager · Fitness Coach · Financial Advisor · Travel Planner |

</details>

<p align="center">
  <img src="images/智能体角色设定.png" alt="Creation Wizard" width="900" />
</p>
<p align="center"><sub>▲ 5-Step Creation Wizard — Role · Capabilities · Parameters · External · Preview</sub></p>

---

### 💬 Premium Conversation Experience

> Streaming isn't just showing text — it's **thinking blocks + tool blocks + text blocks** rendered with precision.

<p align="center">
  <img src="images/普通对话.png" alt="Chat Experience" width="900" />
</p>

| Capability | Description |
|------------|-------------|
| ⚡ Streaming + Chain of Thought | Real-time token output, collapsible thinking, OpenAI reasoning passthrough |
| 🎨 Code Highlighting | 50+ languages + one-click copy |
| 🖼️ Multimodal Input | Image paste · file drag · offline voice · screenshot (⌘⇧S) |
| 📚 RAG Citation | Inline `[N]` superscripts + hover cards + reference list |
| 🔍 Search & Commands | ⌘K search · `/` slash commands · message edit & resend |
| 🗺️ Two-Phase Planning | Collect requirements first, then execute |
| 💡 Smart Suggestions | 2-3 follow-up question capsules after every reply |
| 📌 Message Management | Pin · feedback · session pinning · batch delete · Markdown export |
| 🔊 TTS Read Aloud | Chinese/English auto-detect, one-click play |

<p align="center">
  <img src="images/规划推理.png" alt="Planning" width="900" />
</p>
<p align="center"><sub>▲ Two-Phase Planning — collect dimensions first, execute after confirmation</sub></p>

---

### 🎤 Offline Voice Input

Built-in **whisper.cpp** (Apple Metal accelerated). Record → local recognition → text fills input. Fully offline, zero latency. Falls back to remote Whisper API when needed.

---

### 🔗 14+ Providers, Unified

<p align="center">
  <img src="images/接入点管理.png" alt="Provider Management" width="900" />
</p>

| Protocol | Providers |
|----------|-----------|
| Anthropic Native | Anthropic · DashScope (Alibaba Cloud) |
| OpenAI Compatible | DeepSeek · Qwen · Doubao · GLM · Kimi · Gemini · OpenRouter · Groq · SiliconFlow · Ollama · OpenAI |

<details>
<summary><b>How the Bridge layer works →</b></summary>
<br/>

Lingxi's AI engine uses the Anthropic protocol. For OpenAI-compatible providers, a local Bridge auto-starts for bidirectional real-time translation:

```
Claude CLI ──Anthropic──► Bridge (127.0.0.1) ──OpenAI──► DeepSeek / Qwen / ...
```

Prefers LiteLLM (Python), falls back to llm-bridge (Node.js). Transparent to users.

</details>

---

### 🧩 Skills · Knowledge Base · MCP

<table>
<tr>
<td width="33%" valign="top">

**⚡ Skills**
- AI auto-generation
- ZIP import / batch upload
- Smithery marketplace install
- Online edit / export
- Per-agent binding

</td>
<td width="33%" valign="top">

**📚 Knowledge Base**
- `.md` `.txt` `.csv` `.json` `.pdf` `.docx`
- Docs / QA / Data categories
- Drag-and-drop + preview
- Auto index + RAG citations

</td>
<td width="33%" valign="top">

**🔧 MCP Tools**
- stdio / SSE / HTTP protocols
- Built-in Playwright MCP
- One-click config export
- Browse web, access filesystem…

</td>
</tr>
</table>

<p align="center">
  <img src="images/skill管理.png" alt="Skills" width="900" />
</p>
<p align="center"><sub>▲ Skills — AI generation / marketplace / online edit / ZIP import</sub></p>

<p align="center">
  <img src="images/知识库.png" alt="Knowledge Base" width="900" />
</p>
<p align="center"><sub>▲ Knowledge Base — drag-and-drop · categorized · RAG citations</sub></p>

<p align="center">
  <img src="images/mcp.png" alt="MCP" width="900" />
</p>
<p align="center"><sub>▲ MCP Tools — all protocols · one-click export</sub></p>

---

### 🔀 Visual Workflow Designer

> Drag nodes, draw connections, build execution flows — no code required.

<p align="center">
  <img src="images/工作流编排首页.png" alt="Workflow" width="900" />
</p>

| Node | Description |
|------|-------------|
| 💬 Prompt | Send prompt to AI |
| 🔀 Condition | Branch on output |
| 🔄 Loop | Repeat N times |
| ⏱️ Delay | Wait for duration |
| 💻 Code | Bash / Python scripts |
| 📤 Output | Final result |

---

### 🌐 Project Nexus — Agent-to-Agent Network

> A Lingxi original. Agents across instances **auto-discover, connect, and stream bidirectionally** — LAN + WAN.

<p align="center">
  <img src="images/Agent Nexus网络.png" alt="Nexus Network" width="900" />
</p>

```
┌──────────────────┐                           ┌──────────────────┐
│   Instance A      │  ◄── Bidirectional ──►    │   Instance B      │
│   🤖 Reviewer    │      mDNS / Signaling     │   🤖 Architect    │
│   🧑 Human A     │      Token-level Stream   │   🧑 Human B     │
│   (observe)       │                           │   (observe)       │
└──────────────────┘                           └──────────────────┘
```

| Capability | Description |
|------------|-------------|
| 🔍 Auto-Discovery | LAN mDNS + WAN signaling, visible within 10 seconds |
| ⚡ Bidirectional Streaming | Both agents stream token-by-token, thinking synced |
| 🧠 Persistent Context | Each conversation maps to an isolated session |
| 👁️ Dual-Side Observation | Both parties watch agents think and respond live |
| ✋ Human Oversight | Pause · takeover · terminate · approval |
| 📝 Full Rendering | Code highlighting · tables · thinking blocks — same UI as main chat |

<p align="center">
  <img src="images/Agent与Agent对话.png" alt="Agent Conversation" width="900" />
</p>
<p align="center"><sub>▲ Agent-to-Agent — purple = remote agent, theme color = local agent</sub></p>

---

### ⏰ Scheduled Tasks

> Let agents work 24/7 — hourly email checks, daily reports, weekly cleanup.

<p align="center">
  <img src="images/定时任务.png" alt="Scheduled Tasks" width="900" />
</p>

- **Schedules**: Every N min/hour · daily/weekly/monthly · custom Cron
- **Stateful Mode**: Agent remembers previous runs, reports incremental changes
- **Desktop Notifications**: System-level notification on completion
- **Execution History**: View past runs + jump to session

---

### 💬 Enterprise IM Integration

<p align="center">
  <img src="images/IM.png" alt="IM Integration" width="900" />
</p>

| Platform | Integration |
|----------|-------------|
| 🟢 WeChat Work | Webhook bot |
| 🔵 DingTalk | Webhook bot |
| 🟣 Feishu (Lark) | Webhook bot |

---

### 🧠 Long-Term Memory

Cross-session persistent memory, isolated per agent. AI auto-records preferences and key info; manual management also available.

---

### 📊 Usage Analytics & Budget Alerts

<p align="center">
  <img src="images/用量计费.png" alt="Usage" width="900" />
</p>

- 📈 Token-level precise billing
- 📊 Local pricing estimation for unofficial providers (marked `~`)
- 🔔 Daily/monthly budget alerts

---

## 📸 Screenshots

<table>
<tr>
<td><img src="images/智能体交互.png" alt="Agent Interaction" /></td>
<td><img src="images/规划模式.png" alt="Planning Mode" /></td>
</tr>
<tr>
<td align="center"><sub>Autonomous task execution</sub></td>
<td align="center"><sub>Multi-dimension requirement collection</sub></td>
</tr>
<tr>
<td><img src="images/智能体配置.png" alt="Agent Config" /></td>
<td><img src="images/agent ppt创作.png" alt="PPT Creation" /></td>
</tr>
<tr>
<td align="center"><sub>8-dimension customization</sub></td>
<td align="center"><sub>AI actually getting work done</sub></td>
</tr>
<tr>
<td><img src="images/llm.png" alt="Multi-Model" /></td>
<td><img src="images/skill安装.png" alt="Skill Install" /></td>
</tr>
<tr>
<td align="center"><sub>14+ providers, switch freely</sub></td>
<td align="center"><sub>Smithery marketplace install</sub></td>
</tr>
<tr>
<td><img src="images/工作流编排首页.png" alt="Workflow" /></td>
<td><img src="images/Agent Nexus网络.png" alt="Nexus" /></td>
</tr>
<tr>
<td align="center"><sub>Drag-and-drop workflow editor</sub></td>
<td align="center"><sub>Agent auto-discovery & conversation</sub></td>
</tr>
</table>

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Shortcut | Action |
|----------|--------|----------|--------|
| `⌘ K` | Search messages | `⌘ N` | New conversation |
| `⌘ B` | Toggle sidebar | `⌘ ,` | Settings |
| `⌘ /` | Shortcuts panel | `⌘ ⇧ S` | Screenshot to input |
| `/` | Slash commands | `Esc` | Close panel |
| `Enter` | Send | `Shift+Enter` | New line |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Electron 36                          │
│   Desktop shell · Window mgmt · safeStorage · OTA update  │
├───────────────────────────┬──────────────────────────────┤
│      React 19 + Vite 8    │      Go 1.24 + Gin 1.10     │
│   Tailwind CSS 3.4        │   SQLite (pure Go WASM)      │
│   Zustand 5 · Motion 12   │   WebSocket · mDNS · Signal  │
│   6 themes · virtual scroll│   70+ APIs · scheduler       │
│   prism syntax highlight   │   IM connectors · Bridge     │
└───────────────────────────┴──────────────────────────────┘
              Bundled runtimes (no install required)
     Node.js · whisper.cpp · Claude CLI · LiteLLM Bridge
```

| Layer | Tech | Purpose |
|-------|------|---------|
| 🖥️ Shell | Electron 36 | Window management · safeStorage · screenshots · auto-update |
| 🎨 Frontend | React 19 + Vite 8 + Tailwind 3.4 | 6 themes · Zustand · Framer Motion |
| ⚙️ Backend | Go 1.24 + Gin + SQLite | 70+ APIs · WebSocket · mDNS · scheduler |
| 🔊 Voice | whisper.cpp (Metal) | Offline ASR · ggml-base |
| 🔄 Router | LiteLLM / llm-bridge | Anthropic ↔ OpenAI protocol translation |

---

## 📥 Quick Start

### macOS (Apple Silicon)

1. Download `.dmg` from [Releases](https://github.com/OdysseyFather/lingxi/releases)
2. Double-click to install, drag to Applications
3. If macOS says "cannot be verified": `xattr -cr "/Applications/灵犀.app"`
4. Settings → Providers, configure at least one API key
5. Start chatting!

### Build from Source

```bash
# Prerequisites: Node.js >= 20.19, Go >= 1.24
git clone https://github.com/OdysseyFather/lingxi.git
cd lingxi && ./build-desktop.sh
```

<details>
<summary><b>Development mode →</b></summary>
<br/>

```bash
# Terminal 1: Frontend (hot reload)
cd frontend-desktop && npm install && npm run dev

# Terminal 2: Go backend
cd backend-desktop && go run .

# Terminal 3: Electron
cd electron && npm install && npm start
```

</details>

---

## 📜 License

[MIT License](LICENSE)

---

<p align="center">
  <br/>
  <img src="logo.jpg" width="48" alt="Lingxi" />
  <br/><br/>
  <strong>Lingxi</strong> — Making AI your work partner, not just a chatbot.<br/>
  <sub>Built with ❤️ by the Lingxi community</sub>
  <br/><br/>
  If you find this valuable, please <a href="https://github.com/OdysseyFather/lingxi">Star</a> us!
</p>
