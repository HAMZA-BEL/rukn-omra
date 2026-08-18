import { getFontEmbedCSS, toJpeg } from "html-to-image";
import { normalizeSmartBadgeConfig } from "../smartBadgeConfig";
import { BadgeExportProfiler } from "./badgeExportProfiler";
import { getPilgrimPhotoUrl } from "./badgeStorage";
import { getAgencyLogoUrl } from "../../../utils/agencyLogo";
import { constrainSmartBadgeRaster, createSmartBadgeExportJob, makeSmartBadgePdf, renderSmartBadgeJpeg, settleSmartBadgeExport, SMART_BADGE_EXPORT_GEOMETRY } from "./smartBadgePdf";

jest.mock("html-to-image",()=>({getFontEmbedCSS:jest.fn().mockResolvedValue("@font-face{font-family:Cairo}"),toJpeg:jest.fn()}));
jest.mock("./badgeStorage",()=>({getPilgrimPhotoUrl:jest.fn().mockResolvedValue("data:image/jpeg;base64,cGhvdG8=")}));
jest.mock("../../../utils/agencyLogo",()=>({getAgencyLogoUrl:jest.fn().mockResolvedValue("data:image/png;base64,bG9nbw==")}));

const client={id:"c1",name:"عبدالرحمن محمد عبدالسلام العثماني",passport:{number:"SG5080731"},badgePhotoPath:"pilgrims/c1.jpg",hotelMecca:"فندق مكة",hotelMadina:"فندق المدينة",travelGroupName:"المجموعة الثانية",roomNumber:"1203"};
const program={id:"p1",name:"عمرة رمضان المبارك",departure:"2027-02-20"};
const agency={nameAr:"وكالة الأسفار الدولية",logoPath:"agencies/logo.png"};

beforeEach(()=>{
  jest.spyOn(HTMLImageElement.prototype,"complete","get").mockReturnValue(true);
  getFontEmbedCSS.mockReset().mockResolvedValue("@font-face{font-family:Cairo}");
  getPilgrimPhotoUrl.mockReset().mockResolvedValue("data:image/jpeg;base64,cGhvdG8=");
  getAgencyLogoUrl.mockReset().mockResolvedValue("data:image/png;base64,bG9nbw==");
  toJpeg.htmlHistory=[];
  toJpeg.mockImplementation(async(node,options)=>{toJpeg.lastHtml=node.outerHTML;toJpeg.htmlHistory.push(node.outerHTML);toJpeg.lastOptions=options;toJpeg.lastHost=node.parentElement;return "data:image/jpeg;base64,anBlZw==";});
  global.fetch=jest.fn().mockResolvedValue({ok:true,blob:async()=>new Blob(["jpeg"],{type:"image/jpeg"})});
});

test("agency logo is embedded when available and export succeeds",async()=>{
  const job=createSmartBadgeExportJob({config:normalizeSmartBadgeConfig({printSource:"smart"}),program,agency});
  try{await job.prepare([client]);await job.render({client,photoUrl:"data:image/jpeg;base64,cGhvdG8="});}finally{job.dispose();}
  expect(getAgencyLogoUrl).toHaveBeenCalledWith("agencies/logo.png");
  expect(toJpeg.lastHtml).toContain('alt="شعار وكالة الأسفار الدولية"');
});

test("back side is rasterized only when enabled and follows each front page",async()=>{
  const disabled=createSmartBadgeExportJob({config:normalizeSmartBadgeConfig({sides:{back:{enabled:false}}}),program,agency});
  try{await disabled.prepare([client]);await disabled.render({client});await expect(disabled.renderBack({client})).resolves.toBeNull();}finally{disabled.dispose();}
  expect(toJpeg).toHaveBeenCalledTimes(1);
  toJpeg.mockClear();toJpeg.htmlHistory=[];
  const enabled=createSmartBadgeExportJob({config:normalizeSmartBadgeConfig({sides:{back:{enabled:true,appearance:{backgroundColor:"#123456"},elements:{text:{enabled:true,text:"ظهر مخصص"},image:{enabled:true,source:"pilgrim"},logo:{enabled:true}}}}}),program,agency});
  try{await enabled.prepare([client]);await enabled.render({client});await enabled.renderBack({client});}finally{enabled.dispose();}
  expect(toJpeg).toHaveBeenCalledTimes(2);
  expect(toJpeg.htmlHistory[0]).toContain("smart-badge-person");
  expect(toJpeg.htmlHistory[1]).toContain("smart-badge-back");
  expect(toJpeg.htmlHistory[1]).toContain("ظهر مخصص");
  expect(toJpeg.htmlHistory[1]).toContain('alt="شعار RUKN"');
  expect(toJpeg.lastOptions).toEqual(expect.objectContaining({quality:.98,backgroundColor:"#123456",width:390,height:SMART_BADGE_EXPORT_GEOMETRY.layoutHeightPx}));
});

