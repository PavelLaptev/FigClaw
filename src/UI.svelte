<script lang="ts">
  import JSZip from 'jszip';
  import './styles.css';
  import { tick } from 'svelte';
  import Header, { type Tab } from './components/Header.svelte';
  import History from './components/History.svelte';
  import Settings from './components/Settings.svelte';
  import Skills, { type Skill } from './components/Skills.svelte';
  import ChatMessage from './components/ChatMessage.svelte';
  import Composer, { type AttachedImage } from './components/Composer.svelte';
  import EmptyChat from './components/EmptyChat.svelte';
  import { TOOLS } from './tools';
  import SYSTEM_PROMPT from './system-prompt.md?raw';

  // ─── Types ────────────────────────────────────────────────────────────────
  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    | { type: 'tool_result'; tool_use_id: string; content: string };

  type ApiMessage = {
    role: 'user' | 'assistant';
    content: string | ContentBlock[];
  };

  type DisplayMessage = {
    role: 'user' | 'assistant' | 'tool' | 'code';
    text: string;
    images?: string[]; // data URLs for user messages
    toolName?: string;
    toolStatus?: 'running' | 'done' | 'error';
  };

  type SavedChat = {
    id: string;
    title: string;
    savedAt: number;
    displayMessages: DisplayMessage[];
    apiHistory: ApiMessage[];
  };

  type DownloadFilePayload = {
    filename: string;
    mimeType?: string;
    content: unknown;
    isBinary?: boolean;
  };

  // ─── Helpers (defined early so $state initializers can use them) ──────────
  function makeId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  // ─── State ────────────────────────────────────────────────────────────────
  let apiKeyInput = $state('');
  let hasApiKey = $state(false);
  let statusMessage = $state('');
  let shakeApiKey = $state(false);
  let model = $state('claude-sonnet-4-6');
  let prompt = $state('');
  let attachedImages = $state<AttachedImage[]>([]);
  let isSending = $state(false);
  let abortController = $state<AbortController | null>(null);

  function stopAgent() {
    abortController?.abort();
    abortController = null;
  }
  let activeTab = $state<Tab>('chat');

  let skills = $state<Skill[]>([]);

  let displayMessages = $state<DisplayMessage[]>([]);
  let apiHistory = $state<ApiMessage[]>([]);
  let savedChats = $state<SavedChat[]>([]);
  let currentChatId = $state<string>(makeId());

  let messagesContainer = $state<HTMLElement | null>(null);
  let composer = $state<Composer | null>(null);
  let mainEl = $state<HTMLElement | null>(null);

  const CHAT_HEIGHT = 680;
  const MAX_HEIGHT = 800;

  function sendResize() {
    if (!mainEl) return;
    const h = Math.min(mainEl.scrollHeight, MAX_HEIGHT);
    sendToPlugin({ type: 'resize', width: 400, height: h });
  }

  $effect(() => {
    const tab = activeTab;
    if (tab === 'chat') {
      sendToPlugin({ type: 'resize', width: 400, height: CHAT_HEIGHT });
      return;
    }
    tick().then(() => {
      sendResize();
    });
    if (!mainEl) return;
    const observer = new ResizeObserver(sendResize);
    observer.observe(mainEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (composer) tick().then(() => composer?.focusTextarea());
  });

  // SYSTEM_PROMPT is imported from ./system-prompt.md at build time.
  // Edit that file to change Claude's base behaviour.

  // ─── Default skill (built-in system prompt) ─────────────────────────────
  const DEFAULT_SKILL: Skill = {
    id: '__default__',
    name: 'Figma Agent',
    content: SYSTEM_PROMPT,
    fileName: 'system-prompt.md',
    addedAt: 0,
    isDefault: true,
  };

  // All skills shown in the UI: default first, then user-added
  let allSkills = $derived([DEFAULT_SKILL, ...skills]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function sendToPlugin(msg: Record<string, unknown>) {
    parent.postMessage({ pluginMessage: msg }, '*');
  }

  function toUint8Array(content: unknown): Uint8Array | null {
    if (content instanceof Uint8Array) return content;

    if (Array.isArray(content)) {
      const allNumbers = content.every((v) => typeof v === 'number' && Number.isFinite(v));
      if (!allNumbers) return null;
      return Uint8Array.from(content.map((v) => Number(v)));
    }

    if (content && typeof content === 'object') {
      const numericEntries = Object.entries(content as Record<string, unknown>)
        .filter(([key]) => /^\d+$/.test(key))
        .sort((a, b) => Number(a[0]) - Number(b[0]));

      if (numericEntries.length === 0) return null;

      const values = numericEntries.map(([, value]) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
      });
      return Uint8Array.from(values);
    }

    return null;
  }

  function uint8ToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    if (bytes.buffer instanceof ArrayBuffer) {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }
    return Uint8Array.from(bytes).buffer;
  }

  function payloadToBlob(file: DownloadFilePayload): Blob {
    const mimeType = typeof file.mimeType === 'string' ? file.mimeType : 'application/octet-stream';

    if (file.isBinary) {
      const bytes = toUint8Array(file.content);
      if (!bytes) {
        throw new Error(`Invalid binary content for ${file.filename}`);
      }
      return new Blob([uint8ToArrayBuffer(bytes)], { type: mimeType });
    } else if (typeof file.content === 'string') {
      return new Blob([file.content], { type: mimeType });
    } else {
      const maybeBinary = toUint8Array(file.content);
      if (maybeBinary) {
        return new Blob([uint8ToArrayBuffer(maybeBinary)], { type: mimeType });
      } else {
        return new Blob([JSON.stringify(file.content, null, 2)], {
          type: 'application/json;charset=utf-8',
        });
      }
    }
  }

  function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'export';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function triggerDownload(file: DownloadFilePayload): void {
    const blob = payloadToBlob(file);
    downloadBlob(blob, file.filename || 'export');
  }

  function getZipFileName(files: DownloadFilePayload[]): string {
    const dateStamp = new Date().toISOString().slice(0, 10);
    const svgOnly = files.every((f) =>
      String(f.filename || '')
        .toLowerCase()
        .endsWith('.svg')
    );
    return svgOnly ? `icons-export-${dateStamp}.zip` : `figclaw-export-${dateStamp}.zip`;
  }

  async function downloadAsZip(files: DownloadFilePayload[]): Promise<string> {
    const zip = new JSZip();
    for (const file of files) {
      const filename = String(file.filename || 'export');
      zip.file(filename, payloadToBlob(file));
    }

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const zipName = getZipFileName(files);
    downloadBlob(zipBlob, zipName);
    return zipName;
  }

  async function handleDownloadFiles(files: DownloadFilePayload[]): Promise<void> {
    if (files.length === 0) {
      statusMessage = 'No files were downloaded.';
      return;
    }

    if (files.length > 1) {
      try {
        const zipName = await downloadAsZip(files);
        statusMessage = `Downloaded ${files.length} files as ${zipName}`;
        return;
      } catch (error) {
        console.error('ZIP creation failed, falling back to per-file download.', error);
      }
    }

    let successCount = 0;
    for (const file of files) {
      try {
        triggerDownload(file);
        successCount += 1;
      } catch (error) {
        console.error('Download failed for file:', file.filename, error);
      }
    }

    if (successCount === files.length) {
      statusMessage =
        files.length === 1
          ? `Downloaded 1 file: ${files[0].filename}`
          : `Downloaded ${files.length} files`;
      return;
    }

    statusMessage =
      successCount > 0
        ? `Downloaded ${successCount}/${files.length} files. Check browser download settings.`
        : 'No files were downloaded. Check browser download permissions/settings.';
  }

  async function scrollBottom() {
    await tick();
    if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function pushDisplay(msg: DisplayMessage) {
    displayMessages = [...displayMessages, msg];
    scrollBottom();
  }

  // ─── Tool execution ───────────────────────────────────────────────────────
  let pendingToolResolvers: Map<string, (result: unknown) => void> = new Map();

  // fetch_docs runs entirely in the UI iframe (no CORS restriction needed for public docs)
  async function fetchDocs(url: string): Promise<string> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        if (resp.status === 404) {
          return `404 Not Found: the file "${url}" does not exist in the snapshot repo. Do NOT guess other paths — fetch the slug index first (https://raw.githubusercontent.com/PavelLaptev/figma-api-snapshot/master/out/index.json) to find the correct slug.`;
        }
        return `HTTP ${resp.status} fetching ${url}`;
      }
      const body = await resp.text();
      // JSON files (snapshot repo) — return as-is without HTML parsing
      if (url.endsWith('.json') || resp.headers.get('content-type')?.includes('json')) {
        return body.slice(0, 12000);
      }
      // HTML pages — strip tags to get readable plain text
      const tmp = document.createElement('div');
      tmp.innerHTML = body;
      // Remove scripts/styles
      tmp.querySelectorAll('script,style,nav,footer').forEach((el) => el.remove());
      const text = (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
      // Limit to 12 000 chars so it fits in Claude's context
      return text.slice(0, 12000);
    } catch (err) {
      return 'Failed to fetch: ' + String(err);
    }
  }

  function executeToolInPlugin(
    toolUseId: string,
    toolName: string,
    toolInput: Record<string, unknown>
  ): Promise<unknown> {
    return new Promise((resolve) => {
      pendingToolResolvers.set(toolUseId, resolve);
      sendToPlugin({ type: 'execute-tool', toolUseId, toolName, toolInput });
    });
  }

  // ─── Build system prompt (base + injected active skills) ─────────────────
  // Active skills are always-on — injected into every conversation.
  // Passive skills do nothing until explicitly @mentioned.
  function buildSystemPrompt(): string {
    const activeSkills = skills.filter((s) => !s.isDefault && s.mode !== 'passive');
    if (activeSkills.length === 0) return SYSTEM_PROMPT;
    const skillsSection = activeSkills
      .map((s) => '### Skill: ' + s.name + ' (id: ' + s.id + ')\n\n' + s.content)
      .join('\n\n---\n\n');
    return (
      SYSTEM_PROMPT +
      '\n\n## Custom Skills\n\nThe user has provided the following active skill documents. Apply them as persistent behaviour instructions throughout the conversation unless they conflict with tool constraints, safety requirements, or explicit user requests.\n\n' +
      skillsSection
    );
  }

  // ─── Claude API call (fetch lives here in the iframe — no CORS issue) ─────

  // Remove any trailing assistant message that has tool_use blocks without a
  // following tool_result — this happens when the agent is stopped mid-loop.
  function sanitizeHistory(history: ApiMessage[]): ApiMessage[] {
    const last = history[history.length - 1];
    if (
      last &&
      last.role === 'assistant' &&
      Array.isArray(last.content) &&
      last.content.some((b) => b.type === 'tool_use')
    ) {
      return history.slice(0, -1);
    }
    return history;
  }

  async function callClaude(
    history: ApiMessage[],
    signal?: AbortSignal
  ): Promise<{ content: ContentBlock[]; stop_reason: string }> {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': storedApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: buildSystemPrompt(),
        tools: TOOLS,
        messages: history,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const msg =
        err &&
        typeof err === 'object' &&
        'error' in err &&
        err.error &&
        typeof err.error === 'object' &&
        'message' in err.error
          ? String(err.error.message)
          : 'Claude API error ' + resp.status;
      throw new Error(msg);
    }

    return resp.json();
  }

  // ─── Agent loop ───────────────────────────────────────────────────────────
  let storedApiKey = $state('');

  async function runAgentLoop(
    userText: string,
    images: AttachedImage[] = [],
    displayText?: string
  ) {
    if (!storedApiKey) {
      statusMessage = 'No API key. Save your Claude API key first.';
      return;
    }

    isSending = true;
    abortController = new AbortController();
    const signal = abortController.signal;
    pushDisplay({
      role: 'user',
      text: displayText ?? userText,
      images: images.map((i) => i.dataUrl),
    });

    // Build multipart content if images are attached
    let userContent: string | ContentBlock[];
    if (images.length > 0) {
      userContent = [
        ...images.map(
          (img): ContentBlock => ({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mediaType,
              data: img.dataUrl.replace(/^data:[^;]+;base64,/, ''),
            },
          })
        ),
        ...(userText ? [{ type: 'text' as const, text: userText }] : []),
      ];
    } else {
      userContent = userText;
    }

    const userMsg: ApiMessage = { role: 'user', content: userContent };
    const history: ApiMessage[] = [...sanitizeHistory(apiHistory), userMsg];

    try {
      let keepGoing = true;
      while (keepGoing) {
        if (signal.aborted) break;
        statusMessage = 'Claude is thinking...';
        const response = await callClaude(history, signal);
        const assistantMsg: ApiMessage = { role: 'assistant', content: response.content };
        history.push(assistantMsg);

        // Collect text blocks to display
        const textBlocks = response.content.filter(
          (b): b is { type: 'text'; text: string } => b.type === 'text'
        );
        if (textBlocks.length > 0) {
          pushDisplay({ role: 'assistant', text: textBlocks.map((b) => b.text).join('\n\n') });
        }

        // Process tool use blocks
        const toolUseBlocks = response.content.filter(
          (
            b
          ): b is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
            b.type === 'tool_use'
        );

        if (toolUseBlocks.length === 0 || response.stop_reason !== 'tool_use') {
          keepGoing = false;
          break;
        }

        // Execute all requested tools
        const toolResultContents: ContentBlock[] = [];

        for (const tool of toolUseBlocks) {
          const displayLabel =
            tool.name === 'run_figma_code'
              ? (tool.input.description as string) || 'run_figma_code'
              : tool.name === 'fetch_docs'
                ? 'fetch_docs: ' + String(tool.input.url || '')
                : tool.name;

          pushDisplay({
            role: 'tool',
            text: displayLabel,
            toolName: tool.name,
            toolStatus: 'running',
          });

          let result: unknown;
          if (tool.name === 'fetch_docs') {
            result = { content: await fetchDocs(String(tool.input.url || '')) };
          } else {
            result = await executeToolInPlugin(tool.id, tool.name, tool.input);
          }

          // update last tool display to done
          displayMessages = displayMessages.map((m, i) =>
            i === displayMessages.length - 1 && m.role === 'tool' && m.toolName === tool.name
              ? { ...m, toolStatus: 'done' as const }
              : m
          );

          toolResultContents.push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: JSON.stringify(result),
          });
        }

        // Add tool results as next user message
        history.push({ role: 'user', content: toolResultContents });
        statusMessage = 'Processing tool results...';
      }

      apiHistory = sanitizeHistory(history);
      statusMessage = signal.aborted ? 'Stopped.' : 'Done.';
      upsertCurrentChat();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        statusMessage = 'Stopped.';
        apiHistory = sanitizeHistory(history);
        upsertCurrentChat();
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        statusMessage = 'Error: ' + msg;
        pushDisplay({ role: 'assistant', text: 'Error: ' + msg });
      }
    } finally {
      isSending = false;
      abortController = null;
    }
  }

  // Extract @skill-name mentions from text, inject their content, return cleaned text.
  // Only passive skills can be @mentioned.
  function resolveSkillMentions(text: string): { resolvedText: string; injected: Skill[] } {
    const activeSkills = skills.filter((s) => s.mode === 'passive');
    const mentionPattern = /@([-\w]+)/g;
    const injected: Skill[] = [];
    const resolvedText = text
      .replace(mentionPattern, (match, name) => {
        const skill = activeSkills.find((s) => s.name.toLowerCase() === name.toLowerCase());
        if (skill) {
          if (!injected.find((s) => s.id === skill.id)) injected.push(skill);
          return '';
        }
        return match;
      })
      .trim();
    return { resolvedText, injected };
  }

  async function sendMessage() {
    const rawText = prompt.trim();
    const images = attachedImages.slice();
    if ((!rawText && images.length === 0) || isSending) return;
    if (!storedApiKey) {
      activeTab = 'settings';
      shakeApiKey = false;
      setTimeout(() => (shakeApiKey = true), 50);
      return;
    }
    prompt = '';
    attachedImages = [];

    const { resolvedText, injected } = resolveSkillMentions(rawText);
    let finalText = resolvedText;
    if (injected.length > 0) {
      const skillBlock = injected
        .map((s) => '<skill name="' + s.name + '">\n' + s.content + '\n</skill>')
        .join('\n\n');
      finalText = (skillBlock + '\n\n' + resolvedText).trim();
    }

    await runAgentLoop(finalText, images, rawText);
  }

  function persistHistory(chats: SavedChat[]) {
    // Svelte rune state can contain proxy-wrapped objects that are not postMessage-cloneable.
    // Force plain JSON-serializable data before crossing iframe boundary.
    const serializableChats = JSON.parse(JSON.stringify(chats)) as SavedChat[];
    sendToPlugin({ type: 'save-chat-history', chats: serializableChats });
  }

  // Upsert the active conversation into savedChats in-place
  function upsertCurrentChat() {
    if (displayMessages.length === 0) return;
    const firstUser = displayMessages.find((m) => m.role === 'user');
    const title = firstUser ? firstUser.text.trim().slice(0, 60) || 'Chat' : 'Chat';
    const chat: SavedChat = {
      id: currentChatId,
      title,
      savedAt: Date.now(),
      displayMessages: [...displayMessages],
      apiHistory: [...apiHistory],
    };
    const exists = savedChats.some((c) => c.id === currentChatId);
    const updated = exists
      ? savedChats.map((c) => (c.id === currentChatId ? chat : c))
      : [chat, ...savedChats];
    savedChats = updated;
    persistHistory(updated);
  }

  function clearChat() {
    // Don't save an empty chat
    if (displayMessages.length > 0) upsertCurrentChat();
    displayMessages = [];
    apiHistory = [];
    currentChatId = makeId();
    tick().then(() => composer?.focusTextarea());
  }

  function resumeChat(chat: SavedChat) {
    if (displayMessages.length > 0) upsertCurrentChat();
    displayMessages = [...chat.displayMessages];
    apiHistory = [...chat.apiHistory];
    currentChatId = chat.id;
    statusMessage = '';
    activeTab = 'chat';
    scrollBottom();
  }

  function deleteChat(id: string) {
    const updated = savedChats.filter((c) => c.id !== id);
    savedChats = updated;
    persistHistory(updated);
  }

  // ─── Skills ───────────────────────────────────────────────────────────────
  function persistSkills(updated: Skill[]) {
    // Svelte rune state can contain proxy-wrapped objects that are not postMessage-cloneable.
    // Force plain JSON-serializable data before crossing iframe boundary.
    const serializableSkills = JSON.parse(JSON.stringify(updated)) as Skill[];
    sendToPlugin({ type: 'save-skills', skills: serializableSkills });
  }

  function addSkill(skill: Skill) {
    skills = [...skills, skill];
    persistSkills(skills);
  }

  function removeSkill(id: string) {
    skills = skills.filter((s) => s.id !== id);
    persistSkills(skills);
  }

  function toggleSkillMode(id: string) {
    skills = skills.map((s) =>
      s.id === id ? { ...s, mode: s.mode === 'active' ? 'passive' : 'active' } : s
    );
    persistSkills(skills);
  }

  function updateSkill(id: string, updates: Partial<Skill>) {
    skills = skills.map((s) => (s.id === id ? { ...s, ...updates } : s));
    persistSkills(skills);
  }

  // ─── Plugin message handler ───────────────────────────────────────────────
  onmessage = (event) => {
    const msg = event.data.pluginMessage;
    if (!msg || typeof msg !== 'object' || !msg.type) return;

    if (msg.type === 'init') {
      hasApiKey = Boolean(msg.hasApiKey);
      statusMessage = hasApiKey ? 'Claude is ready ✨' : 'Add your Claude API key to start 🔑';
      if (msg.apiKey) {
        storedApiKey = String(msg.apiKey);
      }
      if (Array.isArray(msg.skills)) {
        skills = msg.skills as Skill[];
      }
      if (Array.isArray(msg.chatHistory) && msg.chatHistory.length > 0) {
        const chats = msg.chatHistory as SavedChat[];
        const latest = chats[0];
        savedChats = chats;
        displayMessages = [...latest.displayMessages];
        apiHistory = [...latest.apiHistory];
        currentChatId = latest.id;
      }
      return;
    }

    if (msg.type === 'skills-value') {
      if (Array.isArray(msg.skills)) {
        skills = msg.skills as Skill[];
      }
      return;
    }

    if (msg.type === 'skills-updated') {
      if (Array.isArray(msg.skills)) {
        skills = msg.skills as Skill[];
      }
      return;
    }

    if (msg.type === 'skill-update-error') {
      statusMessage = 'Skill update failed: ' + String(msg.error);
      return;
    }

    if (msg.type === 'api-key-value') {
      storedApiKey = String(msg.apiKey || '');
      return;
    }

    if (msg.type === 'api-key-saved') {
      hasApiKey = Boolean(msg.hasApiKey);
      statusMessage = String(msg.message || '');
      if (hasApiKey) {
        apiKeyInput = '';
        sendToPlugin({ type: 'get-api-key' });
      } else {
        storedApiKey = '';
      }
      return;
    }

    if (msg.type === 'tool-result') {
      const resolve = pendingToolResolvers.get(String(msg.toolUseId));
      if (resolve) {
        pendingToolResolvers.delete(String(msg.toolUseId));
        resolve(msg.result);
      }
      return;
    }

    if (msg.type === 'download-files') {
      if (Array.isArray(msg.files)) {
        void handleDownloadFiles(msg.files as DownloadFilePayload[]);
      }
      return;
    }

    if (msg.type === 'chat-error') {
      isSending = false;
      statusMessage = 'Error: ' + String(msg.error);
      return;
    }
  };

  sendToPlugin({ type: 'request-init' });
