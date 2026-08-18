import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { getFontEmbedCSS, toJpeg } from "html-to-image";
import { SmartBadge } from "../components/SmartBadge";
import { SmartBadgeBack } from "../components/SmartBadgeBack";
import { buildSmartBadgeData } from "../components/SmartBadgeIdentity";
import { getPilgrimPhotoUrl } from "./badgeStorage";
import { getAgencyLogoUrl } from "../../../utils/agencyLogo";
import { resolveSmartBadgeBackground } from "../smartBadgeConfig";
import { BADGE_EXPORT_STAGE, withBadgeExportStage } from "./badgeExportDiagnostics";

export const SMART_BADGE_EXPORT_GEOMETRY = Object.freeze({
  widthMm: 58,
  heightMm: 88,
  layoutWidthPx: 390,
  layoutHeightPx: 390 * 88 / 58,
  dpi: 300,
});

const {
  widthMm: WIDTH_MM,
  heightMm: HEIGHT_MM,
  layoutWidthPx: LAYOUT_WIDTH_PX,
  layoutHeightPx: LAYOUT_HEIGHT_PX,
  dpi: DPI,
} = SMART_BADGE_EXPORT_GEOMETRY;
const OUTPUT_WIDTH_PX = WIDTH_MM * DPI / 25.4;
const OUTPUT_HEIGHT_PX = HEIGHT_MM * DPI / 25.4;
const PIXEL_RATIO = OUTPUT_WIDTH_PX / LAYOUT_WIDTH_PX;
const SMART_PHOTO_PREFETCH_CONCURRENCY = 4;
const mmToPt = (mm) => mm * 72 / 25.4;
const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());
const sanitize = (value) => String(value || "badge").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 90);
const optionalAssetRef = (value) => {
  const normalized = String(value || "").trim();
  return ["", "null", "undefined"].includes(normalized.toLowerCase()) ? "" : normalized;
};
const clientName = (client = {}, program = {}) => [client.firstName, client.lastName].filter(Boolean).join(" ").trim()
  || client.name
  || program.name
  || "pilgrim";
const getPhotoPath = (client = {}) => client?.badgePhotoPath || client?.docs?.badgePhotoPath || "";

const bytes = (text) => Uint8Array.from(String(text), (character) => character.charCodeAt(0) & 255);
const concat = (chunks) => {
  const out = new Uint8Array(chunks.reduce((sum, item) => sum + item.length, 0));
  let offset = 0;
  chunks.forEach((item) => {
    out.set(item, offset);
    offset += item.length;
  });
  return out;
};

