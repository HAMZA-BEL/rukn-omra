import fs from "fs";
import path from "path";
import {
  DEFAULT_DOCUMENT_BRANDING,
  CONNECTED_DOCUMENT_TYPES,
  buildAgencyDocumentFooterHtml,
  buildAgencyDocumentHeaderHtml,
  buildAgencyDocumentWatermarkHtml,
  chooseBrandColorFromPixels,
  getAgencyBrandingFooterItems,
  getAgencyBrandingFooterLines,
  getAgencyBrandingDetails,
  getAgencyDocumentBranding,
  getDocumentBrandingPrintCSS,
  getDocumentHeaderLayout,
  getDocumentWatermarkLayout,
  getDocumentFooterPrintCSS,
  getDocumentOrientationPrintCSS,
  isDocumentBrandingEnabled,
  normalizeDocumentBranding,
  normalizeAgencyDocumentBranding,
} from "./documentBranding";

describe("agency document branding", () => {
  test("watermark is backward compatible, clamped, and shared by preview and print",()=>{expect(normalizeDocumentBranding({}).watermark).toEqual({enabled:true,size:110,opacity:10});expect(buildAgencyDocumentWatermarkHtml({agency:{logoUrl:"logo.png"},config:{enabled:true}})).toContain("document-branding-watermark");for(const [size,opacity] of [[40,0],[110,10],[160,100],[240,10],[320,100]]){const config=normalizeDocumentBranding({enabled:true,watermark:{enabled:true,size,opacity}}),layout=getDocumentWatermarkLayout(config),css=getDocumentBrandingPrintCSS(config);expect(layout.previewStyle["--branding-watermark-size"]).toBe(`${size}mm`);expect(layout.previewStyle["--branding-watermark-opacity"]).toBe(`${opacity/100}`);expect(css).toContain(`--branding-watermark-size:${size}mm`);expect(css).toContain(`--branding-watermark-opacity:${opacity/100}`);}expect(normalizeDocumentBranding({watermark:{enabled:true,size:999,opacity:999}}).watermark).toEqual({enabled:true,size:320,opacity:100});});
  test.each(["minimal","modern","formal"])("%s watermark uses the resolved logo independently from header size",(style)=>{const config={enabled:true,style,headerLogoSize:8,watermark:{enabled:true,size:150,opacity:12}},html=buildAgencyDocumentWatermarkHtml({agency:{logoUrl:"logo.png"},config}),css=getDocumentBrandingPrintCSS(config);expect(html).toContain('class="document-branding-watermark"');expect(css).toContain("--branding-logo-size:8mm");expect(css).toContain("--branding-watermark-size:150mm");});
  test("watermark is centered behind content with no layout or pointer impact",()=>{const css=getDocumentBrandingPrintCSS({enabled:true,watermark:{enabled:true}});expect(css).toContain("inset:50% auto auto 50%");expect(css).toContain("transform:translate(-50%,-50%)");expect(css).toContain("position:absolute");expect(css).toContain("pointer-events:none");expect(css).toContain("z-index:0");expect(css).toContain(">*:not(.document-branding-watermark){position:relative;z-index:1}");expect(buildAgencyDocumentWatermarkHtml({agency:{},config:{enabled:true,watermark:{enabled:true}}})).toBe("");});
  test("oversized watermark is clipped by the unchanged paper instead of capped or reflowed",()=>{const print=getDocumentBrandingPrintCSS({enabled:true,watermark:{enabled:true,size:320}}),preview=fs.readFileSync(path.resolve(__dirname,"documentBrandingWatermark.css"),"utf8"),paper=fs.readFileSync(path.resolve(__dirname,"documentBrandingRanges.css"),"utf8");expect(print).toContain("--branding-watermark-size:320mm");expect(print).toContain("overflow:hidden");expect(print).not.toContain("max-width:90%");expect(print).not.toContain("max-height:90%");expect(preview).not.toContain("max-width");expect(preview).not.toContain("max-height");expect(preview).toContain("object-fit:contain");expect(paper).toContain("width:210mm;height:297mm");expect(paper).toContain("width:297mm;height:210mm");});
  test("branding defaults to disabled for new and existing agencies", () => {
    expect(DEFAULT_DOCUMENT_BRANDING.enabled).toBe(false);
    expect(getAgencyDocumentBranding({})).toEqual(DEFAULT_DOCUMENT_BRANDING);
    expect(normalizeAgencyDocumentBranding({documents:{}})).toMatchObject({enabled:false,applyToAll:true});
  });

  test("enable, style and manual brand color persist through normalization", () => {
    expect(normalizeDocumentBranding({ enabled:true, style:"formal", colorMode:"manual", brandColor:"#AABBCC" }))
      .toEqual(expect.objectContaining({ enabled:true, style:"formal", orientation:"portrait", colorMode:"manual", brandColor:"#aabbcc" }));
  });

  test("invalid style and color fail safely", () => {
    expect(normalizeDocumentBranding({ enabled:true, style:"unknown", brandColor:"broken" }))
      .toEqual(expect.objectContaining({ enabled:true, style:"minimal", orientation:"portrait", colorMode:"auto", brandColor:"#0f766e" }));
  });

  test("each document keeps independent settings", () => {
    const branding=normalizeAgencyDocumentBranding({enabled:true,applyToAll:false,defaultProfile:{style:"minimal"},documents:{invoice:{mode:"inherit"},receipt:{mode:"custom",profile:{style:"modern",orientation:"landscape"}},contract:{mode:"off"}}});
    expect(branding.documents.invoice.mode).toBe("inherit");
    expect(branding.documents.receipt.profile).toMatchObject({style:"modern",orientation:"landscape"});
    expect(branding.documents.contract.mode).toBe("off");
  });

  test("applyToAll true inherits the main profile while off disables a document", () => {
    const agency={documentBranding:{enabled:true,applyToAll:true,defaultProfile:{style:"formal"},documents:{invoice:{mode:"inherit"},receipt:{mode:"off"}}}};
    expect(getAgencyDocumentBranding(agency,"invoice")).toMatchObject({enabled:true,style:"formal"});
    expect(getAgencyDocumentBranding(agency,"receipt").enabled).toBe(false);
  });

  test("all five real outputs inherit the main identity by default",()=>{const root=normalizeAgencyDocumentBranding({enabled:true,applyToAll:true,defaultProfile:{style:"formal"},documents:{}});expect(CONNECTED_DOCUMENT_TYPES).toEqual(["invoice","receipt","contract","list","report"]);CONNECTED_DOCUMENT_TYPES.forEach((type)=>expect(root.documents[type].mode).toBe("inherit"));});

  test("missing document keys inherit even in older non-global configurations", () => {
    const root=normalizeAgencyDocumentBranding({enabled:true,applyToAll:false,defaultProfile:{style:"minimal"},documents:{invoice:{mode:"inherit"}}});
    expect(root.documents.invoice.mode).toBe("inherit");
    expect(root.documents.receipt.mode).toBe("inherit");
  });

  test("legacy per-document configs make newly introduced types inherit the main profile",()=>{const root=normalizeAgencyDocumentBranding({documents:{invoice:{enabled:true,style:"modern"},receipt:{enabled:false}}});expect(root.defaultProfile.style).toBe("modern");expect(root.documents.invoice.mode).toBe("custom");expect(root.documents.receipt.mode).toBe("off");expect(root.documents.contract.mode).toBe("inherit");expect(root.documents.list.mode).toBe("inherit");expect(root.documents.report.mode).toBe("inherit");});

  test("legacy global config is read for every document", () => {
    const agency={documentBranding:{enabled:true,style:"formal",brandColor:"#112233"}};
    expect(getAgencyDocumentBranding(agency,"invoice")).toMatchObject({enabled:true,style:"formal"});
    expect(getAgencyDocumentBranding(agency,"receipt")).toMatchObject({enabled:true,style:"formal"});
    expect(getAgencyDocumentBranding(agency,"contract")).toMatchObject({enabled:true,style:"formal"});
    expect(getAgencyDocumentBranding(agency,"list")).toMatchObject({enabled:true,style:"formal"});
    expect(getAgencyDocumentBranding(agency,"report")).toMatchObject({enabled:true,style:"formal"});
  });

  test.each(["contract","list","report"])("%s keeps independent custom and off modes",(type)=>{const custom={documentBranding:{enabled:true,defaultProfile:{style:"minimal"},documents:{[type]:{mode:"custom",profile:{style:"formal",footerTemplate:"footer4"}}}}};expect(getAgencyDocumentBranding(custom,type)).toMatchObject({enabled:true,style:"formal",footerTemplate:"footer4"});const off={documentBranding:{...custom.documentBranding,documents:{[type]:{mode:"off"}}}};expect(getAgencyDocumentBranding(off,type).enabled).toBe(false);});

  test("visible fields are composed automatically into identity and practical details", () => {
    const agency={nameAr:"وكالة",email:"mail@example.test",rc:"55",logoUrl:"logo.png"};
    const config={visibleFields:{logo:true,nameAr:false,email:true,rc:true}};
    const header=buildAgencyDocumentHeaderHtml({agency,config});
    const footer=buildAgencyDocumentFooterHtml({agency,config});
    expect(header).toContain("logo.png"); expect(header).not.toContain("mail@example.test"); expect(header).not.toContain("وكالة");
    expect(footer).toContain("R.C :</span> <bdi>55</bdi>"); expect(footer).toContain("mail@example.test");
  });

  test("missing logo uses deterministic fallback color", () => {
    expect(chooseBrandColorFromPixels(null)).toBe("#0f766e");
  });

  test("transparent, very light and very dark pixels use fallback", () => {
    expect(chooseBrandColorFromPixels(new Uint8ClampedArray([20,20,20,255,255,255,255,255,20,80,120,0]))).toBe("#0f766e");
  });

  test("color extraction chooses a stable saturated bucket", () => {
    const pixels = new Uint8ClampedArray(64);
    for (let index = 0; index < pixels.length; index += 4) pixels.set([20,120,180,255], index);
    expect(chooseBrandColorFromPixels(pixels)).toBe("#2080c0");
  });

  test("missing agency fields are omitted from footer", () => {
    expect(getAgencyBrandingFooterItems({ email:"info@example.test" })).toEqual([{key:"email",value:"info@example.test"}]);
    expect(buildAgencyDocumentFooterHtml({ agency:{}, config:{} })).toBe("");
  });

  test("footer composition adapts deterministically to few and many fields", () => {
    const few=buildAgencyDocumentFooterHtml({agency:{email:"a@b.test",rc:"1"},config:{visibleFields:{email:true,rc:true}}});
    const many=buildAgencyDocumentFooterHtml({agency:{email:"a@b.test",website:"site.test",rc:"1",ice:"2",addressTiznit:"A very long agency address that remains inside the information block",phoneTiznit1:"0500"},config:{visibleFields:{email:true,website:true,rc:true,ice:true,address1:true,phone1:true}}});
    expect(few).toContain("is-compact"); expect(many).toContain("is-dense"); expect(many).toContain("A very long agency address");
  });

  test("portrait and landscape emit genuinely different document composition", () => {
    expect(getDocumentOrientationPrintCSS({orientation:"portrait"})).not.toContain("width:277mm");
    const landscape=getDocumentOrientationPrintCSS({orientation:"landscape"});
    expect(landscape).toContain("width:277mm"); expect(landscape).toContain("grid-template-columns:.8fr 1.2fr");
  });

  test("a list can be landscape while an invoice remains portrait", () => {
    const agency={documentBranding:{enabled:true,applyToAll:true,defaultProfile:{orientation:"portrait"},documents:{invoice:{mode:"inherit"},list:{mode:"custom",profile:{orientation:"landscape"}}}}};
    expect(getAgencyDocumentBranding(agency,"invoice").orientation).toBe("portrait");
    expect(getAgencyDocumentBranding(agency,"list").orientation).toBe("landscape");
  });

  test.each(["minimal", "modern", "formal"])("%s emits a distinct print style", (style) => {
    const css = getDocumentBrandingPrintCSS({ style, brandColor:"#123456" });
    expect(css).toContain(`document-branding-${style}`);
    expect(css).toContain("#123456");
  });

  test.each(["footer1","footer2","footer3","footer4"])("%s has an independent agency information composition",(footerTemplate)=>{const html=buildAgencyDocumentFooterHtml({agency:{email:"a@b.test",rc:"1"},config:{footerTemplate,visibleFields:{email:true,rc:true}}});expect(html).toContain(footerTemplate);});

  test("document language selects Arabic or Latin identity with legacy fallback",()=>{const agency={nameAr:"وكالة عربية",agencyNameLatin:"Latin Agency",addressPrimaryAr:"العنوان العربي",addressPrimaryLatin:"Latin address",addressPrimaryFr:"Legacy French address",addressTiznit:"Legacy address"};expect(getAgencyBrandingDetails(agency,"ar")).toMatchObject({nameAr:"وكالة عربية",nameLatin:"",address1:"العنوان العربي"});expect(getAgencyBrandingDetails(agency,"fr")).toMatchObject({nameAr:"",nameLatin:"Latin Agency",address1:"Latin address"});expect(getAgencyBrandingDetails(agency,"en").address1).toBe("Latin address");expect(getAgencyBrandingDetails({nameFr:"Legacy Latin",addressPrimaryFr:"Legacy French address"},"en")).toMatchObject({nameLatin:"Legacy Latin",address1:"Legacy French address"});expect(getAgencyBrandingDetails({addressTiznit:"Legacy address"},"fr").address1).toBe("Legacy address");});

  test("Arabic document footer remains a Latin LTR semantic block",()=>{const agency={addressPrimaryAr:"عنوان عربي طويل",addressPrimaryLatin:"LOT YASSIR N 29 AFRAG TIZNIT",phoneTiznit1:"0641298739",email:"hamzabelok@gmail.com",website:"ruknomra.com",rc:"3245",ice:"1234346"};const config={footerTemplate:"footer1",visibleFields:{address1:true,phone1:true,email:true,website:true,rc:true,ice:true}};const lines=getAgencyBrandingFooterLines(agency,config,"ar"),html=buildAgencyDocumentFooterHtml({agency,config,lang:"ar"});expect(lines).toHaveLength(3);expect(html).toContain('<footer dir="ltr"');expect(html).toContain("Adresse :");expect(html).toContain("LOT YASSIR N 29 AFRAG TIZNIT");expect(html).not.toContain("عنوان عربي طويل");expect(html.indexOf("hamzabelok@gmail.com")).toBeLessThan(html.indexOf("ruknomra.com"));expect(html.indexOf("ruknomra.com")).toBeLessThan(html.indexOf("3245"));expect(html).toContain(" - ");expect(html).not.toContain(" -  - ");expect(html).not.toContain("undefined");});

  test.each(["footer1","footer2","footer3","footer4"])("%s renders selected bank details with shared preview/print composition",(footerTemplate)=>{const agency={bankName:"Banque Atlas",bankAccountHolder:"RUKN SARL",bankAccountNumber:"CB123",bankRib:"RIB123",bankIban:"MA640001",bankSwift:"BCMAMAMC"},config={footerTemplate,visibleFields:{bank:true,bankHolder:true,bankAccount:true,rib:true,iban:true,swift:true}},items=getAgencyBrandingFooterItems(agency,config),html=buildAgencyDocumentFooterHtml({agency,config});expect(items.map((item)=>item.key)).toEqual(["bank","bankHolder","bankAccount","rib","iban","swift"]);for(const value of ["Banque Atlas","RUKN SARL","CB123","RIB123","MA640001","BCMAMAMC"])expect(html).toContain(value);expect(html).toContain('dir="ltr"');});

  test("missing and hidden bank fields emit neither empty labels nor separators",()=>{const agency={bankName:"Banque Atlas",bankIban:""},config={footerTemplate:"footer1",visibleFields:{bank:true,bankHolder:true,bankAccount:true,rib:true,iban:true,swift:false}},html=buildAgencyDocumentFooterHtml({agency,config});expect(html).toContain("Banque Atlas");expect(html).not.toContain("Titulaire");expect(html).not.toContain("IBAN");expect(html).not.toContain("SWIFT");expect(html).not.toContain(" -  - ");});

  test.each([[{email:"a@b.test"},1],[{addressTiznit:"A",email:"a@b.test"},2],[{addressTiznit:"A",email:"a@b.test",ice:"2"},3]])("footer1 uses %s available lines",(agency,count)=>{const html=buildAgencyDocumentFooterHtml({agency,config:{footerTemplate:"footer1"},lang:"en"});expect(html).toContain(`data-footer-lines="${count}"`);expect(html).not.toContain(" -  - ");});

  test("footer1 print CSS stays compact and wrapping in portrait and landscape",()=>{const css=getDocumentFooterPrintCSS({footerTemplate:"footer1"});expect(css).toContain("border-inline-start");expect(css).toContain("display:block");expect(css).toContain("direction:ltr");expect(css).toContain("unicode-bidi:isolate");expect(css).toContain("white-space:normal");expect(css).toContain("grid-template-columns:none");expect(css).not.toContain("space-between");expect(getDocumentOrientationPrintCSS({orientation:"portrait"})).toContain("document-branding-footer");expect(getDocumentOrientationPrintCSS({orientation:"landscape"})).toContain("width:277mm");});

  test.each(["footer1","footer2","footer3","footer4"])("%s agency data is explicitly LTR",(footerTemplate)=>{expect(buildAgencyDocumentFooterHtml({agency:{addressPrimaryLatin:"Latin address",email:"a@b.test"},config:{footerTemplate}})).toContain('dir="ltr"');});

  test("four footer designs emit genuinely different compositions",()=>{const agency={addressPrimaryLatin:"Long Latin address",phoneTiznit1:"0500",email:"a@b.test",website:"site.test",rc:"1",ice:"2"},outputs=Object.fromEntries(["footer1","footer2","footer3","footer4"].map((footerTemplate)=>[footerTemplate,buildAgencyDocumentFooterHtml({agency,config:{footerTemplate}})]));expect(outputs.footer1).toContain("footer-line");expect(outputs.footer1).not.toContain("footer2-inline");expect(outputs.footer2).toContain("footer2-inline");expect(outputs.footer2).toContain("footer2-dot");expect(outputs.footer3).toContain("footer3-groups");expect(outputs.footer3).toContain("group-contact");expect(outputs.footer3).toContain("group-digital");expect(outputs.footer3).toContain("group-legal");expect(outputs.footer4).toContain("footer4-strip-content");expect(new Set(Object.values(outputs)).size).toBe(4);});

  test("footer3 print composition is compact, wrapping and never wide columns",()=>{const css=getDocumentFooterPrintCSS({footerTemplate:"footer3"});expect(css).toContain("justify-content:flex-start");expect(css).toContain("flex-wrap:wrap");expect(css).toContain("flex:0 1 auto");expect(css).not.toContain("space-between");expect(css).not.toContain("repeat(3");});

  test("footer2 is minimal inline and footer4 is the only filled high-contrast strip",()=>{const minimal=getDocumentFooterPrintCSS({footerTemplate:"footer2"}),strip=getDocumentFooterPrintCSS({footerTemplate:"footer4"});expect(minimal).toContain("footer2-inline");expect(minimal).toContain("background:transparent");expect(strip).toContain("background:var(--brand)");expect(strip).toContain("color:#fff");});

  test("per-document custom profile can select a different footer design",()=>{const agency={documentBranding:{enabled:true,applyToAll:true,defaultProfile:{footerTemplate:"footer2"},documents:{invoice:{mode:"inherit"},receipt:{mode:"custom",profile:{footerTemplate:"footer4"}}}}};expect(getAgencyDocumentBranding(agency,"invoice").footerTemplate).toBe("footer2");expect(getAgencyDocumentBranding(agency,"receipt").footerTemplate).toBe("footer4");});

  test("enabled branding supplies shared invoice/receipt header and footer markup", () => {
    const agency = { nameAr:"وكالة الاختبار", rc:"123", addressTiznit:"عنوان" };
    expect(buildAgencyDocumentHeaderHtml({ agency, config:{ enabled:true }, title:"فاتورة" })).toContain("document-branding-header");
    expect(buildAgencyDocumentFooterHtml({ agency, config:{ enabled:true } })).toContain("document-branding-footer");
  });

  test("branding header contains agency identity only with physical defaults",()=>{const config={style:"modern"},header=buildAgencyDocumentHeaderHtml({agency:{logoUrl:"logo.png",nameFr:"Latin Agency"},config,title:"FACTURE N° 4",number:"4",lang:"fr"}),css=getDocumentBrandingPrintCSS(config);expect(header).toContain("logo.png");expect(header).toContain("Latin Agency");expect(header).not.toContain("FACTURE");expect(css).toContain("--branding-logo-size:22mm");expect(css).toContain("--branding-name-size:20pt");expect(css).toContain("--branding-top-space:21mm");});

  test("orientation changes the page without overriding the selected header",()=>{const landscape=getDocumentOrientationPrintCSS({orientation:"landscape"});expect(landscape).toContain("padding-top:7mm");expect(landscape).not.toContain("document-branding-logo");expect(landscape).not.toContain("document-branding-name");});

  test("old categorical controls normalize to canonical numeric ranges",()=>{const config=normalizeDocumentBranding({headerLogoSize:"xlarge",headerNameSize:"small",headerAlign:"center",headerPlacement:"stacked",headerDensity:"compact",headerGap:"wide",headerDivider:false});const layout=getDocumentHeaderLayout(config);expect(config).toMatchObject({headerLogoSize:28,headerNameSize:12,headerAlign:"center",headerDensity:16,headerGap:8,headerDivider:false});expect(layout.previewStyle).toEqual(layout.variables);expect(layout.printVars).toContain("--branding-logo-size:28mm");});

  test("numeric slider min mid and max resolve identically for preview and print",()=>{for(const [key,values,variable] of [["headerLogoSize",[8,22,42],"--branding-logo-size"],["headerNameSize",[9,20,34],"--branding-name-size"],["headerDensity",[14,21,40],"--branding-top-space"],["headerGap",[1,5,14],"--branding-identity-gap"],["footerSize",[6,9,15],"--branding-footer-size"]]){const resolved=values.map((value)=>getDocumentHeaderLayout({[key]:value}));expect(parseFloat(resolved[1].variables[variable])).toBeGreaterThan(parseFloat(resolved[0].variables[variable]));expect(parseFloat(resolved[2].variables[variable])).toBeGreaterThan(parseFloat(resolved[1].variables[variable]));resolved.forEach((layout)=>expect(layout.previewStyle[variable]).toBe(layout.variables[variable]));}});

  test("top-space is consumed by the same real header padding in preview and print",()=>{const previewCss=fs.readFileSync(path.resolve(__dirname,"documentBrandingHeader.css"),"utf8"),printCss=getDocumentBrandingPrintCSS({headerDensity:32,headerLogoSize:27,headerNameSize:19});expect(normalizeDocumentBranding({headerDensity:32}).headerDensity).toBe(32);expect(getDocumentHeaderLayout({headerDensity:32}).previewStyle["--branding-top-space"]).toBe("32mm");expect(printCss).toContain("--branding-top-space:32mm");expect(previewCss).toContain("padding-block-end: calc(var(--branding-top-space) - 12mm)");expect(printCss).toContain("padding-block-end:calc(var(--branding-top-space) - 12mm)");expect(printCss).toContain("--branding-logo-size:27mm");expect(printCss).toContain("--branding-name-size:19pt");});

  test("maximum top-space keeps normal document flow instead of shrinking or overlapping content",()=>{const css=getDocumentBrandingPrintCSS({headerDensity:40});expect(css).toContain("--branding-top-space:40mm");expect(css).toContain("display:flex;flex-direction:column");expect(css).toContain("margin-top:auto");expect(css).not.toMatch(/document-branding-header[^}]*position:(?:absolute|fixed)/);expect(css).not.toMatch(/branded-invoice-content[^}]*transform|branded-invoice-content[^}]*scale/);});

  test("maximum logo exceeds the old maximum while all slider ranges clamp safely",()=>{expect(normalizeDocumentBranding({headerLogoSize:999,headerNameSize:999,headerDensity:999,headerGap:999,footerSize:999})).toMatchObject({headerLogoSize:42,headerNameSize:34,headerDensity:40,headerGap:14,footerSize:15});expect(normalizeDocumentBranding({headerLogoSize:-1,headerNameSize:-1,headerDensity:-1,headerGap:-1,footerSize:-1})).toMatchObject({headerLogoSize:8,headerNameSize:9,headerDensity:14,headerGap:1,footerSize:6});expect(42).toBeGreaterThan(28);});

  test.each(["minimal","modern","formal"])("%s preserves chosen physical sizing",(style)=>{const config={style,headerLogoSize:39,headerNameSize:31,headerDensity:36,headerGap:11,footerSize:14},css=getDocumentBrandingPrintCSS(config);for(const token of ["--branding-logo-size:39mm","--branding-name-size:31pt","--branding-top-space:36mm","--branding-identity-gap:11mm","--branding-footer-size:14pt"])expect(css).toContain(token);});

  test.each(["right","center","left"])("physical %s alignment is emitted independent of document direction",(headerAlign)=>{const ar=buildAgencyDocumentHeaderHtml({agency:{nameAr:"وكالة"},config:{headerAlign},lang:"ar"}),en=buildAgencyDocumentHeaderHtml({agency:{agencyNameLatin:"Agency"},config:{headerAlign},lang:"en"});expect(ar).toContain(`header-align-${headerAlign}`);expect(ar).toContain('identity-dir-rtl');expect(en).toContain(`header-align-${headerAlign}`);expect(en).toContain('identity-dir-ltr');});

  test.each(["footer1","footer2","footer3","footer4"])("%s consumes footer size without fixed positioning",(footerTemplate)=>{const css=getDocumentBrandingPrintCSS({footerSize:14})+getDocumentFooterPrintCSS({footerTemplate,footerSize:14});expect(css).toContain("--branding-footer-size:14pt");expect(css).toContain("position:static");expect(css).not.toContain("position:fixed");expect(css).not.toMatch(/document-branding-footer[^}]*position:absolute/);});

  test("preview and print consume the same logo variable without an oversized slot",()=>{const printCss=getDocumentBrandingPrintCSS({headerLogoSize:42}),previewCss=fs.readFileSync(path.resolve(__dirname,"documentBrandingHeader.css"),"utf8");expect(printCss).toContain("block-size:var(--branding-logo-size)");expect(printCss).toContain("max-inline-size:min(calc(var(--branding-logo-size) * 4),48%)");expect(previewCss).toContain("block-size: var(--branding-logo-size)");expect(previewCss).toContain("object-fit: contain");});

  test.each(["inline-start","inline-end","stacked"])("%s keeps logo and complete agency name in the responsive identity group",(headerPlacement)=>{const config={headerPlacement,headerLogoSize:"xlarge",headerNameSize:"xlarge"},html=buildAgencyDocumentHeaderHtml({agency:{logoUrl:"logo.png",nameAr:"وكالة الأسفار والسياحة دار الإيمان"},config,lang:"ar"}),css=getDocumentBrandingPrintCSS(config);expect(html).toContain(`header-placement-${headerPlacement}`);expect(html).toContain("وكالة الأسفار والسياحة دار الإيمان");expect(css).toContain("flex:0 1 auto");expect(css).toContain("white-space:normal");expect(css).toContain("overflow:visible");expect(css).toContain("text-overflow:clip");expect(css).toContain("max-inline-size:100%");expect(css).not.toContain("text-overflow:ellipsis");});

  test("traditional print footer uses the shared size and compact wrapping",()=>{const css=getDocumentBrandingPrintCSS({style:"minimal",footerSize:13})+getDocumentFooterPrintCSS({footerTemplate:"footer1",footerSize:13});expect(css).toContain("--branding-footer-size:13pt");expect(css).toContain("font-size:var(--branding-footer-size)");expect(css).toContain("line-height:1.5");expect(css).not.toContain("justify-content:space-between");});

  test("branded page pushes a short footer down without absolute positioning or long-content overlap",()=>{const css=getDocumentBrandingPrintCSS({style:"minimal"});expect(css).toContain("display:flex;flex-direction:column");expect(css).toContain("margin-top:auto");expect(css).toContain("break-inside:avoid");expect(css).toContain("page-break-inside:avoid");expect(css).not.toMatch(/document-branding-(?:header|footer)[^}]*position:absolute/);expect(css).not.toContain("position:fixed");});

  test("per-print override never mutates permanent configuration", () => {
    const agency = { documentBranding:{ enabled:true, style:"modern", colorMode:"auto", brandColor:"#123456" } };
    const before = JSON.stringify(agency.documentBranding);
    expect(isDocumentBrandingEnabled(agency, false)).toBe(false);
    expect(JSON.stringify(agency.documentBranding)).toBe(before);
  });
});