test.each([
  {nameAr:"وكالة بلا شعار"},
  {nameAr:"وكالة بلا شعار",logoUrl:null,logoPath:null},
  {nameAr:"وكالة بلا شعار",logo_url:"",logo_path:""},
  {nameAr:"وكالة بلا شعار",logoUrl:"null",logoPath:"undefined"},
])("missing or empty logo bypasses storage and export succeeds",async(noLogoAgency)=>{
  const job=createSmartBadgeExportJob({config:normalizeSmartBadgeConfig({printSource:"smart"}),program,agency:noLogoAgency});
  try{await job.prepare([]);expect(getAgencyLogoUrl).not.toHaveBeenCalled();expect(global.fetch).not.toHaveBeenCalled();await job.render({client:{...client,badgePhotoPath:""},photoUrl:"data:image/jpeg;base64,cGhvdG8="});}finally{job.dispose();}
  expect(toJpeg.lastHtml).toContain("smart-badge-logo-empty");expect(toJpeg.lastHtml).not.toContain("smart-badge-agency-mark");
});

test("broken logo fetch falls back to an empty logo without stopping export",async()=>{
  getAgencyLogoUrl.mockResolvedValueOnce("https://example.test/missing.png");
  global.fetch.mockResolvedValueOnce({ok:false,status:404});
  const job=createSmartBadgeExportJob({config:normalizeSmartBadgeConfig({printSource:"smart"}),program,agency:{nameAr:"وكالة",logoPath:"agencies/missing.png"}});
  try{await job.prepare([]);await job.render({client:{...client,badgePhotoPath:""},photoUrl:"data:image/jpeg;base64,cGhvdG8="});}finally{job.dispose();}
  expect(getAgencyLogoUrl).toHaveBeenCalledWith("agencies/missing.png");
  expect(toJpeg).toHaveBeenCalledTimes(1);expect(toJpeg.lastHtml).toContain("smart-badge-logo-empty");expect(toJpeg.lastHtml).not.toContain("missing.png");
});

test("logo preprocessing failure falls back to empty and PDF generation continues",async()=>{
  const originalBitmap=global.createImageBitmap;global.createImageBitmap=jest.fn().mockRejectedValue(new Error("decode failed"));
  const job=createSmartBadgeExportJob({config:normalizeSmartBadgeConfig({printSource:"smart"}),program,agency:{nameAr:"وكالة",logoUrl:"https://example.test/broken.png"}});
  let jpeg;
  try{await job.prepare([]);jpeg=await job.render({client:{...client,badgePhotoPath:""},photoUrl:"data:image/jpeg;base64,cGhvdG8="});}finally{job.dispose();global.createImageBitmap=originalBitmap;}
  expect(toJpeg.lastHtml).toContain("smart-badge-logo-empty");
  expect(jpeg.type).toBe("image/jpeg");
  const pdf=await makeSmartBadgePdf([{arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer}]);expect(pdf.type).toBe("application/pdf");expect(pdf.size).toBeGreaterThan(0);
});

test("photo paths are signed, fetched and embedded once per unique asset",async()=>{
  jest.spyOn(console,"groupCollapsed").mockImplementation(()=>{});jest.spyOn(console,"table").mockImplementation(()=>{});jest.spyOn(console,"log").mockImplementation(()=>{});jest.spyOn(console,"groupEnd").mockImplementation(()=>{});
  Object.defineProperty(document,"fonts",{configurable:true,value:{ready:Promise.resolve()}});
  getPilgrimPhotoUrl.mockImplementation(async(path)=>`https://example.test/${path}`);
  const profiler=new BadgeExportProfiler({mode:"smart",badges:3}),job=createSmartBadgeExportJob({config:normalizeSmartBadgeConfig({printSource:"smart"}),program,agency:{nameAr:"وكالة"},profiler});
  try{await job.prepare([{badgePhotoPath:"one.jpg"},{badgePhotoPath:"two.jpg"},{badgePhotoPath:"one.jpg"}]);}finally{job.dispose();}
  const summary=profiler.finish();
  expect(getPilgrimPhotoUrl).toHaveBeenCalledTimes(2);
  expect(summary.counters).toEqual(expect.objectContaining({uniquePhotos:2,signedUrlRequests:2,assetFetches:2,fontReadinessWaits:1,reactRoots:1,exportHosts:1}));
  jest.restoreAllMocks();
});

