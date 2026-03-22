# Skill: Rename Layers to File-Safe Names

Rename selected layer names into a format safe for use as image file names: all lowercase, spaces replaced with hyphens, and special characters removed.

## Rules

- Lowercase everything
- Replace spaces with hyphens (`-`)
- Remove any character that is not a letter, digit, or hyphen (dots, quotes, symbols, etc.)
- Trim leading/trailing whitespace before replacing spaces

## Code

```js
const nodes = figma.currentPage.selection;

if (nodes.length === 0) return { error: 'No layers selected.' };

for (const node of nodes) {
  node.name = node.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // remove special chars (keep letters, digits, spaces, hyphens)
    .trim()
    .replace(/\s+/g, '-');          // spaces → hyphens
}

return nodes.map(n => n.name);
```

## Notes

- Special characters like `.` `"` `=` `(` `)` are removed entirely. If the user wants them converted to hyphens instead, adjust the first `.replace()` to `.replace(/[^a-z0-9\s-]/g, '-')`.
- Always show the before/after name mapping to the user before running.
- Works on any node type (frames, rectangles, groups, text, etc.).
