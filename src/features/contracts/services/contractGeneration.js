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
import {
  buildTravelGroupById,
  getTravelGroupContextKey,
  resolveClientTravelContext,
} from "../utils/contractTravelContext";

const ZIP_MIME = "application/zip";

const createContractGenerationError = (code, details = {}) => {
  const error = new Error(code);
  error.code = code;
  Object.assign(error, details);
  return error;
};

const hasContractClient = (client) => Boolean(
  client
  && typeof client === "object"
  && (client.id || client.firstName || client.lastName || client.name || getClientDisplayName(client))
);

const hasContractProgram = (program) => Boolean(
  program
  && typeof program === "object"
  && Object.keys(program).length > 0
);

const formatUnknownPlaceholderList = (unknownTags = []) => {
  const tags = (Array.isArray(unknownTags) ? unknownTags : []).filter(Boolean).slice(0, 6);
  return tags.length ? `: ${tags.join("، ")}` : "";
};

export const getContractGenerationErrorMessage = (error, lang = "ar") => {
  const unknownList = formatUnknownPlaceholderList(error?.unknownTags);
  switch (error?.code) {
    case "missing-contract-client":
      return lang === "fr" ? "Veuillez sélectionner un client avant de générer le contrat."
        : lang === "en" ? "Please select a client before generating the contract."
        : "يرجى اختيار عميل قبل إنشاء العقد.";
    case "missing-contract-program":
      return lang === "fr" ? "Aucun programme valide n’est lié à ce contrat."
        : lang === "en" ? "No valid program is linked to this contract."
        : "لا يوجد برنامج صالح مرتبط بهذا العقد.";
    case "missing-contract-template-file":
      return lang === "fr" ? "Le fichier du modèle de contrat est introuvable. Veuillez réimporter le modèle."
        : lang === "en" ? "The contract template file could not be loaded. Please upload the template again."
        : "تعذر تحميل ملف قالب العقد. يرجى رفع القالب مرة أخرى.";
    case "invalid-contract-template":
      return lang === "fr" ? "Impossible de lire le modèle. Veuillez importer un fichier Word .docx valide."
        : lang === "en" ? "Unable to read the template. Please upload a valid Word .docx file."
        : "تعذر قراءة قالب العقد. يرجى رفع قالب Word صالح بصيغة .docx.";
    case "unknown-contract-placeholders":
      return lang === "fr" ? `Le modèle contient des champs inconnus${unknownList}. Veuillez les corriger depuis la liste des champs disponibles.`
        : lang === "en" ? `The template contains unknown fields${unknownList}. Please correct them using the available fields list.`
        : `قالب العقد يحتوي على حقول غير معروفة${unknownList}. يرجى تصحيحها من قائمة الحقول المتاحة.`;
    case "empty-contract-template":
      return lang === "fr" ? "Le contrat généré est vide. Veuillez vérifier que le modèle contient du texte ou des champs valides."
        : lang === "en" ? "The generated contract is empty. Please make sure the template contains text or valid fields."
        : "العقد الناتج فارغ. يرجى التأكد من أن القالب يحتوي على نص أو حقول صالحة.";
    case "contract-generation-failed":
      return lang === "fr" ? "La génération du contrat a échoué. Veuillez vérifier le modèle puis réessayer."
        : lang === "en" ? "Contract generation failed. Please check the template and try again."
        : "فشل إنشاء العقد. يرجى مراجعة القالب ثم المحاولة مرة أخرى.";
    default:
      return "";
  }
};

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
  if (!hasContractProgram(program)) throw createContractGenerationError("missing-contract-program");
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
  if (!arrayBuffer) throw createContractGenerationError("missing-contract-template-file");
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
  if (!templateArrayBuffer) throw createContractGenerationError("missing-contract-template-file");
  if (!hasContractClient(client)) throw createContractGenerationError("missing-contract-client");
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

