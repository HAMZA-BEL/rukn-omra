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
  const blob = renderContractDocx(arrayBuffer, contractData);
  const fileName = buildContractFileName({ client, lang });
  downloadBlob(blob, fileName);
  return { templateType, fileName };
}
