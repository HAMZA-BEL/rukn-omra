import PizZip from "pizzip";
import { buildContractTemplateData } from "./contractTemplateData";
import { renderContractDocx } from "./contractDocx";
import { CONTRACT_TEMPLATE_FIELD_GROUPS } from "./contractTemplateFields";

const makeTemplate = () => {
  const zip = new PizZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.folder("_rels").file(".rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.folder("word").file("document.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>مكة: {{program.makkah_haram_distance}} متر</w:t></w:r></w:p><w:p><w:r><w:t>المدينة: {{program.madinah_haram_distance}} متر</w:t></w:r></w:p><w:sectPr/></w:body></w:document>');
  return zip.generate({ type: "arraybuffer" });
};

const blobToArrayBuffer = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
});

const program = { priceTable: [{
  id: "economy",
  level: "اقتصادي",
  hotelMecca: "مكة",
  hotelMadina: "المدينة",
  makkahHaramDistance: 120,
  madinahHaramDistance: 300,
  prices: {},
}] };

test("contract data exposes numeric text without a stored unit", () => {
  const data = buildContractTemplateData({ program, client: { packageId: "economy" } });
  expect(data.program.makkah_haram_distance).toBe("120");
  expect(data.program.madinah_haram_distance).toBe("300");
  expect(data.program.makkah_haram_distance).not.toMatch(/متر|m|km/i);
});

test("both distance variables are exposed in the shared hotel registry", () => {
  const hotels = CONTRACT_TEMPLATE_FIELD_GROUPS.find((group) => group.key === "hotels");
  expect(hotels.fields.map((field) => field.placeholder)).toEqual(expect.arrayContaining([
    "{{program.makkah_haram_distance}}",
    "{{program.madinah_haram_distance}}",
  ]));
});

test("missing distances remain empty for hideIfEmpty", () => {
  const data = buildContractTemplateData({ program: {}, client: {} });
  expect(data.program.makkah_haram_distance).toBe("");
  expect(data.program.madinah_haram_distance).toBe("");
});

test("generated DOCX resolves both hotel distances and keeps the template unit", async () => {
  const data = buildContractTemplateData({ program, client: { packageId: "economy" } });
  const blob = renderContractDocx(makeTemplate(), data);
  const xml = new PizZip(await blobToArrayBuffer(blob)).file("word/document.xml").asText();
  expect(xml).toContain("مكة: 120 متر");
  expect(xml).toContain("المدينة: 300 متر");
  expect(xml).not.toContain("program.makkah_haram_distance");
  expect(xml).not.toContain("program.madinah_haram_distance");
});
