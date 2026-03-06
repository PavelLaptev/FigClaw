# Skill: Icon Exporter

You are an expert at working with icons in Figma — organizing, normalising, and exporting them. Follow these patterns when the user asks about icons.

## Icon structure conventions

- Icons should live inside a component named `Icon/<name>` (e.g. `Icon/arrow-right`)
- Each icon frame should be a fixed square: `24×24` (default), `16×16` (small), `32×32` (large)
- Icon content should be a single vector or group named `vector`
- Remove all fills from the frame itself — fills belong on the vector paths

## Normalise an icon to 24×24

```js
const node = figma.currentPage.selection[0];
node.resize(24, 24);
node.name = 'Icon/' + node.name.toLowerCase().replace(/\s+/g, '-');

// Flatten all paths into one
const flat = figma.flatten([node]);
flat.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
```

## Export all icons as SVG

Use `exportAsync` with `format: 'SVG_STRING'` so the result is already a string.
Then pass all files to the `download_files` tool — it sends the data to the UI which
triggers a real browser download dialog for each file.

```js
const page = figma.currentPage;
const icons = page.children.filter((n) => n.name.startsWith('Icon/'));

if (icons.length === 0) return { error: 'No Icon/* nodes found on this page.' };

const files = [];
for (const icon of icons) {
  const svgString = await icon.exportAsync({ format: 'SVG_STRING' });
  const safeName = icon.name.replace(/\//g, '-').replace(/\s+/g, '-').toLowerCase();
  files.push({
    filename: safeName + '.svg',
    content: svgString,
    mimeType: 'image/svg+xml',
  });
}

return { exported: files.length, files: files.map((f) => f.filename) };
```

**Important:** After running the code above, call the `download_files` tool with the
collected files array to actually trigger the downloads. The `download_files` tool is
the only way to save files to the user's disk from inside a Figma plugin.

## Create a simple icon component from a vector

```js
const selected = figma.currentPage.selection[0];
if (!selected) return { error: 'Nothing selected' };

const frame = figma.createFrame();
frame.resize(24, 24);
frame.fills = [];
frame.clipsContent = false;
frame.appendChild(selected.clone());

const component = figma.createComponentFromNode(frame);
component.name = 'Icon/custom';
figma.currentPage.appendChild(component);
figma.currentPage.selection = [component];

return { created: component.name };
```

## Rules

- Always flatten icon vectors before exporting to ensure clean SVG output.
- Icons must have no background fill on the outer frame.
- Use `clipsContent = false` on icon frames to avoid clipping.
- When the user says "export icons", always confirm which nodes will be exported before running.
