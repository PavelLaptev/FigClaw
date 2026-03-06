<script lang="ts">
  import Icon from './Icon.svelte';

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    id?: string;
    value: string;
    options: Option[];
    disabled?: boolean;
  }

  let { id, value = $bindable(), options, disabled = false }: Props = $props();
</script>

<div class="select-wrapper">
  <select {id} bind:value {disabled}>
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  <span class="chevron-icon"><Icon name="chevron-down" /></span>
</div>

<style>
  .select-wrapper {
    position: relative;
    width: 100%;
  }

  select {
    width: 100%;
    border-radius: var(--radius-md);
    font-size: 13px;
    height: var(--height-btn);
    padding: 0 28px 0 8px;
    border: 1px solid var(--color-border-2);
    background: var(--color-surface-1);
    color: var(--color-text-primary);
    outline: none;
    cursor: pointer;
    appearance: none;
  }

  select:focus {
    border-color: var(--color-border-3);
  }

  select:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .chevron-icon {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--color-text-secondary);
    display: flex;
  }
</style>
