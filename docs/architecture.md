# 架构设计

本文档介绍 bm.md 的技术架构设计。

---

## 技术栈

| 类别     | 技术                                        |
| -------- | ------------------------------------------- |
| 框架     | TanStack Start (React 19 + TanStack Router) |
| 构建     | Vite 8                                      |
| 样式     | Tailwind CSS 4 + shadcn/ui                  |
| 语言     | TypeScript (`strict: true`)                 |
| 状态管理 | Zustand                                     |
| 包管理   | pnpm                                        |
| 测试     | Vitest                                      |
| 校验     | Zod                                         |

### 依赖说明

- `mcp-config` 暂时保留 GitHub 依赖：已检查 npm 版 `mcp-config@0.0.10`，其包内容是交互式 CLI（`main`/`bin` 指向 `dist/index.js`），不提供当前 MCP 配置页使用的 `getClients` / `transformConfig` 兼容导出，也没有兼容的 `mcp-config/src/index.js` 入口。

---

## 项目结构

```
src/
├── cli/                 # bmmd 命令行入口
├── components/          # React 组件
│   ├── command-palette/ # 命令面板
│   ├── dialog/          # 弹窗组件
│   ├── file-tabs/       # 文件标签页（多文件管理）
│   ├── logo/            # Logo 组件
│   ├── markdown/        # Markdown 编辑器与预览器
│   │   ├── editor/      # CodeMirror 编辑器
│   │   ├── previewer/   # 预览渲染器
│   │   ├── footer-bar/  # 底部操作栏
│   │   └── hooks/       # 共享 Hooks
│   ├── mockups/         # 设备模拟框（iPhone/Safari）
│   ├── not-found/       # 404 页面
│   └── ui/              # shadcn/ui 组件（CLI 管理）
├── content/             # 静态内容（默认 Markdown）
├── env/                 # 环境变量管理
├── hooks/               # 全局 Hooks（use-files-sync 等）
├── icons/               # 自定义图标
├── lib/                 # 核心业务逻辑
│   ├── actions/         # 用户操作（导入/导出/复制）
│   ├── file-storage.ts  # IndexedDB 文件存储
│   ├── file-importer.ts # 文件分类、解析与标签创建
│   ├── upload-image.ts  # 图片上传客户端边界（ofetch + Zod）
│   └── markdown/        # Markdown 处理管道
│       ├── definitions.ts # 唯一 markdownTools registry
│       ├── extract/     # 文本提取
│       ├── lint/        # 格式校验
│       ├── parse/       # HTML → Markdown
│       ├── render/      # Markdown → HTML
│       ├── router.ts    # 从 registry 派生 API / Worker procedure
│       ├── mcp.ts       # 从 registry 注册 MCP 工具
│       └── types/       # 工具与 CLI 定义类型
├── routes/              # TanStack Router 路由
├── storage/             # 云端存储抽象层
│   ├── index.ts         # 存储入口（自动选择 S3/DC）
│   ├── s3-storage.ts    # S3 兼容存储
│   ├── dc-storage.ts    # DC 图床存储
│   └── types.ts         # 存储类型定义
├── stores/              # Zustand 状态管理
├── styles/              # 全局样式
├── themes/              # 主题配置
│   ├── code-theme/      # 代码高亮主题
│   ├── codemirror/      # 编辑器主题
│   ├── markdown-style/  # Markdown 排版样式
│   ├── palette/         # 统一调色板
│   └── shadcn/          # shadcn 主题定制
└── utils/               # 工具函数
```

---

## 核心流程

### Markdown 处理管道

`src/lib/markdown/definitions.ts` 中的 `markdownTools` 是 `render`、`parse`、`extract`、`lint` 的唯一 registry，将 schema、元信息、CLI 声明与惰性 `run` 绑定。公开 API、CLI 与 MCP 均遍历该 registry 派生；Worker 复用同一组 procedure，并额外提供内部 `preview`。

各工具实现分别位于 `render/html.ts`、`parse/html.ts`、`extract/text.ts` 与 `lint/markdown.ts`。旧的 per-tool `index.ts`、`tools.ts` 和 `rpc.ts` 已删除。

### 渲染流程详解

