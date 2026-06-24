import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { CONTRACT_DOCX_MIME } from "./contractTemplateData";
import { CONTRACT_TEMPLATE_FIELD_GROUPS } from "./contractTemplateFields";

const CONTRACT_PLACEHOLDER_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;
const DYNAMIC_REPRESENTED_TAG_RE = /^represented_\d+(?:\.|$)/;
const CONTROL_TAG_PREFIX_RE = /^[#/^]\s*/;
const CONTAINER_TAG_KEYS = new Set(["document", "headers", "footers", "tags"]);
const META_TAG_KEYS = new Set(["target"]);
const MAIN_CLIENT_FIELD_NAMES = [
  "full_name",
  "first_name",
  "last_name",
  "cin",
  "passport_number",
  "address",
  "birth_date",
  "phone",
  "room_type",
];
const REPRESENTED_MINOR_FIELD_NAMES = [
  "full_name",
  "first_name",
  "last_name",
  "cin",
  "passport_number",
  "birth_date",
  "age",
  "relationship",
  "phone",
  "address",
  "gender",
  "nationality",
  "file_number",
];

function normalizeTagName(tagName) {
  return String(tagName || "")
    .trim()
    .replace(CONTROL_TAG_PREFIX_RE, "")
    .trim();
}

function extractContractTags(value) {
  const tags = [];
  const text = String(value || "");
  for (const match of text.matchAll(CONTRACT_PLACEHOLDER_RE)) {
    const tagName = normalizeTagName(match[1]);
    if (tagName) tags.push(tagName);
  }
  return tags;
}

function buildKnownContractTags() {
  const tags = new Set();
  CONTRACT_TEMPLATE_FIELD_GROUPS.forEach((group) => {
    (group.fields || []).forEach((field) => {
      extractContractTags(field.placeholder || field.token).forEach((tagName) => tags.add(tagName));
    });
  });

  ["pilgrim", "client", "guardian", "representative"].forEach((prefix) => {
    MAIN_CLIENT_FIELD_NAMES.forEach((fieldName) => tags.add(`${prefix}.${fieldName}`));
  });
  MAIN_CLIENT_FIELD_NAMES.forEach((fieldName) => tags.add(fieldName));

  REPRESENTED_MINOR_FIELD_NAMES.forEach((fieldName) => {
    tags.add(`minor.${fieldName}`);
    tags.add(`represented_minors.${fieldName}`);
  });
  tags.add("represented_minors");
  return tags;
}

const KNOWN_CONTRACT_TAGS = new Set(
  buildKnownContractTags()
);

function getTagName(part) {
  return normalizeTagName(part?.value || part?.raw);
}

function isDynamicRepresentedTag(tagName) {
  const normalized = normalizeTagName(tagName);
  if (!DYNAMIC_REPRESENTED_TAG_RE.test(normalized)) return false;
  const [, fieldName = ""] = normalized.match(/^represented_\d+(?:\.(.+))?$/) || [];
  return !fieldName || REPRESENTED_MINOR_FIELD_NAMES.includes(fieldName);
}

function isKnownContractTag(tagName) {
  const normalized = normalizeTagName(tagName);
  return Boolean(
    normalized
    && (KNOWN_CONTRACT_TAGS.has(normalized) || isDynamicRepresentedTag(normalized))
  );
}

function createContractDocxError(code, details = {}) {
  const error = new Error(code);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function collectTemplateTags(value, output = new Set(), parentPath = "") {
  if (!value) return output;
  if (Array.isArray(value)) {
    value.forEach((item) => collectTemplateTags(item, output, parentPath));
    return output;
  }
  if (typeof value !== "object") return output;

  Object.entries(value).forEach(([key, child]) => {
    if (META_TAG_KEYS.has(key)) return;
    if (CONTAINER_TAG_KEYS.has(key)) {
      collectTemplateTags(child, output, parentPath);
      return;
    }

    const tagName = normalizeTagName(key);
    if (!tagName) {
      collectTemplateTags(child, output, parentPath);
      return;
    }

    const fullTagName = parentPath ? `${parentPath}.${tagName}` : tagName;
    output.add(fullTagName);
    if (child && typeof child === "object") collectTemplateTags(child, output, fullTagName);
  });

  return output;
}

function getUnknownTemplateTags(doc) {
  if (typeof doc?.getTags !== "function") return [];
  try {
    const tags = collectTemplateTags(doc.getTags());
    return Array.from(tags)
      .filter((tagName) => tagName !== "." && tagName !== "this" && !isKnownContractTag(tagName))
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    console.warn("[Contracts] Unable to inspect DOCX placeholders:", error);
    return [];
  }
}

function resolvePath(scope, pathParts) {
  let current = scope;
  for (const part of pathParts) {
    if (current === null || current === undefined) return undefined;
    if (Object.prototype.hasOwnProperty.call(Object(current), part)) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function getCandidateScopes(scope, context = {}) {
  const scopes = [];
  if (scope !== undefined) scopes.push(scope);
  const scopeList = Array.isArray(context.scopeList) ? context.scopeList : [];
  for (let index = scopeList.length - 1; index >= 0; index -= 1) {
    if (!scopes.includes(scopeList[index])) scopes.push(scopeList[index]);
  }
  if (context.rootScope && !scopes.includes(context.rootScope)) scopes.push(context.rootScope);
  return scopes;
}

function createContractPathParser(tag) {
  const tagName = normalizeTagName(tag);
  const pathParts = tagName.split(".").map((part) => part.trim()).filter(Boolean);
  return {
    get(scope, context) {
      if (!tagName) return "";
      if (tagName === "." || tagName === "this") return scope;
      for (const candidateScope of getCandidateScopes(scope, context)) {
        const value = resolvePath(candidateScope, pathParts);
        if (value !== undefined) return value === null ? "" : value;
      }
      return undefined;
    },
  };
}

function isEffectivelyEmptyText(value) {
  return !String(value || "").replace(/\s+/g, "").trim();
}

export function renderContractDocx(arrayBuffer, data) {
  const unknownTags = new Set();
  let doc;
  try {
    const zip = new PizZip(arrayBuffer);
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
      parser: createContractPathParser,
      nullGetter: (part) => {
        const tagName = getTagName(part);
        if (tagName && !isKnownContractTag(tagName)) unknownTags.add(tagName);
        return "";
      },
    });
  } catch (error) {
    throw createContractDocxError("invalid-contract-template", { originalError: error });
  }

  const templateUnknownTags = getUnknownTemplateTags(doc);
  if (templateUnknownTags.length > 0) {
    throw createContractDocxError("unknown-contract-placeholders", { unknownTags: templateUnknownTags });
  }

  try {
    doc.render(data || {});
  } catch (error) {
    if (error?.code) throw error;
    throw createContractDocxError("contract-generation-failed", { originalError: error });
  }

  if (unknownTags.size > 0) {
    throw createContractDocxError("unknown-contract-placeholders", { unknownTags: Array.from(unknownTags).sort() });
  }

  if (typeof doc.getFullText === "function" && isEffectivelyEmptyText(doc.getFullText())) {
    throw createContractDocxError("empty-contract-template");
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
