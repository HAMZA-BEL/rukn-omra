import { fetchBadgeTemplates } from "../services/badgeTemplatesApi";
import { badgePhonesFromProgram, normalizeBadgeNumber } from "./badgeTemplateMapping";
import { normalizeBadgeLayout } from "./badgeLayout";
import { drawBadgeBackgroundImage } from "./badgeBackground";
import { getBadgeTemplateImageUrl, getPilgrimPhotoUrl } from "./badgeStorage";
import { fitTextBox } from "./badgeTextFit";
import { BADGE_TEMPLATE_PRINT_DPI, DEFAULT_BADGE_TEMPLATE_PATH } from "./badgeDefaults";
import { getParticipantTerminology } from "../../../utils/participantTerminology";
import { getLocalizedAgencyName } from "../../../utils/agencyDisplay";

const mmToPt = (mm) => Number(mm || 0) * 72 / 25.4;
const sanitizeFile = (value) => String(value || "badge").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 90);
const clientName = (client = {}, program = {}) => [client.firstName, client.lastName].filter(Boolean).join(" ").trim()
  || client.name
  || getParticipantTerminology(program, "ar").singular;
const passportNumber = (client = {}) => client.passport?.number || client.passportNumber || "";
const BADGE_FONT_FAMILY = "\"Tajawal\", \"Cairo\", \"Noto Sans Arabic\", Arial, sans-serif";
const BADGE_FONT_SCALE_DIVISOR = 3.2;
const BADGE_JPEG_QUALITY = 0.98;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const waitForBadgeFonts = async () => {
  if (typeof document === "undefined" || !document.fonts?.ready) return;
  try {
    await document.fonts.ready;
  } catch {
    /* Font readiness is best-effort; canvas fallback fonts keep rendering safe. */
  }
};

const setHighQualitySmoothing = (ctx) => {
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
};

const loadImage = async (url) => {
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) return null;
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const drawCover = (ctx, image, x, y, width, height, mode = "cover") => {
  if (!image) return;
  const imageWidth = image.naturalWidth || image.width || 1;
  const imageHeight = image.naturalHeight || image.height || 1;
  setHighQualitySmoothing(ctx);
  if (mode === "contain") {
    const scale = Math.min(width / imageWidth, height / imageHeight);
    const drawnWidth = imageWidth * scale;
    const drawnHeight = imageHeight * scale;
    ctx.drawImage(image, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight);
    return;
  }
  const imageRatio = imageWidth / imageHeight;
  const boxRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = imageWidth;
  let sourceHeight = imageHeight;
  if (imageRatio > boxRatio) {
    sourceWidth = imageHeight * boxRatio;
    sourceX = (imageWidth - sourceWidth) / 2;
  } else if (imageRatio < boxRatio) {
    sourceHeight = imageWidth / boxRatio;
    sourceY = (imageHeight - sourceHeight) / 2;
  }
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
};

const roundedRectPath = (ctx, x, y, width, height, radius = 0) => {
  const safeRadius = clamp(Number(radius) || 0, 0, Math.min(width, height) / 2);
  if (!safeRadius) {
    ctx.rect(x, y, width, height);
    return;
  }
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
};

const drawDefaultBadgeBackground = (ctx, width, height) => {
  const splitY = height * 0.52;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, splitY);
  ctx.fillStyle = "#e8f0fa";
  ctx.fillRect(0, splitY, width, height - splitY);
  ctx.fillStyle = "rgba(212,175,55,.2)";
  ctx.strokeStyle = "rgba(212,175,55,.32)";
  ctx.lineWidth = Math.max(1, width * 0.0016);
  ctx.beginPath();
  roundedRectPath(ctx, width * 0.07, height * 0.05, width * 0.34, height * 0.07, height * 0.035);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(15,23,42,.08)";
  ctx.strokeStyle = "rgba(15,23,42,.12)";
  ctx.beginPath();
  roundedRectPath(ctx, width * 0.75, height * 0.05, width * 0.18, height * 0.11, height * 0.015);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.strokeStyle = "rgba(15,23,42,.1)";
  ctx.beginPath();
  roundedRectPath(ctx, width * 0.08, height * 0.79, width * 0.84, height * 0.14, height * 0.02);
  ctx.fill();
  ctx.stroke();
};