1. **解析阶段** - `remark-parse` 解析 Markdown AST
2. **扩展处理** - GFM、Math、Frontmatter 等插件
3. **转换阶段** - `remark-rehype` 转为 HTML AST
4. **增强阶段** - 外部链接、GitHub Alert、KaTeX、代码高亮，以及通过 `beautiful-mermaid` 渲染 Mermaid、通过 `@antv/infographic/ssr` 渲染 Infographic；生成的 SVG 经过安全清理
5. **平台适配** - 微信使用专门适配；HTML 使用通用输出
6. **样式内联** - `juice` 将 CSS 内联到元素

### 平台适配器

针对不同平台的输出策略：

| 平台   | 适配内容                                           |
| ------ | -------------------------------------------------- |
| HTML   | 通用 HTML 输出                                     |
| WeChat | 链接转脚注、代码空格用 `\u00A0` 保护、表格滚动容器 |

### 图片、PDF 与打印导出

导出操作以已经写入预览 iframe 的当前正文与样式为输入：

```mermaid
sequenceDiagram
  participant P as 预览 iframe DOM
  participant S as snapDOM
  participant R as 逐页栅格化
  participant O as 导出结果
  P->>S: 捕获当前正文与样式
  alt 图片导出
    S->>O: 下载 JPEG 或复制 PNG
  else PDF 导出
    S->>R: 返回一次 SVG 快照
    R->>R: 按 DOM 断点修改 viewBox
    R->>O: 写入分页 PDF
  else 打印
    P->>O: 调用浏览器打印
  end
```

PDF 分页发生在栅格化之前：系统只捕获一次 SVG 快照，再依据 DOM 安全断点为每页修改 `viewBox`，最后逐页栅格化，而不是先生成整图 canvas 再切片。单页会按尺寸动态缩放，以遵守浏览器单边最大 16384 像素的限制。外部图片需要正确的 CORS 响应，建议先上传后导出，不依赖内置图片代理。

---

## 状态管理

使用 Zustand 进行状态管理，分为 4 个独立 Store：

