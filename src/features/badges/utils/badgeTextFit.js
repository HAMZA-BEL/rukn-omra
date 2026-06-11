const trimToWidth = (ctx, value, maxWidth, suffix = "") => {
  let text = String(value || "").trim();
  if (!text || ctx.measureText(`${text}${suffix}`).width <= maxWidth) return `${text}${suffix}`;
  while (text && ctx.measureText(`${text}${suffix}`).width > maxWidth) {
    text = text.slice(0, -1).trim();
  }
  return text ? `${text}${suffix}` : "";
};

const splitLongWord = (ctx, word, maxWidth) => {
  const chunks = [];
  let current = "";
  String(word || "").split("").forEach((char) => {
    const next = `${current}${char}`;
    if (!current || ctx.measureText(next).width <= maxWidth) {
      current = next;
      return;
    }
    chunks.push(current);
    current = char;
  });
  if (current) chunks.push(current);
  return chunks;
};

export function wrapTextToLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let current = "";
  words.forEach((rawWord) => {
    const wordParts = ctx.measureText(rawWord).width > maxWidth
      ? splitLongWord(ctx, rawWord, maxWidth)
      : [rawWord];
    wordParts.forEach((word) => {
      if (lines.length >= maxLines) return;
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !current) {
        current = next;
        return;
      }
      lines.push(current);
      current = word;
    });
  });
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const clipped = lines.slice(0, maxLines);
  let last = clipped[clipped.length - 1] || "";
  clipped[clipped.length - 1] = trimToWidth(ctx, last, maxWidth, "…");
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
  lines = wrapTextToLines(ctx, text, box.width - 6, maxLines).map((line, index, allLines) => (
    index === allLines.length - 1
      ? trimToWidth(ctx, line, box.width - 6, allLines.length > maxLines ? "…" : "")
      : trimToWidth(ctx, line, box.width - 6)
  )).slice(0, maxLines);
  return { fontSize: minFontSize, lines, lineHeight: minFontSize * 1.2 };
}
