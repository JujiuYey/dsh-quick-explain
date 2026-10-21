# dsh-quick-explain

[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**在对话里选中一个词或一句话，问它是什么意思——答案留在一边，不进入你的主对话。**

`dsh-quick-explain` 是一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）插件：在任意消息里选中文字，点 **💡 解释**，右侧会打开一个临时解释对话。它解释这段内容、支持继续追问，关闭即消失；主对话的历史和上下文一个字都不会变。

[English](README.md)

## 为什么需要它

长任务进行到一半，突然有一个词、一个缩写或一句话没看懂。直接问主助手，代价是这一问会进入会话日志、进入模型上下文，并影响之后的每一次请求。这个插件给你一个*独立、用完即弃*的解释器。

## 功能

- **选中即解释**：在对话中选中 1–1200 字，选区旁浮出「💡 解释」按钮。
- **就地解释**：右侧面板流式输出解释，并自动把选区所在段落作为上下文。
- **可以追问**：在面板里继续问，问题只留在临时对话里。
- **对主会话零影响**：不追加任何会话事件、不新增消息、不改变主对话的模型请求。
- **用你自己的模型**：通过 DSH 的 `ctx.llm.stream` 和你配置的默认模型调用。
- **设计上可丢弃**：关闭面板或闲置 30 分钟后，临时对话从 Host 内存中删除。
- **纯本地**：面板只访问你正在运行的 DSH 进程内的路由，没有额外服务、没有遥测。

## 安装

DSH Desktop：打开 **Plugins** 页面（侧边栏，或 设置 → 插件）→ **Add plugin**：

- **GitHub**：填 `JujiuYey/dsh-quick-explain`
- 或 **Tarball**：用 `npm pack` 打出的 `.tgz`

命令行（适用于非应用托管的 profile）：

```sh
dsh plugin --profile <profile> add github:JujiuYey/dsh-quick-explain
```

Desktop 的 `desktop` profile 由 Electron 应用独占管理：用 CLI 前请先完全退出应用，或者直接用插件页面安装。

## 使用

1. 在消息里选中一段文字。
2. 点选区旁的 **💡 解释**。
3. 阅读解释；在底部输入框继续追问，`⌘/Ctrl + Enter` 发送。
4. 点 `×` 或按 `Esc` 关闭，临时对话即被丢弃。

## 工作原理

```text
选区
  │  client.js: start(quote, context)
  ▼
POST /api/quick-explain            （插件自己的同源路由）
  │
  ▼
index.js: 内存中新建 thread → ctx.llm.stream(...)
  │
  │  client.js 每 350ms 轮询：{endpoint:'poll', threadId}
  ▼
{state, text, error} → 面板渲染增量文本
```

主对话的 Session 不在这条链路上。临时对话不产生任何会话事件，因此不会影响回放、压缩或下一次模型请求。

## 文件

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host 半边：`/api/quick-explain` 路由、内存对话、模型调用、空闲回收 |
| `client.js` | Client 半边：选区监听、浮动按钮、右侧面板、轮询 |
| `cordis.patch.yml` | 把插件行插入 profile |
| `locale/*.json` | 插件列表里的标题与描述（中/英） |
| `icon.svg` | 插件图标 |

## 开发

把本目录作为 **Local directory** bundle 安装，修改后重启 DSH 以加载新的客户端代码：

```sh
npm pack            # 生成 dsh-quick-explain-1.0.0.tgz
```

Host 半边（`index.js`）是无构建步骤的 ESM；Client 半边（`client.js`）是向 `window.__ModuleLoader__` 注册懒加载工厂的普通脚本。

要求：DSH `0.2.1-rc.2` 或提供 `ctx.connection.fetch`、`ctx.llm`、`ctx.agentDefaultModel` 以及 `shell.overlay` 客户端槽位的兼容版本。

## 隐私

选中的文字、它所在的段落以及你的追问会发送给 DSH 中配置的模型提供方——也就是你主对话已经在用的同一个提供方。临时对话本身只存在于 Host 进程内存：不写入会话日志、不落盘，重启即清空。

## 已知限制

- 解释器只能看到选区和它所在的段落，看不到完整会话历史——这是"不触碰主会话"的代价。
- 回答支持轻量行内 Markdown（`**粗体**` 与 `` `代码` ``），不解析标题和列表。
- 临时对话是进程内状态，重启 DSH 后清空。
- 界面文案目前只有中英文。

## 许可证

[MIT](LICENSE) © 2026 JujiuYey
