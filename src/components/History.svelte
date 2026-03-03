<script lang="ts">
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
          <button class="resume-btn" on:click={() => onResume(chat)}>
            <span class="title">{chat.title}</span>
            <span class="meta">{formatDate(chat.savedAt)} · {msgCount(chat)} messages</span>
          </button>
          <button class="delete-btn" title="Delete" on:click={() => onDelete(chat.id)}>✕</button>
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
    color: rgba(255, 255, 255, 0.5);
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

  .resume-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    background: rgba(255, 255, 255, 0.05);
    border: none;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;
    min-width: 0;
  }

  .resume-btn:hover {
    background: rgba(255, 255, 255, 0.1);
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
    color: rgba(255, 255, 255, 0.4);
  }

  .delete-btn {
    flex-shrink: 0;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.3);
    cursor: pointer;
    font-size: 11px;
    padding: 6px;
    border-radius: 6px;
    transition:
      color 0.15s,
      background 0.15s;
  }

  .delete-btn:hover {
    color: white;
    background: rgba(255, 255, 255, 0.08);
  }
</style>
