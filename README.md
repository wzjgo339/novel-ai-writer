# Novel AI Writer · AI 长篇小说写作助手

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.4-blue)](https://react.dev)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-green)](https://github.com/WiseLibs/better-sqlite3)

> AI 驱动的中文长篇小说创作工具，支持完整的写作流程管理、智能 AI 辅助和世界构建。

---

## ✨ 功能概览

### 📝 核心写作
- **富文本编辑器** — 全屏写作区，中英文混排，自动保存
- **卷/章节管理** — 树形结构组织作品，支持拖拽排序、跨卷移动、Ctrl+点击多选
- **字数统计** — 实时统计本章和全书字数
- **导出** — 支持 TXT / Markdown 格式（单章或全书）

### 🧑‍🤝‍🧑 角色管理
- **角色档案** — 姓名、外貌、性格、背景、动机、弧光等完整字段
- **角色关系图** — 支持 13 种关系类型（盟友、敌人、恋人、师徒等）

### 🌍 世界观构建
- **设定管理** — 按类型分类（地点、组织、物品、概念、魔法/科技等）
- **术语去重** — 智能检测重复设定

### 📋 情节大纲
- **时间线视图** — 垂直时间线展示情节事件，关联章节
- **事件管理** — 创建、编辑、排序、关联章节

### 🤖 AI 功能（基于 DeepSeek API）

| 功能 | 说明 |
|------|------|
| **✨ AI 续写** | 流式生成续写内容，打字机效果逐字显示 |
| **✂️ AI 扩写/缩写** | 选中文本后浮动工具栏，支持自定义扩写要求 |
| **🔍 AI 章节分析** | 自动提取角色更新、新设定、情节摘要 |
| **💬 AI 助手** | 侧边对话面板，上下文感知（角色/设定/情节） |
| **📄 AI 下一章** | 根据写作要求和完整上下文生成下一章（含风格分析） |
| **🔄 差异对比** | 字符级差异化高亮修改内容 |

### 🎨 其他
- **亮/暗主题** — 暖色调纸质感设计，防闪烁
- **全局搜索** (Ctrl+K) — 搜索章节、角色、设定、情节
- **侧边栏可缩放** — 拖拽调节宽度，持久化存储

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18
- **npm** >= 9

### 安装

```bash
# 克隆仓库
git clone https://github.com/wzjgo339/novel-ai-writer.git
cd novel-ai-writer

# 安装依赖
npm install
```

### 配置 API Key

```bash
# 复制环境变量模板
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 DeepSeek API Key：

```env
DEEPSEEK_API_KEY=sk-your-key-here
```

> 从 [DeepSeek Platform](https://platform.deepseek.com/api_keys) 获取。

### 初始化数据库

```bash
# 运行数据库迁移
npm run db:migrate

# （可选）导入示例数据
npm run db:seed
```

### 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可开始写作。

> **注意**：如果遇到 Turbopack 相关错误，可使用 Webpack 模式启动：
> ```bash
> NODE_OPTIONS="--max-old-space-size=4096" npx next dev --webpack
> ```

---

## 🏗️ 技术栈

| 技术 | 用途 |
|------|------|
| **Next.js 16** (App Router) | 前后端框架 |
| **React 19** | UI 库 |
| **TypeScript** | 类型安全 |
| **Tailwind CSS 4** | 样式 |
| **shadcn/ui** | UI 组件 |
| **SQLite** (better-sqlite3) | 本地数据库 |
| **Drizzle ORM** | 数据库 ORM |
| **DeepSeek API** | AI 能力 |
| **Lucide** | 图标 |

### 项目结构

```
novel-ai-writer/
├── app/                    # Next.js App Router 页面
│   ├── api/               # API 路由
│   │   ├── ai-write/      # AI 续写
│   │   ├── ai-rewrite/    # AI 扩写/缩写
│   │   ├── ai-next-chapter/ # AI 下一章
│   │   ├── ai-assistant/  # AI 助手对话
│   │   ├── analyze-chapter/ # 章节分析
│   │   └── ...            # 实体 CRUD
│   ├── page.tsx           # 主页面（编辑器）
│   ├── novel-sidebar.tsx  # 侧边栏
│   ├── character-panel.tsx # 角色面板
│   ├── world-terms-panel.tsx # 设定面板
│   ├── plot-outline-panel.tsx # 大纲面板
│   ├── chapter-analyzer.tsx # 章节分析器
│   ├── ai-assistant-panel.tsx # AI 助手面板
│   ├── next-chapter-dialog.tsx # 下一章对话框
│   ├── diff-review-dialog.tsx # 差异对比
│   ├── search-dialog.tsx  # 全局搜索
│   └── theme-provider.tsx # 主题管理
├── db/                    # 数据库
│   ├── schema.ts          # Drizzle schema
│   ├── index.ts           # 数据库连接
│   ├── migrations/        # 迁移文件
│   └── seed.ts            # 示例数据
├── lib/                   # 工具库
│   ├── api.ts             # 共享 API 辅助
│   ├── ai-config.ts       # AI 配置
│   ├── stream.ts          # SSE 流式处理
│   ├── style-profile.ts   # 写作风格分析
│   ├── validation.ts      # Zod 验证
│   └── utils.ts           # cn() 工具
├── components/            # UI 组件（shadcn）
├── hooks/                 # 自定义 Hooks
└── data/                  # SQLite 数据文件
```

---

## 📖 使用指南

### 基础写作流程

1. **创建作品** — 点击侧边栏「新建作品」
2. **添加卷** — 自动创建"第一卷"，可添加更多卷
3. **添加章节** — 在卷下创建章节
4. **开始写作** — 点击章节标题进入编辑器
5. **自动保存** — 停笔 1.2 秒自动保存

### AI 功能使用

- **选中文本后** — 弹出浮动工具栏，可「扩写」或「缩写」
- **点击「AI 续写」** — AI 继续当前章节内容
- **点击「AI 下一章」** — 输入写作要求生成新章节
- **点击「AI 分析」** — 自动提取角色/设定/情节
- **点击「AI 助手」** — 右侧对话面板，边写边问

---

## 📦 构建部署

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

---

## 📄 许可证

[MIT](LICENSE)
