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

    case 'create_frame': {
      const frame = figma.createFrame();
      frame.name = String(input.name || 'Frame');
      frame.resize(Number(input.width || 100), Number(input.height || 100));
      if (typeof input.x === 'number') frame.x = input.x;
      if (typeof input.y === 'number') frame.y = input.y;
      if (input.color && typeof input.color === 'object') {
        const c = input.color as { r: number; g: number; b: number };
        frame.fills = [{ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b } }];
      } else {
        frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      }
      figma.currentPage.appendChild(frame);
      figma.currentPage.selection = [frame];
      figma.viewport.scrollAndZoomIntoView([frame]);
      return { id: frame.id, name: frame.name };
    }

    case 'create_rectangle': {
      const rect = figma.createRectangle();
      rect.name = String(input.name || 'Rectangle');
      rect.resize(Number(input.width || 100), Number(input.height || 100));
      if (typeof input.x === 'number') rect.x = input.x;
      if (typeof input.y === 'number') rect.y = input.y;
      if (typeof input.cornerRadius === 'number') rect.cornerRadius = input.cornerRadius;
      if (input.color && typeof input.color === 'object') {
        const c = input.color as { r: number; g: number; b: number; a?: number };
        rect.fills = [
          {
            type: 'SOLID',
            color: { r: c.r, g: c.g, b: c.b },
            opacity: c.a !== undefined ? c.a : 1,
          },
        ];
      }
      figma.currentPage.appendChild(rect);
      figma.currentPage.selection = [rect];
      figma.viewport.scrollAndZoomIntoView([rect]);
      return { id: rect.id, name: rect.name };
    }

    case 'create_text': {
      const text = figma.createText();
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      text.name = String(input.name || 'Text');
      text.characters = String(input.content || '');
      if (typeof input.fontSize === 'number') text.fontSize = input.fontSize;
      if (typeof input.x === 'number') text.x = input.x;
      if (typeof input.y === 'number') text.y = input.y;
      if (input.color && typeof input.color === 'object') {
        const c = input.color as { r: number; g: number; b: number };
        text.fills = [{ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b } }];
      }
      figma.currentPage.appendChild(text);
      figma.currentPage.selection = [text];
      figma.viewport.scrollAndZoomIntoView([text]);
      return { id: text.id, name: text.name };
    }

    case 'update_node': {
      const node = resolveNodeById(String(input.id));
      if (!node) return { error: 'Node not found: ' + input.id };

      if (typeof input.name === 'string') node.name = input.name;
      if (typeof input.visible === 'boolean') node.visible = input.visible;
      if (typeof input.opacity === 'number' && 'opacity' in node)
        (node as BlendMixin).opacity = input.opacity;
      if (typeof input.x === 'number' && 'x' in node) (node as LayoutMixin).x = input.x;
      if (typeof input.y === 'number' && 'y' in node) (node as LayoutMixin).y = input.y;

      if (input.width !== undefined && input.height !== undefined && 'resize' in node) {
        (node as GeometryMixin & LayoutMixin & { resize(w: number, h: number): void }).resize(
          Number(input.width),
          Number(input.height)
        );
      }

      if (input.color && typeof input.color === 'object' && 'fills' in node) {
        const c = input.color as { r: number; g: number; b: number; a?: number };
        (node as GeometryMixin).fills = [
          {
            type: 'SOLID',
            color: { r: c.r, g: c.g, b: c.b },
            opacity: c.a !== undefined ? c.a : 1,
          },
        ];
      }

      if (typeof input.characters === 'string' && node.type === 'TEXT') {
        await figma.loadFontAsync((node as TextNode).fontName as FontName);
        (node as TextNode).characters = input.characters;
      }

      if (typeof input.fontSize === 'number' && node.type === 'TEXT') {
        await figma.loadFontAsync((node as TextNode).fontName as FontName);
        (node as TextNode).fontSize = input.fontSize;
      }

      if (typeof input.cornerRadius === 'number' && 'cornerRadius' in node) {
        (node as RectangleNode).cornerRadius = input.cornerRadius;
      }

      return { id: node.id, name: node.name, updated: true };
    }

    case 'delete_node': {
      const node = resolveNodeById(String(input.id));
      if (!node) return { error: 'Node not found: ' + input.id };
      const name = node.name;
      node.remove();
      return { deleted: true, name };
    }

    case 'move_node_into': {
      const node = resolveNodeById(String(input.node_id));
      const parent = resolveNodeById(String(input.parent_id));
      if (!node) return { error: 'Node not found: ' + input.node_id };
      if (!parent) return { error: 'Parent not found: ' + input.parent_id };
      if (!('appendChild' in parent)) return { error: 'Parent cannot contain children.' };
      (parent as ChildrenMixin & { appendChild(n: SceneNode): void }).appendChild(node);
      return { moved: true, nodeId: node.id, parentId: parent.id };
    }

    case 'select_nodes': {
      const ids = Array.isArray(input.ids) ? input.ids : [input.ids];
      const nodes = ids
        .map((id: unknown) => resolveNodeById(String(id)))
        .filter(Boolean) as SceneNode[];
      figma.currentPage.selection = nodes;
      if (nodes.length > 0) figma.viewport.scrollAndZoomIntoView(nodes);
      return { selected: nodes.map((n) => ({ id: n.id, name: n.name })) };
    }

    case 'group_nodes': {
      const ids = Array.isArray(input.ids) ? input.ids : [input.ids];
      const nodes = ids
        .map((id: unknown) => resolveNodeById(String(id)))
        .filter(Boolean) as SceneNode[];
      if (nodes.length === 0) return { error: 'No valid nodes to group.' };
      const group = figma.group(nodes, figma.currentPage);
      if (typeof input.name === 'string') group.name = input.name;
      return { id: group.id, name: group.name };
    }

    case 'flatten_node': {
      const node = resolveNodeById(String(input.id));
      if (!node) return { error: 'Node not found: ' + input.id };
      const flat = figma.flatten([node]);
      return { id: flat.id, name: flat.name };
    }

    case 'duplicate_node': {
      const node = resolveNodeById(String(input.id));
      if (!node) return { error: 'Node not found: ' + input.id };
      const clone = node.clone();
      if (typeof input.x === 'number' && 'x' in clone) clone.x = input.x;
      if (typeof input.y === 'number' && 'y' in clone) clone.y = input.y;
      if (typeof input.name === 'string') clone.name = input.name;
      figma.currentPage.appendChild(clone);
      return { id: clone.id, name: clone.name };
    }

    case 'set_auto_layout': {
      const node = resolveNodeById(String(input.id));
      if (!node || node.type !== 'FRAME') return { error: 'Frame not found: ' + input.id };
      const frame = node as FrameNode;
      frame.layoutMode = (input.direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL') as
        | 'HORIZONTAL'
        | 'VERTICAL'
        | 'NONE';
      if (typeof input.gap === 'number') frame.itemSpacing = input.gap;
      if (typeof input.padding === 'number') {
        frame.paddingTop = input.padding;
        frame.paddingBottom = input.padding;
        frame.paddingLeft = input.padding;
        frame.paddingRight = input.padding;
      }
      if (typeof input.align === 'string') {
        frame.primaryAxisAlignItems = input.align.toUpperCase() as
          | 'MIN'
          | 'CENTER'
          | 'MAX'
          | 'SPACE_BETWEEN';
      }
      return { id: frame.id, layoutMode: frame.layoutMode };
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
