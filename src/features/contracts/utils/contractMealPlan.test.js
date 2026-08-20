import PizZip from "pizzip";
import { buildContractTemplateData } from "./contractTemplateData";
import { renderContractDocx } from "./contractDocx";
import { CONTRACT_TEMPLATE_FIELD_GROUPS } from "./contractTemplateFields";

const template = () => {
  const zip = new PizZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.folder("_rels").file(".rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.folder("word").file("document.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>نظام الوجبات: {{program.meal_plan}}</w:t></w:r></w:p><w:sectPr/></w:body></w:document>');
  return zip.generate({ type: "arraybuffer" });
};

const blobBuffer = (blob) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsArrayBuffer(blob); });
const program = (mealPlan) => ({ priceTable: [
  { id: "first", level: "أول", mealPlan: "none", prices: {} },
  { id: "selected", level: "مختار", mealPlan, prices: {} },
] });

test.each([
  ["breakfast", "إفطار"],
  ["half_board", "نصف إعاشة — إفطار وعشاء"],
  ["full_board", "إعاشة كاملة — إفطار وغداء وعشاء"],
])("DOCX resolves %s from the client's selected package", async (value, label) => {
  const data = buildContractTemplateData({ program: program(value), client: { packageId: "selected" } });
  expect(data.program.meal_plan).toBe(label);
  const xml = new PizZip(await blobBuffer(renderContractDocx(template(), data))).file("word/document.xml").asText();
  expect(xml).toContain(`نظام الوجبات: ${label}`);
  expect(xml).not.toContain("program.meal_plan");
});

test("meal plan has one canonical visible contract variable and empty stays empty", () => {
  const fields = CONTRACT_TEMPLATE_FIELD_GROUPS.flatMap((group) => group.fields || []);
  expect(fields.filter((field) => field.placeholder === "{{program.meal_plan}}")).toHaveLength(1);
  expect(buildContractTemplateData({ program: {}, client: {} }).program.meal_plan).toBe("");
});