export async function makeSmartBadgePdf(jpegs, profiler) {
  const pdfStarted = now();
  const chunks = [];
  const offsets = [0];
  let length = 0;
  let nextId = 1;
  const write = (value) => {
    const item = typeof value === "string" ? bytes(value) : value;
    chunks.push(item);
    length += item.length;
  };
  const add = async (parts) => {
    const id = nextId++;
    offsets[id] = length;
    write(`${id} 0 obj\n`);
    parts.forEach(write);
    write("\nendobj\n");
    return id;
  };

  write("%PDF-1.4\n");
  const pages = [];
  for (let index = 0; index < jpegs.length; index += 1) {
    const jpegBlob = jpegs[index];
    const jpeg = await (profiler?.measure
      ? profiler.measure("jpegToBytes", async () => new Uint8Array(await jpegBlob.arrayBuffer()))
      : new Uint8Array(await jpegBlob.arrayBuffer()));
    // The byte representation is now retained by the PDF chunks; release the Blob reference early.
    jpegs[index] = null;
    const imageId = await add([
      `<< /Type /XObject /Subtype /Image /Width ${Math.round(WIDTH_MM * DPI / 25.4)} /Height ${Math.round(HEIGHT_MM * DPI / 25.4)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      jpeg,
      "\nendstream",
    ]);
    const width = mmToPt(WIDTH_MM);
    const height = mmToPt(HEIGHT_MM);
    const stream = `q\n${width} 0 0 ${height} 0 0 cm\n/Im${imageId} Do\nQ\n`;
    const contentId = await add([`<< /Length ${stream.length} >>\nstream\n${stream}endstream`]);
    pages.push({ imageId, contentId, width, height });
  }

  const pagesId = nextId++;
  const pageIds = [];
  for (const page of pages) {
    pageIds.push(await add([`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /XObject << /Im${page.imageId} ${page.imageId} 0 R >> >> /Contents ${page.contentId} 0 R >>`]));
  }
  offsets[pagesId] = length;
  write(`${pagesId} 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>\nendobj\n`);
  const catalogId = await add([`<< /Type /Catalog /Pages ${pagesId} 0 R >>`]);
  const xref = length;
  write(`xref\n0 ${nextId}\n0000000000 65535 f \n`);
  for (let id = 1; id < nextId; id += 1) write(`${String(offsets[id] || 0).padStart(10, "0")} 00000 n \n`);
  write(`trailer\n<< /Size ${nextId} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const assembled = profiler?.measureSync ? profiler.measureSync("pdfAssembly", () => concat(chunks)) : concat(chunks);
  const blob = profiler?.measureSync
    ? profiler.measureSync("finalBlob", () => new Blob([assembled], { type: "application/pdf" }))
    : new Blob([assembled], { type: "application/pdf" });
  profiler?.addPhase?.("pdfTotal", now() - pdfStarted);
  return blob;
}

const download = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const waitForImages = async (node) => Promise.all(Array.from(node.querySelectorAll("img")).map((img) => (
  img.complete
    ? Promise.resolve()
    : new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    })
)));
const nextFrame = () => new Promise((resolve) => {
  let settled = false;
  let timer;
  const done = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolve();
  };
  // Background/headless tabs may indefinitely suspend rAF. Preserve the frame when available,
  // but never allow an export job to hang solely because the tab is throttled.
  timer = setTimeout(done, 100);
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(done);
});
const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onloadend = () => resolve(String(reader.result || ""));
  reader.readAsDataURL(blob);
});

const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("smart-badge-image-preprocess-failed"));
  }, type, quality);
});

export async function constrainSmartBadgeRaster(blob) {
  const type = String(blob?.type || "").toLowerCase();
  if (!blob || type.includes("svg") || type.includes("gif") || typeof createImageBitmap !== "function") return blob;
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, OUTPUT_WIDTH_PX / bitmap.width, OUTPUT_HEIGHT_PX / bitmap.height);
    if (!(scale < 1)) return blob;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: type !== "image/jpeg" });
    if (!context) return blob;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const outputType = ["image/jpeg", "image/png", "image/webp"].includes(type) ? type : "image/png";
    try {
      return await canvasToBlob(canvas, outputType, 0.98);
    } finally {
      canvas.width = 1;
      canvas.height = 1;
    }
  } finally {
    bitmap.close?.();
  }
}
const decodeUrl = async (url) => {
  if (!url) return;
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  if (typeof image.decode === "function") await image.decode().catch(() => {});
};
const runWithConcurrency = async (items, limit, worker) => {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
};

export function collectSmartBadgeRenderMetrics(node) {
  const badgeRect = node.getBoundingClientRect();
  const read = (id) => {
    const element = node.querySelector(`[data-element-id="${id}"]`);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const target = element.querySelector("h2,.smart-badge-field-value,strong,bdi") || element;
    const label = element.querySelector(".smart-badge-field-label");
    const value = element.querySelector(".smart-badge-field-value");
    const labelRect = label?.getBoundingClientRect();
    const valueRect = value?.getBoundingClientRect();
    const style = getComputedStyle(target);
    return {
      x: rect.left - badgeRect.left,
      y: rect.top - badgeRect.top,
      width: rect.width,
      height: rect.height,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      whiteSpace: style.whiteSpace,
      transform: getComputedStyle(element).transform,
      labelAnchor: labelRect ? labelRect.right - rect.right : null,
      valueAnchor: valueRect ? valueRect.right - rect.right : null,
    };
  };
  return {
    badge: {
      width: badgeRect.width,
      height: badgeRect.height,
      fontFamily: getComputedStyle(node).fontFamily,
      background: getComputedStyle(node).backgroundColor,
    },
    name: read("pilgrimName"),
    photo: read("photo"),
    passport: read("passport"),
    program: read("program"),
    travelDate: read("travelDate"),
    makkahHotel: read("makkahHotel"),
    madinahHotel: read("madinahHotel"),
    phone: read("phone"),
    group: read("group"),
    room: read("room"),
  };
}

