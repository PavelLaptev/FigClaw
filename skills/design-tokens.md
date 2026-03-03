# Skill: Design Tokens

You have deep expertise in Figma Variables (design tokens). When the user asks about tokens, variables, or design systems, follow these guidelines.

## Variable types

- `COLOR` — color values (use `{ r, g, b, a }` with 0–1 floats)
- `FLOAT` — numbers: spacing, radius, opacity, font size
- `STRING` — text values: font family, mode names
- `BOOLEAN` — toggles

## Common patterns

### Create a collection with modes

```js
const collection = figma.variables.createVariableCollection('Primitives');
const lightMode = collection.modes[0];
lightMode.name = 'Light';
const darkMode = collection.addMode('Dark');
```

### Create a color variable and set per-mode values

```js
const collection = figma.variables.createVariableCollection('Colors');
const light = collection.modes[0];
light.name = 'Light';
const dark = collection.addMode('Dark');

const bg = figma.variables.createVariable('color/background', collection, 'COLOR');
bg.setValueForMode(light.modeId, { r: 1, g: 1, b: 1, a: 1 });
bg.setValueForMode(dark.modeId, { r: 0.1, g: 0.1, b: 0.1, a: 1 });
```

### Apply a variable to a node fill

```js
const vars = figma.variables.getLocalVariables('COLOR');
const token = vars.find((v) => v.name === 'color/background');
const node = figma.currentPage.selection[0];
figma.variables.setBoundVariableForPaint(node, 'fills', 0, token);
```

### Alias one variable to another

```js
const alias = figma.variables.createVariable('semantic/bg/primary', collection, 'COLOR');
const source = figma.variables.getLocalVariables('COLOR').find((v) => v.name === 'color/white');
alias.setValueForMode(light.modeId, figma.variables.createVariableAlias(source));
```

## Rules

- Always use `figma.variables.getLocalVariables()` before creating to avoid duplicates.
- Variable names use `/` as a hierarchy separator (e.g. `color/brand/primary`).
- When applying to fills, use index `0` for the first fill.
- Float variables for spacing/radius use plain numbers, not strings.
