<script lang="ts">
  type TextPart = { type: 'text'; text: string } | { type: 'code'; lang: string; text: string };

  type DisplayMessage = {
    role: 'user' | 'assistant' | 'tool' | 'code';
    text: string;
    toolName?: string;
    toolStatus?: 'running' | 'done' | 'error';
  };

  let { msg }: { msg: DisplayMessage } = $props();

  function splitCodeBlocks(text: string): TextPart[] {
    const parts: TextPart[] = [];
    const regex = /```(\w*)\n?([\s\S]*?)```/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) {
        const t = text.slice(last, match.index).trim();
        if (t) parts.push({ type: 'text', text: t });
      }
      parts.push({ type: 'code', lang: match[1] || 'code', text: match[2].trim() });
      last = match.index + match[0].length;
    }
    const tail = text.slice(last).trim();
    if (tail) parts.push({ type: 'text', text: tail });
    return parts.length ? parts : [{ type: 'text', text }];
  }
</script>

{#if msg.role === 'tool'}
  <div
    class="tool-call"
    class:running={msg.toolStatus === 'running'}
    class:done={msg.toolStatus === 'done'}
  >
    <span class="tool-icon">{msg.toolStatus === 'running' ? '⟳' : '✓'}</span>
    <span class="tool-name">{msg.text}</span>
  </div>
{:else if msg.role === 'code'}
  <details class="code-block">
    <summary class="code-header">
      <span>JavaScript</span>
      <span class="code-toggle-hint">show</span>
    </summary>
    <pre class="code-body">{msg.text}</pre>
  </details>
{:else}
  <div class="message {msg.role}">
    <p class="meta">{msg.role === 'user' ? 'You' : 'Claude'}</p>
    {#each splitCodeBlocks(msg.text) as part}
      {#if part.type === 'code'}
        <details class="code-block inline-code-block">
          <summary class="code-header">
            <span>{part.lang || 'code'}</span>
            <span class="code-toggle-hint">show</span>
          </summary>
          <pre class="code-body">{part.text}</pre>
        </details>
      {:else}
        <p class="body">{part.text}</p>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .message {
    border-radius: 8px;
    padding: 8px 10px;
    line-height: 1.5;
  }

  .message.user {
    background: rgba(255, 77, 77, 0.1);
    align-self: flex-end;
    max-width: 90%;
  }

  .message.assistant {
    background: rgba(0, 229, 204, 0.08);
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
  .inline-code-block {
    margin-top: 4px;
  }

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
    cursor: pointer;
    list-style: none;
    user-select: none;
  }

  .code-header::-webkit-details-marker {
    display: none;
  }

  .code-toggle-hint {
    font-size: 10px;
    opacity: 0.5;
  }

  .code-block[open] .code-toggle-hint {
    display: none;
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
    border-color: rgba(255, 77, 77, 0.5);
    opacity: 1;
  }

  .tool-call.done {
    border-color: rgba(0, 229, 204, 0.5);
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
    to {
      transform: rotate(360deg);
    }
  }

  .tool-name {
    font-family: monospace;
    font-size: 11px;
  }
</style>
