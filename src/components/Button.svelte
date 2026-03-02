<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
    onclick?: () => void;
  }

  let { children, onclick }: Props = $props();
</script>

<button class="update-button" {onclick}>
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  .update-button {
    font-size: 16px;
    padding: 8px 20px;
    background-color: #ff9d73;
    color: rgb(0, 0, 0);
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }
</style>
