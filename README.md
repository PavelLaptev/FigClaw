# Claude Chat Figma Plugin

This plugin adds a chat interface inside Figma and sends messages to Claude via the Anthropic Messages API.

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
4. Run the plugin: `Plugins` → `Development` → `Claude Chat Plugin`.

## Using the chat

1. Paste your Claude API key (for example `sk-ant-...`) in the API key field and click **Save**.
2. Optionally adjust the model name (default: `claude-3-5-sonnet-latest`).
3. Type a message and click **Send**.

The API key is stored with `figma.clientStorage` for this plugin on your local machine.

## Build

```bash
pnpm build
```

## Notes

- Network access is restricted to `https://api.anthropic.com` in the manifest.
- Chat history is kept in the plugin UI session (it resets when the plugin window closes).
