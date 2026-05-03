import { fetchBadgeTemplates } from "../services/badgeTemplatesApi";
import { badgePhonesFromProgram } from "./badgeTemplateMapping";
import { normalizeBadgeLayout } from "./badgeLayout";
import { getBadgeTemplateImageUrl, getPilgrimPhotoUrl } from "./badgeStorage";
import { fitTextBox } from "./badgeTextFit";

const mmToPt = (mm) => Number(mm || 0) * 72 / 25.4;
const sanitizeFile = (value) => String(value || "badge").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 90);
const clientName = (client = {}) => [client.firstName, client.lastName].filter(Boolean).join(" ").trim() || client.name || "معتمر";
const passportNumber = (client = {}) => client.passport?.number || client.passportNumber || "";

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
  const scale = mode === "contain"
    ? Math.min(width / image.width, height / image.height)
    : Math.max(width / image.width, height / image.height);
  const sw = image.width * scale;
  const sh = image.height * scale;
  ctx.drawImage(image, x + (width - sw) / 2, y + (height - sh) / 2, sw, sh);
};

const dataForField = ({ field, client, program, agency, fileNumber }) => {
  const phones = badgePhonesFromProgram(program);
  const map = {
    fullName: clientName(client),
    passportNumber: passportNumber(client),
    primaryPhone: phones[0] || "",
    extraPhone: phones[1] || phones[2] || "",
    programName: program?.name || "",
    badgeNote: program?.badgeNote || "",
    agencyName: agency?.nameAr || agency?.nameFr || "",
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

const renderBadgeCanvas = async ({ template, client, program, agency, fileNumber }) => {
  const widthMm = Number(template.widthMm || 90);
  const heightMm = Number(template.heightMm || 140);
  const scale = 250 / 25.4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(widthMm * scale);
  canvas.height = Math.round(heightMm * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const templateUrl = await getBadgeTemplateImageUrl(template.templatePath);
  const background = await loadImage(templateUrl);
  if (background) drawCover(ctx, background, 0, 0, canvas.width, canvas.height, "cover");

  const photoPath = client?.badgePhotoPath || client?.docs?.badgePhotoPath || "";
  const photo = photoPath ? await loadImage(await getPilgrimPhotoUrl(photoPath)) : null;
  const layout = normalizeBadgeLayout(template.layout);

  for (const field of layout.fields.filter((item) => item.visible !== false)) {
    const box = {
      x: canvas.width * field.xPct / 100,
      y: canvas.height * field.yPct / 100,
      width: canvas.width * field.wPct / 100,
      height: canvas.height * field.hPct / 100,
    };
    if (field.type === "image") {
      ctx.save();
      ctx.beginPath();
      ctx.rect(box.x, box.y, box.width, box.height);
      ctx.clip();
      if (photo) {
        drawCover(ctx, photo, box.x, box.y, box.width, box.height, field.fit || "cover");
      } else {
        ctx.fillStyle = "#eef2f7";
        ctx.fillRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${Math.max(12, box.width / 9)}px Arial`;
        ctx.fillText("PHOTO", box.x + box.width / 2, box.y + box.height / 2);
      }
      ctx.restore();
      continue;
    }

    const text = dataForField({ field, client, program, agency, fileNumber });
    if (!text) continue;
    const fitted = fitTextBox(ctx, text, box, {
      fontSize: (field.fontSize || 12) * scale / 3.2,
      fontWeight: field.fontWeight || 700,
      fontFamily: "Arial",
      maxLines: field.maxLines || 1,
    });
    ctx.fillStyle = field.color || "#111111";
    ctx.textAlign = field.align === "start" ? "left" : field.align === "end" ? "right" : "center";
    ctx.textBaseline = "middle";
    ctx.font = `${field.fontWeight || 700} ${fitted.fontSize}px Arial`;
    const x = field.align === "start" ? box.x + 3 : field.align === "end" ? box.x + box.width - 3 : box.x + box.width / 2;
    const totalHeight = fitted.lines.length * fitted.lineHeight;
    fitted.lines.forEach((line, index) => {
      ctx.fillText(line, x, box.y + box.height / 2 - totalHeight / 2 + fitted.lineHeight * (index + .5));
    });
  }

  return {
    widthPt: mmToPt(widthMm),
    heightPt: mmToPt(heightMm),
    pixelWidth: canvas.width,
    pixelHeight: canvas.height,
    jpeg: await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .92)),
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

export async function downloadClientBadgePdf({ agencyId, client, program, agency, fileNumber }) {
  const template = await getTemplateForProgram({ agencyId, program });
  if (!template) throw new Error("missing-template");
  const page = await renderBadgeCanvas({ template, client, program, agency, fileNumber });
  const pdf = await makePdf([page]);
  downloadBlob(pdf, `badge-${sanitizeFile(clientName(client))}.pdf`);
}

export async function downloadProgramBadgesPdf({ agencyId, clients = [], program, agency }) {
  const template = await getTemplateForProgram({ agencyId, program });
  if (!template) throw new Error("missing-template");
  const pages = [];
  for (let index = 0; index < clients.length; index += 1) {
    const page = await renderBadgeCanvas({
      template,
      client: clients[index],
      program,
      agency,
      fileNumber: String(index + 1).padStart(3, "0"),
    });
    pages.push(page);
  }
  const pdf = await makePdf(pages);
  downloadBlob(pdf, `badges-${sanitizeFile(program?.name || "program")}.pdf`);
}