</script>

<main class="plugin" class:auto-height={activeTab !== 'chat'} bind:this={mainEl}>
  <Header bind:activeTab onClear={clearChat} />

  {#if activeTab === 'settings'}
    <Settings
      bind:apiKeyInput
      bind:model
      {hasApiKey}
      apiKey={storedApiKey}
      shake={shakeApiKey}
      onSave={() => sendToPlugin({ type: 'save-api-key', apiKey: apiKeyInput })}
      onRemove={() => sendToPlugin({ type: 'save-api-key', apiKey: '' })}
    />
  {:else if activeTab === 'skills'}
    <Skills
      skills={allSkills}
      onAdd={addSkill}
      onRemove={removeSkill}
      onToggleMode={toggleSkillMode}
    />
  {:else if activeTab === 'history'}
    <History
      {savedChats}
      {currentChatId}
      onResume={resumeChat}
      onDelete={deleteChat}
      onUnapply={clearChat}
    />
  {:else}
    <!-- Chat messages -->
    <div class="chat-wrapper">
      <section class="chat" bind:this={messagesContainer}>
        {#if displayMessages.length === 0}
          <EmptyChat />
        {:else}
          {#each displayMessages as msg}
            <ChatMessage {msg} />
          {/each}
          {#if isSending}
            <div class="thinking">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>
          {/if}
        {/if}
      </section>
    </div>

    {#if statusMessage && displayMessages.length === 0}
      <p class="status">{statusMessage}</p>
    {/if}

    <Composer
      bind:this={composer}
      bind:prompt
      bind:attachedImages
      skills={allSkills.filter((s) => !s.isDefault && s.mode === 'passive')}
      {isSending}
      onSend={sendMessage}
      onStop={stopAgent}
    />
  {/if}
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  main.auto-height {
    height: auto;
    overflow: visible;
  }

  .chat-wrapper {
    position: relative;
    flex: 1;
    overflow: hidden;

    &::after {
      position: absolute;
      top: 0;
      left: 0;
      content: '';
      height: 30px;
      width: calc(100% - var(--spacing-inner-padding));
      pointer-events: none;
      background: linear-gradient(var(--color-bg) 20%, transparent 100%);
    }

    &::before {
      position: absolute;
      bottom: 0;
      left: 0;
      content: '';
      height: 30px;
      width: calc(100% - var(--spacing-inner-padding));
      pointer-events: none;
      background: linear-gradient(transparent 0%, var(--color-bg) 80%);
    }
  }

  /* Chat */
  .chat {
    height: 100%;
    overflow-y: auto;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: calc(var(--spacing-inner-padding) * 2) var(--spacing-inner-padding);
  }

  /* Thinking dots */
  .thinking {
    display: flex;
    gap: 4px;
    padding: 6px 10px;
    width: fit-content;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    animation: bounce 1.2s infinite ease-in-out;
  }

  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }
  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes bounce {
    0%,
    80%,
    100% {
      transform: scale(0.6);
      opacity: 0.4;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* Status */
  .status {
    padding: 12px var(--spacing-inner-padding);
    font-size: 12px;
    opacity: 0.4;
    margin: 0;
    flex-shrink: 0;
    text-align: center;
  }
</style>
