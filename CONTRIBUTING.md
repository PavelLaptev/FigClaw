# Contributing to FigClaw

Thanks for your interest in contributing! This guide covers everything you need to run FigClaw locally and build the plugin from source.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- A Figma desktop app account

## Local development

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/PavelLaptev/figma-cc-agent.git
   cd figma-cc-agent
   pnpm install
   ```
2. Start the development build (watches for changes and rebuilds automatically):
   ```bash
   pnpm dev
   ```
3. In the Figma desktop app, open **Plugins → Development → Import plugin from manifest…** and select `public/manifest.json`.
4. Run the plugin: **Plugins → Development → FigClaw**.

The plugin UI is a Svelte 5 app (`src/UI.svelte`) that runs in an iframe. The plugin sandbox backend lives in `src/code.ts`. Changes to either file are picked up by the watcher automatically — reload the plugin in Figma to see them.

## Build for production

```bash
pnpm build
```

Output goes to `public/build/bundle.js`.

## Project structure

```
src/
  code.ts       # Plugin sandbox — tool executor, storage, message handler
  UI.svelte     # Plugin iframe — agent loop, Claude API calls, chat UI
  tools.ts      # Tool definitions shared between code.ts and UI.svelte
  utils.ts      # Shared utilities
  components/   # Svelte UI components
skills/         # Example skill .md files bundled with the plugin
public/
  manifest.json # Figma plugin manifest
  build/        # Compiled output (generated)
```

## Technical notes

- The Claude API is called directly from the Svelte iframe using the `anthropic-dangerous-direct-browser-access: true` header.
- Network access is restricted to `https://api.anthropic.com` in the manifest.
- The API key and chat history are persisted in `figma.clientStorage` — local to your Figma client, never synced.
- The agent may make several API calls per message as it iterates through a task; this counts against your Anthropic usage.
- `run_figma_code` results must use an explicit `return` statement — code without `return` always yields `{ ok: true }`.

## Adding skills

Drop any `.md` file into the `skills/` folder. Users can load skill files from the **Skills** tab in the plugin UI. See the existing files for examples of what a skill can do.

## Adding tools

1. Add the tool definition to `src/tools.ts` (exported `TOOLS` array).
2. Add the corresponding `case` block in the `executeTool()` switch in `src/code.ts`.
3. Update the `## Tools available` section in the `SYSTEM_PROMPT` inside `src/UI.svelte`.
