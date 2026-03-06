<script lang="ts">
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  export type Tab = 'chat' | 'skills' | 'settings' | 'history';

  let {
    activeTab = $bindable<Tab>('chat'),
    onClear,
  }: {
    activeTab: Tab;
    onClear: () => void;
  } = $props();
</script>

<header class="header">
  <nav class="tabs-shell">
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
      class:active={activeTab === 'history'}
      onclick={() => (activeTab = 'history')}>History</button
    >
    <button
      class="tab-btn"
      class:active={activeTab === 'settings'}
      onclick={() => (activeTab = 'settings')}>Settings</button
    >
  </nav>
  <div class="header-actions">
    {#if activeTab === 'chat'}
      <Button onclick={onClear} title="New chat" variant="outline"><Icon name="plus" /></Button>
    {/if}
  </div>
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    padding: var(--spacing-inner-padding);
    padding-bottom: 0;
  }

  .tabs-shell {
    display: flex;
    gap: 4px;
    border-radius: var(--radius-lg);
    padding: 3px;
    background: var(--color-surface-1);
  }

  .tab-btn {
    display: inline-flex;
    align-items: center;
    color: var(--color-text-tertiary);
    border: none;
    background: transparent;
    height: calc(var(--height-btn) - 4px);
    padding: 0 8px;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    line-height: 1;
  }

  .tab-btn:hover {
    color: var(--color-text-secondary);
    background: var(--color-surface-1);
  }

  .tab-btn.active {
    color: var(--color-text-primary);
    background: var(--color-surface-3);
  }

  .header-actions {
    display: flex;
    gap: 4px;
  }

  :global(.new-chat-btn.btn) {
    width: 44px !important;
    height: 44px !important;
    min-width: 44px;
    border-radius: var(--radius-lg) !important;
    border: 1px solid var(--color-border-2) !important;
    background: transparent !important;
    color: var(--color-text-secondary) !important;
    font-size: 26px !important;
    font-weight: 400 !important;
    line-height: 1 !important;
    padding: 0 !important;
  }

  :global(.new-chat-btn.btn:hover) {
    background: var(--color-surface-1) !important;
    color: var(--color-text-primary) !important;
  }
</style>