test("large source photos are constrained once to the maximum 300 DPI badge raster",async()=>{
  const source=new Blob(["large-photo"],{type:"image/jpeg"}),resized=new Blob(["resized-photo"],{type:"image/jpeg"}),close=jest.fn(),drawImage=jest.fn(),originalBitmap=global.createImageBitmap,originalCreate=document.createElement.bind(document);
  global.createImageBitmap=jest.fn().mockResolvedValue({width:3000,height:4000,close});
  jest.spyOn(document,"createElement").mockImplementation((tag)=>tag==="canvas"?{width:0,height:0,getContext:()=>({drawImage}),toBlob:(callback)=>callback(resized)}:originalCreate(tag));
  await expect(constrainSmartBadgeRaster(source)).resolves.toBe(resized);
  expect(drawImage).toHaveBeenCalledWith(expect.anything(),0,0,685,913);
  expect(close).toHaveBeenCalledTimes(1);
  document.createElement.mockRestore();global.createImageBitmap=originalBitmap;
});

test("already print-sized images pass through without recompression",async()=>{
  const source=new Blob(["small-photo"],{type:"image/jpeg"}),close=jest.fn(),originalBitmap=global.createImageBitmap;
  global.createImageBitmap=jest.fn().mockResolvedValue({width:600,height:900,close});
  await expect(constrainSmartBadgeRaster(source)).resolves.toBe(source);
  expect(close).toHaveBeenCalledTimes(1);global.createImageBitmap=originalBitmap;
});

test("a batch reuses one host/root/font embedding while fully replacing pilgrim data",async()=>{
  jest.spyOn(console,"groupCollapsed").mockImplementation(()=>{});jest.spyOn(console,"table").mockImplementation(()=>{});jest.spyOn(console,"log").mockImplementation(()=>{});jest.spyOn(console,"groupEnd").mockImplementation(()=>{});
  Object.defineProperty(document,"fonts",{configurable:true,value:{ready:Promise.resolve()}});
  const config=normalizeSmartBadgeConfig({printSource:"smart",appearance:{layoutFamily:"rukn-signature"}}),profiler=new BadgeExportProfiler({mode:"smart",badges:3}),job=createSmartBadgeExportJob({config,program,agency,profiler});
  const pilgrims=[
    {...client,id:"short",name:"علي حسن",badgePhotoPath:""},
    {...client,id:"long",name:"عبدالرحمن محمد عبدالسلام العثماني",badgePhotoPath:""},
    {...client,id:"third",name:"مريم عبدالله",badgePhotoPath:""},
  ];
  const photos=["data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E","data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='2' height='2'/%3E%3C/svg%3E","data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle r='1'/%3E%3C/svg%3E"];
  try{
    await job.prepare(pilgrims);
    for(let index=0;index<pilgrims.length;index+=1)await job.render({client:pilgrims[index],photoUrl:photos[index],badgeIndex:index+1,badgeTotal:pilgrims.length});
  }finally{job.dispose();}
  const summary=profiler.finish();
  expect(summary.counters).toEqual(expect.objectContaining({reactRoots:1,exportHosts:1,fontReadinessWaits:1,fontEmbedCSSGenerations:1,toJpegCalls:3}));
  expect(getFontEmbedCSS).toHaveBeenCalledTimes(1);
  expect(toJpeg).toHaveBeenCalledTimes(3);
  expect(toJpeg.mock.calls.map(([,options])=>({fontEmbedCSS:options.fontEmbedCSS,cacheBust:options.cacheBust}))).toEqual(Array.from({length:3},()=>({fontEmbedCSS:"@font-face{font-family:Cairo}",cacheBust:false})));
  expect(toJpeg.htmlHistory[0]).toContain("علي حسن");expect(toJpeg.htmlHistory[0]).not.toContain("مريم عبدالله");
  expect(toJpeg.htmlHistory[1]).toContain("عبدالرحمن محمد عبدالسلام العثماني");expect(toJpeg.htmlHistory[1]).not.toContain("علي حسن");
  expect(toJpeg.htmlHistory[2]).toContain("مريم عبدالله");expect(toJpeg.htmlHistory[2]).not.toContain("عبدالرحمن محمد عبدالسلام العثماني");
  jest.restoreAllMocks();
});

test("export keeps the preview layout size and uses pixel ratio only for 300 DPI",async()=>{
  const config=normalizeSmartBadgeConfig({printSource:"smart"});
  await renderSmartBadgeJpeg({config,client,program,agency});
  expect(toJpeg.lastHost.classList).toContain("smart-badge-export-host");
  expect(toJpeg.lastHost.dataset).toEqual(expect.objectContaining({logicalWidthMm:"58",logicalHeightMm:"88"}));
  expect(toJpeg.lastHost.style.width).toBe("390px");
  expect(toJpeg.lastHost.style.height).toBe(`${SMART_BADGE_EXPORT_GEOMETRY.layoutHeightPx}px`);
  expect(toJpeg.lastOptions.width).toBe(390);
  expect(toJpeg.lastOptions.height).toBe(SMART_BADGE_EXPORT_GEOMETRY.layoutHeightPx);
  expect(toJpeg.lastOptions.pixelRatio).toBeCloseTo((58*300/25.4)/390,8);
  expect(toJpeg.lastHtml).toContain("width: 390px");
  expect(toJpeg.lastHtml).not.toContain("685px");
});

