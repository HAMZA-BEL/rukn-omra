import { escapeHtml } from "../../utils/escapeHtml";

export const DOCUMENT_TYPES = ["invoice", "receipt", "contract", "list", "report"];
export const CONNECTED_DOCUMENT_TYPES = [...DOCUMENT_TYPES];
export const DOCUMENT_BRANDING_STYLES = ["minimal", "modern", "formal"];
export const DOCUMENT_FOOTER_STYLES = ["footer1", "footer2", "footer3", "footer4"];
export const DOCUMENT_HEADER_SIZES = ["small", "medium", "large", "xlarge"];
export const DOCUMENT_HEADER_ALIGNS = ["right", "center", "left"];
export const DOCUMENT_HEADER_PLACEMENTS = ["inline-start", "inline-end", "stacked"];
export const DOCUMENT_HEADER_DENSITIES = ["compact", "balanced", "spacious"];
export const DOCUMENT_HEADER_GAPS = ["compact", "normal", "wide"];
export const DOCUMENT_BRANDING_FALLBACK_COLOR = "#0f766e";
export const BRANDING_ELEMENT_KEYS = ["logo", "nameAr", "nameLatin", "phone1", "phone2", "email", "website", "address1", "address2", "ice", "rc", "bank", "bankHolder", "bankAccount", "rib", "iban", "swift"];
export const DEFAULT_HEADER_ELEMENTS = ["logo", "nameAr", "nameLatin"];
export const DEFAULT_FOOTER_ELEMENTS = ["address1", "address2", "phone1", "phone2", "email", "website", "ice", "rc"];
export const DEFAULT_VISIBLE_FIELDS = Object.freeze({logo:true,nameAr:true,nameLatin:true,phone1:true,phone2:false,email:true,website:true,address1:true,address2:false,ice:true,rc:true,bank:false,bankHolder:false,bankAccount:false,rib:false,iban:false,swift:false});

export const DEFAULT_DOCUMENT_BRANDING = Object.freeze({
  enabled:false, style:"minimal", orientation:"portrait", colorMode:"auto", brandColor:DOCUMENT_BRANDING_FALLBACK_COLOR,
  footerTemplate:"footer1",
  headerLogoSize:22, headerNameSize:20, headerAlign:"right", headerPlacement:"inline-start",
  headerDensity:21, headerGap:5, headerDivider:true, footerSize:9,
  watermark:{enabled:true,size:110,opacity:10},
  visibleFields:DEFAULT_VISIBLE_FIELDS,
});

const text = (value) => String(value ?? "").trim();
const validHex = (value) => /^#[0-9a-f]{6}$/i.test(text(value));
const clampNumber=(value,min,max,fallback)=>{const parsed=Number(value);return Number.isFinite(parsed)?Math.min(max,Math.max(min,parsed)):fallback;};
const legacyRange=(value,map,fallback,min,max)=>clampNumber(Object.prototype.hasOwnProperty.call(map,value)?map[value]:value,min,max,fallback);
const LEGACY_LOGO_SIZE={small:11,medium:16,large:22,xlarge:28,veryLarge:28};
const LEGACY_NAME_SIZE={small:12,medium:16,large:20,xlarge:26,veryLarge:26};
const LEGACY_TOP_SPACE={compact:16,balanced:21,spacious:27};
const LEGACY_GAP={compact:2.5,normal:5,wide:8};
const uniqueElements = (values, fallback) => Array.from(new Set((Array.isArray(values) ? values : fallback).filter((key) => BRANDING_ELEMENT_KEYS.includes(key))));

