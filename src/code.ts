// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY_API = 'claude_api_key';
const STORAGE_KEY_SKILLS = 'claude_skills';
const STORAGE_KEY_HISTORY = 'claude_chat_history';

figma.showUI(__html__, { themeColors: true, width: 400, height: 680 });

// ─── Init ─────────────────────────────────────────────────────────────────────
async function postInitState() {
  const apiKey = await figma.clientStorage.getAsync(STORAGE_KEY_API);
  const skills = await getSkills();
  const chatHistory = await getChatHistory();
  figma.ui.postMessage({
    type: 'init',
    hasApiKey: Boolean(apiKey),
    apiKey: apiKey ? String(apiKey) : '',
    skills,
    chatHistory,
  });
}

async function saveApiKey(apiKey: string) {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    await figma.clientStorage.deleteAsync(STORAGE_KEY_API);
    figma.ui.postMessage({
      type: 'api-key-saved',
      hasApiKey: false,
      message: 'API key cleared 🧽',
    });
    return;
  }
  await figma.clientStorage.setAsync(STORAGE_KEY_API, trimmed);
  figma.ui.postMessage({ type: 'api-key-saved', hasApiKey: true, message: 'API key saved ✅' });
}

async function getApiKey(): Promise<string | null> {
  const key = await figma.clientStorage.getAsync(STORAGE_KEY_API);
  return key ? String(key) : null;
}

// ─── Skills storage ───────────────────────────────────────────────────────────
async function getSkills(): Promise<unknown[]> {
  const raw = await figma.clientStorage.getAsync(STORAGE_KEY_SKILLS);
  if (!raw) return [];
  try {
    return Array.isArray(raw) ? raw : JSON.parse(String(raw));
  } catch (_e) {
    return [];
  }
}

async function saveSkills(skills: unknown[]): Promise<void> {
  await figma.clientStorage.setAsync(STORAGE_KEY_SKILLS, skills);
}

// ─── Chat history storage ─────────────────────────────────────────────────────
async function getChatHistory(): Promise<unknown[]> {
  const raw = await figma.clientStorage.getAsync(STORAGE_KEY_HISTORY);
  if (!raw) return [];
  try {
    return Array.isArray(raw) ? raw : JSON.parse(String(raw));
  } catch (_e) {
    return [];
  }
}

async function saveChatHistory(chats: unknown[]): Promise<void> {
  await figma.clientStorage.setAsync(STORAGE_KEY_HISTORY, chats);
}

type PluginMessage = { type: string; [key: string]: unknown };

async function handleStorageMessage(msg: PluginMessage): Promise<boolean> {
  if (msg.type === 'request-init') {
    await postInitState();
    return true;
  }

  if (msg.type === 'save-api-key') {
    await saveApiKey(String(msg.apiKey || ''));
    return true;
  }

  if (msg.type === 'get-api-key') {
    const key = await getApiKey();
    figma.ui.postMessage({ type: 'api-key-value', apiKey: key || '' });
    return true;
  }

  if (msg.type === 'get-skills') {
    const skills = await getSkills();
    figma.ui.postMessage({ type: 'skills-value', skills: Array.isArray(skills) ? skills : [] });
    return true;
  }

  if (msg.type === 'save-skills') {
    const skills = Array.isArray(msg.skills) ? msg.skills : [];
    await saveSkills(skills);
    figma.ui.postMessage({ type: 'skills-saved' });
    return true;
  }

  if (msg.type === 'save-chat-history') {
    const chats = Array.isArray(msg.chats) ? msg.chats : [];
    await saveChatHistory(chats);
    return true;
  }

  return false;
}

