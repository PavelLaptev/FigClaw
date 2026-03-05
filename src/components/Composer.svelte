<script lang="ts">
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

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

<div class="composer-wrapper">
  <section class="composer">
    {#if attachedImages.length > 0}
      <div class="image-strip">
        {#each attachedImages as img, i}
          <div class="image-thumb">
            <img src={img.dataUrl} alt={img.name} />
            <Button variant="outline" onclick={() => removeImage(i)} title="Remove"
              ><Icon name="close" /></Button
            >
          </div>
        {/each}
      </div>
    {/if}

    <textarea
      bind:value={prompt}
      onkeydown={handleKeydown}
      onpaste={handlePaste}
      rows="3"
      placeholder="Ask Claude to do something in Figma…"
      disabled={isSending}
    ></textarea>

    <div class="divider"></div>

    <div class="actions-row">
      <Button
        onclick={() => fileInput?.click()}
        disabled={isSending}
        title="Attach image"
        variant="outline"
      >
        <Icon name="image" />
      </Button>
      <input
        bind:this={fileInput}
        type="file"
        accept="image/*"
        multiple
        style="display:none"
        onchange={handleFileChange}
      />
      <Button variant="primary" onclick={onSend} disabled={isSending}>
        {isSending ? 'Working...' : 'Send'}
        <Icon name="plus" />
      </Button>
    </div>
  </section>
</div>

<style>
  .composer-wrapper {
    padding: 12px;
  }

  .composer {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-shrink: 0;
    border: 1px solid var(--color-border-1);
    border-radius: 10px;
    background: var(--color-surface-1);
    padding: 12px;
    transition:
      border-color 0.15s,
      transform 0.15s;

    &:focus-within,
    &:hover {
      border-color: var(--color-border-2);
      transform: translateY(-1px);
    }
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
    border: 1px solid var(--color-border-2);
    flex-shrink: 0;
  }

  .image-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  textarea {
    width: 100%;
    border-radius: 0;
    font-size: 14px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
      'Courier New', monospace;
    padding: 0;
    border: none;
    background: transparent;
    color: var(---color-text-primary);
    outline: none;
    resize: none;
    line-height: 1.4;
    min-height: 96px;
  }

  textarea::placeholder {
    color: var(---color-text-primary);
    opacity: 0.2;
  }

  textarea:disabled {
    opacity: 0.5;
  }

  .divider {
    width: 100%;
    border-top: 1px solid var(--color-border-1);
  }

  .actions-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
</style>