export const normalizeDocumentBranding = (value = {}) => ({
  enabled:value?.enabled === true,
  style:DOCUMENT_BRANDING_STYLES.includes(value?.style) ? value.style : "minimal",
  footerTemplate:DOCUMENT_FOOTER_STYLES.includes(value?.footerTemplate || value?.footer_template) ? (value.footerTemplate || value.footer_template) : "footer1",
  headerLogoSize:legacyRange(value?.headerLogoSize ?? value?.header_logo_size,LEGACY_LOGO_SIZE,22,8,42),
  headerNameSize:legacyRange(value?.headerNameSize ?? value?.header_name_size,LEGACY_NAME_SIZE,20,9,34),
  headerAlign:({start:"right",end:"left"}[value?.headerAlign || value?.header_align]) || (DOCUMENT_HEADER_ALIGNS.includes(value?.headerAlign || value?.header_align) ? (value.headerAlign || value.header_align) : "right"),
  headerPlacement:DOCUMENT_HEADER_PLACEMENTS.includes(value?.headerPlacement || value?.header_placement) ? (value.headerPlacement || value.header_placement) : "inline-start",
  headerDensity:legacyRange(value?.headerDensity ?? value?.header_density,LEGACY_TOP_SPACE,21,14,40),
  headerGap:legacyRange(value?.headerGap ?? value?.header_gap,LEGACY_GAP,5,1,14),
  headerDivider:value?.headerDivider !== false && value?.header_divider !== false,
  footerSize:clampNumber(value?.footerSize ?? value?.footer_size,6,15,9),
  watermark:{enabled:value?.watermark?.enabled !== false,size:clampNumber(value?.watermark?.size,40,320,110),opacity:clampNumber(value?.watermark?.opacity,0,100,10)},
  orientation:value?.orientation === "landscape" ? "landscape" : "portrait",
  colorMode:value?.colorMode === "manual" || value?.color_mode === "manual" ? "manual" : "auto",
  brandColor:validHex(value?.brandColor || value?.brand_color) ? text(value.brandColor || value.brand_color).toLowerCase() : DOCUMENT_BRANDING_FALLBACK_COLOR,
  visibleFields:Object.fromEntries(BRANDING_ELEMENT_KEYS.map((key)=>{
    if(value?.visibleFields&&Object.prototype.hasOwnProperty.call(value.visibleFields,key))return [key,value.visibleFields[key]===true];
    if(key==="nameLatin"&&value?.visibleFields&&Object.prototype.hasOwnProperty.call(value.visibleFields,"nameFr"))return [key,value.visibleFields.nameFr===true];
    const legacySelected=new Set([...uniqueElements(value?.headerElements||value?.header_elements,DEFAULT_HEADER_ELEMENTS),...uniqueElements(value?.footerElements||value?.footer_elements,DEFAULT_FOOTER_ELEMENTS)]);
    return [key,value?.headerElements||value?.footerElements?legacySelected.has(key):DEFAULT_VISIBLE_FIELDS[key]===true];
  })),
});

export const normalizeAgencyDocumentBranding = (value = {}) => {
  const source = value && typeof value === "object" ? value : {};
  if (source.defaultProfile) {
    const applyToAll=source.applyToAll !== false;
    return {
      enabled:source.enabled === true,
      applyToAll,
      defaultProfile:normalizeDocumentBranding(source.defaultProfile),
      documents:Object.fromEntries(DOCUMENT_TYPES.map((type)=>{
        const entry=source.documents?.[type];
        const requestedMode=["inherit","custom","off"].includes(entry?.mode) ? entry.mode : "inherit";
        const mode=requestedMode==="inherit"&&!CONNECTED_DOCUMENT_TYPES.includes(type)?"off":requestedMode;
        return [type,{mode,...(mode==="custom"?{profile:normalizeDocumentBranding(entry?.profile)}:{})}];
      })),
    };
  }
  if (source.documents) {
    const hasLegacyDocumentProfiles=DOCUMENT_TYPES.some((type)=>source.documents?.[type]&&typeof source.documents[type]==="object");
    if(!hasLegacyDocumentProfiles){return {enabled:false,applyToAll:true,defaultProfile:normalizeDocumentBranding({}),documents:Object.fromEntries(DOCUMENT_TYPES.map((type)=>[type,{mode:CONNECTED_DOCUMENT_TYPES.includes(type)?"inherit":"off"}]))};}
    const currentEntries=DOCUMENT_TYPES.map((type)=>[type,normalizeDocumentBranding(source.documents?.[type]||{})]);
    const enabledEntries=currentEntries.filter(([,profile])=>profile.enabled);
    return {enabled:enabledEntries.length>0,applyToAll:false,defaultProfile:normalizeDocumentBranding(enabledEntries[0]?.[1]||{}),documents:Object.fromEntries(currentEntries.map(([type,profile])=>[type,Object.prototype.hasOwnProperty.call(source.documents,type)?(profile.enabled?{mode:"custom",profile}:{mode:"off"}):{mode:"inherit"}]))};
  }
  const legacy=normalizeDocumentBranding(source);
  return {
    enabled:legacy.enabled,
    applyToAll:true,
    defaultProfile:legacy,
    documents:Object.fromEntries(DOCUMENT_TYPES.map((type)=>[type,{mode:CONNECTED_DOCUMENT_TYPES.includes(type)?"inherit":"off"}])),
  };
};