const createBadgeRenderAssets = async (template = {}) => {
  const widthMm = normalizeBadgeNumber(template.widthMm, 90) || 90;
  const heightMm = normalizeBadgeNumber(template.heightMm, 140) || 140;
  const scale = BADGE_TEMPLATE_PRINT_DPI / 25.4;
  const pixelWidth = Math.round(widthMm * scale);
  const pixelHeight = Math.round(heightMm * scale);
  const layout = normalizeBadgeLayout(template.layout);
  const visibleFields = layout.fields.filter((item) => item.visible !== false);
  const useDefaultDesign = template.templatePath === DEFAULT_BADGE_TEMPLATE_PATH;
  const templateUrl = useDefaultDesign ? "" : await getBadgeTemplateImageUrl(template.templatePath);
  const background = await loadImage(templateUrl);
  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = pixelWidth;
  baseCanvas.height = pixelHeight;
  const baseCtx = baseCanvas.getContext("2d");
  if (!baseCtx) throw new Error("badge-canvas-unavailable");
  setHighQualitySmoothing(baseCtx);
  baseCtx.fillStyle = "#ffffff";
  baseCtx.fillRect(0, 0, pixelWidth, pixelHeight);
  if (background) {
    drawBadgeBackgroundImage({
      ctx: baseCtx,
      image: background,
      canvasWidth: pixelWidth,
      canvasHeight: pixelHeight,
      background: layout.background,
    });
  } else if (useDefaultDesign) {
    drawDefaultBadgeBackground(baseCtx, pixelWidth, pixelHeight);
  }

  return {
    widthMm,
    heightMm,
    scale,
    pixelWidth,
    pixelHeight,
    widthPt: mmToPt(widthMm),
    heightPt: mmToPt(heightMm),
    visibleFields,
    background,
    baseCanvas,
  };
};

const dataForField = ({ field, client, program, agency, fileNumber, lang }) => {
  const phones = badgePhonesFromProgram(program);
  const map = {
    fullName: clientName(client, program),
    passportNumber: passportNumber(client),
    primaryPhone: phones[0] || "",
    extraPhone: phones[1] || phones[2] || "",
    hotelMecca: client?.hotelMecca || client?.hotel_mecca || program?.hotelMecca || "",
    hotelMadina: client?.hotelMadina || client?.hotel_madina || program?.hotelMadina || "",
    programName: program?.name || "",
    badgeNote: program?.badgeNote || "",
    agencyName: getLocalizedAgencyName(agency, lang),
    fileNumber: fileNumber || "",
  };
  return map[field.key] || "";
};

const getTemplateForProgram = async ({ agencyId, program }) => {
  const { data, error } = await fetchBadgeTemplates({ agencyId });
  if (error) throw error;
  const templates = data || [];
  return templates.find((template) => template.id === program?.badgeTemplateId)
    || templates.find((template) => template.isDefault)
    || templates[0]
    || null;
};

const scaledFieldValue = (value, scale, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number * scale / BADGE_FONT_SCALE_DIVISOR : fallback;
};

const textDirectionForLang = (lang = "ar") => (lang === "ar" ? "rtl" : "ltr");

const textAlignForField = (align = "center") => {
  if (align === "start") return "start";
  if (align === "end") return "end";
  return "center";
};

const textAnchorForField = (box, align = "center", direction = "rtl", padding = 0) => {
  if (align === "start") return direction === "rtl" ? box.x + box.width - padding : box.x + padding;
  if (align === "end") return direction === "rtl" ? box.x + padding : box.x + box.width - padding;
  return box.x + box.width / 2;
};

const fieldOpacity = (field = {}) => {
  const opacity = Number(field.opacity);
  return Number.isFinite(opacity) ? clamp(opacity, 0, 1) : 1;
};

const fieldRadius = (field = {}, scale = 1) => (
  scaledFieldValue(field.borderRadius ?? field.radius, scale, 0)
);

const renderBadgeCanvas = async ({ template, client, program, agency, fileNumber, lang, renderAssets }) => {
  const assets = renderAssets || await createBadgeRenderAssets(template);
  const { scale, pixelWidth, pixelHeight, visibleFields, baseCanvas } = assets;
  await waitForBadgeFonts();
  const canvas = document.createElement("canvas");
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("badge-canvas-unavailable");
  setHighQualitySmoothing(ctx);
  ctx.drawImage(baseCanvas, 0, 0);

  const photoPath = client?.badgePhotoPath || client?.docs?.badgePhotoPath || "";
  const photo = photoPath ? await loadImage(await getPilgrimPhotoUrl(photoPath)) : null;
  const direction = textDirectionForLang(lang);

  for (const field of visibleFields) {
    const box = {
      x: canvas.width * field.xPct / 100,
      y: canvas.height * field.yPct / 100,
      width: canvas.width * field.wPct / 100,
      height: canvas.height * field.hPct / 100,
    };
    const opacity = fieldOpacity(field);
    if (field.type === "image") {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      roundedRectPath(ctx, box.x, box.y, box.width, box.height, fieldRadius(field, scale));
      ctx.clip();
      if (photo) {
        drawCover(ctx, photo, box.x, box.y, box.width, box.height, "contain");
      } else {
        ctx.fillStyle = "#eef2f7";
        ctx.fillRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `700 ${Math.max(12, box.width / 9)}px ${BADGE_FONT_FAMILY}`;
        ctx.fillText("PHOTO", box.x + box.width / 2, box.y + box.height / 2);
      }
      ctx.restore();
      continue;
    }

    const text = dataForField({ field, client, program, agency, fileNumber, lang });
    if (!text) continue;
    const padding = Math.max(3, 1.2 * scale);
    const textBox = {
      x: box.x + padding,
      y: box.y,
      width: Math.max(1, box.width - padding * 2),
      height: box.height,
    };
    const requestedFontSize = scaledFieldValue(field.fontSize || 12, scale, 12);
    const minFontSize = scaledFieldValue(
      field.minFontSize || Math.max(6, Number(field.fontSize || 12) * 0.62),
      scale,
      Math.max(7, requestedFontSize * 0.62)
    );
    const fitted = fitTextBox(ctx, text, textBox, {
      fontSize: requestedFontSize,
      minFontSize,
      fontWeight: field.fontWeight || 700,
      fontFamily: BADGE_FONT_FAMILY,
      maxLines: Math.max(1, Number(field.maxLines || field.lineCount || 1)),
    });
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = field.color || "#111111";
    ctx.direction = direction;
    ctx.textAlign = textAlignForField(field.align);
    ctx.textBaseline = "middle";
    ctx.font = `${field.fontWeight || 700} ${fitted.fontSize}px ${BADGE_FONT_FAMILY}`;
    if ("fontKerning" in ctx) ctx.fontKerning = "normal";
    const x = textAnchorForField(textBox, field.align, direction, 0);
    const totalHeight = fitted.lines.length * fitted.lineHeight;
    fitted.lines.forEach((line, index) => {
      ctx.fillText(line, x, textBox.y + textBox.height / 2 - totalHeight / 2 + fitted.lineHeight * (index + .5));
    });
    ctx.restore();
  }

  return {
    widthPt: assets.widthPt,
    heightPt: assets.heightPt,
    pixelWidth: canvas.width,
    pixelHeight: canvas.height,
    jpeg: await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", BADGE_JPEG_QUALITY)),
  };
};

