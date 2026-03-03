<script lang="ts">
  let {
    apiKeyInput = $bindable(''),
    model = $bindable(''),
    hasApiKey,
    keyLoaded,
    onSave,
  }: {
    apiKeyInput: string;
    model: string;
    hasApiKey: boolean;
    keyLoaded: boolean;
    onSave: () => void;
  } = $props();
</script>

<section class="settings">
  <label for="api-key">Claude API key</label>
  <div class="row">
    <input id="api-key" type="password" bind:value={apiKeyInput} placeholder="sk-ant-..." />
    <button class="save-btn" onclick={onSave}>Save</button>
  </div>
  <div class="status-badge" class:saved={hasApiKey} class:missing={!hasApiKey}>
    {hasApiKey ? '✓ Saved in storage' : '✗ Not saved in storage'}
  </div>
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
    background: rgba(74, 222, 128, 0.15);
    color: #4ade80;
    border: 1px solid rgba(74, 222, 128, 0.3);
  }

  .status-badge.missing {
    background: rgba(251, 146, 60, 0.15);
    color: #fb923c;
    border: 1px solid rgba(251, 146, 60, 0.3);
  }

  input {
    box-sizing: border-box;
    width: 100%;
    border-radius: 6px;
    font-size: 13px;
    padding: 8px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.05);
    color: white;
    outline: none;
  }

  input:focus {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .save-btn {
    box-sizing: border-box;
    width: auto;
    flex-shrink: 0;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-weight: 500;
    white-space: nowrap;
    border-radius: 6px;
    font-size: 13px;
    padding: 8px;
  }

  .save-btn:hover {
    background: rgba(255, 255, 255, 0.18);
  }
</style>