export const getAgencyBrandingRoot = (agency = {}) => normalizeAgencyDocumentBranding(agency.documentBranding || agency.document_branding || {});
export const getAgencyDocumentBranding = (agency = {}, documentType = "invoice") => {
  const root=getAgencyBrandingRoot(agency),entry=root.documents[DOCUMENT_TYPES.includes(documentType)?documentType:"invoice"];
  if(!root.enabled||entry.mode==="off")return {...root.defaultProfile,enabled:false};
  return {...(entry.mode==="custom"?entry.profile:root.defaultProfile),enabled:true};
};
export const isDocumentBrandingEnabled = (agency = {}, perPrintEnabled, documentType = "invoice") => typeof perPrintEnabled === "boolean" ? perPrintEnabled : getAgencyDocumentBranding(agency, documentType).enabled;

export const getAgencyBrandingDetails = (agency = {}, lang = "ar") => {
  const legacyAddress=text(agency.addressTiznit || agency.address_tiznit);
  const arabicAddress=text(agency.addressPrimaryAr || agency.address_primary_ar) || legacyAddress;
  const latinAddress=text(agency.addressPrimaryLatin || agency.address_primary_latin || agency.addressPrimaryFr || agency.address_primary_fr) || legacyAddress;
  const arabicName=text(agency.nameAr || agency.name_ar || agency.agencyName) || text(agency.agencyNameLatin || agency.nameFr || agency.name_fr);
  const latinName=text(agency.agencyNameLatin || agency.nameLatin || agency.nameFr || agency.name_fr) || text(agency.nameAr || agency.name_ar || agency.agencyName);
  return ({
  logo:text(agency.logoUrl || agency.logo_url), nameAr:lang === "ar" ? arabicName : "", nameLatin:lang === "ar" ? "" : latinName,
  phone1:text(agency.phoneTiznit1 || agency.phone_tiznit1 || agency.phoneAgadir1 || agency.phone_agadir1),
  phone2:text(agency.phoneTiznit2 || agency.phone_tiznit2 || agency.phoneAgadir2 || agency.phone_agadir2),
  email:text(agency.email), website:text(agency.website), address1:lang === "ar" ? arabicAddress : latinAddress,
  address2:text(agency.addressAgadir || agency.address_agadir), ice:text(agency.ice), rc:text(agency.rc),
  bank:text(agency.bankName || agency.bank_name), bankHolder:text(agency.bankAccountHolder || agency.bank_account_holder),
  bankAccount:text(agency.bankAccountNumber || agency.bank_account_number), rib:text(agency.bankRib || agency.bank_rib),
  iban:text(agency.bankIban || agency.bank_iban), swift:text(agency.bankSwift || agency.bank_swift),
  });
};

export const getAgencyBrandingItems = (agency = {}, keys = [], lang = "ar") => {
  const details = getAgencyBrandingDetails(agency, lang);
  return keys.map((key) => ({ key, value:details[key] })).filter(({ value }) => value);
};
export const getVisibleBrandingKeys=(config={})=>BRANDING_ELEMENT_KEYS.filter((key)=>normalizeDocumentBranding(config).visibleFields[key]);
export const getAgencyBrandingFooterItems = (agency = {}, config = {}) => getAgencyBrandingItems(agency, getVisibleBrandingKeys(config).filter((key)=>!["logo","nameAr","nameLatin"].includes(key)), "en").map(({ key, value }) => ({key,value}));

