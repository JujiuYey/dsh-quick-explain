<div align="center">
  <img src="icon.svg" width="96" alt="dsh-quick-explain logo">
  <h1>dsh-quick-explain</h1>
</div>

[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Select a fragment of a chat, ask what it means, and keep the answer out of your main conversation.**

`dsh-quick-explain` is a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) plugin: highlight a word or a sentence in any message, click **💡 Explain**, and a temporary side conversation opens on the right. It explains the fragment, answers follow-ups, and disappears when you close it — the main chat keeps its exact history and context.

[中文说明](README.zh.md)

## Why

Sometimes you need to understand one word, one acronym, or one sentence in the middle of a long task. Asking the main assistant means adding a turn you will have to live with: it enters the session log, the model's context, and every later request. This plugin gives you a separate, disposable explainer instead.

## Features

- **Selection → aside.** Highlight 1–1200 characters in the transcript; a small chip appears next to the selection.
- **Explains in place.** The side panel streams a short explanation of the selected text, using the paragraph around it as context.
- **Follow-up questions.** Keep digging in the panel; each question stays in the side conversation.
- **Zero impact on the main session.** Nothing is appended to the session log, no message is added to the conversation, and the main model request is untouched.
- **Uses your own model.** The side calls go through DSH's own `ctx.llm.stream` with your configured default model.
- **Native chrome.** The panel is a right-edge sheet built from DSH's own theme tokens — same hairlines, radii, type scale and motion — so it reads as part of the app instead of a third-party card.
- **Disposable by design.** Closing the panel, or 30 minutes of inactivity, drops the side conversation from host memory.
- **Local only.** The panel talks to a route inside your running DSH process; no extra service, no telemetry.

## Install

In DSH Desktop: open the **Plugins** page (sidebar, or Settings → Plugins) → **Add plugin**:

- **GitHub**: `JujiuYey/dsh-quick-explain`
- or **Tarball**: a `.tgz` built from this repository (`npm pack`)

From a shell (for a profile the app does not reserve):

```sh
dsh plugin --profile <profile> add github:JujiuYey/dsh-quick-explain
```

The Desktop `desktop` profile is owned by the Electron app — quit it fully before using the CLI, or install through the Plugins page.

## Usage

1. Select text in a message.
2. Click **💡 Explain** next to the selection.
3. Read the explanation; type a follow-up and press `Cmd/Ctrl + Enter`.
4. Close with `×` or `Esc` — the side chat is discarded.

## How it works

```text
selection
   │  client.js: start(quote, context)
   ▼
POST /api/quick-explain            (plugin-owned route, same origin)
   │
   ▼
index.js: new thread in memory → ctx.llm.stream(...)
   │
   │  client.js polls every 350 ms: {endpoint:'poll', threadId}
   ▼
{state, text, error} → panel renders the growing answer
```

The main conversation's Session is not part of this path. The side conversation never emits session events, so it cannot affect replay, compaction, or the next model request.

## Files

| File | Role |
| --- | --- |
| `index.js` | Host half: the `/api/quick-explain` route, in-memory threads, model calls, idle sweep |
| `client.js` | Client half: selection detection, floating chip, side panel, polling |
| `cordis.patch.yml` | Inserts the plugin row into the profile |
| `locale/*.json` | Plugin list title and description (English / Chinese) |
| `icon.svg` | Plugin icon |

## Development

Install this directory as a **Local directory** bundle, edit, then restart DSH to load changed client code:

```sh
npm pack            # produces dsh-quick-explain-<version>.tgz
```

or point the plugin manager at the checkout. The Host half (`index.js`) is plain ESM with no build step; the Client half (`client.js`) is a plain script that registers a lazy factory with `window.__ModuleLoader__`.

Requirements: DSH `0.2.1-rc.2` or a compatible release that provides `ctx.connection.fetch`, `ctx.llm`, `ctx.agentDefaultModel`, and the `shell.overlay` client slot.

## Privacy

The selected text, the paragraph around it, and your follow-up questions are sent to the model provider configured in DSH — the same provider your main conversation already uses. The side conversation itself lives only in the Host process memory: it is not written to the session log, not stored on disk, and gone after a restart.

## Limitations

- The explainer sees the selection plus its surrounding paragraph, not the full conversation history — that is the price of leaving the main session untouched.
- Answers render light inline Markdown (`**bold**` and `` `code` ``); headings and lists are not interpreted.
- Side conversations are per-process; restarting DSH clears them.
- UI strings are English and Chinese only.

## Development

The client is bundled from `src/` into a single injected script:

```sh
npm install   # also runs the build via `prepare`
npm run build # regenerate client.js
```

## License

[MIT](LICENSE) © 2026 JujiuYey

The sparkles glyph used by the selection chip and the plugin icon is from [Lucide](https://lucide.dev) (ISC License).
