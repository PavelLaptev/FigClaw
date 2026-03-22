# Skill: Favicon Exporter

You are an expert at setting up favicon export configurations in Figma. When the user asks to create favicon assets, export favicons, or set up a favicon from a selected icon, follow these patterns.

## What this does

- Takes the currently selected node as the source icon
- Adds the correct export settings (sizes + formats) directly on the node
- Shows the user an HTML `<head>` snippet they can copy-paste into their website
- The user then manually exports the files from Figma's Export panel (File → Export or the Export section in the right panel)

## Required favicon exports

File names use the node's name as the prefix (e.g. node `fav` → `fav-16x16.png`).

| File name pattern    | Format | Size                       |
| -------------------- | ------ | -------------------------- |
| `<name>.svg`         | SVG    | Vector (scalable)          |
| `<name>-16x16.png`   | PNG    | 16×16                      |
| `<name>-32x32.png`   | PNG    | 32×32                      |
| `<name>-180x180.png` | PNG    | 180×180 (Apple touch icon) |
| `<name>-192x192.png` | PNG    | 192×192                    |
| `<name>-512x512.png` | PNG    | 512×512                    |

## Setting export settings on the selected node

Use `exportSettings` to configure all required sizes at once. Figma uses `constraint` with `type: 'WIDTH'` or `type: 'HEIGHT'` to scale exports.

```js
const node = figma.currentPage.selection[0];
if (!node) return { error: 'No node selected. Please select the icon first.' };

const name = node.name.toLowerCase().replace(/\s+/g, '-');

node.exportSettings = [
  { format: 'SVG' },
  { format: 'PNG', constraint: { type: 'WIDTH', value: 16 }, suffix: '-16x16' },
  { format: 'PNG', constraint: { type: 'WIDTH', value: 32 }, suffix: '-32x32' },
  { format: 'PNG', constraint: { type: 'WIDTH', value: 180 }, suffix: '-180x180' },
  { format: 'PNG', constraint: { type: 'WIDTH', value: 192 }, suffix: '-192x192' },
  { format: 'PNG', constraint: { type: 'WIDTH', value: 512 }, suffix: '-512x512' },
];

return {
  node: node.name,
  name: name,
  exportSettingsAdded: node.exportSettings.length,
};
```

After running this code:

1. Tell the user the export settings have been added to the selected node.
2. Tell them to open the **Export** panel in Figma's right sidebar and click **Export `<node name>`** to download all files.
3. Use the returned `name` value when generating the HTML snippet — it is the node's name lowercased with spaces as dashes.

## HTML snippet to show the user

After setting up the export settings, always show this snippet for the user to copy into their `<head>`.

**Use the actual node name** (lowercased, spaces replaced with `-`) as both the folder name and the filename prefix. For example, if the node is named `fav`, the paths become `/fav/fav-16x16.png`, `/fav/fav-32x32.png`, etc.

```html
<link rel="icon" type="image/svg+xml" href="/<name>/<name>.svg" />
<link rel="icon" type="image/png" sizes="16x16" href="/<name>/<name>-16x16.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/<name>/<name>-32x32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/<name>/<name>-180x180.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/<name>/<name>-192x192.png" />
<link rel="icon" type="image/png" sizes="512x512" href="/<name>/<name>-512x512.png" />
```

Replace `<name>` with the actual node name. For a node named `fav` this becomes:

```html
<link rel="icon" type="image/svg+xml" href="/fav/fav.svg" />
<link rel="icon" type="image/png" sizes="16x16" href="/fav/fav-16x16.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/fav/fav-32x32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/fav/fav-180x180.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/fav/fav-192x192.png" />
<link rel="icon" type="image/png" sizes="512x512" href="/fav/fav-512x512.png" />
```

If the user also wants a `manifest.json` for PWA support, show this as well:

```json
{
  "name": "Your App Name",
  "short_name": "App",
  "icons": [
    { "src": "/<name>/<name>-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/<name>/<name>-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
}
```

And add this to `<head>`:

```html
<link rel="manifest" href="/manifest.json" />
```

## Rules

- Always check that `figma.currentPage.selection.length > 0` before applying export settings. If nothing is selected, return an error message asking the user to select the icon first.
- Do not resize or modify the original node — only add `exportSettings`.
- Use `constraint: { type: 'WIDTH', value: N }` so the icon scales proportionally from its original size.
- Figma cannot export `.ico` natively. If the user needs a `.ico` file, remind them to convert `<name>-32x32.png` using an external tool like [favicon.io](https://favicon.io) or [realfavicongenerator.net](https://realfavicongenerator.net).
- Always display the HTML snippet after running the code so the user can copy it immediately.
- In the HTML snippet, always substitute the real node name for `<name>` — never show a placeholder, always show the actual value.