export async function settleSmartBadgeExport(node, profiler, badge, { waitForFonts = true } = {}) {
  if (waitForFonts && document.fonts?.ready) {
    profiler?.increment?.("fontReadinessWaits");
    await (profiler?.measureBadge
      ? profiler.measureBadge(badge, "fontReadiness", () => document.fonts.ready)
      : document.fonts.ready);
  }
  const images = Array.from(node.querySelectorAll("img"));
  images.forEach((img) => profiler?.recordImage?.(img.currentSrc || img.src));
  await (profiler?.measureBadge
    ? profiler.measureBadge(badge, "imageReadiness", () => waitForImages(node))
    : waitForImages(node));
  await (profiler?.measureBadge
    ? profiler.measureBadge(badge, "imageDecode", () => Promise.all(images.map((img) => (
      typeof img.decode === "function" ? img.decode().catch(() => {}) : Promise.resolve()
    ))))
    : Promise.all(images.map((img) => (typeof img.decode === "function" ? img.decode().catch(() => {}) : Promise.resolve()))));
  // Keep both frames: Auto-fit and layout effects must visibly settle before rasterization.
  await (profiler?.measureBadge
    ? profiler.measureBadge(badge, "stabilizationFrames", async () => {
      await nextFrame();
      await nextFrame();
    })
    : (async () => {
      await nextFrame();
      await nextFrame();
    })());
}

