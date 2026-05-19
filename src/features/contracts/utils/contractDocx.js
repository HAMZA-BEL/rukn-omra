import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import expressionParser from "docxtemplater/expressions.js";
import { CONTRACT_DOCX_MIME } from "./contractTemplateData";
import { CONTRACT_TEMPLATE_FIELD_GROUPS } from "./contractTemplateFields";

const CONTRACT_PLACEHOLDER_RE = /^\{\{\s*(.*?)\s*\}\}$/;
const DYNAMIC_REPRESENTED_TAG_RE = /^represented_\d+(?:\.|$)/;

const KNOWN_CONTRACT_TAGS = new Set(
  CONTRACT_TEMPLATE_FIELD_GROUPS.flatMap((group) => group.fields || [])
    .map((field) => String(field.placeholder || "").match(CONTRACT_PLACEHOLDER_RE)?.[1])
    .filter(Boolean)
);

function getTagName(part) {
  return String(part?.value || part?.raw || "").trim();
}

function isDynamicRepresentedTag(tagName) {
  return DYNAMIC_REPRESENTED_TAG_RE.test(String(tagName || ""));
}

export function renderContractDocx(arrayBuffer, data) {
  const zip = new PizZip(arrayBuffer);
  const unknownTags = new Set();
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    parser: expressionParser,
    nullGetter: (part) => {
      const tagName = getTagName(part);
      if (!tagName) return "";
      if (KNOWN_CONTRACT_TAGS.has(tagName) || isDynamicRepresentedTag(tagName)) return "";
      unknownTags.add(tagName);
      return `{{${tagName}}}`;
    },
  });
  doc.render(data);
  if (unknownTags.size > 0) {
    console.warn("[Contracts] Unknown placeholders in DOCX template:", Array.from(unknownTags));
  }
  return doc.getZip().generate({
    type: "blob",
    mimeType: CONTRACT_DOCX_MIME,
    compression: "DEFLATE",
  });
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
