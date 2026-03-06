<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
    onclick?: () => void;
    /** 'primary' = accent filled | 'ghost' = subtle | 'icon' = icon-only ghost */
    variant?: 'primary' | 'ghost' | 'outline';
    disabled?: boolean;
    title?: string;
    'aria-pressed'?: boolean;
  }

  let {
    children,
    onclick,
    variant = 'primary',
    disabled = false,
    title,
    'aria-pressed': ariaPressed,
  }: Props = $props();
</script>

<button class="btn btn--{variant}" {onclick} {disabled} {title} aria-pressed={ariaPressed}>
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    line-height: 1;
    transition:
      background-color 0.15s,
      color 0.15s;
    white-space: nowrap;
    height: var(--height-btn);
    padding: 0 6px;
    font-family: inherit;
    font-weight: 600;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* Primary — accent filled */
  .btn--primary {
    background: var(--color-accent);
    color: var(--color-text-primary);
  }

  .btn--primary:not(:disabled):hover {
    background: var(--color-accent-hover);
  }

  /* Ghost — subtle surface */
  .btn--ghost {
    color: var(--color-text-secondary);
    background-color: transparent;
  }

  .btn--ghost:not(:disabled):hover {
    background: var(--color-surface-3);
    color: var(--color-text-primary);
  }

  .btn--icon:not(:disabled):hover {
    background: var(--color-surface-2);
    color: var(--color-text-primary);
  }

  .btn--outline {
    color: var(--color-text-secondary);
    background: transparent;
    border: 1px solid var(--color-border-1);
  }

  .btn--outline:not(:disabled):hover {
    background: var(--color-surface-1);
  }
</style>
