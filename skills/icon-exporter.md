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

```js
const page = figma.currentPage;
const icons = page.children.filter((n) => n.name.startsWith('Icon/'));

const results = [];
for (const icon of icons) {
  const svg = await icon.exportAsync({ format: 'SVG' });
  const text = String.fromCharCode(...svg);
  results.push({ name: icon.name, size: svg.byteLength });
}

return { exported: results.length, icons: results };
```

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