// ─── Code runner ──────────────────────────────────────────────────────────────
// Wraps the user code in an async IIFE so top-level await works,
// then injects `figma` into scope via a Function constructor.
async function runCode(code: string): Promise<unknown> {
  // The Function receives `figma` as its only argument.
  // We wrap the code in an async block so Claude can freely use await.
  const wrapped = `return (async () => { ${code} })()`;
  // eslint-disable-next-line no-new-func
  const fn = new Function('figma', wrapped);
  const result = await fn(figma);
  return result !== undefined ? result : { ok: true };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function serializeNode(node: SceneNode): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
  };

  if ('x' in node) base.x = node.x;
  if ('y' in node) base.y = node.y;
  if ('width' in node) base.width = node.width;
  if ('height' in node) base.height = node.height;
  if ('opacity' in node) base.opacity = node.opacity;

  if ('fills' in node) {
    const fills = node.fills;
    if (Array.isArray(fills)) {
      base.fills = fills.map((f) => {
        if (f.type === 'SOLID') {
          return {
            type: 'SOLID',
            color: f.color,
            opacity: f.opacity,
          };
        }
        return { type: f.type };
      });
    }
  }

  if ('characters' in node) base.characters = node.characters;
  if ('fontSize' in node) base.fontSize = node.fontSize;
  if ('fontName' in node) base.fontName = node.fontName;

  if ('children' in node) {
    base.childCount = (node as ChildrenMixin).children.length;
    base.children = (node as ChildrenMixin).children.map(serializeNode);
  }

  return base;
}

function resolveNodeById(id: string): SceneNode | null {
  return figma.getNodeById(id) as SceneNode | null;
}

