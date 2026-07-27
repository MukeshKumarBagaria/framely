const fs = require("fs");

function generateMergedSlots(slots) {
  const pairs = [];
  const used = new Set();
  for (let i = 0; i < slots.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < slots.length; j++) {
      if (used.has(j)) continue;
      const a = slots[i];
      const b = slots[j];
      const sameY = Math.abs(a.y - b.y) < 20 && Math.abs(a.h - b.h) < 20;
      const adjacentX = Math.abs((a.x + a.w) - b.x) < 200 || Math.abs((b.x + b.w) - a.x) < 200;
      const sameX = Math.abs(a.x - b.x) < 20 && Math.abs(a.w - b.w) < 20;
      const adjacentY = Math.abs((a.y + a.h) - b.y) < 200 || Math.abs((b.y + b.h) - a.y) < 200;

      if ((sameY && adjacentX) || (sameX && adjacentY)) {
        pairs.push([i, j]);
        used.add(i);
        used.add(j);
        break;
      }
    }
  }

  if (pairs.length === 0) return slots;

  const result = [];
  for (const [i, j] of pairs) {
    const a = slots[i];
    const b = slots[j];
    const minX = Math.min(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxX = Math.max(a.x + a.w, b.x + b.w);
    const maxY = Math.max(a.y + a.h, b.y + b.h);
    result.push({
      ...a,
      id: `${a.id}_${b.id}`,
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    });
  }
  for (let i = 0; i < slots.length; i++) {
    if (!used.has(i)) result.push(slots[i]);
  }
  return result;
}

const doc8 = JSON.parse(fs.readFileSync("./src/data/templates/PF-000008/template.json", "utf-8"));
let slots8 = doc8.layers.filter(l => l.type === "photoSlot");
console.log("08 start:", slots8.length);
slots8 = generateMergedSlots(slots8);
console.log("08 merge 1:", slots8.length);
slots8 = generateMergedSlots(slots8);
console.log("08 merge 2:", slots8.length);

const doc3 = JSON.parse(fs.readFileSync("./src/data/templates/PF-000003/template.json", "utf-8"));
let slots3 = doc3.layers.filter(l => l.type === "photoSlot");
console.log("03 start:", slots3.length);
slots3 = generateMergedSlots(slots3);
console.log("03 merge 1:", slots3.length);

const doc1 = JSON.parse(fs.readFileSync("./src/data/templates/PF-000001/template.json", "utf-8"));
let slots1 = doc1.layers.filter(l => l.type === "photoSlot");
console.log("01 start:", slots1.length);
slots1 = generateMergedSlots(slots1);
console.log("01 merge 1:", slots1.length);
