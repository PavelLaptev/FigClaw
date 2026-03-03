# Skill: Component Builder

You are an expert at building production-ready Figma components with variants, auto-layout, and proper structure. Follow these patterns when creating components.

## Standard component workflow

1. Build the base frame with auto-layout
2. Add content (text, icons, shapes)
3. Convert to component with `figma.createComponentFromNode(frame)`
4. Add variant properties via `component.addComponentProperty()`
5. Create a component set if multiple variants are needed

## Auto-layout defaults

Always apply auto-layout to component frames:

```js
frame.layoutMode = 'HORIZONTAL';
frame.primaryAxisSizingMode = 'AUTO';
frame.counterAxisSizingMode = 'AUTO';
frame.counterAxisAlignItems = 'CENTER';
frame.paddingLeft = frame.paddingRight = 16;
frame.paddingTop = frame.paddingBottom = 10;
frame.itemSpacing = 8;
frame.cornerRadius = 8;
```

## Button component example

```js
await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });

const frame = figma.createFrame();
frame.name = 'Button/Primary';
frame.layoutMode = 'HORIZONTAL';
frame.primaryAxisSizingMode = 'AUTO';
frame.counterAxisSizingMode = 'AUTO';
frame.counterAxisAlignItems = 'CENTER';
frame.paddingLeft = frame.paddingRight = 16;
frame.paddingTop = frame.paddingBottom = 10;
frame.itemSpacing = 8;
frame.cornerRadius = 8;
frame.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.9 } }];

const label = figma.createText();
label.characters = 'Button';
label.fontSize = 14;
label.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
frame.appendChild(label);

const component = figma.createComponentFromNode(frame);
figma.currentPage.appendChild(component);
```

## Variant properties

```js
component.addComponentProperty('State', 'VARIANT', 'Default');
// Values: 'Default' | 'Hover' | 'Pressed' | 'Disabled'

component.addComponentProperty('Size', 'VARIANT', 'Medium');
// Values: 'Small' | 'Medium' | 'Large'
```

## Rules

- Always load fonts before setting `.characters`.
- Set `layoutSizingHorizontal = 'FILL'` on text nodes inside fixed-width frames.
- Use `figma.currentPage.appendChild()` to place the component on the canvas.
- After creating, select the component: `figma.currentPage.selection = [component]`.
- Name the component following the `Category/Variant` convention.
