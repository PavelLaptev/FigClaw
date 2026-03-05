<script lang="ts">
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  export type Skill = {
    id: string;
    name: string;
    content: string;
    fileName: string;
    addedAt: number;
    isDefault?: boolean;
  };

  let {
    skills = [],
    onAdd,
    onRemove,
  }: {
    skills: Skill[];
    onAdd: (skill: Skill) => void;
    onRemove: (id: string) => void;
  } = $props();

  let isDragging = $state(false);
  let fileInput: HTMLInputElement | null = null;
  let errorMessage = $state('');

  function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  async function processFile(file: File) {
    errorMessage = '';
    if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      errorMessage = 'Only .md and .txt files are supported.';
      return;
    }
    const content = await file.text();
    const skill: Skill = {
      id: generateId(),
      name: file.name.replace(/\.(md|txt)$/, ''),
      content,
      fileName: file.name,
      addedAt: Date.now(),
    };
    onAdd(skill);
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      processFile(file);
    }
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function onDragLeave() {
    isDragging = false;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    handleFiles(e.dataTransfer?.files ?? null);
  }

  function openFilePicker() {
    fileInput?.click();
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  let previewSkill = $state<Skill | null>(null);

  function openPreview(skill: Skill) {
    previewSkill = skill;
  }

  function closePreview() {
    previewSkill = null;
  }

  function downloadSkill(skill: Skill) {
    const blob = new Blob([skill.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = skill.isDefault ? 'figma-agent-system-prompt.md' : skill.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<section class="skills">
  <!-- Drop zone -->
  <div
    class="drop-zone"
    class:dragging={isDragging}
    role="button"
    tabindex="0"
    onclick={openFilePicker}
    onkeydown={(e) => e.key === 'Enter' && openFilePicker()}
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    ondrop={onDrop}
  >
    <span class="drop-icon">↑</span>
    <span class="drop-label">Drop .md / .txt files here or click to browse</span>
    <input
      bind:this={fileInput}
      type="file"
      accept=".md,.txt"
      multiple
      class="hidden-input"
      onchange={(e) => handleFiles((e.target as HTMLInputElement).files)}
    />
  </div>

  {#if errorMessage}
    <p class="error">{errorMessage}</p>
  {/if}

  <!-- Skill list -->
  {#if skills.filter((s) => !s.isDefault).length === 0}
    <p class="empty-hint">No custom skills yet. Drop a .md file to add one.</p>
  {/if}
  <ul class="skill-list">
    {#each skills as skill (skill.id)}
      <li class="skill-item" class:default-skill={skill.isDefault}>
        <div class="skill-meta">
          <span class="skill-name">{skill.name}</span>
          {#if skill.isDefault}
            <span class="badge">built-in</span>
          {:else}
            <span class="skill-date">{formatDate(skill.addedAt)}</span>
          {/if}
        </div>
        <span class="skill-file">
          {#if skill.isDefault}
            Default system prompt · {(skill.content.length / 1024).toFixed(1)} KB
          {:else}
            {skill.fileName} · {(skill.content.length / 1024).toFixed(1)} KB
          {/if}
        </span>
        <div class="item-actions">
          <Button variant="icon" title="Preview" onclick={() => openPreview(skill)}
            ><Icon name="preview" /></Button
          >
          <Button variant="icon" title="Download" onclick={() => downloadSkill(skill)}
            ><Icon name="download" /></Button
          >
          {#if !skill.isDefault}
            <Button
              variant="icon"
              title="Remove"
              class="remove-skill-btn"
              onclick={() => onRemove(skill.id)}><Icon name="close" /></Button
            >
          {/if}
        </div>
      </li>
    {/each}
  </ul>

  <!-- Preview drawer -->
  {#if previewSkill}
    <div class="preview">
      <div class="preview-header">
        <span class="preview-title">{previewSkill.name}</span>
        <div class="preview-actions">
          <Button variant="icon" title="Download" onclick={() => downloadSkill(previewSkill!)}
            ><Icon name="download" /></Button
          >
          <Button variant="icon" title="Close" onclick={closePreview}><Icon name="close" /></Button>
        </div>
      </div>
      <pre class="preview-body">{previewSkill.content}</pre>
    </div>
  {/if}
</section>

<style>
  .skills {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    overflow: hidden;
  }

  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px dashed var(--color-border-2);
    border-radius: 8px;
    padding: 20px 12px;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
    flex-shrink: 0;
    text-align: center;
  }

  .drop-zone:hover,
  .drop-zone.dragging {
    border-color: var(--color-border-3);
    background: var(--color-surface-1);
  }

  .drop-icon {
    font-size: 20px;
    opacity: 0.5;
  }

  .drop-label {
    font-size: 11px;
    opacity: 0.55;
    line-height: 1.5;
  }

  .hidden-input {
    display: none;
  }

  .error {
    font-size: 11px;
    color: var(--color-accent-hover);
    margin: 0;
  }

  .empty-hint {
    font-size: 11px;
    opacity: 0.45;
    text-align: center;
    margin: auto;
    line-height: 1.6;
    padding: 0 16px;
  }

  .skill-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    flex: 1;
  }

  .skill-item {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    align-items: center;
    gap: 2px 8px;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border-1);
    border-radius: 6px;
    padding: 8px 10px;
    position: relative;
  }

  .default-skill {
    border-color: var(--color-border-2);
    background: var(--color-surface-1);
  }

  .badge {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.45;
    border: 1px solid var(--color-border-2);
    border-radius: 3px;
    padding: 1px 4px;
    flex-shrink: 0;
  }

  .skill-meta {
    display: flex;
    align-items: baseline;
    gap: 6px;
    grid-column: 1;
    grid-row: 1;
    min-width: 0;
  }

  .skill-name {
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .skill-date {
    font-size: 10px;
    opacity: 0.4;
    flex-shrink: 0;
  }

  .item-actions {
    grid-column: 2;
    grid-row: 1 / 3;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  :global(.remove-skill-btn:hover) {
    color: var(--color-accent-hover) !important;
  }

  .preview {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border-1);
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
    max-height: 220px;
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: var(--color-surface-1);
    border-bottom: 1px solid var(--color-border-1);
    flex-shrink: 0;
  }

  .preview-title {
    font-size: 11px;
    font-weight: 500;
    opacity: 0.8;
  }

  .preview-actions {
    display: flex;
    gap: 2px;
  }

  .preview-body {
    font-size: 10px;
    line-height: 1.6;
    opacity: 0.6;
    margin: 0;
    padding: 10px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'Inter', sans-serif;
    flex: 1;
  }

  .skill-file {
    font-size: 10px;
    opacity: 0.4;
    grid-column: 1;
    grid-row: 2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
