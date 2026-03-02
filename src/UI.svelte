<script lang="ts">
  import './styles.css';
  import { tick } from 'svelte';
  import Header from './components/Header.svelte';
  import Settings from './components/Settings.svelte';
  import ChatMessage from './components/ChatMessage.svelte';
  import Composer, { type AttachedImage } from './components/Composer.svelte';

  // ─── Types ────────────────────────────────────────────────────────────────
  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    | { type: 'tool_result'; tool_use_id: string; content: string };

  type ApiMessage = {
    role: 'user' | 'assistant';
    content: string | ContentBlock[];
  };

  type DisplayMessage = {
    role: 'user' | 'assistant' | 'tool' | 'code';
    text: string;
    images?: string[]; // data URLs for user messages
    toolName?: string;
    toolStatus?: 'running' | 'done' | 'error';
  };

  // ─── State ────────────────────────────────────────────────────────────────
  let apiKeyInput = $state('');
  let hasApiKey = $state(false);
  let statusMessage = $state('');
  let model = $state('claude-sonnet-4-5');
  let prompt = $state('');
  let attachedImages = $state<AttachedImage[]>([]);
  let isSending = $state(false);
  let showSettings = $state(false);

  let displayMessages = $state<DisplayMessage[]>([]);
  let apiHistory = $state<ApiMessage[]>([]);

  let messagesContainer: HTMLElement | null = null;

  // ─── Tool definitions sent to Claude ─────────────────────────────────────
  const TOOLS = [
    {
      name: 'fetch_docs',
      description:
        'Fetches a Figma Plugin API documentation page and returns its content. ' +
        'Use this when you are unsure about an API type, property, or method signature. ' +
        'For common operations (shapes, fills, text, auto-layout, selection) you already know the API — skip this tool. ' +
        'HOW TO USE: ' +
        '1) To find a slug, fetch the index: https://raw.githubusercontent.com/PavelLaptev/figma-api-snapshot/master/out/index.json ' +
        '2) Then fetch the page: https://raw.githubusercontent.com/PavelLaptev/figma-api-snapshot/master/out/raw/plugin-api/{slug}.json ' +
        'Common slug patterns: node types → docs__plugins__api__FrameNode | figma methods → docs__plugins__api__properties__figma-createframe | node props → docs__plugins__api__properties__nodes-fills | data types → docs__plugins__api__Paint',
      input_schema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description:
              'URL to fetch. Use the snapshot repo URLs described above, e.g. https://raw.githubusercontent.com/PavelLaptev/figma-api-snapshot/master/out/raw/plugin-api/docs__plugins__api__FrameNode.json',
          },
        },
        required: ['url'],
      },
    },
    {
      name: 'run_figma_code',
      description:
        'Executes arbitrary JavaScript in the Figma plugin context. ' +
        'The code runs with full access to the `figma` global — all Plugin API methods are available. ' +
        'Top-level `await` is supported (the code is wrapped in an async function). ' +
        'Before calling this tool, ALWAYS show the code you are about to run in a text message so the user can see it. ' +
        'IMPORTANT: To read a value back as the tool result, the code MUST end with an explicit `return` statement ' +
        '(e.g. `return figma.currentPage.name`). Without a `return`, the result will always be `{ ok: true }` ' +
        'regardless of what the code evaluates — never assume a value from the code unless it is explicitly returned.',
      input_schema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Valid JavaScript to execute. Has access to the `figma` global.',
          },
          description: {
            type: 'string',
            description: 'One-line summary of what this code does (shown in the UI).',
          },
        },
        required: ['code', 'description'],
      },
    },
    {
      name: 'get_selection',
      description: 'Returns the currently selected nodes in Figma with all their properties.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'get_page_nodes',
      description: 'Returns nodes on the current page up to a given depth.',
      input_schema: {
        type: 'object',
        properties: {
          depth: { type: 'number', description: 'How many levels deep to traverse (default 2)' },
        },
        required: [],
      },
    },
    {
      name: 'get_node_by_id',
      description: 'Returns full properties of a specific node by its Figma ID.',
      input_schema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Figma node ID' } },
        required: ['id'],
      },
    },
    {
      name: 'get_styles',
      description: 'Returns all local paint and text styles defined in the document.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'notify',
      description: 'Shows a toast notification inside Figma.',
      input_schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          timeout: { type: 'number' },
          error: { type: 'boolean' },
        },
        required: ['message'],
      },
    },
  ] as const;

  const SYSTEM_PROMPT = `You are an expert Figma design agent running inside a Figma plugin. You can read and manipulate the Figma document, create and edit nodes, manage styles and variables, and run arbitrary Plugin API code — all through the tools provided.

## Tools available

- run_figma_code — execute JavaScript in the Figma plugin sandbox. Full access to the \`figma\` global. Top-level await is supported. Always show the code in a fenced block before running it. **To read any value back you MUST use an explicit \`return\` statement** (e.g. \`return figma.currentPage.name\`). Without \`return\` the result is always \`{ ok: true }\` — never guess or infer a value that was not explicitly returned.
- get_selection — read currently selected nodes with their serialised properties.
- get_page_nodes — read top-level nodes on the current page (with optional depth).
- get_node_by_id — read a specific node by its ID.
- get_styles — list all local paint and text styles.
- notify — show a toast in Figma.
- fetch_docs — fetch a Figma Plugin API reference page. Use this whenever you are unsure about a type, property, or method signature.

## Quick API reference (no need to look these up)

// Creating nodes
figma.createFrame() | createRectangle() | createEllipse() | createLine() | createText()
figma.createComponent() | createComponentFromNode(node)
figma.group(nodes, parent) | figma.flatten(nodes) | figma.ungroup(node)

// Text — font MUST be loaded before setting .characters
await figma.loadFontAsync({ family: "Inter", style: "Regular" })
textNode.characters = "Hello"
textNode.fontSize = 16

// Common node properties
node.x / node.y / node.width / node.height
node.resize(w, h) | node.rescale(factor)
node.name | node.visible | node.locked | node.opacity (0–1)
node.fills = [{ type: 'SOLID', color: { r, g, b } }]   // r/g/b are 0–1 floats
node.strokes = [{ type: 'SOLID', color: { r, g, b } }]
node.strokeWeight | node.strokeAlign ('INSIDE'|'OUTSIDE'|'CENTER')
node.effects = [{ type: 'DROP_SHADOW', color: {r,g,b,a}, offset: {x,y}, radius, visible: true }]
node.cornerRadius | node.topLeftRadius | node.topRightRadius | node.bottomLeftRadius | node.bottomRightRadius
node.blendMode | node.isMask
node.exportAsync({ format: 'PNG' | 'SVG' | 'PDF', constraint: { type: 'SCALE', value: 2 } })

// Auto-layout (FrameNode)
frame.layoutMode = 'HORIZONTAL' | 'VERTICAL' | 'NONE'
frame.primaryAxisSizingMode = 'FIXED' | 'AUTO'
frame.counterAxisSizingMode = 'FIXED' | 'AUTO'
frame.primaryAxisAlignItems = 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
frame.counterAxisAlignItems = 'MIN' | 'CENTER' | 'MAX' | 'BASELINE'
frame.paddingLeft | paddingRight | paddingTop | paddingBottom
frame.itemSpacing | frame.layoutWrap = 'NO_WRAP' | 'WRAP'
child.layoutSizingHorizontal = 'FIXED' | 'HUG' | 'FILL'
child.layoutSizingVertical  = 'FIXED' | 'HUG' | 'FILL'

// Tree & selection
figma.currentPage.selection          // read selected nodes
figma.currentPage.selection = [node] // set selection
figma.currentPage.children           // top-level nodes
parent.appendChild(child) | parent.insertChild(index, child)
node.remove() | figma.getNodeById(id)

// Styles
figma.getLocalPaintStyles() | getLocalTextStyles() | getLocalEffectStyles()
figma.createPaintStyle() | createTextStyle()
style.name | style.paints | style.fontSize | style.fontName

// Variables (design tokens)
figma.variables.getLocalVariables() | getLocalVariableCollections()
figma.variables.createVariable(name, collectionId, resolvedType)
figma.variables.createVariableCollection(name)
variable.setValueForMode(modeId, value)
node.setBoundVariable('fills', variable)

// Misc
figma.notify("message", { timeout: 3000, error: false })
figma.closePlugin()
figma.currentPage.name | figma.root.name

## Workflow

1. UNDERSTAND — if you need to inspect the canvas, call get_selection or get_page_nodes first.
2. LOOK UP DOCS (when unsure) — call fetch_docs before writing code for unfamiliar APIs. See "API docs" section below.
3. SHOW CODE — always display the code in a \`\`\`js block in a text message before executing.
4. RUN — call run_figma_code with that exact code.
5. REPORT — briefly summarise what happened or what changed.

If run_figma_code returns an error: read it carefully, fix the code, and retry. Only fetch docs if the error suggests a wrong API name or signature.

## API docs (fetch on demand)

The full Figma Plugin API is available as a snapshot at:
- Slug index: https://raw.githubusercontent.com/PavelLaptev/figma-api-snapshot/master/out/index.json
- Page template: https://raw.githubusercontent.com/PavelLaptev/figma-api-snapshot/master/out/raw/plugin-api/{slug}.json

Slug patterns:
- Node types      → docs__plugins__api__FrameNode  /  docs__plugins__api__TextNode
- figma.* methods → docs__plugins__api__properties__figma-createframe
- Node properties → docs__plugins__api__properties__nodes-fills
- Data types      → docs__plugins__api__Paint  /  docs__plugins__api__Effect
- Sub-namespaces  → docs__plugins__api__figma-variables  /  docs__plugins__api__figma-ui

If unsure of the slug, fetch the index first, search for the relevant title, then fetch that page.

## Rules
- Code must be self-contained — never reference variables from previous tool calls.
- Always load fonts before setting text content.
- Use get_selection before mutating selected nodes.
- Prefer run_figma_code for all writes; use the read tools (get_selection, get_page_nodes, etc.) for inspecting state.
- Keep responses concise. Show code, run it, report the outcome.
- **Always use an explicit \`return\` statement when reading a value** (e.g. \`return figma.currentPage.name\`). Code without \`return\` always yields \`{ ok: true }\` — never state a value you haven't seen in the tool result.`;

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function sendToPlugin(msg: Record<string, unknown>) {
    parent.postMessage({ pluginMessage: msg }, '*');
  }

  async function scrollBottom() {
    await tick();
    if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function pushDisplay(msg: DisplayMessage) {
    displayMessages = [...displayMessages, msg];
    scrollBottom();
  }

  // ─── Tool execution ───────────────────────────────────────────────────────
  let pendingToolResolvers: Map<string, (result: unknown) => void> = new Map();

  // fetch_docs runs entirely in the UI iframe (no CORS restriction needed for public docs)
  async function fetchDocs(url: string): Promise<string> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return `HTTP ${resp.status} fetching ${url}`;
      const html = await resp.text();
      // Strip tags to get readable plain text
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      // Remove scripts/styles
      tmp.querySelectorAll('script,style,nav,footer').forEach((el) => el.remove());
      const text = (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
      // Limit to 12 000 chars so it fits in Claude's context
      return text.slice(0, 12000);
    } catch (err) {
      return 'Failed to fetch: ' + String(err);
    }
  }

  function executeToolInPlugin(
    toolUseId: string,
    toolName: string,
    toolInput: Record<string, unknown>
  ): Promise<unknown> {
    return new Promise((resolve) => {
      pendingToolResolvers.set(toolUseId, resolve);
      sendToPlugin({ type: 'execute-tool', toolUseId, toolName, toolInput });
    });
  }

  // ─── Claude API call (fetch lives here in the iframe — no CORS issue) ─────
  async function callClaude(
    history: ApiMessage[]
  ): Promise<{ content: ContentBlock[]; stop_reason: string }> {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': storedApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: history,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const msg =
        err &&
        typeof err === 'object' &&
        'error' in err &&
        err.error &&
        typeof err.error === 'object' &&
        'message' in err.error
          ? String(err.error.message)
          : 'Claude API error ' + resp.status;
      throw new Error(msg);
    }

    return resp.json();
  }

  // ─── Agent loop ───────────────────────────────────────────────────────────
  let storedApiKey = '';

  async function runAgentLoop(userText: string, images: AttachedImage[] = []) {
    if (!storedApiKey) {
      statusMessage = 'No API key. Save your Claude API key first.';
      return;
    }

    isSending = true;
    pushDisplay({ role: 'user', text: userText, images: images.map((i) => i.dataUrl) });

    // Build multipart content if images are attached
    let userContent: string | ContentBlock[];
    if (images.length > 0) {
      userContent = [
        ...images.map(
          (img): ContentBlock => ({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mediaType,
              data: img.dataUrl.replace(/^data:[^;]+;base64,/, ''),
            },
          })
        ),
        ...(userText ? [{ type: 'text' as const, text: userText }] : []),
      ];
    } else {
      userContent = userText;
    }

    const userMsg: ApiMessage = { role: 'user', content: userContent };
    const history: ApiMessage[] = [...apiHistory, userMsg];

    try {
      let keepGoing = true;
      while (keepGoing) {
        statusMessage = 'Claude is thinking...';
        const response = await callClaude(history);
        const assistantMsg: ApiMessage = { role: 'assistant', content: response.content };
        history.push(assistantMsg);

        // Collect text blocks to display
        const textBlocks = response.content.filter(
          (b): b is { type: 'text'; text: string } => b.type === 'text'
        );
        if (textBlocks.length > 0) {
          pushDisplay({ role: 'assistant', text: textBlocks.map((b) => b.text).join('\n\n') });
        }

        // Process tool use blocks
        const toolUseBlocks = response.content.filter(
          (
            b
          ): b is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
            b.type === 'tool_use'
        );

        if (toolUseBlocks.length === 0 || response.stop_reason !== 'tool_use') {
          keepGoing = false;
          break;
        }

        // Execute all requested tools
        const toolResultContents: ContentBlock[] = [];

        for (const tool of toolUseBlocks) {
          const displayLabel =
            tool.name === 'run_figma_code'
              ? (tool.input.description as string) || 'run_figma_code'
              : tool.name === 'fetch_docs'
                ? 'fetch_docs: ' + String(tool.input.url || '')
                : tool.name;

          // For run_figma_code: show the code block in chat before executing
          if (tool.name === 'run_figma_code' && tool.input.code) {
            pushDisplay({
              role: 'code',
              text: String(tool.input.code),
              toolName: tool.name,
            });
          }

          pushDisplay({
            role: 'tool',
            text: displayLabel,
            toolName: tool.name,
            toolStatus: 'running',
          });

          let result: unknown;
          if (tool.name === 'fetch_docs') {
            result = { content: await fetchDocs(String(tool.input.url || '')) };
          } else {
            result = await executeToolInPlugin(tool.id, tool.name, tool.input);
          }

          // update last tool display to done
          displayMessages = displayMessages.map((m, i) =>
            i === displayMessages.length - 1 && m.role === 'tool' && m.toolName === tool.name
              ? { ...m, toolStatus: 'done' as const }
              : m
          );

          toolResultContents.push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: JSON.stringify(result),
          });
        }

        // Add tool results as next user message
        history.push({ role: 'user', content: toolResultContents });
        statusMessage = 'Processing tool results...';
      }

      apiHistory = history;
      statusMessage = 'Done.';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      statusMessage = 'Error: ' + msg;
      pushDisplay({ role: 'assistant', text: 'Error: ' + msg });
    } finally {
      isSending = false;
    }
  }

  async function sendMessage() {
    const text = prompt.trim();
    const images = attachedImages.slice();
    if ((!text && images.length === 0) || isSending) return;
    prompt = '';
    attachedImages = [];
    await runAgentLoop(text, images);
  }

  function clearChat() {
    displayMessages = [];
    apiHistory = [];
    statusMessage = '';
  }

  // ─── Plugin message handler ───────────────────────────────────────────────
  onmessage = (event) => {
    const msg = event.data.pluginMessage;
    if (!msg || typeof msg !== 'object' || !msg.type) return;

    if (msg.type === 'init') {
      hasApiKey = Boolean(msg.hasApiKey);
      statusMessage = hasApiKey ? 'Ready.' : 'Add your Claude API key to start.';
      if (hasApiKey) {
        sendToPlugin({ type: 'get-api-key' });
      }
      return;
    }

    if (msg.type === 'api-key-value') {
      storedApiKey = String(msg.apiKey || '');
      return;
    }

    if (msg.type === 'api-key-saved') {
      hasApiKey = Boolean(msg.hasApiKey);
      statusMessage = String(msg.message || '');
      if (hasApiKey) {
        apiKeyInput = '';
        sendToPlugin({ type: 'get-api-key' });
      } else {
        storedApiKey = '';
      }
      return;
    }

    if (msg.type === 'tool-result') {
      const resolve = pendingToolResolvers.get(String(msg.toolUseId));
      if (resolve) {
        pendingToolResolvers.delete(String(msg.toolUseId));
        resolve(msg.result);
      }
      return;
    }

    if (msg.type === 'chat-error') {
      isSending = false;
      statusMessage = 'Error: ' + String(msg.error);
      return;
    }
  };

  sendToPlugin({ type: 'request-init' });