const createMixedTravelContextUnitError = ({ sourceClient, contractClient, contractMembers, contextKeys } = {}) => ({
  code: "mixed-contract-travel-context",
  reason: "mixed_travel_context",
  sourceClientId: sourceClient?.id || null,
  sourceClientName: getClientDisplayName(sourceClient) || sourceClient?.name || "",
  contractClientId: contractClient?.id || null,
  contractClientName: getClientDisplayName(contractClient) || contractClient?.name || "",
  contractMemberIds: (contractMembers || []).map((client) => client?.id).filter(Boolean),
  contractMemberNames: (contractMembers || [])
    .map((client) => getClientDisplayName(client) || client?.name || "")
    .filter(Boolean),
  contextKeys: contextKeys || [],
});

const createNoValidContractUnitsError = ({ errors = [] } = {}) => {
  const mixedError = errors.find((error) => error?.code === "mixed-contract-travel-context");
  if (mixedError) {
    const error = new Error("no-valid-contract-clients");
    error.code = "no-valid-contract-clients";
    error.reason = "mixed_travel_context";
    error.skippedCount = errors.length;
    error.skippedErrors = errors;
    return error;
  }

  const error = new Error("no-contract-clients");
  error.code = "no-contract-clients";
  error.skippedCount = errors.length;
  error.skippedErrors = errors;
  return error;
};

const buildBulkContractUnits = ({
  exportClients,
  programClients,
  clientLookups,
  program,
  travelGroupById,
} = {}) => {
  const renderedContractClientIds = new Set();
  const units = [];
  const errors = [];

  for (let index = 0; index < exportClients.length; index += 1) {
    const sourceClient = exportClients[index];
    const contractClient = resolveContractClient({ sourceClient, programClients, clientLookups });
    if (renderedContractClientIds.has(contractClient.id)) continue;
    renderedContractClientIds.add(contractClient.id);

    const representedMinors = getRepresentedMinors({ contractClient, programClients, clientLookups });
    const contractMembers = [contractClient, ...representedMinors].filter(Boolean);
    const contextKeys = Array.from(new Set(
      contractMembers.map((client) => getTravelGroupContextKey(client, travelGroupById))
    ));

    if (contextKeys.length > 1) {
      errors.push(createMixedTravelContextUnitError({ sourceClient, contractClient, contractMembers, contextKeys }));
      continue;
    }

    const travelContext = resolveClientTravelContext(contractClient, program, travelGroupById);
    units.push({
      contractClient,
      representedMinors,
      program: travelContext.program || program,
      travelContext,
    });
  }

  return { units, errors };
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
  if (!hasContractClient(client)) throw createContractGenerationError("missing-contract-client");
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
  travelGroups,
  travelGroupById,
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
  const clientLookups = buildBulkContractClientLookups(programClients);
  const resolvedTravelGroupById = buildTravelGroupById(
    travelGroupById === undefined || travelGroupById === null ? travelGroups : travelGroupById
  );
  const contractUnitResult = buildBulkContractUnits({
    exportClients,
    programClients,
    clientLookups,
    program,
    travelGroupById: resolvedTravelGroupById,
  });
  const contractUnits = contractUnitResult.units || [];
  const skippedErrors = contractUnitResult.errors || [];
  if (!contractUnits.length) throw createNoValidContractUnitsError({ errors: skippedErrors });
  let total = 0;

  for (let index = 0; index < contractUnits.length; index += 1) {
    const { contractClient, representedMinors, program: contractProgram } = contractUnits[index];
    const payments = typeof getClientPayments === "function" ? getClientPayments(contractClient.id) : [];
    const totalPaid = typeof getClientTotalPaid === "function" ? getClientTotalPaid(contractClient.id) : null;
    const salePrice = contractClient.salePrice || contractClient.price || 0;
    const blob = buildClientContractDocx({
      templateArrayBuffer: arrayBuffer,
      client: contractClient,
      program: contractProgram,
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
    throw createNoValidContractUnitsError({ errors: skippedErrors });
  }

  const zipBlob = zip.generate({
    type: "blob",
    mimeType: ZIP_MIME,
    compression: "DEFLATE",
  });
  const fileName = buildContractsZipFileName(program);
  downloadBlob(zipBlob, fileName);
  return {
    templateType,
    fileName,
    total,
    skippedCount: skippedErrors.length,
    skippedErrors,
  };
}
