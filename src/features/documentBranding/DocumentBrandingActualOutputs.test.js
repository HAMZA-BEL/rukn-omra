import { printProgramPDF, printClearancePDF } from "../../utils/exportPdf";
import { printProgramCostingReport } from "../../utils/programCostingPdf";
import { buildContractTemplateData } from "../contracts/utils/contractTemplateData";

const brandedAgency=(documents={})=>({
  nameAr:"وكالة الاختبار",nameFr:"Test Agency",logoUrl:"logo.png",email:"mail@example.test",ice:"ICE-1",bankName:"Banque Atlas",bankAccountNumber:"CB123",bankIban:"MA640001",bankSwift:"BCMAMAMC",
  documentBranding:{enabled:true,applyToAll:true,defaultProfile:{style:"modern",footerTemplate:"footer2",watermark:{enabled:true,size:144,opacity:17}},documents},
});

const capturePrintHtml=(run)=>{
  let html="";
  const previous=window.open;
  window.open=jest.fn(()=>({document:{write:(value)=>{html=value;},close:jest.fn()}}));
  try{run();}finally{window.open=previous;}
  return html;
};

describe("actual document branding output connections",()=>{
  test("program list consumes the resolved list profile without changing table content",()=>{
    const html=capturePrintHtml(()=>printProgramPDF({program:{name:"PROGRAM-X"},clients:[],lang:"en",t:{},agency:brandedAgency({list:{mode:"custom",profile:{style:"formal",footerTemplate:"footer4",visibleFields:{bank:true,bankAccount:true,iban:true,swift:true},watermark:{enabled:true,size:201,opacity:23}}}})}));
    expect(html).toContain("document-branding-formal");
    expect(html).toContain("footer4");
    expect(html).toContain("--branding-watermark-size:201mm");
    expect(html).toContain("PROGRAM-X");
    expect(html).toContain("Banque Atlas");
    expect(html).toContain("CB123");
    expect(html).toContain("MA640001");
    expect(html).toContain("BCMAMAMC");
  });

  test("off list profile keeps the legacy list renderer and removes generated branding",()=>{
    const html=capturePrintHtml(()=>printProgramPDF({program:{name:"PROGRAM-X"},clients:[],lang:"en",t:{},agency:brandedAgency({list:{mode:"off"}})}));
    expect(html).not.toContain("document-branding-header");
    expect(html).toContain("page-header");
    expect(html).not.toContain("Test Agency");
    expect(html).toContain("PROGRAM-X");
  });

  test("clearance and costing outputs share the resolved report profile",()=>{
    const agency=brandedAgency({report:{mode:"custom",profile:{style:"formal",footerTemplate:"footer3",watermark:{enabled:true,size:188,opacity:19}}}});
    const clearance=capturePrintHtml(()=>printClearancePDF({data:[],totals:{},filterLabel:"ALL",lang:"en",t:{},agency}));
    const labels=new Proxy({reportTitle:"COST REPORT",print:"Print",note:"NOTE",resultsPrices:"Results",sharedCosts:"Shared",programDates:"Dates",generatedOn:"Generated",currencyRate:"Rate",notSpecified:"—"},{get:(target,key)=>target[key]||String(key)});
    const costing=capturePrintHtml(()=>printProgramCostingReport({program:{name:"PROGRAM-X"},agency,draft:{},results:[],labels,lang:"en"}));
    for(const html of [clearance,costing]){expect(html).toContain("document-branding-formal");expect(html).toContain("footer3");expect(html).toContain("--branding-watermark-size:188mm");}
    expect(clearance).toContain("ALL");
    expect(costing).toContain("COST REPORT");
  });

  test("contract DOCX placeholders honor inherit, custom field visibility and off without touching contract data",()=>{
    const base={client:{firstName:"CLIENT",lastName:"UNCHANGED"},program:{name:"PROGRAM-X"},lang:"en"};
    const inherited=buildContractTemplateData({...base,agency:brandedAgency()});
    expect(inherited.agency.name).toBe("Test Agency");
    expect(inherited.agency.email).toBe("mail@example.test");
    expect(inherited.full_name).toBe("CLIENT UNCHANGED");
    const custom=buildContractTemplateData({...base,agency:brandedAgency({contract:{mode:"custom",profile:{visibleFields:{nameLatin:true,email:false,ice:true}}}})});
    expect(custom.agency.name).toBe("Test Agency");
    expect(custom.agency.email).toBe("");
    expect(custom.agency.ice).toBe("ICE-1");
    const off=buildContractTemplateData({...base,agency:brandedAgency({contract:{mode:"off"}})});
    expect(off.agency.name).toBe("");
    expect(off.agency.email).toBe("");
    expect(off.full_name).toBe("CLIENT UNCHANGED");
  });

  test("agencies without enabled branding keep legacy contract agency placeholders",()=>{
    const data=buildContractTemplateData({client:{firstName:"A"},program:{name:"P"},agency:{nameFr:"Legacy Agency",email:"legacy@example.test"},lang:"en"});
    expect(data.agency.name).toBe("Legacy Agency");
    expect(data.agency.email).toBe("legacy@example.test");
  });
});
