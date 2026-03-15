<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    text,
    icon,
    padding,
  }: {
    text: Snippet;
    icon: Snippet;
    padding?: string;
  } = $props();
</script>

<div class="empty-state" style="padding: {padding || 'var(--spacing-inner-padding)'}">
  {@render icon()}
  <p>{@render text()}</p>
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    flex: 1;
  }

  .empty-state p {
    font-size: 12px;
    opacity: 0.45;
    line-height: 1.7;
    text-align: center;
    margin: 0;
  }
</style>