class SmartBadgeExportJob {
  constructor({ config, program, agency, travelGroups = [], profiler } = {}) {
    this.config = config;
    this.program = program;
    this.agency = agency || {};
    this.travelGroups = travelGroups;
    this.profiler = profiler;
    this.photoDataUrls = new Map();
    this.fontEmbedCSS = undefined;
    this.fontEmbedAttempted = false;
    this.prepared = false;
    this.disposed = false;
    this.host = profiler?.measureSync
      ? profiler.measureSync("exportHostCreation", () => document.createElement("div"))
      : document.createElement("div");
    profiler?.increment?.("exportHosts");
    this.host.className = "smart-badge-identity smart-badge-export-host";
    this.host.dataset.logicalWidthMm = String(WIDTH_MM);
    this.host.dataset.logicalHeightMm = String(HEIGHT_MM);
    Object.assign(this.host.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: `${LAYOUT_WIDTH_PX}px`,
      height: `${LAYOUT_HEIGHT_PX}px`,
      background: "transparent",
      zIndex: "-1",
    });
    document.body.appendChild(this.host);
    this.root = profiler?.measureSync
      ? profiler.measureSync("reactRootCreation", () => createRoot(this.host))
      : createRoot(this.host);
    profiler?.increment?.("reactRoots");
  }

  async toEmbeddedImage(url, phase, { fallbackToSource = true } = {}) {
    if (!url || url.startsWith("data:")) return url || "";
    this.profiler?.recordImage?.(url);
    this.profiler?.increment?.("assetFetches");
    try {
      const response = await (this.profiler?.measure
        ? this.profiler.measure(`${phase}Fetch`, () => fetch(url))
        : fetch(url));
      if (!response.ok) return fallbackToSource ? url : "";
      const sourceBlob = await response.blob();
      const blob = await (this.profiler?.measure
        ? this.profiler.measure(`${phase}Preprocess`, () => constrainSmartBadgeRaster(sourceBlob))
        : constrainSmartBadgeRaster(sourceBlob));
      const dataUrl = await (this.profiler?.measure
        ? this.profiler.measure(`${phase}ToDataUrl`, () => blobToDataUrl(blob))
        : blobToDataUrl(blob));
      await (this.profiler?.measure
        ? this.profiler.measure(`${phase}Decode`, () => decodeUrl(dataUrl))
        : decodeUrl(dataUrl));
      return dataUrl;
    } catch {
      return fallbackToSource ? url : "";
    }
  }

  async resolveAgencyAssets() {
    const clearLogo = () => {
      this.agency = { ...this.agency, logoUrl: "", logo_url: "" };
    };
    const logoUrl = optionalAssetRef(this.agency.logoUrl || this.agency.logo_url);
    const path = optionalAssetRef(this.agency.logoPath || this.agency.logo_path);
    if (!logoUrl && !path) {
      clearLogo();
      return;
    }
    try {
      const resolvedLogo = logoUrl || await (this.profiler?.measure
        ? this.profiler.measure("agencyLogoResolution", () => getAgencyLogoUrl(path))
        : getAgencyLogoUrl(path));
      if (!resolvedLogo) {
        clearLogo();
        return;
      }
      const embeddedLogo = await this.toEmbeddedImage(resolvedLogo, "agencyLogo", { fallbackToSource: false });
      if (!embeddedLogo) {
        clearLogo();
        return;
      }
      this.agency = { ...this.agency, logoUrl: embeddedLogo, logo_url: embeddedLogo };
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.warn("[Smart Badge] Agency logo unavailable; continuing without it.", error);
      clearLogo();
    }
  }

  async prefetchPhotos(clients) {
    const paths = Array.from(new Set(clients.map(getPhotoPath).filter(Boolean)));
    this.profiler?.setCounter?.("uniquePhotos", paths.length);
    await runWithConcurrency(paths, SMART_PHOTO_PREFETCH_CONCURRENCY, async (path) => {
      this.profiler?.increment?.("signedUrlRequests");
      const signedUrl = await (this.profiler?.measure
        ? this.profiler.measure("photoSignedUrl", () => getPilgrimPhotoUrl(path))
        : getPilgrimPhotoUrl(path));
      const embedded = await this.toEmbeddedImage(signedUrl, "photoImage");
      this.photoDataUrls.set(path, embedded);
    });
  }

  async prepare(clients = []) {
    if (this.prepared) return;
    this.prepared = true;
    if (document.fonts?.ready) {
      this.profiler?.increment?.("fontReadinessWaits");
      await (this.profiler?.measure
        ? this.profiler.measure("fontReadiness", () => document.fonts.ready)
        : document.fonts.ready);
    }
    await Promise.all([this.resolveAgencyAssets(), this.prefetchPhotos(clients)]);
  }

  async ensureFontEmbedCSS(node) {
    if (this.fontEmbedAttempted) return;
    this.fontEmbedAttempted = true;
    this.profiler?.increment?.("fontEmbedCSSGenerations");
    try {
      this.fontEmbedCSS = await (this.profiler?.measure
        ? this.profiler.measure("fontEmbedCSS", () => getFontEmbedCSS(node, { cacheBust: false }))
        : getFontEmbedCSS(node, { cacheBust: false }));
    } catch {
      // Preserve correctness: undefined lets html-to-image use its normal font path.
      this.fontEmbedCSS = undefined;
    }
  }

  async render({ client, data: providedData, photoUrl: providedPhotoUrl = "", onMetrics, badgeIndex = 1, badgeTotal = 1 }) {
    if (this.disposed) throw new Error("smart-badge-export-job-disposed");
    const badge = this.profiler?.startBadge?.(badgeIndex, badgeTotal);
    const preparationStarted = now();
    const profileSync = (name, work) => (this.profiler?.measureBadgeSync
      ? this.profiler.measureBadgeSync(badge, name, work)
      : work());
    try {
      const photoUrl = providedPhotoUrl || this.photoDataUrls.get(getPhotoPath(client)) || "";
      const data = providedData || profileSync("dataPreparation", () => buildSmartBadgeData(client, [this.program], this.travelGroups));
      profileSync("smartBadgeRender", () => flushSync(() => this.root.render(React.createElement(SmartBadge, {
        editor: true,
        config: this.config,
        data,
        agency: this.agency,
        photoUrl,
      }))));
      const node = this.host.querySelector(".smart-badge");
      if (!node) throw new Error("smart-badge-export-node-missing");
      Object.assign(node.style, {
        width: `${LAYOUT_WIDTH_PX}px`,
        height: `${LAYOUT_HEIGHT_PX}px`,
        maxWidth: "none",
        aspectRatio: "auto",
        transition: "none",
      });
      await settleSmartBadgeExport(node, this.profiler, badge, { waitForFonts: false });
      onMetrics?.(collectSmartBadgeRenderMetrics(node));
      await this.ensureFontEmbedCSS(node);
      this.profiler?.addBadgePhase?.(badge, "renderPreparation", now() - preparationStarted);
      this.profiler?.increment?.("toJpegCalls");
      const options = {
        quality: 0.98,
        pixelRatio: PIXEL_RATIO,
        cacheBust: false,
        width: LAYOUT_WIDTH_PX,
        height: LAYOUT_HEIGHT_PX,
        backgroundColor: resolveSmartBadgeBackground(this.config).color,
        ...(this.fontEmbedCSS !== undefined ? { fontEmbedCSS: this.fontEmbedCSS } : {}),
      };
      const dataUrl = await withBadgeExportStage(BADGE_EXPORT_STAGE.TO_JPEG, () => (this.profiler?.measureBadge
        ? this.profiler.measureBadge(badge, "toJpeg", () => toJpeg(node, options))
        : toJpeg(node, options)));
      const blob = await withBadgeExportStage(BADGE_EXPORT_STAGE.TO_JPEG, () => (this.profiler?.measureBadge
        ? this.profiler.measureBadge(badge, "dataUrlToBlob", async () => (await fetch(dataUrl)).blob())
        : (async () => (await fetch(dataUrl)).blob())()));
      this.profiler?.addBytes?.("jpegBytes", blob.size);
      return blob;
    } finally {
      this.profiler?.finishBadge?.(badge);
    }
  }

  async renderBack({ client, photoUrl: providedPhotoUrl = "", badgeIndex = 1, badgeTotal = 1 }) {
    if (this.disposed) throw new Error("smart-badge-export-job-disposed");
    if (!this.config?.sides?.back?.enabled) return null;
    const badge = this.profiler?.startBadge?.(badgeIndex, badgeTotal);
    const preparationStarted = now();
    try {
      const photoUrl = providedPhotoUrl || this.photoDataUrls.get(getPhotoPath(client)) || "";
      flushSync(() => this.root.render(React.createElement(SmartBadgeBack, { config:this.config, agency:this.agency, photoUrl })));
      const node = this.host.querySelector(".smart-badge-back");
      if (!node) throw new Error("smart-badge-back-export-node-missing");
      Object.assign(node.style, {width:`${LAYOUT_WIDTH_PX}px`,height:`${LAYOUT_HEIGHT_PX}px`,maxWidth:"none",aspectRatio:"auto",transition:"none"});
      await settleSmartBadgeExport(node, this.profiler, badge, { waitForFonts:false });
      await this.ensureFontEmbedCSS(node);
      this.profiler?.addBadgePhase?.(badge,"renderPreparation",now()-preparationStarted);
      this.profiler?.increment?.("toJpegCalls");
      const options={quality:.98,pixelRatio:PIXEL_RATIO,cacheBust:false,width:LAYOUT_WIDTH_PX,height:LAYOUT_HEIGHT_PX,backgroundColor:this.config.sides.back.appearance.backgroundColor,...(this.fontEmbedCSS!==undefined?{fontEmbedCSS:this.fontEmbedCSS}:{})};
      const dataUrl=await withBadgeExportStage(BADGE_EXPORT_STAGE.TO_JPEG,()=>(this.profiler?.measureBadge?this.profiler.measureBadge(badge,"toJpeg",()=>toJpeg(node,options)):toJpeg(node,options)));
      const blob=await withBadgeExportStage(BADGE_EXPORT_STAGE.TO_JPEG,()=>(this.profiler?.measureBadge?this.profiler.measureBadge(badge,"dataUrlToBlob",async()=>(await fetch(dataUrl)).blob()):(async()=>(await fetch(dataUrl)).blob())()));
      this.profiler?.addBytes?.("jpegBytes",blob.size);
      return blob;
    } finally { this.profiler?.finishBadge?.(badge); }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const cleanup = () => {
      this.root?.unmount();
      this.host?.remove();
      this.photoDataUrls.clear();
      this.fontEmbedCSS = undefined;
      this.root = null;
      this.host = null;
      this.agency = null;
      this.config = null;
      this.program = null;
      this.travelGroups = null;
    };
    if (this.profiler?.measureSync) this.profiler.measureSync("cleanup", cleanup);
    else cleanup();
  }
}

