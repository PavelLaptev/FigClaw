# Skill: Padding Maker

You are an expert at adding padding inside Figma frames and sections. When the user asks to add padding, spacing, or "hug" content inside a frame, follow these patterns.

## What this does

- Calculates the bounding box of all children in a frame or section
- Repositions all children outward to create uniform padding space
- Resizes the frame/section to accommodate the new padding
- Works with multiple selected frames at once

## Core logic

```js
const paddingAmount = 16; // default, or use value from user
const selection = figma.currentPage.selection;

if (selection.length === 0) {
  figma.notify('Please select a frame or section to add padding to.');
  figma.closePlugin();
  return;
}

const processedNodes = [];

for (const node of selection) {
  if (node.type !== 'FRAME' && node.type !== 'SECTION') {
    figma.notify(`"${node.name}" is not a frame or section. Skipping.`);
    continue;
  }

  const children = [...node.children];

  if (children.length === 0) {
    figma.notify(`"${node.name}" has no children. Skipping.`);
    continue;
  }

  // Calculate bounding box of all children
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  for (const child of children) {
    minX = Math.min(minX, child.x);
    minY = Math.min(minY, child.y);
    maxX = Math.max(maxX, child.x + child.width);
    maxY = Math.max(maxY, child.y + child.height);
  }

  // Shift children to create padding
  const offsetX = paddingAmount - minX;
  const offsetY = paddingAmount - minY;

  for (const child of children) {
    child.x += offsetX;
    child.y += offsetY;
  }

  // Resize frame to fit children + padding on all sides
  const newWidth = maxX - minX + paddingAmount * 2;
  const newHeight = maxY - minY + paddingAmount * 2;

  if (node.type === 'SECTION') {
    node.resizeWithoutConstraints(newWidth, newHeight);
  } else {
    node.resize(newWidth, newHeight);
  }

  processedNodes.push(node);
}

if (processedNodes.length > 0) {
  figma.notify(`Added ${paddingAmount}px padding to ${processedNodes.length} frame(s).`);
}
```

## Variant: different padding per side

If the user wants asymmetric padding (e.g. top/bottom vs left/right):

```js
const paddingX = 24; // left + right
const paddingY = 16; // top + bottom

const offsetX = paddingX - minX;
const offsetY = paddingY - minY;

for (const child of children) {
  child.x += offsetX;
  child.y += offsetY;
}

const newWidth = maxX - minX + paddingX * 2;
const newHeight = maxY - minY + paddingY * 2;
```

## Rules

- Only operate on `FRAME` and `SECTION` nodes — skip anything else with a notify.
- Use `resizeWithoutConstraints` for sections, `resize` for frames.
- Always check that the frame has children before processing.
- The padding amount must be a non-negative number; default to `16` if not specified.
- After processing, notify the user with how many frames were updated.
