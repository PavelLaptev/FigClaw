<script lang="ts">
  export type Tab = 'chat' | 'skills' | 'settings' | 'history';

  let {
    activeTab = $bindable<Tab>('chat'),
    onClear,
  }: {
    activeTab: Tab;
    onClear: () => void;
  } = $props();
</script>

<header>
  <nav class="tabs">
    <button class="tab-btn" class:active={activeTab === 'chat'} onclick={() => (activeTab = 'chat')}
      >Chat</button
    >
    <button
      class="tab-btn"
      class:active={activeTab === 'skills'}
      onclick={() => (activeTab = 'skills')}>Skills</button
    >
    <button
      class="tab-btn"
      class:active={activeTab === 'settings'}
      onclick={() => (activeTab = 'settings')}>Settings</button
    >
    <button
      class="tab-btn"
      class:active={activeTab === 'history'}
      onclick={() => (activeTab = 'history')}>History</button
    >
  </nav>
  <div class="header-actions">
    {#if activeTab === 'chat'}
      <button class="icon-btn" onclick={onClear} title="New chat">+</button>
    {/if}
  </div>
</header>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .tabs {
    display: flex;
    gap: 2px;
  }

  .tab-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.45);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    padding: 4px 8px;
    border-radius: 6px;
    width: auto;
    transition:
      color 0.15s,
      background 0.15s;
  }

  .tab-btn:hover {
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.07);
  }

  .tab-btn.active {
    color: white;
    background: rgba(255, 255, 255, 0.12);
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
</style>
