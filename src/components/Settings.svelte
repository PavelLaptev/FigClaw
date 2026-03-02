<script lang="ts">
  let {
    apiKeyInput = $bindable(''),
    model = $bindable(''),
    hasApiKey,
    onSave,
  }: {
    apiKeyInput: string;
    model: string;
    hasApiKey: boolean;
    onSave: () => void;
  } = $props();
</script>

<section class="settings">
  <label for="api-key">Claude API key</label>
  <div class="row">
    <input id="api-key" type="password" bind:value={apiKeyInput} placeholder="sk-ant-..." />
    <button class="save-btn" onclick={onSave}>Save</button>
  </div>
  <p class="hint">{hasApiKey ? '✓ API key saved.' : 'No API key saved yet.'}</p>

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

  .hint {
    font-size: 11px;
    opacity: 0.6;
    margin: 0;
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
