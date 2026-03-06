<script lang="ts">
  import type { HTMLInputTypeAttribute } from 'svelte/elements';

  interface Props {
    id?: string;
    type?: HTMLInputTypeAttribute;
    value: string | number;
    placeholder?: string;
    disabled?: boolean;
    oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
  }

  let { id, value = $bindable(), type, placeholder, disabled = false, oninput }: Props = $props();
</script>

<input {id} {type} bind:value {placeholder} {disabled} {oninput} />

<style>
  input {
    width: 100%;
    border-radius: var(--radius-md);
    font-size: 13px;
    height: var(--height-btn);
    padding: 0 8px;
    border: 1px solid var(--color-border-2);
    background: var(--color-surface-1);
    color: var(--color-text-primary);
    outline: none;
  }

  input:focus {
    border-color: var(--color-border-3);
  }

  input:disabled {
    opacity: 0.5;
  }
</style>
