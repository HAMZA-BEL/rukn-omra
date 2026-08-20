import PizZip from "pizzip";
import { buildContractTemplateData } from "./contractTemplateData";
import { renderContractDocx } from "./contractDocx";

const routeProgram = {
  name: "برنامج الاختبار",
  type: "عمرة",
  outboundRouteStops: ["الدار البيضاء", "المدينة المنورة", "جدة"],
  returnRouteStops: ["جدة", "الدار البيضاء"],
};

const makeRouteTemplate = () => {
  const zip = new PizZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.folder("_rels").file(".rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.folder("word").file("document.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{program.travel_route}}</w:t></w:r></w:p><w:sectPr/></w:body></w:document>');
  return zip.generate({ type: "arraybuffer" });
};

const blobToArrayBuffer = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
});

test("all registered route aliases receive the same canonical value", () => {
  const data = buildContractTemplateData({ program: routeProgram });
  const expected = "الدار البيضاء ← المدينة المنورة ← جدة | جدة ← الدار البيضاء";
  ["route", "travel_route", "itinerary", "route_text", "travelRoute", "routeText"]
    .forEach((key) => expect(data.program[key]).toBe(expected));
});

test("Builder data is empty rather than a generic marker when route is absent", () => {
  const data = buildContractTemplateData({ program: {} });
  expect(data.program.travel_route).toBe("");
  expect(JSON.stringify(data.program)).not.toMatch(/محدد|\[object Object\]|undefined|null/);
});

test("a real DOCX replaces program.travel_route inside generated OOXML", async () => {
  const data = buildContractTemplateData({ program: routeProgram });
  const generated = renderContractDocx(makeRouteTemplate(), data);
  const outputZip = new PizZip(await blobToArrayBuffer(generated));
  const xml = outputZip.file("word/document.xml").asText();
  expect(xml).toContain("الدار البيضاء ← المدينة المنورة ← جدة | جدة ← الدار البيضاء");
  expect(xml).not.toContain("program.travel_route");
});