const blobToBytes = async (blob) => new Uint8Array(await blob.arrayBuffer());
const ascii = (text) => new TextEncoder().encode(text);
const concatBytes = (chunks) => {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => { out.set(chunk, offset); offset += chunk.length; });
  return out;
};

const makePdf = async (pages) => {
  const chunks = [];
  const offsets = [0];
  const write = (chunk) => chunks.push(typeof chunk === "string" ? ascii(chunk) : chunk);
  const currentOffset = () => chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let objectId = 1;
  const pageIds = [];
  const objects = [];

  write("%PDF-1.4\n");
  const addObject = async (bodyParts) => {
    const id = objectId++;
    offsets[id] = currentOffset();
    write(`${id} 0 obj\n`);
    for (const part of bodyParts) write(part);
    write("\nendobj\n");
    return id;
  };

  for (const page of pages) {
    const jpeg = await blobToBytes(page.jpeg);
    const imageId = await addObject([
      `<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth || 1} /Height ${page.pixelHeight || 1} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      jpeg,
      "\nendstream",
    ]);
    const content = `q\n${page.widthPt} 0 0 ${page.heightPt} 0 0 cm\n/Im${imageId} Do\nQ\n`;
    const contentId = await addObject([`<< /Length ${content.length} >>\nstream\n${content}endstream`]);
    objects.push({ page, imageId, contentId });
  }

  const pagesId = objectId++;
  for (const item of objects) {
    const pageId = await addObject([`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${item.page.widthPt} ${item.page.heightPt}] /Resources << /XObject << /Im${item.imageId} ${item.imageId} 0 R >> >> /Contents ${item.contentId} 0 R >>`]);
    pageIds.push(pageId);
  }
  offsets[pagesId] = currentOffset();
  write(`${pagesId} 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>\nendobj\n`);
  const catalogId = await addObject([`<< /Type /Catalog /Pages ${pagesId} 0 R >>`]);
  const xrefOffset = currentOffset();
  write(`xref\n0 ${objectId}\n0000000000 65535 f \n`);
  for (let i = 1; i < objectId; i += 1) write(`${String(offsets[i] || 0).padStart(10, "0")} 00000 n \n`);
  write(`trailer\n<< /Size ${objectId} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new Blob([concatBytes(chunks)], { type: "application/pdf" });
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export async function downloadClientBadgePdf({ agencyId, client, program, agency, fileNumber, lang = "ar" }) {
  const template = await getTemplateForProgram({ agencyId, program });
  if (!template) throw new Error("missing-template");
  const page = await renderBadgeCanvas({ template, client, program, agency, fileNumber, lang });
  const pdf = await makePdf([page]);
  downloadBlob(pdf, `badge-${sanitizeFile(clientName(client, program))}.pdf`);
}

export async function downloadProgramBadgesPdf({ agencyId, clients = [], program, agency, lang = "ar" }) {
  const template = await getTemplateForProgram({ agencyId, program });
  if (!template) throw new Error("missing-template");
  const renderAssets = await createBadgeRenderAssets(template);
  const pages = [];
  for (let index = 0; index < clients.length; index += 1) {
    const page = await renderBadgeCanvas({
      template,
      client: clients[index],
      program,
      agency,
      lang,
      fileNumber: String(index + 1).padStart(3, "0"),
      renderAssets,
    });
    pages.push(page);
  }
  const pdf = await makePdf(pages);
  downloadBlob(pdf, `badges-${sanitizeFile(program?.name || "program")}.pdf`);
}
