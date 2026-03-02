<script lang="ts">
  export type AttachedImage = { dataUrl: string; mediaType: string; name: string };

  let {
    prompt = $bindable(''),
    attachedImages = $bindable<AttachedImage[]>([]),
    isSending,
    onSend,
  }: {
    prompt: string;
    attachedImages: AttachedImage[];
    isSending: boolean;
    onSend: () => void;
  } = $props();

  let fileInput: HTMLInputElement | null = null;

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      onSend();
    }
  }

  function handlePaste(e: ClipboardEvent) {
    if (!e.clipboardData) return;
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((i) => i.type.startsWith('image/'));
    if (imageItems.length === 0) return;
    e.preventDefault();
    imageItems.forEach((item) => {
      const file = item.getAsFile();
      if (file) readFile(file);
    });
  }

  function handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (!input.files) return;
    Array.from(input.files).forEach(readFile);
    input.value = '';
  }

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const mediaType = file.type || 'image/png';
      attachedImages = [...attachedImages, { dataUrl, mediaType, name: file.name }];
    };
    reader.readAsDataURL(file);
  }

  function removeImage(index: number) {
    attachedImages = attachedImages.filter((_, i) => i !== index);
  }
</script>

<section class="composer">
  {#if attachedImages.length > 0}
    <div class="image-strip">
      {#each attachedImages as img, i}
        <div class="image-thumb">
          <img src={img.dataUrl} alt={img.name} />
          <button class="remove-btn" onclick={() => removeImage(i)} title="Remove">✕</button>
        </div>
      {/each}
    </div>
  {/if}

  <div class="input-row">
    <textarea
      bind:value={prompt}
      onkeydown={handleKeydown}
      onpaste={handlePaste}
      rows="3"
      placeholder="Ask Claude to do something in Figma… (⌘↵ to send)"
      disabled={isSending}
    ></textarea>
  </div>

  <div class="actions">
    <button
      class="attach-btn"
      onclick={() => fileInput?.click()}
      disabled={isSending}
      title="Attach image"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="1"
          y="3"
          width="14"
          height="10"
          rx="1.5"
          stroke="currentColor"
          stroke-width="1.2"
          fill="none"
        />
        <circle cx="5.5" cy="6.5" r="1.5" fill="currentColor" />
        <path
          d="M1 11l3.5-3.5 2.5 2.5 2.5-2.5L15 11"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linejoin="round"
          fill="none"
        />
      </svg>
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept="image/*"
      multiple
      style="display:none"
      onchange={handleFileChange}
    />
    <button class="send-btn" onclick={onSend} disabled={isSending}>
      {isSending ? 'Working...' : 'Send'}
    </button>
  </div>
</section>

<style>
  .composer {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
  }

  .image-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .image-thumb {
    position: relative;
    width: 56px;
    height: 56px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.18);
    flex-shrink: 0;
  }

  .image-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .remove-btn {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    cursor: pointer;
    font-size: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    line-height: 1;
  }

  .input-row {
    display: flex;
    gap: 6px;
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

  .actions {
    display: flex;
    gap: 6px;
  }

  .attach-btn {
    box-sizing: border-box;
    border-radius: 6px;
    padding: 0 10px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .attach-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .attach-btn:not(:disabled):hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }

  .send-btn {
    box-sizing: border-box;
    flex: 1;
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
