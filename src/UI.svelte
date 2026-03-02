<script lang="ts">
  import './styles.css';
  import { tick } from 'svelte';

  // ─── Types ────────────────────────────────────────────────────────────────
  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    | { type: 'tool_result'; tool_use_id: string; content: string };

  type ApiMessage = {
    role: 'user' | 'assistant';
    content: string | ContentBlock[];
  };

  type DisplayMessage = {
    role: 'user' | 'assistant' | 'tool' | 'code';
    text: string;
    toolName?: string;
    toolStatus?: 'running' | 'done' | 'error';
  };

  // ─── State ────────────────────────────────────────────────────────────────
  let apiKeyInput = $state('');
  let hasApiKey = $state(false);
  let statusMessage = $state('');
  let model = $state('claude-sonnet-4-5');
  let prompt = $state('');
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
        'Fetches the content of a URL (e.g. Figma plugin API docs) and returns the text. ' +
        'Always call this before writing code for an unfamiliar Figma API to check the correct method signatures.',
      input_schema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to fetch. For Figma plugin API use https://developers.figma.com/plugin-docs/',
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
        'Return values are sent back as the tool result.',
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
      name: 'create_frame',
      description: 'Creates a new frame (container) on the current page.',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
          x: { type: 'number' },
          y: { type: 'number' },
          color: {
            type: 'object',
            description: 'RGB fill color (values 0–1)',
            properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } },
          },
        },
        required: ['name', 'width', 'height'],
      },
    },
    {
      name: 'create_rectangle',
      description: 'Creates a rectangle shape on the current page.',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
          x: { type: 'number' },
          y: { type: 'number' },
          cornerRadius: { type: 'number' },
          color: {
            type: 'object',
            description: 'RGBA fill (values 0–1)',
            properties: {
              r: { type: 'number' },
              g: { type: 'number' },
              b: { type: 'number' },
              a: { type: 'number' },
            },
          },
        },
        required: ['name', 'width', 'height'],
      },
    },
    {
      name: 'create_text',
      description: 'Creates a text node on the current page.',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          content: { type: 'string', description: 'The visible text' },
          fontSize: { type: 'number' },
          x: { type: 'number' },
          y: { type: 'number' },
          color: {
            type: 'object',
            properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } },
          },
        },
        required: ['name', 'content'],
      },
    },
    {
      name: 'update_node',
      description: 'Updates properties of an existing node by ID. Any property can be omitted.',
      input_schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          visible: { type: 'boolean' },
          opacity: { type: 'number' },
          x: { type: 'number' },
          y: { type: 'number' },
          width: { type: 'number' },
          height: { type: 'number' },
          cornerRadius: { type: 'number' },
          characters: { type: 'string', description: 'Text content (TEXT nodes only)' },
          fontSize: { type: 'number', description: 'Font size (TEXT nodes only)' },
          color: {
            type: 'object',
            description: 'RGBA fill (values 0–1)',
            properties: {
              r: { type: 'number' },
              g: { type: 'number' },
              b: { type: 'number' },
              a: { type: 'number' },
            },
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'delete_node',
      description: 'Deletes a node by ID.',
      input_schema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    {
      name: 'duplicate_node',
      description: 'Duplicates a node and optionally repositions the copy.',
      input_schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
        },
        required: ['id'],
      },
    },
    {
      name: 'move_node_into',
      description: 'Moves a node inside another node (re-parents it).',
      input_schema: {
        type: 'object',
        properties: {
          node_id: { type: 'string' },
          parent_id: { type: 'string' },
        },
        required: ['node_id', 'parent_id'],
      },
    },
    {
      name: 'group_nodes',
      description: 'Groups multiple nodes together.',
      input_schema: {
        type: 'object',
        properties: {
          ids: { type: 'array', items: { type: 'string' }, description: 'Node IDs to group' },
          name: { type: 'string' },
        },
        required: ['ids'],
      },
    },
    {
      name: 'flatten_node',
      description: 'Flattens a node into a single vector.',
      input_schema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    {
      name: 'set_auto_layout',
      description: 'Enables auto layout on a frame.',
      input_schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          direction: { type: 'string', enum: ['horizontal', 'vertical'] },
          gap: { type: 'number' },
          padding: { type: 'number' },
          align: { type: 'string', enum: ['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN'] },
        },
        required: ['id', 'direction'],
      },
    },
    {
      name: 'select_nodes',
      description: 'Selects nodes in Figma by their IDs and scrolls them into view.',
      input_schema: {
        type: 'object',
        properties: {
          ids: { type: 'array', items: { type: 'string' } },
        },
        required: ['ids'],
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

  const SYSTEM_PROMPT = `You are an expert Figma design agent running inside a Figma plugin. You have unrestricted access to the Figma Plugin API via the run_figma_code tool.

Your workflow for ANY task that involves modifying or reading Figma:
1. LOOK UP DOCS — call fetch_docs with the relevant Figma Plugin API page (e.g. https://developers.figma.com/plugin-docs/ or a specific section) to verify the exact API methods and their signatures.
2. WRITE CODE — compose clean, correct JavaScript that uses the figma global. Top-level await is available.
3. SHOW CODE — before executing, always include the code in a plain text message block so the user can read it. Format it as a fenced code block with the \`\`\`js language tag.
4. RUN CODE — call run_figma_code with the exact same code.
5. REPORT — summarise what happened based on the tool result.

Rules:
- Never guess API method names. Fetch the docs first if unsure.
- Keep code concise and self-contained. Do not rely on variables from previous runs.
- If the tool result contains an error, debug by fetching docs again and rewriting the code.
- Use get_selection to inspect what is currently selected before acting on it.
- Prefer run_figma_code over the individual fixed tools for complex or novel tasks.`;

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

  async function runAgentLoop(userText: string) {
    if (!storedApiKey) {
      statusMessage = 'No API key. Save your Claude API key first.';
      return;
    }

    isSending = true;
    pushDisplay({ role: 'user', text: userText });

    const userMsg: ApiMessage = { role: 'user', content: userText };
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
    if (!text || isSending) return;
    prompt = '';
    await runAgentLoop(text);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      sendMessage();
    }
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
  <!-- Header -->
  <header>
    <h1>Claude Agent</h1>
    <div class="header-actions">
      <button class="icon-btn" onclick={clearChat} title="Clear chat">✕</button>
      <button class="icon-btn" onclick={() => (showSettings = !showSettings)} title="Settings">⚙</button>
    </div>
  </header>

  <!-- Settings panel -->
  {#if showSettings}
    <section class="settings">
      <label for="api-key">Claude API key</label>
      <div class="row">
        <input id="api-key" type="password" bind:value={apiKeyInput} placeholder="sk-ant-..." />
        <button class="save-btn" onclick={() => sendToPlugin({ type: 'save-api-key', apiKey: apiKeyInput })}>Save</button>
      </div>
      <p class="hint">{hasApiKey ? '✓ API key saved.' : 'No API key saved yet.'}</p>

      <label for="model">Model</label>
      <input id="model" type="text" bind:value={model} placeholder="claude-sonnet-4-5" />
    </section>
  {/if}

  <!-- Chat messages -->
  <section class="chat" bind:this={messagesContainer}>
    {#if displayMessages.length === 0}
      <p class="empty">Ask Claude to do anything in your Figma document.<br />Examples:<br />• "Create a button component"<br />• "What's selected right now?"<br />• "Add auto layout to this frame"</p>
    {:else}
      {#each displayMessages as msg}
        {#if msg.role === 'tool'}
          <div class="tool-call" class:running={msg.toolStatus === 'running'} class:done={msg.toolStatus === 'done'}>
            <span class="tool-icon">{msg.toolStatus === 'running' ? '⟳' : '✓'}</span>
            <span class="tool-name">{msg.text}</span>
          </div>
        {:else if msg.role === 'code'}
          <div class="code-block">
            <div class="code-header">
              <span>JavaScript</span>
            </div>
            <pre class="code-body">{msg.text}</pre>
          </div>
        {:else}
          <div class="message {msg.role}">
            <p class="meta">{msg.role === 'user' ? 'You' : 'Claude'}</p>
            <p class="body">{msg.text}</p>
          </div>
        {/if}
      {/each}
      {#if isSending}
        <div class="thinking">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      {/if}
    {/if}
  </section>

  <!-- Status bar -->
  {#if statusMessage}
    <p class="status">{statusMessage}</p>
  {/if}

  <!-- Composer -->
  <section class="composer">
    <textarea
      bind:value={prompt}
      onkeydown={handleKeydown}
      rows="3"
      placeholder="Ask Claude to do something in Figma… (⌘↵ to send)"
      disabled={isSending}
    ></textarea>
    <button class="send-btn" onclick={sendMessage} disabled={isSending}>
      {isSending ? 'Working...' : 'Send'}
    </button>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #2c2c2c;
    color: white;
    font-family: 'Inter', sans-serif;
  }

  main {
    display: flex;
    flex-direction: column;
    height: 100vh;
    box-sizing: border-box;
    padding: 10px;
    gap: 8px;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  h1 {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 4px;
  }

  .icon-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    font-size: 14px;
    padding: 4px 6px;
    border-radius: 4px;
    width: auto;
  }

  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  /* Settings */
  .settings {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 10px;
    flex-shrink: 0;
  }

  .row {
    display: flex;
    gap: 6px;
  }

  label {
    font-size: 11px;
    opacity: 0.6;
    margin: 0;
  }

  .hint {
    font-size: 11px;
    opacity: 0.6;
    margin: 0;
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

  .message {
    border-radius: 8px;
    padding: 8px 10px;
    line-height: 1.5;
  }

  .message.user {
    background: rgba(255, 255, 255, 0.08);
    align-self: flex-end;
    max-width: 90%;
  }

  .message.assistant {
    background: rgba(120, 169, 255, 0.12);
    align-self: flex-start;
    max-width: 95%;
  }

  .meta {
    font-size: 10px;
    opacity: 0.5;
    margin: 0 0 3px;
  }

  .body {
    font-size: 13px;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* Code block */
  .code-block {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    align-self: flex-start;
    width: 100%;
  }

  .code-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.06);
    padding: 4px 10px;
    font-size: 10px;
    opacity: 0.6;
    font-family: monospace;
  }

  .code-body {
    margin: 0;
    padding: 10px;
    background: rgba(0, 0, 0, 0.3);
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 11px;
    line-height: 1.6;
    white-space: pre;
    overflow-x: auto;
    color: #e2e8f0;
  }

  /* Tool call pill */
  .tool-call {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    width: fit-content;
    opacity: 0.75;
  }

  .tool-call.running {
    border-color: rgba(255, 157, 115, 0.5);
    opacity: 1;
  }

  .tool-call.done {
    border-color: rgba(100, 220, 120, 0.4);
  }

  .tool-icon {
    font-size: 12px;
    animation: none;
  }

  .tool-call.running .tool-icon {
    display: inline-block;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .tool-name {
    font-family: monospace;
    font-size: 11px;
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

  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }

  /* Status */
  .status {
    font-size: 11px;
    opacity: 0.55;
    margin: 0;
    flex-shrink: 0;
    text-align: center;
  }

  /* Composer */
  .composer {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
  }

  /* Shared input/button base */
  input,
  textarea,
  button {
    box-sizing: border-box;
    width: 100%;
    border-radius: 6px;
    font-size: 13px;
    padding: 8px;
  }

  input,
  textarea {
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.05);
    color: white;
    outline: none;
  }

  input:focus,
  textarea:focus {
    border-color: rgba(255, 255, 255, 0.4);
  }

  textarea {
    resize: none;
    line-height: 1.5;
    min-height: 60px;
  }

  textarea:disabled {
    opacity: 0.5;
  }

  .save-btn {
    width: auto;
    flex-shrink: 0;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-weight: 500;
    white-space: nowrap;
  }

  .save-btn:hover {
    background: rgba(255, 255, 255, 0.18);
  }

  .send-btn {
    cursor: pointer;
    background: #ff9d73;
    color: black;
    border: none;
    font-weight: 600;
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .send-btn:not(:disabled):hover {
    background: #ffb08c;
  }
</style>
