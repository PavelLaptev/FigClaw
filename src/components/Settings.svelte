<script lang="ts">
  import Button from './Button.svelte';

  let {
    apiKeyInput = $bindable(''),
    model = $bindable(''),
    hasApiKey,
    keyLoaded,
    onSave,
    onRemove,
  }: {
    apiKeyInput: string;
    model: string;
    hasApiKey: boolean;
    keyLoaded: boolean;
    onSave: () => void;
    onRemove: () => void;
  } = $props();
</script>

<section class="settings">
  <label for="api-key">Claude API key</label>
  {#if hasApiKey}
    <div class="row">
      <div class="status-badge saved">✓ Saved in storage</div>
      <Button variant="ghost" onclick={onRemove}>Remove</Button>
    </div>
  {:else}
    <div class="row">
      <input id="api-key" type="password" bind:value={apiKeyInput} placeholder="sk-ant-..." />
      <Button variant="ghost" onclick={onSave}>Save</Button>
    </div>
    <div class="status-badge missing">✗ Not saved in storage</div>
  {/if}
  <div class="status-badge" class:saved={keyLoaded} class:missing={!keyLoaded}>
    {keyLoaded ? '✓ Key loaded in session' : '✗ Key not loaded in session'}
  </div>

  <label for="model">Model</label>
  <input id="model" type="text" bind:value={model} placeholder="claude-sonnet-4-5" />
</section>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid var(--color-border-1);
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

  .status-badge {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: 4px;
    width: fit-content;
    margin: 0;
  }

  .status-badge.saved {
    background: var(--color-green-bg);
    color: var(--color-green);
    border: 1px solid var(--color-green-border);
  }

  .status-badge.missing {
    background: var(--color-orange-bg);
    color: var(--color-orange);
    border: 1px solid var(--color-orange-border);
  }

  input {
    width: 100%;
    border-radius: 6px;
    font-size: 13px;
    padding: 8px;
    border: 1px solid var(--color-border-2);
    background: var(--color-surface-1);
    color: var(--color-text-primary);
    outline: none;
  }

  input:focus {
    border-color: var(--color-border-3);
  }
</style>
