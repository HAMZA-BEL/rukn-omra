import { printInvoiceSnapshot, printProformaInvoice, printReceipt, printSharedReceipt, resolveAgencyForBrandedPrint } from "./PrintTemplates";

const makePrintWindow = () => {
  let html = "";
  return {
    document: { write: jest.fn((value) => { html += value; }), close: jest.fn() },
    getHtml: () => html,
  };
};

const agency = (enabled) => ({
  nameAr:"وكالة الاختبار",
  nameFr:"Agence Test",
  addressTiznit:"العنوان",
  phoneTiznit1:"0500000000",
  logoUrl:"https://example.test/logo.png",
  documentBranding:{ enabled, style:"modern", colorMode:"manual", brandColor:"#123456" },
});

describe("invoice and receipt document branding integration", () => {
  afterEach(() => jest.restoreAllMocks());

  test("branding OFF preserves the legacy receipt markup", () => {
    const target = makePrintWindow();
    jest.spyOn(window, "open").mockReturnValue(target);
    printReceipt({ payment:{ amount:100, date:"2026-08-11", receiptNo:"R-1" }, client:{ id:"c1", nameAr:"عميل" }, program:{ name:"برنامج" }, agency:agency(false) });
    expect(target.getHtml()).not.toContain("document-branding-header");
    expect(target.getHtml()).toContain("receipt-logo");
  });

  test("branding ON adds the shared header/footer to a receipt", () => {
    const target = makePrintWindow();
    jest.spyOn(window, "open").mockReturnValue(target);
    printReceipt({ payment:{ amount:100, date:"2026-08-11", receiptNo:"R-1" }, client:{ id:"c1", nameAr:"عميل" }, program:{ name:"برنامج" }, agency:agency(true) });
    expect(target.getHtml()).toContain("document-branding-header");
    expect(target.getHtml()).toContain("document-branding-footer");
  });

  test("shared receipt uses the same branding layer", () => {
    const target = makePrintWindow();
    jest.spyOn(window, "open").mockReturnValue(target);
    printSharedReceipt({ receipt:{ amount:100, date:"2026-08-11", receiptNo:"R-2", allocations:[] }, program:{ name:"برنامج" }, agency:agency(true) });
    expect(target.getHtml()).toContain("document-branding-modern");
    expect(target.getHtml()).toContain("#123456");
  });

  test("watermark reaches actual receipt print with the resolved values",()=>{const source=agency(true);source.documentBranding.watermark={enabled:true,size:140,opacity:8};const target=makePrintWindow();jest.spyOn(window,"open").mockReturnValue(target);printReceipt({payment:{amount:100,date:"2026-08-11",receiptNo:"R-W"},client:{id:"c1"},program:{name:"برنامج"},agency:source});const html=target.getHtml();expect(html).toContain('class="document-branding-watermark"');expect(html).toContain("--branding-watermark-size:140mm");expect(html).toContain("--branding-watermark-opacity:0.08");expect(html.indexOf("document-branding-watermark")).toBeLessThan(html.indexOf("document-branding-header"));});

  test("per-print override hides branding without changing agency config", () => {
    const source = agency(true);
    const target = makePrintWindow();
    jest.spyOn(window, "open").mockReturnValue(target);
    printReceipt({ payment:{ amount:100, date:"2026-08-11", receiptNo:"R-3" }, client:{ id:"c1" }, program:{ name:"برنامج" }, agency:source, brandingEnabled:false });
    expect(target.getHtml()).not.toContain("document-branding-header");
    expect(source.documentBranding.enabled).toBe(true);
  });

  test("receipt configuration is independent from invoice configuration", () => {
    const source={...agency(false),documentBranding:{enabled:true,applyToAll:false,defaultProfile:{style:"formal"},documents:{invoice:{mode:"inherit"},receipt:{mode:"off"}}}};
    const target=makePrintWindow(); jest.spyOn(window,"open").mockReturnValue(target);
    printReceipt({payment:{amount:100,date:"2026-08-11",receiptNo:"R-4"},client:{id:"c1"},program:{name:"برنامج"},agency:source});
    expect(target.getHtml()).not.toContain("document-branding-header");
    expect(source.documentBranding.documents.invoice.mode).toBe("inherit");
  });

  const invoiceArgs=(overrides={})=>({client:{id:"invoice-client",nameAr:"عميل تجريبي",salePrice:1000,phone:"0500",roomType:"double"},program:null,payments:[{id:"p1",amount:1000,date:"2026-08-11",receiptNo:"R-1"}],agency:agency(true),recipient:{type:"client"},invoiceApi:null,...overrides});
  const snapshot={id:"invoice-1",invoiceNumber:"0004/2026",invoiceDisplayNumber:"0004/2026",issueDate:"2026-08-11",recipientSnapshot:{name:"Sample Client",clientName:"Sample Client",phone:"0500"},programSnapshot:{programName:"Sample Program",departureDate:"2026-09-01",returnDate:"2026-09-10",roomType:"double"},amountSnapshot:{total:1000,currency:"MAD"},paymentReferences:[{receiptNumber:"R-1",date:"2026-08-11",amount:1000}]};

  test.each([["fr","ltr","FACTURE N°"],["en","ltr","INVOICE No."],["ar","rtl","فاتورة رقم"]])("invoice language %s controls the complete document direction and title",async(lang,dir,title)=>{const target=makePrintWindow();jest.spyOn(window,"open").mockReturnValue(target);await printInvoiceSnapshot({snapshot,agency:agency(true),lang});expect(target.getHtml()).toContain(`<html dir="${dir}"`);expect(target.getHtml()).toContain(title);});

  test("actual branded invoice renders resolved logo and number only in body",async()=>{const target=makePrintWindow();jest.spyOn(window,"open").mockReturnValue(target);await printInvoiceSnapshot({snapshot,agency:agency(true),lang:"fr"});const html=target.getHtml(),header=html.match(/<header[\s\S]*?<\/header>/)?.[0]||"";expect(header).toContain("https://example.test/logo.png");expect(header).toContain("Agence Test");expect(header).not.toContain("FACTURE");expect(header).not.toMatch(/N°|2026-001/);expect(html).toMatch(/<div class="title">FACTURE N°/);});

  test("branded invoice alone gets flex page composition while plain layout stays unchanged",async()=>{const branded=makePrintWindow();jest.spyOn(window,"open").mockReturnValue(branded);await printInvoiceSnapshot({snapshot,agency:agency(true),lang:"en"});expect(branded.getHtml()).toContain('class="page branded-invoice-page"');expect(branded.getHtml()).toContain('class="branded-invoice-content"');jest.restoreAllMocks();const plain=makePrintWindow();jest.spyOn(window,"open").mockReturnValue(plain);await printInvoiceSnapshot({snapshot,agency:agency(false),lang:"en",brandingEnabled:false});expect(plain.getHtml()).toContain('<div class="page">');expect(plain.getHtml()).not.toContain("branded-invoice-content");});

  test("Proforma translates its body title and renders logo without header metadata",async()=>{const target=makePrintWindow();jest.spyOn(window,"open").mockReturnValue(target);await printProformaInvoice(invoiceArgs({lang:"en",payments:[]}));const html=target.getHtml(),header=html.match(/<header[\s\S]*?<\/header>/)?.[0]||"";expect(html).toContain('<div class="title">PROFORMA INVOICE</div>');expect(header).toContain("logo.png");expect(header).not.toContain("PROFORMA");});

  test("branding OFF keeps language selection while preserving plain print",async()=>{const target=makePrintWindow();jest.spyOn(window,"open").mockReturnValue(target);await printProformaInvoice(invoiceArgs({lang:"fr",payments:[],brandingEnabled:false}));expect(target.getHtml()).toContain('<div class="title">FACTURE PROFORMA</div>');expect(target.getHtml()).not.toContain("document-branding-header");});

  test("actual print resolves a stored logo path through the existing logo API",async()=>{const source={...agency(true),logoUrl:"",logoPath:"agencies/a/logo.png"},logoApi={getLogoUrl:jest.fn().mockResolvedValue("https://cdn.test/resolved-logo.png")};const resolved=await resolveAgencyForBrandedPrint(source,logoApi);expect(logoApi.getLogoUrl).toHaveBeenCalledWith("agencies/a/logo.png");expect(resolved.logoUrl).toBe("https://cdn.test/resolved-logo.png");expect(source.logoUrl).toBe("");});

  test("missing logo resolves gracefully without a broken image",async()=>{const resolved=await resolveAgencyForBrandedPrint({...agency(true),logoUrl:"",logoPath:""},{getLogoUrl:jest.fn()});const target=makePrintWindow();jest.spyOn(window,"open").mockReturnValue(target);await printInvoiceSnapshot({snapshot,agency:resolved,lang:"en"});expect(target.getHtml()).not.toContain('<img class="document-branding-logo"');expect(target.getHtml()).toContain("document-branding-name");});

  test("actual invoice emits canonical physical branding tokens and flow-safe footer",async()=>{const configured=agency(true);configured.documentBranding.defaultProfile={...configured.documentBranding.defaultProfile,headerLogoSize:40,headerNameSize:30,headerDensity:35,headerGap:10,footerSize:14};const target=makePrintWindow();jest.spyOn(window,"open").mockReturnValue(target);await printInvoiceSnapshot({snapshot,agency:configured,lang:"en"});const html=target.getHtml();expect(html).toContain("--branding-logo-size:40mm");expect(html).toContain("--branding-name-size:30pt");expect(html).toContain("--branding-top-space:35mm");expect(html).toContain("--branding-identity-gap:10mm");expect(html).toContain("--branding-footer-size:14pt");expect(html).toContain("branded-invoice-page");expect(html).toContain("margin-top:auto");expect(html).toContain("position:static");});
});
