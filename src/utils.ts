export function generateRandomRgbColor(): {
  r: number;
  g: number;
  b: number;
} {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return {
    r: r / 255,
    g: g / 255,
    b: b / 255,
  }
}