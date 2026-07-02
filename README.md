# bm.md

更好用的 Markdown 排版助手｜微信公众号专门适配，支持输出到网页与图片。

---

## ✨ 特性

- 📝 **实时预览** - 基于 CodeMirror 6 的 Markdown 编辑器，所见即所得
- 🎨 **15 种排版样式** - 从专业商务到复古怀旧，满足不同场景需求
- 🌈 **14 种代码主题** - 支持浅色/深色多种代码高亮风格
- 📱 **平台适配** - 微信公众号专门适配，同时支持通用 HTML 输出
- 🖼️ **图片导出** - 将排版内容导出为图片分享
- 🔌 **开发者友好** - 提供 CLI、REST API 和 MCP 协议集成
- ⌨️ **快捷操作** - 命令面板 + 全局快捷键，高效操作

## 🚀 快速开始

```bash
# 克隆项目
git clone https://github.com/miantiao-me/bm.md.git
cd bm.md

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:2663 开始使用。

### CLI 使用

`bmmd` 可在命令行中复用核心 Markdown 处理能力，支持文件输入或 stdin，默认输出到 stdout。

```bash
# 直接运行
pnpm dlx bmmd render article.md --platform wechat --output article.html

# 管道输入
cat article.md | pnpm dlx bmmd extract

# 修复 Markdown 并写回源文件
pnpm dlx bmmd lint article.md --fix
```

本地开发可执行 `pnpm build:cli` 构建 CLI，入口文件为 `bin/bmmd.mjs`。

## 🛠️ 技术栈

- **框架**: [TanStack Start](https://tanstack.com/start) (React 19 + TanStack Router)
- **构建**: [Vite 8](https://vite.dev)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- **部署**: [Nitro](https://nitro.build) (支持 Cloudflare Workers / Vercel / Netlify / Docker / Alibaba ESA / Tencent EdgeOne 等)

阿里云部署配置：

```txt
安装命令: pnpm install
构建命令: pnpm run build
根目录: /
静态资源目录: dist/client
函数文件路径: dist/server/server.js
```

其他环境部署配置参考 [Nitro](https://v3.nitro.build/deploy) 文档。

## 📖 文档

- [功能说明](https://github.com/miantiao-me/bm.md/blob/master/docs/features.md) - 完整功能介绍
- [架构设计](https://github.com/miantiao-me/bm.md/blob/master/docs/architecture.md) - 技术架构详解
- [UI 设计](https://github.com/miantiao-me/bm.md/blob/master/docs/design.md) - 界面设计说明
- [API 文档](https://bm.md/docs) - REST API 参考

## 🙏 致谢

- [Kami](https://github.com/tw93/Kami) — 「Kami」排版风格的灵感来源（暖羊皮纸 + 墨蓝克制的编辑级排版）。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

## 📄 许可证

[AGPL-3.0](https://github.com/miantiao-me/bm.md/blob/master/LICENSE)
