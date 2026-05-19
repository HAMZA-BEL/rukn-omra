import {
  buildContractFileName,
  buildContractTemplateData,
  getContractTemplateType,
} from "../utils/contractTemplateData";
import { downloadBlob, renderContractDocx } from "../utils/contractDocx";
import {
  fetchContractTemplates,
  getContractTemplateArrayBuffer,
} from "./contractTemplatesApi";
import PizZip from "pizzip";
import { getClientDisplayName } from "../../../utils/clientNames";
import {
  getRepresentedByClientId,
  isClientMinorWithoutCin,
  isEligibleRepresentative,
} from "../../../utils/clientRepresentation";

const ZIP_MIME = "application/zip";

const cleanFilePart = (value, fallback = "contract") => {
  const cleaned = String(value || fallback)
    .replace(/[\\/:*?"<>|\u0000-\u001F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "")
    .slice(0, 120);
  return cleaned || fallback;
};

const ensureUniqueFileName = (fileName, usedNames) => {
  const extensionMatch = String(fileName).match(/(\.[^.]+)$/);
  const extension = extensionMatch?.[1] || "";
  const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
  let candidate = fileName;
  let counter = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} (${counter})${extension}`;
    counter += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
};

const buildBulkContractFileName = (client, usedNames) => {
  const name = cleanFilePart(getClientDisplayName(client) || client?.name, "contract");
  return ensureUniqueFileName(`عقد - ${name}.docx`, usedNames);
};

const buildContractsZipFileName = (program) => {
  const programName = cleanFilePart(program?.name, "program");
  return `عقود - ${programName}.zip`;
};

const getTemplateForProgram = async ({ agencyId, program } = {}) => {
  const templateType = getContractTemplateType(program);
  const { data: templates, error: fetchError } = await fetchContractTemplates({ agencyId });
  if (fetchError) throw fetchError;
  const template = (templates || []).find((item) => (item.templateType || item.type) === templateType);
  if (!template) {
    const error = new Error("missing-contract-template");
    error.code = "missing-contract-template";
    error.templateType = templateType;
    throw error;
  }

  const { data: arrayBuffer, error: downloadError } = await getContractTemplateArrayBuffer({ template });
  if (downloadError) throw downloadError;
  return { templateType, arrayBuffer };
};

const buildClientContractDocx = ({
  templateArrayBuffer,
  client,
  program,
  payments,
  totalPaid,
  salePrice,
  agency,
  representedMinors,
  lang,
} = {}) => {
  const contractData = buildContractTemplateData({
    client,
    program,
    payments,
    totalPaid,
    salePrice,
    agency,
    representedMinors,
    lang,
  });
  return renderContractDocx(templateArrayBuffer, contractData);
};

const getNestedLookupValue = (lookup, firstKey, secondKey) => {
  const innerLookup = lookup?.get(firstKey);
  return innerLookup?.get(secondKey) || null;
};

const addNestedLookupValue = (lookup, firstKey, secondKey, value) => {
  let innerLookup = lookup.get(firstKey);
  if (!innerLookup) {
    innerLookup = new Map();
    lookup.set(firstKey, innerLookup);
  }
  if (!innerLookup.has(secondKey)) innerLookup.set(secondKey, value);
};

const pushNestedLookupValue = (lookup, firstKey, secondKey, value) => {
  let innerLookup = lookup.get(firstKey);
  if (!innerLookup) {
    innerLookup = new Map();
    lookup.set(firstKey, innerLookup);
  }
  const current = innerLookup.get(secondKey);
  if (current) current.push(value);
  else innerLookup.set(secondKey, [value]);
};

const buildBulkContractClientLookups = (programClients = []) => {
  const clientsById = new Map();
  const representedMinorsByRepresentativeId = new Map();

  (Array.isArray(programClients) ? programClients : []).forEach((client) => {
    if (!client) return;
    addNestedLookupValue(clientsById, client.programId, client.id, client);
    if (isClientMinorWithoutCin(client)) {
      pushNestedLookupValue(
        representedMinorsByRepresentativeId,
        client.programId,
        getRepresentedByClientId(client),
        client
      );
    }
  });

  return { clientsById, representedMinorsByRepresentativeId };
};

const resolveContractClient = ({ sourceClient, programClients = [], clientLookups = null } = {}) => {
  if (!isClientMinorWithoutCin(sourceClient)) return sourceClient;
  const representedById = getRepresentedByClientId(sourceClient);
  const representative = representedById
    ? (
      clientLookups
        ? getNestedLookupValue(clientLookups.clientsById, sourceClient.programId, representedById)
        : programClients.find((item) => item.id === representedById && item.programId === sourceClient.programId)
    )
    : null;
  if (!representative || !isEligibleRepresentative(representative)) {
    const error = new Error("missing-representative");
    error.code = "missing-representative";
    throw error;
  }
  return representative;
};

const getRepresentedMinors = ({ contractClient, programClients = [], clientLookups = null } = {}) => {
  if (clientLookups) {
    return (
      getNestedLookupValue(
        clientLookups.representedMinorsByRepresentativeId,
        contractClient.programId,
        contractClient.id
      ) || []
    ).filter((item) => item.id !== contractClient.id);
  }
  return programClients.filter((item) => (
    item.id !== contractClient.id
    && item.programId === contractClient.programId
    && getRepresentedByClientId(item) === contractClient.id
    && isClientMinorWithoutCin(item)
  ));
};

export async function downloadSingleContract({
  agencyId,
  client,
  program,
  payments,
  totalPaid,
  salePrice,
  agency,
  representedMinors,
  lang,
} = {}) {
  const { templateType, arrayBuffer } = await getTemplateForProgram({ agencyId, program });
  const blob = buildClientContractDocx({
    templateArrayBuffer: arrayBuffer,
    client,
    program,
    payments,
    totalPaid,
    salePrice,
    agency,
    representedMinors,
    lang,
  });
  const fileName = buildContractFileName({ client, lang });
  downloadBlob(blob, fileName);
  return { templateType, fileName };
}

export async function exportProgramWordContractsZip({
  agencyId,
  clients = [],
  programClients = [],
  program,
  getClientPayments,
  getClientTotalPaid,
  agency,
  lang,
} = {}) {
  const exportClients = Array.isArray(clients) ? clients.filter(Boolean) : [];
  if (!exportClients.length) {
    const error = new Error("no-contract-clients");
    error.code = "no-contract-clients";
    throw error;
  }

  const { templateType, arrayBuffer } = await getTemplateForProgram({ agencyId, program });
  const zip = new PizZip();
  const usedNames = new Set();
  const renderedContractClientIds = new Set();
  const clientLookups = buildBulkContractClientLookups(programClients);
  let total = 0;

  for (let index = 0; index < exportClients.length; index += 1) {
    const sourceClient = exportClients[index];
    const contractClient = resolveContractClient({ sourceClient, programClients, clientLookups });
    if (renderedContractClientIds.has(contractClient.id)) continue;
    renderedContractClientIds.add(contractClient.id);

    const payments = typeof getClientPayments === "function" ? getClientPayments(contractClient.id) : [];
    const totalPaid = typeof getClientTotalPaid === "function" ? getClientTotalPaid(contractClient.id) : null;
    const salePrice = contractClient.salePrice || contractClient.price || 0;
    const representedMinors = getRepresentedMinors({ contractClient, programClients, clientLookups });
    const blob = buildClientContractDocx({
      templateArrayBuffer: arrayBuffer,
      client: contractClient,
      program,
      payments,
      totalPaid,
      salePrice,
      agency,
      representedMinors,
      lang,
    });
    const fileName = buildBulkContractFileName(contractClient, usedNames);
    zip.file(fileName, await blob.arrayBuffer());
    total += 1;

    if (index % 10 === 9) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (!total) {
    const error = new Error("no-contract-clients");
    error.code = "no-contract-clients";
    throw error;
  }

  const zipBlob = zip.generate({
    type: "blob",
    mimeType: ZIP_MIME,
    compression: "DEFLATE",
  });
  const fileName = buildContractsZipFileName(program);
  downloadBlob(zipBlob, fileName);
  return { templateType, fileName, total };
}
