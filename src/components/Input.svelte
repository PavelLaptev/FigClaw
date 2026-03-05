<script lang="ts">
  import { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';

  interface Props {
    type?: HTMLInputTypeAttribute;
    value: string | number;
    placeholder?: string;
  }

  let { value = $bindable(), type, placeholder }: Props = $props();
</script>

<input {type} bind:value {placeholder} />

<style>
  input {
    padding: 6px;
    font-size: 14px;
    border: 1px solid var(--color-border-3);
    color: var(--color-text-primary);
    border-radius: 4px;
    background: none;
    width: 100%;
  }
</style>
