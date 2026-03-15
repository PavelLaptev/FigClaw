<script lang="ts">
  import { onMount } from 'svelte';
  let introDone = false;
  onMount(() => {
    // longest intro: 0.35s delay + 0.5s duration
    setTimeout(() => {
      introDone = true;
    }, 900);
  });
</script>

<div class="empty">
  <svg
    class="logo"
    width="107"
    height="122"
    viewBox="0 0 107 122"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      class="segment seg-1"
      class:intro-done={introDone}
      d="M87.8756 48.7391C87.8756 39.5257 84.2473 30.6897 77.789 24.1749C71.3306 17.66 62.5713 14 53.4378 14C44.3043 14 35.5449 17.66 29.0866 24.1749C22.6283 30.6897 19 39.5257 19 48.7391L87.8756 48.7391Z"
      fill="#FF6441"
    />
    <path
      class="segment seg-2"
      class:intro-done={introDone}
      d="M50.458 48.7391C47.9766 53.6872 47.5745 59.4124 49.3401 64.6552C51.1058 69.8979 54.8945 74.2288 59.8729 76.6951C64.8513 79.1614 70.6115 79.5611 75.8863 77.8062C81.1612 76.0513 85.5186 72.2856 88 67.3375L50.458 48.7391Z"
      fill="#FF4741"
    />
    <path
      class="segment seg-3"
      class:intro-done={introDone}
      d="M33.9059 78.3696C25.7237 78.3696 19 71.7366 19 63.5544C19 55.3721 25.7237 48.7391 33.9059 48.7391C42.0881 48.7391 48.8118 55.3721 48.8118 63.5543C48.8118 71.7366 42.0881 78.3696 33.9059 78.3696Z"
      fill="#FFAA41"
    />
    <path
      class="segment seg-4"
      class:intro-done={introDone}
      d="M48.8118 93.0941C48.8118 101.326 42.1382 108 33.9059 108C25.6736 108 19 101.326 19 93.0941L19 78.3696L48.8118 78.3696L48.8118 93.0941Z"
      fill="#FF4151"
    />
  </svg>

  <p class="empty-text">
    Chat with your canvas. Claude can inspect nodes, run code, and make changes.
    <br />
    <a href="https://github.com/PavelLaptev/figclaw" target="_blank" rel="noreferrer"
      >Read docs ↗</a
    >
  </p>
</div>

<style>
  .empty {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
  }

  .logo {
    transform-origin: center;
  }

  .segment {
    opacity: 0;
    transform-origin: center bottom;
    animation: seg-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .seg-1 {
    animation-delay: 0.05s;
  }
  .seg-2 {
    animation-delay: 0.15s;
  }
  .seg-3 {
    animation-delay: 0.25s;
  }
  .seg-4 {
    animation-delay: 0.35s;
  }

  .seg-1 {
    transform-origin: 53.4378px 48.7391px;
  }

  .seg-2 {
    transform-origin: 50.458px 48.7391px;
  }

  .seg-3 {
    transform-origin: 33.9059px 63.5544px;
  }

  .seg-4 {
    transform-origin: 33.9059px 78.3696px;
  }

  /* once intro finishes, lock opacity and clear animation on all segments */
  .segment.intro-done {
    animation: none;
    opacity: 1;
  }

  .logo:hover .seg-1.intro-done {
    animation: wobble-1 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards;
  }

  .logo:hover .seg-2.intro-done {
    animation: clamp 1s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards;
  }

  .logo:hover .seg-3.intro-done {
    animation: wobble-3 0.6s 0.05s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards;
  }

  .logo:hover .seg-4.intro-done {
    animation: wobble-4 0.6s 0.1s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards;
  }

  @keyframes wobble-1 {
    0% {
      opacity: 1;
      transform: rotate(0deg);
    }
    25% {
      opacity: 1;
      transform: rotate(5deg);
    }
    55% {
      opacity: 1;
      transform: rotate(-3deg);
    }
    100% {
      opacity: 1;
      transform: rotate(0deg);
    }
  }

  @keyframes wobble-3 {
    0% {
      opacity: 1;
      transform: rotate(0deg);
    }
    25% {
      opacity: 1;
      transform: rotate(-8deg);
    }
    55% {
      opacity: 1;
      transform: rotate(4deg);
    }
    100% {
      opacity: 1;
      transform: rotate(0deg);
    }
  }

  @keyframes wobble-4 {
    0% {
      opacity: 1;
      transform: rotate(0deg);
    }
    25% {
      opacity: 1;
      transform: rotate(6deg);
    }
    55% {
      opacity: 1;
      transform: rotate(-3deg);
    }
    100% {
      opacity: 1;
      transform: rotate(0deg);
    }
  }

  @keyframes clamp {
    0% {
      opacity: 1;
      transform: rotate(0deg);
    }
    20% {
      opacity: 1;
      transform: rotate(-28deg);
    }
    45% {
      opacity: 1;
      transform: rotate(6deg);
    }
    100% {
      opacity: 1;
      transform: rotate(0deg);
    }
  }

  @keyframes seg-in {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.88);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .empty-text {
    font-size: 14px;
    color: var(--color-text-tertiary);
    max-width: 360px;
    line-height: 1.5;
    text-align: center;
    padding: 20px;
    opacity: 0;
    animation: fade-up 0.3s ease forwards;
  }

  @keyframes fade-up {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .empty-text a {
    color: var(--color-text-secondary);
    text-underline-offset: 4px;
  }
</style>