// ─── Tool Executor ────────────────────────────────────────────────────────────
async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_selection': {
      const nodes = figma.currentPage.selection;
      if (nodes.length === 0) return { nodes: [], message: 'Nothing is selected.' };
      return { nodes: nodes.map(serializeNode) };
    }

    case 'get_page_nodes': {
      const depth = typeof input.depth === 'number' ? input.depth : 2;
      const summarize = (nodes: readonly SceneNode[], d: number): unknown[] =>
        nodes.map((n) => {
          const s = serializeNode(n);
          if (d <= 1) delete s.children;
          else if ('children' in n && d > 1) {
            s.children = summarize((n as ChildrenMixin).children, d - 1);
          }
          return s;
        });
      return { nodes: summarize(figma.currentPage.children, depth) };
    }

    case 'get_node_by_id': {
      const node = resolveNodeById(String(input.id));
      if (!node) return { error: 'Node not found: ' + input.id };
      return { node: serializeNode(node) };
    }

    case 'get_styles': {
      const paintStyles = figma.getLocalPaintStyles().map((s) => ({
        id: s.id,
        name: s.name,
        type: 'paint',
      }));
      const textStyles = figma.getLocalTextStyles().map((s) => ({
        id: s.id,
        name: s.name,
        type: 'text',
      }));
      const effectStyles = figma.getLocalEffectStyles().map((s) => ({
        id: s.id,
        name: s.name,
        type: 'effect',
      }));
      const gridStyles = figma.getLocalGridStyles().map((s) => ({
        id: s.id,
        name: s.name,
        type: 'grid',
      }));
      return { paintStyles, textStyles, effectStyles, gridStyles };
    }

    case 'get_variables': {
      const collections = figma.variables.getLocalVariableCollections().map((col) => ({
        id: col.id,
        name: col.name,
        modes: col.modes,
        defaultModeId: col.defaultModeId,
        variables: col.variableIds.map((varId) => {
          const v = figma.variables.getVariableById(varId);
          if (!v) return { id: varId };
          return {
            id: v.id,
            name: v.name,
            resolvedType: v.resolvedType,
            scopes: v.scopes,
            valuesByMode: v.valuesByMode,
          };
        }),
      }));
      return { collections };
    }

    case 'get_components': {
      const components = figma.currentPage
        .findAll((n) => n.type === 'COMPONENT' || n.type === 'COMPONENT_SET')
        .map((n) => {
          const base: Record<string, unknown> = {
            id: n.id,
            name: n.name,
            type: n.type,
          };
          if ('description' in n) base.description = n.description;
          if ('componentPropertyDefinitions' in n)
            base.componentPropertyDefinitions = n.componentPropertyDefinitions;
          return base;
        });
      return { components };
    }

    case 'get_pages': {
      const pages = figma.root.children.map((p) => ({
        id: p.id,
        name: p.name,
        nodeCount: p.children.length,
        isCurrent: p.id === figma.currentPage.id,
      }));
      return { pages };
    }

    case 'notify': {
      figma.notify(String(input.message || ''), {
        timeout: typeof input.timeout === 'number' ? input.timeout : 3000,
        error: input.error === true,
      });
      return { notified: true };
    }

    case 'create_skill': {
      const name = String(input.name || '').trim();
      const content = String(input.content || '');
      if (!name) return { error: 'name is required.' };
      const newSkill: Record<string, unknown> = {
        id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        }),
        name,
        content,
        fileName: `${name}.md`,
        addedAt: Date.now(),
      };
      const allSkills = (await getSkills()) as Array<Record<string, unknown>>;
      allSkills.push(newSkill);
      await saveSkills(allSkills);
      figma.ui.postMessage({ type: 'skills-updated', skills: allSkills });
      return { created: true, id: newSkill.id, name: newSkill.name };
    }

    case 'update_skill': {
      const id = String(input.id || '');
      const content = String(input.content || '');
      const newName = input.name !== undefined ? String(input.name) : undefined;
      if (!id) return { error: 'id is required.' };
      const allSkills = (await getSkills()) as Array<Record<string, unknown>>;
      const idx = allSkills.findIndex((s) => s.id === id);
      if (idx === -1) return { error: `Skill with id "${id}" not found.` };
      if (newName !== undefined) allSkills[idx].name = newName;
      allSkills[idx].content = content;
      await saveSkills(allSkills);
      figma.ui.postMessage({ type: 'skills-updated', skills: allSkills });
      return { updated: true, id, name: allSkills[idx].name };
    }

    case 'download_files': {
      const files = Array.isArray(input.files) ? input.files : [];
      if (files.length === 0) return { error: 'No files provided.' };

      const serialized = files.map((f: Record<string, unknown>) => {
        const content = f.content;
        // Uint8Array comes through as an object with numeric keys — convert to plain array for postMessage
        const isUint8 =
          content instanceof Uint8Array ||
          (content !== null &&
            typeof content === 'object' &&
            !Array.isArray(content) &&
            Object.prototype.toString.call(content) === '[object Uint8Array]');
        return {
          filename: String(f.filename || 'export'),
          mimeType: String(f.mimeType || 'application/octet-stream'),
          content: isUint8 ? Array.from(content as Uint8Array) : content,
          isBinary: isUint8,
        };
      });

      figma.ui.postMessage({ type: 'download-files', files: serialized });
      return {
        downloading: serialized.length,
        files: serialized.map((f: Record<string, unknown>) => f.filename),
      };
    }

    default:
      return { error: 'Unknown tool: ' + name };
  }
}

// ─── Message Handler ──────────────────────────────────────────────────────────
figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    const handledStorage = await handleStorageMessage(msg);
    if (handledStorage) {
      return;
    }

    if (msg.type === 'execute-tool') {
      const toolName = String(msg.toolName);
      const toolInput = (msg.toolInput || {}) as Record<string, unknown>;
      try {
        let result: unknown;
        if (toolName === 'run_figma_code') {
          const code = String(toolInput.code || '');
          result = await runCode(code);
        } else {
          result = await executeTool(toolName, toolInput);
        }
        // Ensure result is JSON-serialisable before posting
        const safe = JSON.parse(JSON.stringify(result !== undefined ? result : { ok: true }));
        figma.ui.postMessage({ type: 'tool-result', toolUseId: msg.toolUseId, result: safe });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        figma.ui.postMessage({
          type: 'tool-result',
          toolUseId: msg.toolUseId,
          result: { error: errMsg },
        });
      }
      return;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected plugin error.';
    figma.ui.postMessage({ type: 'chat-error', error: errorMessage });
  }
};
