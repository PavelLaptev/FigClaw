<script lang="ts">
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import EmptyState from './EmptyState.svelte';

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

  let {
    savedChats = [],
    currentChatId = '',
    onResume,
    onDelete,
    onUnapply,
  }: {
    savedChats?: SavedChat[];
    currentChatId?: string;
    onResume: (chat: SavedChat) => void;
    onDelete: (id: string) => void;
    onUnapply: () => void;
  } = $props();

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

  let listEl = $state<HTMLElement | null>(null);
  let canScrollUp = $state(false);
  let canScrollDown = $state(false);

  function updateScrollState() {
    if (!listEl) return;
    canScrollUp = listEl.scrollTop > 0;
    canScrollDown = listEl.scrollTop + listEl.clientHeight < listEl.scrollHeight - 1;
  }

  $effect(() => {
    savedChats;
    if (listEl) requestAnimationFrame(updateScrollState);
  });
</script>

<section class="history" class:fade-top={canScrollUp} class:fade-bottom={canScrollDown}>
  {#if savedChats.length === 0}
    <EmptyState padding="40px">
      {#snippet icon()}
        <svg
          width="68"
          height="52"
          viewBox="0 0 68 52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M40.25 0.75V33.25H30.25V45.2744L17.5713 33.4512L17.3555 33.25H0.75V0.75H40.25Z"
            stroke="var(--color-text-tertiary)"
            stroke-width="1.5"
          />
          <path
            d="M44 12.5H67V41H49L40.5 49.5V41H34.5"
            stroke="var(--color-text-tertiary)"
            stroke-width="1.5"
            stroke-dasharray="2 2"
          />
        </svg>
      {/snippet}
      {#snippet text()}
        No past chats yet.<br />New chats are saved automatically.
      {/snippet}
    </EmptyState>
  {:else}
    <ul class="list" bind:this={listEl} onscroll={updateScrollState}>
      {#each savedChats.filter((c) => c.id === currentChatId) as chat (chat.id)}
        <li class="item active">
          <div class="item-meta">
            <span class="title">{chat.title}</span>
            <Badge variant="active">applied</Badge>
          </div>
          <span class="sub">{formatDate(chat.savedAt)} · {msgCount(chat)} messages</span>
          <div class="item-actions">
            <Button variant="ghost" onclick={onUnapply} title="Unapply"
              ><Icon name="close" /></Button
            >
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
            <Button variant="ghost" onclick={() => onResume(chat)} title="Apply"
              ><Icon name="arrow-up" /></Button
            >
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
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;

    &::after,
    &::before {
      z-index: 1;
      position: absolute;
      left: 0;
      content: '';
      height: 30px;
      width: 100%;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    &::after {
      top: 0;
      background: linear-gradient(var(--color-bg) 20%, transparent 100%);
    }

    &::before {
      bottom: 0;
      background: linear-gradient(transparent 0%, var(--color-bg) 80%);
    }

    &.fade-top::after {
      opacity: 1;
    }

    &.fade-bottom::before {
      opacity: 1;
    }
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
    max-height: 650px;
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
    align-items: center;
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
    gap: 4px;
  }
</style>
