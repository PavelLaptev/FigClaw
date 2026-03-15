<script module lang="ts">
  type AnthropicModel = { id: string; display_name: string };
  // True module-level cache — survives component unmount/remount
  let cachedModels: AnthropicModel[] | null = null;
  let cachedForKey: string = '';
</script>

<script lang="ts">
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import FormField from './FormField.svelte';
  import Input from './Input.svelte';
  import Icon from './Icon.svelte';
  import Select from './Select.svelte';

  let {
    apiKeyInput = $bindable(''),
    model = $bindable(''),
    hasApiKey,

    apiKey = '',
    shake = false,
    onSave,
    onRemove,
  }: {
    apiKeyInput: string;
    model: string;
    hasApiKey: boolean;
    apiKey?: string;
    shake?: boolean;
    onSave: () => void;
    onRemove: () => void;
  } = $props();

  const FALLBACK_MODELS: AnthropicModel[] = [
    { id: 'claude-opus-4-5', display_name: 'Claude Opus 4.5' },
    { id: 'claude-sonnet-4-5', display_name: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-3-5', display_name: 'Claude Haiku 3.5' },
    { id: 'claude-3-5-sonnet-20241022', display_name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', display_name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', display_name: 'Claude 3 Opus' },
  ];

  let models = $state<AnthropicModel[]>(cachedModels ?? FALLBACK_MODELS);
  let modelsLoading = $state(false);
  let modelsError = $state('');

  async function fetchModels() {
    if (!apiKey) return;

    // Return cached result if the key hasn't changed
    if (cachedModels && cachedForKey === apiKey) {
      models = cachedModels;
      if (models.length > 0 && !models.find((m) => m.id === model)) {
        model = models[0].id;
      }
      return;
    }

    modelsLoading = true;
    modelsError = '';
    try {
      const resp = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      models = (data.data as AnthropicModel[]).filter((m) => m.id.startsWith('claude-'));
      cachedModels = models;
      cachedForKey = apiKey;
      if (models.length > 0 && !models.find((m) => m.id === model)) {
        model = models[0].id;
      }
    } catch (e) {
      modelsError = 'Could not fetch models';
    } finally {
      modelsLoading = false;
    }
  }

  $effect(() => {
    if (apiKey) fetchModels();
  });
</script>

<section class="settings">
  <FormField label="Claude API key" for="api-key">
    {#snippet badge()}
      {#if hasApiKey}
        <Badge variant="saved">Saved in storage</Badge>
      {:else}
        <Badge variant="missing">Not saved</Badge>
      {/if}
    {/snippet}
    <div class="row" class:shake>
      <Input
        id="api-key"
        type="password"
        value={hasApiKey ? apiKey : apiKeyInput}
        oninput={(e) => {
          if (!hasApiKey) apiKeyInput = e.currentTarget.value;
        }}
        placeholder="sk-ant-..."
        disabled={hasApiKey}
      />
      {#if hasApiKey}
        <Button variant="primary" onclick={onRemove}>
          Forget key
          <Icon name="bin" />
        </Button>
      {:else}
        <Button variant="primary" onclick={onSave}
          >Save key
          <Icon name="tick" />
        </Button>
      {/if}
    </div>
    {#if !hasApiKey}
      <div class="hint">
        <p>
          Get your API key at <a href="https://console.anthropic.com/settings/keys" target="_blank"
            >console.anthropic.com</a
          >
        </p>
        <p>
          The key is stored locally in your browser's storage and never sent anywhere until you
          click "Save key".
        </p>
      </div>
    {/if}
  </FormField>

  {#if apiKey}
    <FormField label="Model" for="model">
      {#snippet badge()}
        {#if modelsError}
          <Badge variant="missing">{modelsError}</Badge>
        {/if}
      {/snippet}
      <Select
        id="model"
        bind:value={model}
        options={models.map((m) => ({ value: m.id, label: m.display_name }))}
        disabled={modelsLoading}
      />
    </FormField>
  {/if}
</section>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: var(--spacing-inner-padding);
    flex-shrink: 0;
  }

  .row {
    display: flex;
    gap: 6px;
  }

  .shake {
    animation: shake 0.4s ease;
  }

  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    20% {
      transform: translateX(-6px);
    }
    40% {
      transform: translateX(6px);
    }
    60% {
      transform: translateX(-4px);
    }
    80% {
      transform: translateX(4px);
    }
    100% {
      transform: translateX(0);
    }
  }

  .hint {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
  }

  .hint p {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    opacity: 0.4;
  }

  .hint a {
    color: inherit;
  }
</style>
