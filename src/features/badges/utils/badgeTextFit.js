export function wrapTextToLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
      return;
    }
    lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const clipped = lines.slice(0, maxLines);
  let last = clipped[clipped.length - 1] || "";
  while (last && ctx.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1).trim();
  }
  clipped[clipped.length - 1] = `${last}…`;
  return clipped;
}

export function fitTextBox(ctx, text, box, {
  fontSize = 12,
  fontWeight = 700,
  fontFamily = "Arial",
  minFontSize = 7,
  maxLines = 1,
} = {}) {
  let size = Number(fontSize) || 12;
  let lines = [];
  while (size >= minFontSize) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    lines = wrapTextToLines(ctx, text, box.width - 6, maxLines);
    const lineHeight = size * 1.2;
    if (lines.length * lineHeight <= box.height - 4 && lines.every((line) => ctx.measureText(line).width <= box.width - 6)) {
      return { fontSize: size, lines, lineHeight };
    }
    size -= 1;
  }
  ctx.font = `${fontWeight} ${minFontSize}px ${fontFamily}`;
  lines = wrapTextToLines(ctx, text, box.width - 6, maxLines);
  return { fontSize: minFontSize, lines, lineHeight: minFontSize * 1.2 };
}
