<script lang="ts">
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  export type AttachedImage = { dataUrl: string; mediaType: string; name: string };
  type Skill = { id: string; name: string; content: string };

  let {
    prompt = $bindable(''),
    attachedImages = $bindable<AttachedImage[]>([]),
    skills = [],
    isSending,
    onSend,
    onStop,
  }: {
    prompt: string;
    attachedImages: AttachedImage[];
    skills?: Skill[];
    isSending: boolean;
    onSend: () => void;
    onStop?: () => void;
  } = $props();

  let fileInput: HTMLInputElement | null = null;
  let textarea: HTMLTextAreaElement | null = null;

  // ─── @mention autocomplete ────────────────────────────────────────────────
  let mentionQuery = $state('');
  let mentionStart = $state(-1);
  let showDropdown = $state(false);
  let selectedIndex = $state(0);

  let filteredSkills = $derived(
    mentionQuery === ''
      ? skills
      : skills.filter((s) => s.name.toLowerCase().includes(mentionQuery.toLowerCase()))
  );

  $effect(() => {
    // reset selection when list changes
    selectedIndex = 0;
  });

  function detectMention(value: string, cursorPos: number) {
    const textBefore = value.slice(0, cursorPos);
    const atIdx = textBefore.lastIndexOf('@');
    if (atIdx === -1) {
      showDropdown = false;
      mentionStart = -1;
      return;
    }
    // only open if no space between @ and cursor
    const fragment = textBefore.slice(atIdx + 1);
    if (/\s/.test(fragment)) {
      showDropdown = false;
      mentionStart = -1;
      return;
    }
    mentionStart = atIdx;
    mentionQuery = fragment;
    showDropdown = skills.length > 0;
  }

  function insertMention(skill: Skill) {
    if (!textarea) return;
    const before = prompt.slice(0, mentionStart);
    const after = prompt.slice(textarea.selectionStart);
    const inserted = `@${skill.name} `;
    prompt = before + inserted + after;
    showDropdown = false;
    mentionStart = -1;
    // restore cursor
    const newPos = before.length + inserted.length;
    // tick needed — let Svelte flush the binding first
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(newPos, newPos);
    });
  }

  export function focusTextarea() {
    textarea?.focus();
  }

  let minHeight = 0;

  function autoResize() {
    if (!textarea) return;
    if (minHeight === 0) minHeight = textarea.clientHeight;
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(textarea.scrollHeight, minHeight) + 'px';
  }

  $effect(() => {
    if (textarea) {
      const _ = prompt; // track prompt changes
      autoResize();
    }
  });

  function handleInput() {
    detectMention(prompt, textarea?.selectionStart ?? prompt.length);
    autoResize();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (showDropdown && filteredSkills.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % filteredSkills.length;
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + filteredSkills.length) % filteredSkills.length;
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredSkills[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        showDropdown = false;
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
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
  {#if showDropdown && filteredSkills.length > 0}
    <div class="mention-dropdown">
      {#each filteredSkills as skill, i}
        <button
          class="mention-item"
          class:selected={i === selectedIndex}
          onmousedown={(e) => {
            e.preventDefault();
            insertMention(skill);
          }}
        >
          <span class="mention-at">@</span>{skill.name}
        </button>
      {/each}
    </div>
  {/if}

  <section class="composer">
    {#if attachedImages.length > 0}
      <div class="image-strip">
        {#each attachedImages as img, i}
          <div class="image-thumb">
            <img src={img.dataUrl} alt={img.name} />
            <button class="remove-btn" onclick={() => removeImage(i)} title="Remove">
              <Icon name="close" size={10} />
            </button>
          </div>
        {/each}
      </div>
    {/if}

    <textarea
      bind:this={textarea}
      bind:value={prompt}
      onkeydown={handleKeydown}
      oninput={handleInput}
      onpaste={handlePaste}
      rows="3"
      placeholder="Ask Claude to do something in Figma… (type @ to invoke a skill)"
      disabled={isSending}
    ></textarea>

    <div class="divider"></div>

    <div class="actions-row">
      <Button
        onclick={() => fileInput?.click()}
        disabled={isSending}
        title="Add image"
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
      {#if isSending}
        <Button variant="outline" onclick={onStop}>
          <Icon name="stop" />
          Stop
        </Button>
      {:else}
        <Button variant="primary" onclick={onSend}>
          Send
          <Icon name="arrow-up" />
        </Button>
      {/if}
    </div>
  </section>
</div>

<style>
  .composer-wrapper {
    padding: 12px;
    padding-top: 0;
  }

  .composer {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex-shrink: 0;
    border: 1px solid var(--color-border-1);
    border-radius: var(--radius-lg);
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
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-2);
    flex-shrink: 0;

    & .remove-btn {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 18px;
      height: 18px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg);
      border: 1px solid var(--color-border-2);
      border-radius: 50%;
      color: var(--color-text-primary);
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s;
      z-index: 1;
    }

    &:hover .remove-btn {
      opacity: 1;
    }
  }

  .image-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: var(--radius-md);
  }

  textarea {
    width: 100%;
    border-radius: 0;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
      'Courier New', monospace;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--color-text-primary);
    outline: none;
    resize: none;
    line-height: 1.4;
    overflow-y: auto;
    max-height: 160px;
  }

  textarea::placeholder {
    color: var(--color-text-primary);
    opacity: 0.2;
  }

  textarea:disabled {
    opacity: 0.5;
  }

  .mention-dropdown {
    position: relative;
    bottom: 0;
    left: 12px;
    right: 12px;
    background: var(--color-bg);
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin-bottom: 4px;
    z-index: 10;
  }

  .mention-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 7px 10px;
    background: none;
    border: none;
    color: var(--color-text-primary);
    font-size: 12px;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    gap: 2px;

    &:hover,
    &.selected {
      background: var(--color-surface-2);
    }
  }

  .mention-at {
    color: var(--color-teal);
    font-weight: 600;
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
