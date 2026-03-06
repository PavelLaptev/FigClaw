// ─── Tool definitions ─────────────────────────────────────────────────────────
// Shared between the plugin sandbox (code.ts) and the UI iframe (UI.svelte).
// Each entry is sent to the Claude API as part of the `tools` array, and the
// tool names are also used as the switch keys in executeTool() (code.ts).

export const TOOLS = [
  {
    name: 'fetch_docs',
    description:
      'Fetches a Figma Plugin API documentation page and returns its content. ' +
      'Use this when you are unsure about an API type, property, or method signature. ' +
      'For common operations (shapes, fills, text, auto-layout, selection) you already know the API — skip this tool. ' +
      'HOW TO USE: ' +
      '1) To find a slug, fetch the index: https://raw.githubusercontent.com/PavelLaptev/figma-api-snapshot/master/out/index.json ' +
      '2) Then fetch the page: https://raw.githubusercontent.com/PavelLaptev/figma-api-snapshot/master/out/raw/plugin-api/{slug}.json ' +
      'Common slug patterns: node types → docs__plugins__api__FrameNode | figma methods → docs__plugins__api__properties__figma-createframe | node props → docs__plugins__api__properties__nodes-fills | data types → docs__plugins__api__Paint',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description:
            'URL to fetch. Use the snapshot repo URLs described above, e.g. https://raw.githubusercontent.com/PavelLaptev/figma-api-snapshot/master/out/raw/plugin-api/docs__plugins__api__FrameNode.json',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'run_figma_code',
    description:
      'Executes arbitrary JavaScript in the Figma plugin context. ' +
      'The code runs with full access to the `figma` global — all Plugin API methods are available. ' +
      'Top-level `await` is supported (the code is wrapped in an async function). ' +
      'Before calling this tool, ALWAYS show the code you are about to run in a text message so the user can see it. ' +
      'IMPORTANT: To read a value back as the tool result, the code MUST end with an explicit `return` statement ' +
      '(e.g. `return figma.currentPage.name`). Without a `return`, the result will always be `{ ok: true }` ' +
      'regardless of what the code evaluates — never assume a value from the code unless it is explicitly returned.',
    input_schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Valid JavaScript to execute. Has access to the `figma` global.',
        },
        description: {
          type: 'string',
          description: 'One-line summary of what this code does (shown in the UI).',
        },
      },
      required: ['code', 'description'],
    },
  },
  {
    name: 'get_selection',
    description: 'Returns the currently selected nodes in Figma with all their properties.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_page_nodes',
    description: 'Returns nodes on the current page up to a given depth.',
    input_schema: {
      type: 'object',
      properties: {
        depth: { type: 'number', description: 'How many levels deep to traverse (default 2)' },
      },
      required: [],
    },
  },
  {
    name: 'get_node_by_id',
    description: 'Returns full properties of a specific node by its Figma ID.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Figma node ID' } },
      required: ['id'],
    },
  },
  {
    name: 'get_styles',
    description: 'Returns all local paint, text, effect, and grid styles defined in the document.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_variables',
    description:
      'Returns all local variable collections and their variables. ' +
      'Each collection includes its modes and the full list of variables with resolved values per mode. ' +
      'Use this before reading or writing design tokens / variables.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_components',
    description:
      'Returns all local components and component sets (variant groups) on the current page. ' +
      'Includes name, id, description, and component properties.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_pages',
    description: 'Returns all pages in the document with their id, name, and top-level node count.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'notify',
    description: 'Shows a toast notification inside Figma.',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        timeout: { type: 'number' },
        error: { type: 'boolean' },
      },
      required: ['message'],
    },
  },
] as const;

export type ToolName = (typeof TOOLS)[number]['name'];
