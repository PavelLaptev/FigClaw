# Skill: Naming Conventions

When creating or renaming layers, components, variables, and styles, always follow these conventions unless the user specifies otherwise.

## Layers

- Use descriptive, lowercase kebab-case: `card/header`, `button/primary/default`
- Group related nodes by prefixing with a category and `/`: `icon/arrow-right`
- Avoid generic names like `Frame 1`, `Rectangle`, `Group`
- Auto-layout frames: name them after their content role, e.g. `layout/sidebar`, `list/item`

## Components

- Component names use Title Case with `/` for grouping: `Button/Primary`, `Input/Text/Default`
- Variant properties use Title Case: `State`, `Size`, `Variant`
- Variant values use Title Case: `Default`, `Hover`, `Disabled`, `Small`, `Large`

## Variables & styles

- Variables: `category/subcategory/name` in lowercase kebab-case
  - Colors: `color/brand/primary`, `color/neutral/100`
  - Spacing: `spacing/xs`, `spacing/md`, `spacing/2xl`
  - Radius: `radius/sm`, `radius/full`
  - Typography sizes: `font-size/body`, `font-size/heading-lg`
- Paint styles: `Color/Brand/Primary`
- Text styles: `Body/Regular`, `Heading/Large/Bold`
- Effect styles: `Shadow/Card`, `Shadow/Modal`

## Pages

- Page names are Title Case: `Design`, `Prototype`, `Components`, `Icons`, `Archive`

## Rules

- Always rename any auto-generated names (Frame 1, Rectangle 2, etc.) before finishing.
- When creating components, set `.name` on the component, not just the wrapper frame.
- Apply the naming convention when duplicating or cloning existing nodes too.
