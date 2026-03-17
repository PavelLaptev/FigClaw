<script lang="ts">
  import { ICONS, type IconName } from './icons';

  interface Props {
    name: IconName;
    size?: number;
    title?: string;
  }

  let { name, size = 16, title }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 16 16"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden={title ? undefined : 'true'}
  role={title ? 'img' : undefined}
  class={name === 'spinner' ? 'spinning' : undefined}
>
  {#if title}
    <title>{title}</title>
  {/if}
  <path d={ICONS[name]} fill="currentColor" stroke="none" />
</svg>

<style>
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .spinning {
    animation: spin 1s linear infinite;
  }
</style>