</script>

<main class="plugin">
  <Header onClear={clearChat} onToggleSettings={() => (showSettings = !showSettings)} />

  {#if showSettings}
    <Settings
      bind:apiKeyInput
      bind:model
      {hasApiKey}
      onSave={() => sendToPlugin({ type: 'save-api-key', apiKey: apiKeyInput })}
    />
  {/if}

  <!-- Chat messages -->
  <section class="chat" bind:this={messagesContainer}>
    {#if displayMessages.length === 0}
      <p class="empty">
        Ask Claude to do anything in your Figma document.<br />Examples:<br />• "Create a button
        component"<br />• "What's selected right now?"<br />• "Add auto layout to this frame"
      </p>
    {:else}
      {#each displayMessages as msg}
        <ChatMessage {msg} />
      {/each}
      {#if isSending}
        <div class="thinking">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      {/if}
    {/if}
  </section>

  {#if statusMessage}
    <p class="status">{statusMessage}</p>
  {/if}

  <Composer bind:prompt bind:attachedImages {isSending} onSend={sendMessage} />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #252525;
    color: white;
    font-family: 'Inter', sans-serif;
  }

  :global(::-webkit-scrollbar) {
    width: 4px;
    height: 4px;
  }

  :global(::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0);
    border-radius: 2px;
  }

  :global(::-webkit-scrollbar-thumb:hover) {
    background: rgba(255, 255, 255, 0);
  }

  :global(::-webkit-scrollbar-corner) {
    background: transparent;
  }

  main {
    display: flex;
    flex-direction: column;
    height: 100vh;
    box-sizing: border-box;
    padding: 10px;
    gap: 8px;
  }

  /* Chat */
  .chat {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 0;
  }

  .empty {
    font-size: 12px;
    opacity: 0.5;
    line-height: 1.7;
    margin: auto;
    text-align: center;
    padding: 20px;
  }

  /* Thinking dots */
  .thinking {
    display: flex;
    gap: 4px;
    padding: 6px 10px;
    width: fit-content;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    animation: bounce 1.2s infinite ease-in-out;
  }

  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }
  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes bounce {
    0%,
    80%,
    100% {
      transform: scale(0.6);
      opacity: 0.4;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* Status */
  .status {
    font-size: 11px;
    opacity: 0.55;
    margin: 0;
    flex-shrink: 0;
    text-align: center;
  }
</style>
