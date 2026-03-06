<script lang="ts">
  export let variant: 'label' | 'saved' | 'missing' = 'label';
</script>

<span class="badge {variant}"><slot /></span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    width: fit-content;
  }

  /* Label variant — small uppercase tag (History, Skills) */
  .badge.label {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.45;
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-sm);
    padding: 1px 4px;
  }

  /* Status variants (Settings) */
  .badge.saved,
  .badge.missing {
    font-size: 11px;
    font-weight: 500;
    padding: 3px 6px;
    border-radius: var(--radius-lg);
  }

  .badge.saved {
    background: var(--color-green-bg);
    color: var(--color-green);
    border: 1px solid var(--color-green-border);
  }

  .badge.missing {
    background: var(--color-orange-bg);
    color: var(--color-orange);
    border: 1px solid var(--color-orange-border);
  }
</style>