export const createSmartBadgeExportJob = (options) => new SmartBadgeExportJob(options);

export async function renderSmartBadgeJpeg({
  config,
  client,
  program,
  agency,
  travelGroups = [],
  onMetrics,
  photoUrl = "",
  data,
  profiler,
  badgeIndex = 1,
  badgeTotal = 1,
}) {
  const job = createSmartBadgeExportJob({ config, program, agency, travelGroups, profiler });
  try {
    await job.prepare([client]);
    return await job.render({ client, data, photoUrl, onMetrics, badgeIndex, badgeTotal });
  } finally {
    job.dispose();
  }
}

export async function downloadSmartClientBadgePdf(args) {
  const job = createSmartBadgeExportJob(args);
  let pdf;
  try {
    await withBadgeExportStage(BADGE_EXPORT_STAGE.PREPARE_ASSETS, () => job.prepare([args.client]));
    const hasBack=Boolean(job.config?.sides?.back?.enabled),pageTotal=hasBack?2:1;
    const jpeg = await withBadgeExportStage(BADGE_EXPORT_STAGE.RENDER_FRONT, () => job.render({
      client: args.client,
      data: args.data,
      photoUrl: args.photoUrl,
      onMetrics: args.onMetrics,
      badgeIndex: 1,
      badgeTotal: pageTotal,
    }));
    const backJpeg = hasBack?await withBadgeExportStage(BADGE_EXPORT_STAGE.RENDER_BACK, () => job.renderBack({client:args.client,photoUrl:args.photoUrl,badgeIndex:2,badgeTotal:pageTotal})):null;
    job.dispose();
    pdf = await withBadgeExportStage(BADGE_EXPORT_STAGE.BUILD_PDF, () => makeSmartBadgePdf(backJpeg?[jpeg,backJpeg]:[jpeg], args.profiler));
    await withBadgeExportStage(BADGE_EXPORT_STAGE.DOWNLOAD, async () => download(pdf, `badge-${sanitize(clientName(args.client, args.program))}.pdf`));
    args.profiler?.finish?.({ pdfBlob: pdf });
  } finally {
    job.dispose();
  }
}