### Store 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Zustand Stores                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│   filesStore    │   editorStore   │      previewStore       │
│                 │                 │                         │
│  • files[]      │  • scrollRatio  │  • previewWidth（持久化）│
│  • activeFileId │  • scrollSource │  • previewColorScheme   │
│  • currentContent│ • 3 项编辑设置 │  • 渲染主题与 customCss │
│  • isInitialized│                 │  • renderedSignature    │
│  • contentStatus│                 │  • hasHydrated          │
│  • revision     │                 │                         │
├─────────────────┴─────────────────┴─────────────────────────┤
│                   commandPaletteStore                       │
│                                                             │
│  • open (boolean)    • subMenu (enum)                       │
└─────────────────────────────────────────────────────────────┘
```

### 持久化策略

| Store               | 存储位置/Key                 | 持久化内容                                              |
| ------------------- | ---------------------------- | ------------------------------------------------------- |
| filesStore          | IndexedDB + sessionStorage   | catalog/正文；当前标签活动文件使用 `bm.md.files.active` |
| editorStore         | localStorage `bm.md.editor`  | 脚注链接、新窗口打开、滚动同步 3 项设置（不含滚动状态） |
| previewStore        | localStorage `bm.md.preview` | 宽度、配色、渲染主题与 customCss；不保存渲染 HTML       |
| commandPaletteStore | -                            | 不持久化                                                |

### Store 交互

- `editorStore` 与 `previewStore` 使用 `skipHydration`，由 `src/lib/client-integrations.ts` 在客户端显式调用 `persist.rehydrate()`
- 预览 HTML 只保存在 iframe 中；`renderedSignature` 仅标识当前输入是否已真正提交，不进入持久化存储
- `filesStore` 不使用 Zustand persist。文件 catalog 是 IndexedDB 唯一事实源，`activeFileId` 是标签页私有会话状态
- 正文只在 `contentStatus=ready` 且 `contentFileId=activeFileId` 时允许编辑；切换加载期间编辑器和导出入口均关闭
- 组件通过 Hooks 订阅 Store，实现响应式更新

---

## 存储架构

### 本地存储（文件 catalog 与正文）

使用 IndexedDB 存储用户的 Markdown 文档内容：

```
┌──────────────────────────────────────────────────────────────┐
│                    file-storage.ts                           │
├──────────────────────────────────────────────────────────────┤
│  IndexedDB (idb, v2)                                         │
│  ├─ Database: bm.md                                          │
│  ├─ ObjectStore: catalog                                     │
│  │   └─ { key: "main", revision, files[] }                  │
│  └─ ObjectStore: files                                       │
│      └─ { id: string, content: string, version: number }     │
├──────────────────────────────────────────────────────────────┤
│  降级策略                                                     │
│  ├─ 首次打开不可用时降级为内存存储                             │
│  └─ 运行期失败保留内存草稿并阻止破坏性切换                     │
└──────────────────────────────────────────────────────────────┘
```

create、rename、delete 会在 IndexedDB 事务内读取最新 catalog；create/delete 同时修改正文 Store，避免 metadata 与正文半提交。正文保存先确认 catalog 中仍存在文件，再递增独立 `version`，因此删除后的迟到保存不会复活文件。

跨标签同步不传递全量快照：提交方只写入 `bm.md.files.signal` revision/version 通知，接收方重读 IndexedDB，且不会回写通知。文件列表共享，活动标签通过 sessionStorage 保持各标签独立；同一正文并发编辑采用 version 排序的 last-writer-wins。正文首笔编辑立即写入，连续输入在 150ms 尾随窗口内合并，显式切换或页面隐藏会立即 flush。

旧版 `localStorage['bm.md.files']` 仅用于一次性迁移到 v2 catalog，迁移成功后删除。

`src/lib/file-importer.ts` 统一识别 `.md`、`.markdown`、`.mdown`、`.mkd`（大小写不敏感），HTML 文件经 Markdown Worker 转换。批量导入按原始顺序创建标签；`filesStore.createFile()` 创建文件后立即将其设为活动文件，因此最后创建的文件保持激活。

### 云端存储（图片上传）

客户端上传边界是 `src/lib/upload-image.ts`：使用 `ofetch` 请求同源或 `VITE_API_URL` 下的 `/api/upload/image`，并用 Zod 校验成功响应、统一提取错误信息。旧的 `services` 上传层与顶层 `lib/api` helper 已删除。

服务端路由 `src/routes/api.upload.image.ts` 校验表单、图片大小和 PNG/JPEG/GIF/WebP 文件签名，并由检测结果决定扩展名和 Content-Type，再通过 `src/storage/index.ts` 选择 S3 兼容存储或 DC 图床：

```
┌──────────────────────────────────────────────────────────────┐
│                    storage/index.ts                          │
├──────────────────────────────────────────────────────────────┤
│  isS3Configured()                                            │
│  ├─ true  → S3Storage (Cloudflare R2, MinIO, AWS S3)         │
│  └─ false → DCStorage (默认图床)                              │
├──────────────────────────────────────────────────────────────┤
│  环境变量                                                     │
│  ├─ S3_ACCESS_KEY_ID                                         │
│  ├─ S3_SECRET_ACCESS_KEY                                     │
│  ├─ S3_ENDPOINT                                              │
│  └─ S3_BUCKET                                                │
└──────────────────────────────────────────────────────────────┘
```

---

## 路由设计

基于 TanStack Router 的文件路由系统：

### 页面路由

| 路径          | 文件                     | 说明                    |
| ------------- | ------------------------ | ----------------------- |
| `/`           | `_layout.index.tsx`      | 主页（编辑器 + 预览器） |
| `/about`      | `_layout.about.tsx`      | 关于页面（弹窗）        |
| `/docs`       | `docs.tsx`               | API 文档（Scalar UI）   |
| `/docs/mcp`   | `_layout.docs.mcp.tsx`   | MCP 配置说明（弹窗）    |
| `/docs/skill` | `_layout.docs.skill.tsx` | AI Skill 文档（弹窗）   |

### API 路由

| 路径                | 文件                  | 说明                 |
| ------------------- | --------------------- | -------------------- |
| `/api/*`            | `api.$.ts`            | Markdown API（oRPC） |
| `/api/upload/image` | `api.upload.image.ts` | 图片上传             |
| `/mcp`              | `mcp.ts`              | MCP 协议端点         |

### 布局结构

```
__root.tsx (HTML 文档结构、全局 Provider)
└── _layout.tsx (主布局：编辑器 | 预览器 | 底栏)
    ├── _layout.index.tsx (首页)
    ├── _layout.about.tsx (关于弹窗)
    ├── _layout.docs.mcp.tsx (MCP 弹窗)
    └── _layout.docs.skill.tsx (Skill 弹窗)
```

---

## Worker 架构

Markdown 渲染在 Web Worker 中执行，避免阻塞主线程：

```
┌──────────────┐         oRPC          ┌──────────────┐
│  Main Thread │ ◄─────────────────► │  Web Worker  │
│              │                       │              │
│  • UI 渲染   │                       │  • Markdown  │
│  • 用户交互  │                       │    处理管道  │
│  • 状态管理  │                       │  • 重计算    │
└──────────────┘                       └──────────────┘
```

### 通信方式

- 使用 oRPC 的 Web Workers Adapter
- 支持双向通信
- 类型安全的 RPC 调用

---

## 部署支持

基于 Nitro 构建，支持多种部署平台：

| 平台               | 说明                  |
| ------------------ | --------------------- |
| Cloudflare Workers | Edge Runtime          |
| Vercel             | Serverless Functions  |
| Netlify            | Serverless Functions  |
| Node.js (Docker)   | 传统服务器部署        |
| 阿里云 ESA         | Edge Runtime          |
| 腾讯云 EdgeOne     | Node.js Runtime       |
| 其他               | 任意 Nitro 支持的平台 |

### 环境检测

`scripts/vite/platform.ts` 集中解析部署环境，`vite.config.ts` 使用其结果配置 Nitro、预渲染与 PWA 输出目录。阿里云 ESA 优先；腾讯 EdgeOne 仅在 `HOME` 与 `TMPDIR` 同时匹配时启用：

```typescript
const isAliyunESA = Boolean(environment.AliUid)
const isTencentEdgeOne = environment.HOME === '/dev/shm/home'
  && environment.TMPDIR === '/dev/shm/tmp'
```

---

## 接口与工具设计

### oRPC 架构

使用 oRPC 构建类型安全的 API。`src/lib/markdown/router.ts` 遍历 `markdownTools` 生成四个公开 procedure，避免维护第二份 handler 映射：

```
┌─────────────────────────────────────────────────────────────┐
│                        oRPC Router                          │
├─────────────────┬─────────────────┬─────────────────────────┤
│ markdown.render │ markdown.parse  │ markdown.extract/lint   │
├─────────────────┴─────────────────┴─────────────────────────┤
│                    OpenAPIHandler                           │
│                    (CORS, Error Handling)                   │
└─────────────────────────────────────────────────────────────┘
```

### CLI 集成

CLI 使用 `cac` 实现，入口为 `src/cli/index.ts`，构建后输出到 `bin/bmmd.mjs` 并通过 `package.json` 的 `bin.bmmd` 暴露。

```
┌─────────────────────────────────────────────────────────────┐
│                         bmmd CLI                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│ bmmd render     │ bmmd parse      │ bmmd extract/lint       │
├─────────────────┴─────────────────┴─────────────────────────┤
│ src/lib/markdown/definitions.ts 提供唯一 markdownTools registry│
│ src/cli/core.ts 直接复用 registry 的 schema、CLI 声明与 run    │
│ src/cli/index.ts 遍历 registry 注册命令                        │
└─────────────────────────────────────────────────────────────┘
```

设计要点：

- **声明式命令** - `markdownTools` 汇总各工具的 Zod schema、CLI 输入字段、选项和执行函数，CLI 自动生成命令与帮助信息
- **统一校验** - CLI 执行前复用同一份 Zod schema 校验参数，错误统一以 `bmmd: ...` 输出
- **输入输出一致** - 命令支持文件输入和 stdin；默认写 stdout，`--output <file>` 写入文件
- **特殊写回** - `bmmd lint <file> --fix` 将修复结果写回输入文件，且不能与 `--output` 同时使用
- **构建发布** - `pnpm build:cli` 使用 `tsdown.cli.config.ts` 生成 Node 20 ESM bundle，`prepack` 会在发布前自动构建

### MCP 集成

实现 Model Context Protocol 服务端：

`src/lib/markdown/mcp.ts` 遍历 `markdownTools` 注册工具，并只负责 MCP 配置与结果格式化。工具集合、schema 和执行逻辑不在 MCP 层重复声明。

---

## 构建优化

### Vite 插件

| 插件                          | 功能              |
| ----------------------------- | ----------------- |
| `cssRawMinifyPlugin`          | CSS 原始导入压缩  |
| `markdownPlugin`              | Markdown 文件导入 |
| `tanstackStart`               | SSR 支持          |
| `babel-plugin-react-compiler` | React 编译器优化  |
| `vite-plugin-pwa`             | PWA 支持          |

### 代码分割

- 编辑器组件懒加载
- 预览器组件懒加载
- 命令面板客户端渲染
- Worker 独立 bundle
