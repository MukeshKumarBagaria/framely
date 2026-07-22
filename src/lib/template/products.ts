// Platform product presets — PRD FR-PRD-1 / Technical Plan §7 `products` table.
// FR-PRD-1 (P0): "Seed frame presets: 8×12, 12×18, A4, 12×12, 16×24
// (portrait+landscape variants). One-click add to org." These are the sizes
// offered by the workspace's "Resize" control (§ template resizing).
export type Product = {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  safeMm: number;
  dpi: number;
  orientation: "portrait" | "landscape" | "square";
};

export const products: Record<string, Product> = {
  "frame-8x12-portrait": {
    id: "frame-8x12-portrait",
    name: '8×12" Portrait Frame',
    widthMm: 203.2,
    heightMm: 304.8,
    bleedMm: 3,
    safeMm: 5,
    dpi: 300,
    orientation: "portrait",
  },
  "frame-12x18-portrait": {
    id: "frame-12x18-portrait",
    name: '12×18" Portrait Frame',
    widthMm: 304.8,
    heightMm: 457.2,
    bleedMm: 3,
    safeMm: 5,
    dpi: 300,
    orientation: "portrait",
  },
  "frame-a4-portrait": {
    id: "frame-a4-portrait",
    name: "A4 Portrait Frame",
    widthMm: 210,
    heightMm: 297,
    bleedMm: 3,
    safeMm: 5,
    dpi: 300,
    orientation: "portrait",
  },
  "frame-12x12-square": {
    id: "frame-12x12-square",
    name: '12×12" Square Frame',
    widthMm: 304.8,
    heightMm: 304.8,
    bleedMm: 3,
    safeMm: 5,
    dpi: 300,
    orientation: "square",
  },
  "frame-16x24-portrait": {
    id: "frame-16x24-portrait",
    name: '16×24" Portrait Frame',
    widthMm: 406.4,
    heightMm: 609.6,
    bleedMm: 3,
    safeMm: 5,
    dpi: 300,
    orientation: "portrait",
  },
};
