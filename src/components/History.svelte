<script lang="ts">
  import Badge from './Badge.svelte';
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
  export let currentChatId: string = '';
  export let onResume: (chat: SavedChat) => void;
  export let onDelete: (id: string) => void;
  export let onUnapply: () => void;

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
  {#if savedChats.length === 0}
    <p class="empty">
      No past chats yet.<br />Start a conversation, then clear it to save it here.
    </p>
  {:else}
    <ul class="list">
      {#each savedChats.filter((c) => c.id === currentChatId) as chat (chat.id)}
        <li class="item active">
          <div class="item-meta">
            <span class="title">{chat.title}</span>
            <Badge>applied</Badge>
          </div>
          <span class="sub">{formatDate(chat.savedAt)} · {msgCount(chat)} messages</span>
          <div class="item-actions">
            <Button variant="outline" onclick={onUnapply}>Unapply <Icon name="close" /></Button>
            <div class="vertical-devider"></div>
            <Button variant="ghost" onclick={() => onDelete(chat.id)} title="Delete"
              ><Icon name="bin" /></Button
            >
          </div>
        </li>
      {/each}
      {#each savedChats.filter((c) => c.id !== currentChatId) as chat (chat.id)}
        <li class="item">
          <div class="item-meta">
            <span class="title">{chat.title}</span>
          </div>
          <span class="sub">{formatDate(chat.savedAt)} · {msgCount(chat)} messages</span>
          <div class="item-actions">
            <Button variant="outline" onclick={() => onResume(chat)}
              >Apply chat <Icon name="arrow-up" /></Button
            >
            <div class="vertical-devider"></div>
            <Button variant="ghost" onclick={() => onDelete(chat.id)} title="Delete"
              ><Icon name="bin" /></Button
            >
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .history {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .empty {
    font-size: 12px;
    opacity: 0.45;
    line-height: 1.7;
    text-align: center;
    padding: var(--spacing-inner-padding);
    margin: 0;
  }

  .list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    flex: 1;
    padding: var(--spacing-inner-padding);
  }

  .item {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    align-items: center;
    gap: 6px 8px;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border-1);
    border-radius: var(--radius-md);
    padding: 10px 12px;
  }

  .item-meta {
    grid-column: 1;
    grid-row: 1;
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
  }

  .title {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sub {
    font-size: 12px;
    opacity: 0.4;
    grid-column: 1;
    grid-row: 2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-actions {
    grid-column: 2;
    grid-row: 1 / 3;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .vertical-devider {
    width: 1px;
    height: calc(var(--height-btn) - 8px);
    background: var(--color-border-1);
  }
</style>
