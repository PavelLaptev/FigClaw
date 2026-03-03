# Skill: Accessibility

When creating or auditing Figma designs, apply accessibility best practices. This skill guides you on contrast, structure, and annotations.

## Color contrast

WCAG 2.1 minimum requirements:

- Normal text (< 18pt or < 14pt bold): **4.5:1** contrast ratio
- Large text (≥ 18pt or ≥ 14pt bold): **3:1**
- UI components and graphical objects: **3:1**
- AAA target for normal text: **7:1**

When the user asks to check contrast, calculate the relative luminance of both colors and report the ratio. Use the formula:

```
L = 0.2126 * R + 0.7152 * G + 0.0722 * B
(where R, G, B are linearized: c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4)
ratio = (L1 + 0.05) / (L2 + 0.05)  where L1 > L2
```

## Focus order & reading order

- Layer order in Figma = reading order for screen readers (bottom of the layers panel = first).
- Use descriptive layer names — they become accessible names.
- Group related elements so they are announced together.

## Annotations

When adding accessibility annotations, create a frame named `A11y Annotations` on top of the design with:

- Red outlines for focus indicators
- Labels for roles: `button`, `input`, `link`, `heading`, `image`, `list`
- Tab order numbers in circles

```js
// Example: add a focus ring annotation
const ring = figma.createRectangle();
ring.name = 'focus-ring';
ring.fills = [];
ring.strokes = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
ring.strokeWeight = 2;
ring.dashPattern = [4, 4];
// Position it over the target node
ring.x = targetNode.x - 2;
ring.y = targetNode.y - 2;
ring.resize(targetNode.width + 4, targetNode.height + 4);
```

## Text sizing

- Minimum body text: **16px** for web, **14px** for dense UI
- Line height: **1.5× font size** for body text
- Don't use text opacity below **0.6** for readable content

## Rules

- Always flag contrast issues before finishing any color-related task.
- Never convey information by color alone — pair with shape, pattern, or label.
- When setting `opacity`, note that it affects the entire node including contrast.
