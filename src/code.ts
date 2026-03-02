// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY_API = 'claude_api_key';

figma.showUI(__html__, { themeColors: true, width: 420, height: 680 });

// ─── Init ─────────────────────────────────────────────────────────────────────
async function postInitState() {
  const apiKey = await figma.clientStorage.getAsync(STORAGE_KEY_API);
  figma.ui.postMessage({ type: 'init', hasApiKey: Boolean(apiKey) });
}

async function saveApiKey(apiKey: string) {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    await figma.clientStorage.deleteAsync(STORAGE_KEY_API);
    figma.ui.postMessage({ type: 'api-key-saved', hasApiKey: false, message: 'API key cleared.' });
    return;
  }
  await figma.clientStorage.setAsync(STORAGE_KEY_API, trimmed);
  figma.ui.postMessage({ type: 'api-key-saved', hasApiKey: true, message: 'API key saved.' });
}

async function getApiKey(): Promise<string | null> {
  const key = await figma.clientStorage.getAsync(STORAGE_KEY_API);
  return key ? String(key) : null;
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
      return { paintStyles, textStyles };
    }

    case 'notify': {
      figma.notify(String(input.message || ''), {
        timeout: typeof input.timeout === 'number' ? input.timeout : 3000,
        error: input.error === true,
      });
      return { notified: true };
    }

    default:
      return { error: 'Unknown tool: ' + name };
  }
}

// ─── Message Handler ──────────────────────────────────────────────────────────
figma.ui.onmessage = async (msg: { type: string; [key: string]: unknown }) => {
  try {
    if (msg.type === 'request-init') {
      await postInitState();
      return;
    }

    if (msg.type === 'save-api-key') {
      await saveApiKey(String(msg.apiKey));
      return;
    }

    if (msg.type === 'get-api-key') {
      const key = await getApiKey();
      figma.ui.postMessage({ type: 'api-key-value', apiKey: key || '' });
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

postInitState();