export async function downloadSmartProgramBadgesPdf({ clients = [], onProgress, profiler, ...args }) {
  const job = createSmartBadgeExportJob({ ...args, profiler });
  const jpegs = [];
  let pdf;
  try {
    await job.prepare(clients);
    const hasBack=Boolean(job.config?.sides?.back?.enabled),pageTotal=clients.length*(hasBack?2:1);
    for (let index = 0; index < clients.length; index += 1) {
      jpegs.push(await job.render({
        client: clients[index],
        badgeIndex: hasBack?(index*2)+1:index+1,
        badgeTotal: pageTotal,
      }));
      if (hasBack) jpegs.push(await job.renderBack({
        client:clients[index],
        badgeIndex:(index*2)+2,
        badgeTotal:clients.length*2,
      }));
      onProgress?.({
        step: "render",
        current: index + 1,
        total: clients.length,
        percent: Math.round(((index + 1) / Math.max(1, clients.length)) * 100),
      });
    }
    job.dispose();
    onProgress?.({ step: "pdf", current: clients.length, total: clients.length, percent: 100 });
    pdf = await makeSmartBadgePdf(jpegs, profiler);
    download(pdf, `badges-${sanitize(args.program?.name || "program")}.pdf`);
    onProgress?.({ step: "done", current: clients.length, total: clients.length, percent: 100 });
    profiler?.finish?.({ pdfBlob: pdf });
  } finally {
    job.dispose();
    jpegs.length = 0;
  }
}