test("export settlement waits for fonts, image load/decode and two layout frames",async()=>{
  const node=document.createElement("div"),img=document.createElement("img"),events=[];
  node.appendChild(img);Object.defineProperty(img,"complete",{configurable:true,get:()=>false});img.decode=jest.fn(async()=>events.push("decode"));
  const fontReady=Promise.resolve().then(()=>events.push("fonts"));Object.defineProperty(document,"fonts",{configurable:true,value:{ready:fontReady}});
  const originalFrame=window.requestAnimationFrame;window.requestAnimationFrame=(callback)=>{events.push("frame");callback();return 1;};
  const settling=settleSmartBadgeExport(node);await fontReady;await Promise.resolve();img.dispatchEvent(new Event("load"));await settling;window.requestAnimationFrame=originalFrame;
  expect(events).toEqual(["fonts","decode","frame","frame"]);
  expect(img.decode).toHaveBeenCalledTimes(1);
});

test("Smart Badge export uses the selected layout, mix-and-match, overrides and typography",async()=>{
  const a=normalizeSmartBadgeConfig({printSource:"smart",appearance:{layoutFamily:"editorial",valueFontSize:18,badgeBackground:"#112233"},componentSources:{hero:"travel-tag"},effects:{hero:{preset:"floating"},passport:{preset:"elevated",shadowY:5,blur:16}},elements:{passport:{mode:"custom",xMm:7,yMm:48,widthMm:34,heightMm:10,fontSize:19,color:"#abcdef"}}});
  await renderSmartBadgeJpeg({config:a,client,program,agency});
  expect(toJpeg.lastHtml).toContain("template-editorial");
  expect(toJpeg.lastHtml).toContain("hero-source-travel-tag");
  expect(toJpeg.lastHtml).toContain("smart-badge-hero effect-floating");
  expect(toJpeg.lastHtml).toContain("effect-elevated smart-badge-data-field");
  expect(toJpeg.lastHtml).toContain("--effect-shadow-blur: 16px");
  expect(toJpeg.lastHtml).toContain("left: 12.068965517241379%");
  expect(toJpeg.lastHtml).toContain("width: 58.620689655172406%");
  expect(toJpeg.lastHtml).toContain("--element-font-size: 19px");
  expect(toJpeg.lastHtml).toContain("--badge-background: #112233");
  expect(toJpeg.lastHtml).toContain("SG5080731");
  expect(toJpeg.lastHtml).toContain("عبدالرحمن محمد عبدالسلام العثماني");

  const b=normalizeSmartBadgeConfig({printSource:"smart",appearance:{layoutFamily:"rukn-future"}});
  await renderSmartBadgeJpeg({config:b,client,program,agency});
  expect(toJpeg.lastHtml).toContain("template-rukn-future");
  expect(toJpeg.lastHtml).not.toContain("--element-font-size: 19px");
});

test("hidden Smart Badge fields stay hidden in export",async()=>{
  const config=normalizeSmartBadgeConfig({printSource:"smart",content:{passport:false,program:false,travelDate:false,makkahHotel:false,madinahHotel:false,group:false,room:false}});
  await renderSmartBadgeJpeg({config,client,program,agency});
  expect(toJpeg.lastHtml).not.toContain("SG5080731");
  expect(toJpeg.lastHtml).not.toContain("عمرة رمضان المبارك");
});

test("PDF export uses the exact preview label/value offsets",async()=>{
  const config=normalizeSmartBadgeConfig({printSource:"smart",fieldParts:{passport:{value:{offsetXmm:2,offsetYmm:4},label:{offsetXmm:-.5,offsetYmm:1}},makkahHotel:{value:{offsetXmm:1.5,offsetYmm:-1}}}});
  await renderSmartBadgeJpeg({config,client,program,agency});
  expect(toJpeg.lastHtml).toContain("translate(2mm, 4mm)");
  expect(toJpeg.lastHtml).toContain("translate(-0.5mm, 1mm)");
  expect(toJpeg.lastHtml).toContain("translate(1.5mm, -1mm)");
  expect(toJpeg.lastHtml).toContain('data-field-part="value"');
});

test("generated Smart Badge PDF keeps the physical 58 by 88 mm page",async()=>{
  const pdf=await makeSmartBadgePdf([{arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer}]);
  const buffer=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsArrayBuffer(pdf);}),text=String.fromCharCode(...new Uint8Array(buffer));
  expect(text).toContain("/MediaBox [0 0 164.40944881889766 249.4488188976378]");
});
