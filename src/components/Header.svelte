<script lang="ts">
  let { onClear, onToggleSettings }: { onClear: () => void; onToggleSettings: () => void } =
    $props();
</script>

<header>
  <h1>Claude Agent</h1>
  <div class="header-actions">
    <button class="icon-btn" onclick={onClear} title="Clear chat">✕</button>
    <button class="icon-btn" onclick={onToggleSettings} title="Settings">⚙</button>
  </div>
</header>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  h1 {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
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
