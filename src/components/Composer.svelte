<script lang="ts">
  let {
    prompt = $bindable(''),
    isSending,
    onSend,
  }: {
    prompt: string;
    isSending: boolean;
    onSend: () => void;
  } = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      onSend();
    }
  }
</script>

<section class="composer">
  <textarea
    bind:value={prompt}
    onkeydown={handleKeydown}
    rows="3"
    placeholder="Ask Claude to do something in Figma… (⌘↵ to send)"
    disabled={isSending}
  ></textarea>
  <button class="send-btn" onclick={onSend} disabled={isSending}>
    {isSending ? 'Working...' : 'Send'}
  </button>
</section>

<style>
  .composer {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
  }

  textarea {
    box-sizing: border-box;
    width: 100%;
    border-radius: 6px;
    font-size: 13px;
    padding: 8px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.05);
    color: white;
    outline: none;
    resize: none;
    line-height: 1.5;
    min-height: 60px;
  }

  textarea:focus {
    border-color: rgba(255, 255, 255, 0.4);
  }

  textarea:disabled {
    opacity: 0.5;
  }

  .send-btn {
    box-sizing: border-box;
    width: 100%;
    border-radius: 6px;
    font-size: 13px;
    padding: 8px;
    cursor: pointer;
    background: #ff4d4d;
    color: #fff;
    border: none;
    font-weight: 600;
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .send-btn:not(:disabled):hover {
    background: #ff6b6b;
  }
</style>