const FOOTER_LABELS={address1:"Adresse",address2:"Adresse complémentaire",phone1:"Tél",phone2:"Tél 2",email:"E-mail",website:"Site",rc:"R.C",ice:"ICE",bank:"Banque",bankHolder:"Titulaire",bankAccount:"CB",rib:"RIB",iban:"IBAN",swift:"SWIFT / BIC"};
export const getAgencyBrandingFooterLines=(agency={},config={})=>{
  const byKey=Object.fromEntries(getAgencyBrandingFooterItems(agency,config).map((item)=>[item.key,item.value]));
  const groups=[["address1","address2","phone1","phone2"],["email","website","rc"],["ice"],["bank","bankHolder","bankAccount"],["rib","iban","swift"]];
  return groups.map((keys)=>keys.filter((key)=>byKey[key]).map((key)=>({key,label:FOOTER_LABELS[key],value:byKey[key]}))).filter((line)=>line.length);
};
export const getAgencyBrandingFooterGroups=(agency={},config={})=>{
  const byKey=Object.fromEntries(getAgencyBrandingFooterItems(agency,config).map((item)=>[item.key,item.value]));
  return [
    {key:"contact",label:"Contact / Adresse",keys:["address1","address2","phone1","phone2"]},
    {key:"digital",label:"Digital",keys:["email","website"]},
    {key:"legal",label:"Legal",keys:["rc","ice"]},
    {key:"bank",label:"Banque",keys:["bank","bankHolder","bankAccount","rib","iban","swift"]},
  ].map((group)=>({...group,items:group.keys.filter((key)=>byKey[key]).map((key)=>({key,label:FOOTER_LABELS[key],value:byKey[key]}))})).filter((group)=>group.items.length);
};

