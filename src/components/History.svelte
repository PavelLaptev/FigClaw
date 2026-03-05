<script lang="ts">
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  type DisplayMessage = {
    role: 'user' | 'assistant' | 'tool' | 'code';
    text: string;
    images?: string[];
    toolName?: string;
    toolStatus?: 'running' | 'done' | 'error';
  };

  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    | { type: 'tool_result'; tool_use_id: string; content: string };

  type ApiMessage = {
    role: 'user' | 'assistant';
    content: string | ContentBlock[];
  };

  type SavedChat = {
    id: string;
    title: string;
    savedAt: number;
    displayMessages: DisplayMessage[];
    apiHistory: ApiMessage[];
  };

  export let savedChats: SavedChat[] = [];
  export let onResume: (chat: SavedChat) => void;
  export let onDelete: (id: string) => void;

  function formatDate(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function msgCount(chat: SavedChat): number {
    return chat.displayMessages.filter((m) => m.role === 'user' || m.role === 'assistant').length;
  }
</script>

<section class="history">
  <h3>Past chats</h3>

  {#if savedChats.length === 0}
    <p class="empty">
      No past chats yet.<br />Start a conversation, then clear it to save it here.
    </p>
  {:else}
    <ul class="list">
      {#each savedChats as chat (chat.id)}
        <li class="item">
          <Button variant="ghost" onclick={() => onResume(chat)} class="resume-btn">
            <span class="title">{chat.title}</span>
            <span class="meta">{formatDate(chat.savedAt)} · {msgCount(chat)} messages</span>
          </Button>
          <Button variant="icon" onclick={() => onDelete(chat.id)} title="Delete" class="delete-btn"
            ><Icon name="close" /></Button
          >
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .history {
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    flex: 1;
  }

  h3 {
    margin: 0;
    font-size: 13px;
    color: var(--color-text-tertiary);
    font-weight: 500;
  }

  .empty {
    font-size: 12px;
    opacity: 0.45;
    line-height: 1.7;
    margin: auto;
    text-align: center;
    padding: 20px;
  }

  .list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  :global(.resume-btn) {
    flex: 1 !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 2px !important;
    background: var(--color-surface-1) !important;
    border: none !important;
    border-radius: 8px !important;
    padding: 8px 10px !important;
    text-align: left !important;
    min-width: 0 !important;
  }

  :global(.resume-btn:hover) {
    background: var(--color-surface-2) !important;
  }

  .title {
    font-size: 12px;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .meta {
    font-size: 10px;
    color: var(--color-text-tertiary);
  }

  :global(.delete-btn) {
    flex-shrink: 0 !important;
    color: var(--color-text-tertiary) !important;
    font-size: 11px !important;
    padding: 6px !important;
  }

  :global(.delete-btn:hover) {
    color: var(--color-text-primary) !important;
    background: var(--color-surface-2) !important;
  }
</style>
