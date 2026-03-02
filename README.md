# FigClaw

FigClaw is an agentic Claude-powered Figma plugin that lets you chat with your canvas, inspect and manipulate nodes, and execute Figma Plugin API code — all from within Figma.

Instead of a simple Q&A chat, FigClaw runs an agent loop: it can inspect your current selection, read page structure, look up Figma Plugin API docs on demand, write and execute JavaScript against the `figma` global, and report back what changed — all in one conversation.

## Features

- **Agentic loop** — Claude autonomously calls tools, reads results, and iterates until the task is done
- **Canvas inspection** — get the current selection or full page node tree
- **Code execution** — run arbitrary Figma Plugin API code with full `await` support
- **Doc lookup** — fetches Figma API docs on demand so Claude always has the right API signatures
- **Image attachments** — attach screenshots or reference images to your messages
- **Persistent API key** — stored locally via `figma.clientStorage`, never leaves your machine

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start development build:
   ```bash
   pnpm dev
   ```
3. In Figma, open `Plugins` → `Development` → `Import plugin from manifest...` and select `public/manifest.json`.
4. Run the plugin: `Plugins` → `Development` → `FigClaw`.

## Usage

1. Paste your Claude API key (e.g. `sk-ant-...`) in the settings panel and click **Save**.
2. Optionally change the model (default: `claude-sonnet-4-5`).
3. Type a message and click **Send** — or attach an image first.

Example prompts:

- _"Create a button component with auto layout"_
- _"What's selected right now?"_
- _"Add a drop shadow to every frame on this page"_
- _"Rename all layers that start with 'Frame' to use the component name instead"_

## Build

```bash
pnpm build
```

## Notes

- Network access is restricted to `https://api.anthropic.com` in the manifest.
- Chat history is kept in the plugin UI session (it resets when the plugin window closes).
- The agent may make multiple API calls per message as it works through a task — this counts against your Anthropic usage.