export const chooseBrandColorFromPixels = (pixels, fallback = DOCUMENT_BRANDING_FALLBACK_COLOR) => {
  if (!pixels || pixels.length < 4) return fallback;
  const buckets = new Map();
  for (let index = 0; index < pixels.length; index += 16) {
    const r=pixels[index], g=pixels[index+1], b=pixels[index+2], a=pixels[index+3];
    if (a < 128) continue;
    const max=Math.max(r,g,b), min=Math.min(r,g,b), saturation=max ? (max-min)/max : 0, luminance=(.2126*r+.7152*g+.0722*b)/255;
    if (luminance>.9 || luminance<.08 || saturation<.16) continue;
    const key=`${Math.round(r/32)*32},${Math.round(g/32)*32},${Math.round(b/32)*32}`;
    buckets.set(key,(buckets.get(key)||0)+1+saturation);
  }
  const winner=[...buckets.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
  if (!winner) return fallback;
  return `#${winner[0].split(",").map((part)=>Math.min(255,Number(part)).toString(16).padStart(2,"0")).join("")}`;
};

export const extractBrandColorFromLogo = (url, fallback = DOCUMENT_BRANDING_FALLBACK_COLOR) => new Promise((resolve) => {
  if (!url || typeof Image === "undefined" || typeof document === "undefined") return resolve(fallback);
  const image=new Image(), timeout=setTimeout(()=>resolve(fallback),2500); image.crossOrigin="anonymous";
  image.onload=()=>{try{const canvas=document.createElement("canvas");canvas.width=32;canvas.height=32;const context=canvas.getContext("2d",{willReadFrequently:true});context.drawImage(image,0,0,32,32);clearTimeout(timeout);resolve(chooseBrandColorFromPixels(context.getImageData(0,0,32,32).data,fallback));}catch{clearTimeout(timeout);resolve(fallback);}};
  image.onerror=()=>{clearTimeout(timeout);resolve(fallback);}; image.src=url;
});

export const getDocumentHeaderLayout=(config={})=>{
  const n=normalizeDocumentBranding(config);
  const classes=`header-placement-${n.headerPlacement} header-align-${n.headerAlign}${n.headerDivider?"":" header-no-divider"}`;
  const variables={"--branding-logo-size":`${n.headerLogoSize}mm`,"--branding-name-size":`${n.headerNameSize}pt`,"--branding-top-space":`${n.headerDensity}mm`,"--branding-identity-gap":`${n.headerGap}mm`,"--branding-footer-size":`${n.footerSize}pt`};
  return {classes,variables,printVars:Object.entries(variables).map(([key,val])=>`${key}:${val}`).join(";")+";",previewStyle:variables};
};

export const getDocumentIdentityLocaleLayout=(config={},lang="ar")=>{
  const normalized=normalizeDocumentBranding(config),isRtl=lang==="ar",side=isRtl?"right":"left";
  return {side,isRtl,logoAtEdge:normalized.headerPlacement!=="inline-end",classes:`identity-side-${side} ${normalized.headerPlacement==="inline-end"?"identity-order-custom-reversed":"identity-order-logo-edge"}`};
};

export const getDocumentWatermarkLayout=(config={})=>{
  const {watermark}=normalizeDocumentBranding(config),variables={"--branding-watermark-size":`${watermark.size}mm`,"--branding-watermark-opacity":`${watermark.opacity/100}`};
  return {variables,printVars:Object.entries(variables).map(([key,val])=>`${key}:${val}`).join(";")+";",previewStyle:variables};
};

export const getDocumentBrandingPrintCSS = (config) => {
  const { style, brandColor, orientation }=normalizeDocumentBranding(config),layout=getDocumentHeaderLayout(config),watermarkLayout=getDocumentWatermarkLayout(config);
  return `.document-branding{--brand:${brandColor};${layout.printVars};break-inside:avoid}.page.branded-invoice-page{${watermarkLayout.printVars}min-height:297mm;padding-top:9mm;padding-bottom:9mm;display:flex;flex-direction:column;position:relative;isolation:isolate;overflow:hidden}.branded-invoice-page>.document-branding-watermark{position:absolute;inset:50% auto auto 50%;width:var(--branding-watermark-size);height:var(--branding-watermark-size);transform:translate(-50%,-50%);object-fit:contain;opacity:var(--branding-watermark-opacity);pointer-events:none;z-index:0}.branded-invoice-page>*:not(.document-branding-watermark){position:relative;z-index:1}.branded-invoice-content{display:block;min-width:0;flex:0 0 auto}.document-branding-header{display:flex;align-items:center;direction:ltr;gap:var(--branding-identity-gap);margin-bottom:3mm;padding-block-start:1mm;padding-block-end:calc(var(--branding-top-space) - 12mm);padding-inline:1mm;border-bottom:.35mm solid var(--brand);max-inline-size:100%;box-sizing:border-box}.document-branding-logo{display:block;inline-size:auto;block-size:var(--branding-logo-size);max-inline-size:min(calc(var(--branding-logo-size) * 4),48%);max-block-size:none;object-fit:contain;flex:0 1 auto}.document-branding-agency-names{display:grid;gap:.5mm;flex:0 1 auto;min-inline-size:0;max-inline-size:100%;overflow:visible}.document-branding-name,.document-branding-name-fr{display:block;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere}.document-branding-name{font-size:var(--branding-name-size);line-height:1.08;font-weight:900;color:var(--brand)}.document-branding-name-fr{font-size:max(9pt,calc(var(--branding-name-size) * .55));line-height:1.15;font-weight:750;color:#374151}.document-branding-modern .document-branding-header{border-inline-start:4mm solid var(--brand);background:#f7f8fa}.document-branding-formal .document-branding-header{border:.7mm double var(--brand)}.document-branding-formal .document-branding-name{font-family:Georgia,serif}.identity-dir-ltr.header-placement-inline-end .document-branding-logo,.identity-dir-rtl.header-placement-inline-start .document-branding-logo{order:2}.header-placement-stacked .document-branding-header{flex-direction:column}.header-placement-stacked .document-branding-logo{max-inline-size:100%}.header-placement-stacked .document-branding-agency-names{flex-basis:auto}.header-align-right .document-branding-header{justify-content:flex-end;text-align:right}.header-align-center .document-branding-header{justify-content:center;text-align:center}.header-align-left .document-branding-header{justify-content:flex-start;text-align:left}.header-align-center .document-branding-agency-names{text-align:center}.header-align-right .document-branding-agency-names{text-align:right}.header-align-left .document-branding-agency-names{text-align:left}.identity-side-right .document-branding-header{justify-content:flex-end;text-align:right}.identity-side-left .document-branding-header{justify-content:flex-start;text-align:left}.identity-side-right .document-branding-agency-names{text-align:right}.identity-side-left .document-branding-agency-names{text-align:left}.identity-order-logo-edge.identity-dir-rtl:not(.header-placement-stacked) .document-branding-logo{order:2}.identity-order-logo-edge.identity-dir-ltr:not(.header-placement-stacked) .document-branding-logo{order:0}.identity-order-custom-reversed.identity-dir-rtl:not(.header-placement-stacked) .document-branding-logo{order:0}.identity-order-custom-reversed.identity-dir-ltr:not(.header-placement-stacked) .document-branding-logo{order:2}.header-no-divider.document-branding-minimal .document-branding-header{border-bottom:0}.header-no-divider.document-branding-modern .document-branding-header{border-inline-start:0}.header-no-divider.document-branding-formal .document-branding-header{border:0}.document-branding-footer{width:100%;box-sizing:border-box;margin-top:auto;font-size:var(--branding-footer-size);line-height:1.4;font-weight:700;color:#252a31;break-inside:avoid;page-break-inside:avoid;position:static}.document-branding-footer .footer-label{font-weight:850}.branded-invoice-page .invoice-table tr,.branded-invoice-page .box,.branded-invoice-page .summary-box,.branded-invoice-page .bank,.branded-invoice-page .words{break-inside:avoid;page-break-inside:avoid}@media print{@page{size:A4 ${orientation};margin:0}}.document-branding-${style}{}`;
};

export const getDocumentOrientationPrintCSS = (config) => normalizeDocumentBranding(config).orientation === "landscape"
  ? `.page.branded-invoice-page{width:277mm;min-height:210mm;padding-top:7mm!important;padding-bottom:7mm!important}.grid{grid-template-columns:.8fr 1.2fr}.document-branding-footer{width:100%}.invoice-table,.covered{table-layout:auto}`
  : `.document-branding-footer.is-dense{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2mm 5mm;text-align:center}`;

export const getDocumentFooterPrintCSS = (config) => {
  const { footerTemplate }=normalizeDocumentBranding(config);
  const shared=`.document-branding-footer.${footerTemplate}{direction:ltr;text-align:left;unicode-bidi:isolate;isolation:isolate;overflow-wrap:anywhere}.document-branding-footer.${footerTemplate} bdi{direction:ltr;unicode-bidi:isolate}.document-branding-footer.is-dense{font-size:max(6pt,calc(var(--branding-footer-size) * .82))}`;
  if(footerTemplate==="footer2")return `${shared}.document-branding-footer.footer2{display:block;border:0;border-top:1px solid var(--brand);background:transparent;padding:calc(var(--branding-footer-size) * .55) 0 0;line-height:1.4}.footer2-inline{display:inline;white-space:normal}.footer2 span+span:before{content:none}.footer2-dot{color:var(--brand);white-space:pre}`;
  if(footerTemplate==="footer3")return `${shared}.document-branding-footer.footer3{display:block;border:0;border-top:.6mm solid var(--brand);background:transparent;padding:calc(var(--branding-footer-size) * .55) 0 0}.footer3-groups{display:flex;align-items:flex-start;justify-content:flex-start;flex-wrap:wrap;gap:1.5mm 3mm}.footer3-group{display:inline-grid;gap:.5mm;flex:0 1 auto;min-width:0}.footer3-group>small{color:var(--brand);font-size:max(5pt,calc(var(--branding-footer-size) * .62));font-weight:800;text-transform:uppercase}.footer3-divider{width:.25mm;height:7mm;background:var(--brand);opacity:.3;align-self:center}.footer3 span+span:before{content:none}.footer3-item-dot{color:#94a3b8;white-space:pre}`;
  if(footerTemplate==="footer4")return `${shared}.document-branding-footer.footer4{display:block;border:0;background:var(--brand);color:#fff;padding:calc(var(--branding-footer-size) * .65) calc(var(--branding-footer-size) * 1.1);line-height:1.4}.footer4-strip-content{display:inline;white-space:normal}.footer4 .footer-label,.footer4 bdi{color:#fff}.footer4 span+span:before{content:none}.footer4-separator{color:rgba(255,255,255,.72);white-space:pre}`;
  return `${shared}.document-branding-footer.footer1{width:100%;box-sizing:border-box;border-top:0;border-inline-start:1.2mm solid var(--brand);background:transparent;padding:calc(var(--branding-footer-size) * .7) calc(var(--branding-footer-size) * 1.1);text-align:left;display:block;justify-content:initial;grid-template-columns:none;gap:0;direction:ltr;unicode-bidi:isolate;isolation:isolate;font-size:var(--branding-footer-size);font-weight:700}.footer1 .footer-line{display:block;line-height:1.5;white-space:normal;overflow-wrap:anywhere}.footer1 .footer-line+.footer-line{margin-top:.7mm}.footer1 span+span:before{content:none;margin:0}.footer1 bdi{direction:ltr;unicode-bidi:isolate}.footer1 .footer-label{font-weight:850}`;
};

export const buildAgencyDocumentHeaderHtml = ({ agency={}, config, title="", number="", lang="ar" }) => {
  const normalized=normalizeDocumentBranding(config),layout=getDocumentHeaderLayout(normalized),localeLayout=getDocumentIdentityLocaleLayout(normalized,lang),items=getAgencyBrandingItems(agency,["logo","nameAr","nameLatin"].filter((key)=>normalized.visibleFields[key]),lang), byKey=Object.fromEntries(items.map((item)=>[item.key,item.value]));
  const identityDirection=lang==="ar"?"rtl":"ltr";
  return `<header class="document-branding document-branding-${normalized.style} is-${normalized.orientation} identity-dir-${identityDirection} ${localeLayout.classes} ${layout.classes}"><div class="document-branding-header">${byKey.logo?`<img class="document-branding-logo" src="${escapeHtml(byKey.logo)}" alt="" onerror="this.remove()"/>`:""}<div dir="${identityDirection}" class="document-branding-agency-names">${byKey.nameAr?`<div class="document-branding-name">${escapeHtml(byKey.nameAr)}</div>`:""}${byKey.nameLatin?`<div class="document-branding-name-fr">${escapeHtml(byKey.nameLatin)}</div>`:""}</div></div></header>`;
};
export const buildAgencyDocumentWatermarkHtml=({agency={},config={}})=>{const normalized=normalizeDocumentBranding(config),logo=text(agency.logoUrl||agency.logo_url);return normalized.enabled&&normalized.watermark.enabled&&logo?`<img class="document-branding-watermark" src="${escapeHtml(logo)}" alt="" aria-hidden="true" onerror="this.remove()"/>`:"";};
const footerEntryHtml=(item)=>`<span class="footer-entry field-${item.key}"><span class="footer-label">${escapeHtml(item.label)} :</span> <bdi>${escapeHtml(item.value)}</bdi></span>`;
export const buildAgencyDocumentFooterHtml = ({ agency={}, config }) => {
  const normalized=normalizeDocumentBranding(config),items=getAgencyBrandingFooterItems(agency,normalized),density=items.length<=3?"compact":items.length>=6?"dense":"balanced";
  if(!items.length)return "";
  const shell=(body)=>`<footer dir="ltr" class="document-branding document-branding-${normalized.style} document-branding-footer ${normalized.footerTemplate} is-${density}" data-footer-composition="${normalized.footerTemplate}">${body}</footer>`;
  if(normalized.footerTemplate==="footer1"){const lines=getAgencyBrandingFooterLines(agency,normalized);return `<footer dir="ltr" class="document-branding document-branding-${normalized.style} document-branding-footer footer1 is-${density}" data-footer-composition="footer1" data-footer-lines="${lines.length}">${lines.map((line)=>`<span class="footer-line">${line.map(footerEntryHtml).join(" - ")}</span>`).join("")}</footer>`;}
  if(normalized.footerTemplate==="footer2"){const entries=getAgencyBrandingFooterLines(agency,normalized).flat();return shell(`<span class="footer2-inline">${entries.map(footerEntryHtml).join('<span class="footer2-dot" aria-hidden="true"> • </span>')}</span>`);}
  if(normalized.footerTemplate==="footer3"){const groups=getAgencyBrandingFooterGroups(agency,normalized);return shell(`<span class="footer3-groups">${groups.map((group)=>`<span class="footer3-group group-${group.key}"><small>${escapeHtml(group.label)}</small><span>${group.items.map(footerEntryHtml).join('<span class="footer3-item-dot" aria-hidden="true"> · </span>')}</span></span>`).join('<span class="footer3-divider" aria-hidden="true"></span>')}</span>`);}
  const entries=getAgencyBrandingFooterLines(agency,normalized).flat();return shell(`<span class="footer4-strip-content">${entries.map(footerEntryHtml).join('<span class="footer4-separator" aria-hidden="true"> • </span>')}</span>`);
};

export const buildAgencyDocumentBrandingParts = ({ agency={}, documentType="invoice", lang="ar" } = {}) => {
  const root=getAgencyBrandingRoot(agency),config=getAgencyDocumentBranding(agency,documentType);
  if(!config.enabled)return {enabled:false,useLegacyIdentity:!root.enabled,config,css:"",header:"",footer:"",watermark:"",pageClass:""};
  return {
    enabled:true,useLegacyIdentity:false,
    config,
    css:`${getDocumentBrandingPrintCSS(config)}${getDocumentOrientationPrintCSS(config)}${getDocumentFooterPrintCSS(config)}`,
    header:buildAgencyDocumentHeaderHtml({agency,config,lang}),
    footer:buildAgencyDocumentFooterHtml({agency,config}),
    watermark:buildAgencyDocumentWatermarkHtml({agency,config}),
    pageClass:"page branded-invoice-page",
  };
};
