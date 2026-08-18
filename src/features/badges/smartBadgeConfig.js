import { SMART_BADGE_ELEMENTS, normalizeElementOverride, normalizeFieldPartOverrides } from "./smartBadgeLayout";

export const SMART_BADGE_SCHEMA_VERSION = 9;
export const SMART_BADGE_PRINT_SOURCES = Object.freeze(["legacy", "smart"]);
export const SMART_BADGE_DENSITIES = ["calm", "balanced", "rich"];

// Only the approved original presets are selectable. Removed presets are
// compatibility aliases only and never re-enter the design catalogue.
export const SMART_BADGE_LAYOUTS = Object.freeze({
  "rukn-signature": { name:"RUKN Signature", compositionStyle:"rukn-signature", group:"original", stylePreset:"soft" },
  editorial: { name:"Editorial", compositionStyle:"editorial", group:"original", stylePreset:"minimal" },
  "centered-ceremony": { name:"Centered Ceremony", compositionStyle:"centered-ceremony", group:"original", stylePreset:"elegant" },
  "passport-inspired": { name:"Passport Inspired", compositionStyle:"passport-inspired", group:"original", stylePreset:"formal" },
  "minimal-air": { name:"Minimal Air", compositionStyle:"minimal-air", group:"original", stylePreset:"minimal" },
  "travel-tag": { name:"Travel Tag", compositionStyle:"travel-tag", group:"original", stylePreset:"formal" },
  "luxury-white": { name:"Luxury White", compositionStyle:"luxury-white", group:"original", stylePreset:"elegant" },
  "rukn-future": { name:"RUKN Future", compositionStyle:"rukn-future", group:"original", stylePreset:"soft" },
});

export const SMART_BADGE_LAYOUT_FAMILIES = Object.freeze(Object.keys(SMART_BADGE_LAYOUTS));
export const SMART_BADGE_STYLE_PRESETS = ["minimal", "soft", "formal", "elegant", "bold"];
export const SMART_BADGE_STYLES = Object.freeze({
  minimal: { headerStyle:"minimal", fieldsStyle:"lines", separatorsStyle:"none", backgroundStyle:"clean", footerStyle:"minimal", identityStyle:"classic", photoStyle:"portrait", decorativeStyle:"none", badgeBackground:"#ffffff", heroBackground:"#ffffff", heroBorderColor:"#e5e7eb", heroBorderWidth:0, heroRadius:8, heroShadowVisible:false, accentColor:"#9ca3af", labelColor:"#6b7280", valueColor:"#17201d", fieldBackground:"#ffffff", fieldBorderColor:"#e5e7eb", fieldBorderWidth:0, fieldRadius:0, fieldPadding:5 },
  soft: { headerStyle:"classic", fieldsStyle:"cards", separatorsStyle:"soft", backgroundStyle:"warm", footerStyle:"classic", identityStyle:"classic", photoStyle:"portrait", decorativeStyle:"editorial", badgeBackground:"#fcfaf4", heroBackground:"#ffffff", heroBorderColor:"#ded6c7", heroBorderWidth:1, heroRadius:18, heroShadowVisible:true, accentColor:"#b8aa90", labelColor:"#777f7a", valueColor:"#19221f", fieldBackground:"#ffffff", fieldBorderColor:"#e4ddd0", fieldBorderWidth:1, fieldRadius:9, fieldPadding:7 },
  formal: { headerStyle:"centered", fieldsStyle:"document", separatorsStyle:"soft", backgroundStyle:"paper", footerStyle:"classic", identityStyle:"stamp", photoStyle:"passport", decorativeStyle:"editorial", badgeBackground:"#f7f4ed", heroBackground:"#ffffff", heroBorderColor:"#a69b87", heroBorderWidth:1, heroRadius:2, heroShadowVisible:false, accentColor:"#756b59", labelColor:"#686157", valueColor:"#171916", fieldBackground:"#ffffff", fieldBorderColor:"#c9c1b2", fieldBorderWidth:1, fieldRadius:2, fieldPadding:6 },
  elegant: { headerStyle:"centered", fieldsStyle:"lines", separatorsStyle:"soft", backgroundStyle:"warm", footerStyle:"minimal", identityStyle:"centered", photoStyle:"circle", decorativeStyle:"ceremonial", badgeBackground:"#fbf8f1", heroBackground:"#fffdf8", heroBorderColor:"#cfc1aa", heroBorderWidth:1, heroRadius:16, heroShadowVisible:false, accentColor:"#a88b58", labelColor:"#796f61", valueColor:"#201d18", fieldBackground:"#fffdf8", fieldBorderColor:"#d9cebc", fieldBorderWidth:0, fieldRadius:6, fieldPadding:7 },
  bold: { headerStyle:"band", fieldsStyle:"cards", separatorsStyle:"bold", backgroundStyle:"tinted", footerStyle:"band", identityStyle:"classic", photoStyle:"portrait", decorativeStyle:"ribbon", badgeBackground:"#f5f7f6", heroBackground:"#ffffff", heroBorderColor:"#26312d", heroBorderWidth:2, heroRadius:10, heroShadowVisible:false, accentColor:"#26312d", labelColor:"#4b5752", valueColor:"#101513", fieldBackground:"#ffffff", fieldBorderColor:"#26312d", fieldBorderWidth:1, fieldRadius:6, fieldPadding:7 },
});

export const SMART_BADGE_DEFAULT_COLOR = "#805b0b";
export const SMART_BADGE_TEMPLATES = SMART_BADGE_LAYOUT_FAMILIES;
export const SMART_BADGE_PRESETS = Object.freeze(Object.fromEntries(SMART_BADGE_LAYOUT_FAMILIES.map((id)=>[id,{layoutFamily:id,stylePreset:SMART_BADGE_LAYOUTS[id].stylePreset}])));
export const SMART_BADGE_DESIGN_MATRIX = SMART_BADGE_LAYOUTS;
export const SMART_BADGE_STYLE_PARTS = Object.freeze({ stylePreset:SMART_BADGE_STYLE_PRESETS });
export const SMART_BADGE_COMPONENT_KEYS = Object.freeze(["header","hero","primaryData","secondaryData","fieldStyle","background","separators","footer","photoFrame"]);
export const SMART_BADGE_EFFECT_TARGETS = Object.freeze(["header","hero","primaryData","secondaryData","footer","photoFrame",...Object.keys(SMART_BADGE_ELEMENTS).filter((id)=>id!=="heroContainer"&&id!=="watermark")]);
export const SMART_BADGE_EFFECT_PRESETS = Object.freeze(["normal","floating","soft-shadow","elevated"]);

const FALLBACK_LAYOUT = "rukn-signature";
const LEGACY_LAYOUTS = Object.freeze({
  classic:FALLBACK_LAYOUT, modern:FALLBACK_LAYOUT, cards:FALLBACK_LAYOUT, compact:FALLBACK_LAYOUT, minimal:"minimal-air", premium:FALLBACK_LAYOUT, luxury:FALLBACK_LAYOUT,
  "rukn-default":FALLBACK_LAYOUT,
  "classic-editorial":FALLBACK_LAYOUT, "split-vertical":FALLBACK_LAYOUT, "vertical-split":FALLBACK_LAYOUT, "hero-portrait":FALLBACK_LAYOUT, "photo-hero":FALLBACK_LAYOUT, typographic:FALLBACK_LAYOUT, "modular-cards":FALLBACK_LAYOUT, diagonal:FALLBACK_LAYOUT,
  "centered-ceremonial":"centered-ceremony", "side-ribbon":FALLBACK_LAYOUT, "side-rail":FALLBACK_LAYOUT, "bold-frame":FALLBACK_LAYOUT, "information-grid":FALLBACK_LAYOUT,
  "floating-elements":FALLBACK_LAYOUT, "floating-composition":FALLBACK_LAYOUT, topbar:FALLBACK_LAYOUT, "top-band":FALLBACK_LAYOUT, "bottom-identity":FALLBACK_LAYOUT, "soft-geometry":FALLBACK_LAYOUT, "sharp-geometric":FALLBACK_LAYOUT,
  "luxury-brand":FALLBACK_LAYOUT, "luxe-dark":FALLBACK_LAYOUT, "freeform-signature":FALLBACK_LAYOUT,
  "rukn-signature-v2":FALLBACK_LAYOUT, "editorial-v2":FALLBACK_LAYOUT, "vertical-split-v2":FALLBACK_LAYOUT, "centered-ceremony-v2":FALLBACK_LAYOUT, "mosaic-frame-v2":FALLBACK_LAYOUT, "ribbon-focus-v2":FALLBACK_LAYOUT, "gallery-strip-v2":FALLBACK_LAYOUT, "profile-ledger-v2":FALLBACK_LAYOUT, "horizon-card-v2":FALLBACK_LAYOUT, "dual-panel-v2":FALLBACK_LAYOUT,
  "editorial-luxury":FALLBACK_LAYOUT, "modern-rukn-signature":FALLBACK_LAYOUT,
});

export const DEFAULT_SMART_BADGE_CONFIG = Object.freeze({
  printSource:"legacy",
  content:Object.freeze({ photo:true, passport:true, program:true, group:true, room:true, hotel:false, makkahHotel:true, madinahHotel:true, city:false, phone:false, guidePhone:false, travelDate:true, watermark:false }),
  appearance:Object.freeze({
    layoutFamily:FALLBACK_LAYOUT, stylePreset:"soft", template:FALLBACK_LAYOUT, compositionStyle:SMART_BADGE_LAYOUTS[FALLBACK_LAYOUT].compositionStyle,
    primaryColor:SMART_BADGE_DEFAULT_COLOR, density:"balanced", backgroundColorOverride:"", heroContainerVisible:true, heroFrameVisible:true, heroOpacity:100, heroPadding:13,
    labelFontSize:9.5, labelFontWeight:700, valueFontSize:13, valueFontWeight:800,
    ...SMART_BADGE_STYLES.soft,
  }),
  elements:Object.freeze({}),
  hiddenElements:Object.freeze([]),
  fieldParts:Object.freeze({}),
  effects:Object.freeze({}),
  layoutOverrides:Object.freeze({}),
  fieldPartOverrides:Object.freeze({}),
  componentSources:Object.freeze(Object.fromEntries(SMART_BADGE_COMPONENT_KEYS.map((key)=>[key,FALLBACK_LAYOUT]))),
  sides:Object.freeze({
    front:Object.freeze({}),
    back:Object.freeze({
      enabled:false,
      initialized:false,
      appearance:Object.freeze({backgroundColor:"#f7f3ea"}),
      elements:Object.freeze({
        logo:Object.freeze({enabled:true,xMm:13,yMm:23,widthMm:32,heightMm:42,opacity:100,radius:0,shadow:false,lockAspectRatio:true}),
        image:Object.freeze({enabled:false,source:"custom",customDataUrl:"",xMm:7,yMm:12,widthMm:44,heightMm:52,opacity:100,radius:3,shadow:false,lockAspectRatio:true}),
        text:Object.freeze({enabled:true,text:"رحلة مباركة",xMm:6,yMm:67,widthMm:46,heightMm:10,fontSize:22,fontWeight:800,color:"#292722",backgroundColor:"",opacity:100,radius:0,shadow:false}),
      }),
    }),
  }),
});

const validHex=(value)=>/^#[0-9a-f]{6}$/i.test(String(value||"").trim());
const colorOr=(candidate,fallback)=>validHex(candidate)?String(candidate).toLowerCase():fallback;
const numberIn=(candidate,fallback,min,max)=>Math.min(max,Math.max(min,Number.isFinite(Number(candidate))?Number(candidate):fallback));
const resolveLayout=(appearance={})=>{
  for(const candidate of [appearance.layoutFamily,appearance.template,appearance.compositionStyle]){
    if(SMART_BADGE_LAYOUT_FAMILIES.includes(candidate))return candidate;
    if(LEGACY_LAYOUTS[candidate])return LEGACY_LAYOUTS[candidate];
  }
  return FALLBACK_LAYOUT;
};
const normalizeElements=(elements={})=>Object.fromEntries(Object.keys(SMART_BADGE_ELEMENTS).map((id)=>[id,normalizeElementOverride(id,elements?.[id])]));
const normalizeEffect=(value={})=>{
  const preset=SMART_BADGE_EFFECT_PRESETS.includes(value?.preset)?value.preset:"normal";
  return {preset,shadowX:numberIn(value.shadowX,0,-12,12),shadowY:numberIn(value.shadowY,preset==="floating"?2:preset==="elevated"?6:3,-12,18),blur:numberIn(value.blur,preset==="floating"?8:preset==="elevated"?18:preset==="soft-shadow"?10:0,0,36),spread:numberIn(value.spread,0,-6,12),opacity:numberIn(value.opacity,preset==="elevated"?14:preset==="normal"?0:10,0,40)};
};
const normalizeEffects=(effects={})=>Object.fromEntries(SMART_BADGE_EFFECT_TARGETS.flatMap((id)=>effects?.[id]?[ [id,normalizeEffect(effects[id])] ]:[]));
const normalizeBackElement=(id,value={})=>{
  const fallback=DEFAULT_SMART_BADGE_CONFIG.sides.back.elements[id],isText=id==="text",isImage=id==="image",isLogo=id==="logo";
  return {
    enabled:typeof value.enabled==="boolean"?value.enabled:fallback.enabled,
    ...(isImage?{source:"custom",customDataUrl:typeof value.customDataUrl==="string"?value.customDataUrl:"",lockAspectRatio:typeof value.lockAspectRatio==="boolean"?value.lockAspectRatio:true}:{}),
    ...(isLogo?{lockAspectRatio:typeof value.lockAspectRatio==="boolean"?value.lockAspectRatio:true}:{}),
    ...(isText?{text:typeof value.text==="string"?value.text:fallback.text,fontSize:numberIn(value.fontSize,fallback.fontSize,7,96),fontWeight:[500,600,700,800,900].includes(Number(value.fontWeight))?Number(value.fontWeight):fallback.fontWeight,color:colorOr(value.color,fallback.color),backgroundColor:validHex(value.backgroundColor)?String(value.backgroundColor).toLowerCase():""}:{}),
    xMm:numberIn(value.xMm,fallback.xMm,-58,58),yMm:numberIn(value.yMm,fallback.yMm,-88,88),widthMm:numberIn(value.widthMm,fallback.widthMm,3,116),heightMm:numberIn(value.heightMm,fallback.heightMm,3,176),opacity:numberIn(value.opacity,fallback.opacity,0,100),radius:numberIn(value.radius,fallback.radius,0,30),shadow:typeof value.shadow==="boolean"?value.shadow:fallback.shadow,
  };
};
const normalizeSides=(value={},front={})=>{
  const back=value?.back||{},elements=back.elements||{};
  const hadBackConfig=Boolean(value&&Object.prototype.hasOwnProperty.call(value,"back"));
  return {front:{appearance:{...front.appearance},elements:{...front.elements},fieldParts:{...front.fieldParts},hiddenElements:[...(front.hiddenElements||[])]},back:{enabled:Boolean(back.enabled),initialized:typeof back.initialized==="boolean"?back.initialized:hadBackConfig&&Boolean(back.elements),appearance:{backgroundColor:colorOr(back.appearance?.backgroundColor,DEFAULT_SMART_BADGE_CONFIG.sides.back.appearance.backgroundColor)},elements:{logo:normalizeBackElement("logo",elements.logo),image:normalizeBackElement("image",elements.image),text:normalizeBackElement("text",elements.text)}}};
};

export function normalizeSmartBadgeConfig(value={},fallbackColor=SMART_BADGE_DEFAULT_COLOR){
  const sourceContent=value?.content||{},source=value?.appearance||{};
  const content=Object.fromEntries(Object.keys(DEFAULT_SMART_BADGE_CONFIG.content).map((key)=>[key,typeof sourceContent[key]==="boolean"?sourceContent[key]:DEFAULT_SMART_BADGE_CONFIG.content[key]]));
  const layoutFamily=resolveLayout(source),layout=SMART_BADGE_LAYOUTS[layoutFamily];
  const stylePreset=SMART_BADGE_STYLE_PRESETS.includes(source.stylePreset)?source.stylePreset:layout.stylePreset;
  const style=SMART_BADGE_STYLES[stylePreset],candidateColor=source.primaryColor||source.primary_color||fallbackColor;
  const badgeBackground=colorOr(source.badgeBackground,style.badgeBackground);
  const legacyManualBackground=source.backgroundColorOverride===undefined&&Object.prototype.hasOwnProperty.call(source,"badgeBackground")&&badgeBackground!==style.badgeBackground?badgeBackground:"";
  const appearance={
    ...DEFAULT_SMART_BADGE_CONFIG.appearance,...style,
    layoutFamily,stylePreset,template:layoutFamily,compositionStyle:layout.compositionStyle,
    primaryColor:colorOr(candidateColor,SMART_BADGE_DEFAULT_COLOR),density:SMART_BADGE_DENSITIES.includes(source.density)?source.density:"balanced",
    badgeBackground,backgroundColorOverride:validHex(source.backgroundColorOverride)?String(source.backgroundColorOverride).toLowerCase():legacyManualBackground,heroBackground:colorOr(source.heroBackground,style.heroBackground),
    heroContainerVisible:typeof source.heroContainerVisible==="boolean"?source.heroContainerVisible:true,heroFrameVisible:typeof source.heroFrameVisible==="boolean"?source.heroFrameVisible:style.heroBorderWidth>0,
    heroBorderColor:colorOr(source.heroBorderColor,style.heroBorderColor),heroBorderWidth:numberIn(source.heroBorderWidth,style.heroBorderWidth,0,8),heroRadius:numberIn(source.heroRadius,style.heroRadius,0,40),heroShadowVisible:typeof source.heroShadowVisible==="boolean"?source.heroShadowVisible:style.heroShadowVisible,heroOpacity:numberIn(source.heroOpacity,100,0,100),heroPadding:numberIn(source.heroPadding,13,0,40),accentColor:colorOr(source.accentColor,style.accentColor),
    labelFontSize:numberIn(source.labelFontSize,9.5,5,48),labelFontWeight:[500,600,700,800,900].includes(Number(source.labelFontWeight))?Number(source.labelFontWeight):700,labelColor:colorOr(source.labelColor,style.labelColor),valueFontSize:numberIn(source.valueFontSize,13,7,72),valueFontWeight:[500,600,700,800,900].includes(Number(source.valueFontWeight))?Number(source.valueFontWeight):800,valueColor:colorOr(source.valueColor,style.valueColor),
    fieldBackground:colorOr(source.fieldBackground,style.fieldBackground),fieldBorderColor:colorOr(source.fieldBorderColor,style.fieldBorderColor),fieldBorderWidth:numberIn(source.fieldBorderWidth,style.fieldBorderWidth,0,6),fieldRadius:numberIn(source.fieldRadius,style.fieldRadius,0,24),fieldPadding:numberIn(source.fieldPadding,style.fieldPadding,0,20),
  };
  const elements=normalizeElements(value?.elements);
  const fieldParts=normalizeFieldPartOverrides(value?.fieldParts);
  const layoutOverrides=Object.fromEntries(SMART_BADGE_LAYOUT_FAMILIES.flatMap((id)=>value?.layoutOverrides?.[id]?[ [id,normalizeElements(value.layoutOverrides[id])] ]:[]));
  const fieldPartOverrides=Object.fromEntries(SMART_BADGE_LAYOUT_FAMILIES.flatMap((id)=>value?.fieldPartOverrides?.[id]?[ [id,normalizeFieldPartOverrides(value.fieldPartOverrides[id])] ]:[]));
  layoutOverrides[layoutFamily]=elements;
  fieldPartOverrides[layoutFamily]=fieldParts;
  const componentSources=Object.fromEntries(SMART_BADGE_COMPONENT_KEYS.map((key)=>[key,SMART_BADGE_LAYOUT_FAMILIES.includes(value?.componentSources?.[key])?value.componentSources[key]:layoutFamily]));
  const printSource=SMART_BADGE_PRINT_SOURCES.includes(value?.printSource)?value.printSource:"legacy";
  const hiddenElements=[...new Set((Array.isArray(value?.hiddenElements)?value.hiddenElements:[]).filter((id)=>Object.prototype.hasOwnProperty.call(SMART_BADGE_ELEMENTS,id)&&id!=="heroContainer"))];
  const front={appearance,elements,fieldParts,hiddenElements};
  return {printSource,content,appearance,elements,hiddenElements,fieldParts,effects:normalizeEffects(value?.effects),layoutOverrides,fieldPartOverrides,componentSources,sides:normalizeSides(value?.sides,front)};
}

export function smartBadgeEffectStyle(effect={}){
  const normalized=normalizeEffect(effect);
  if(normalized.preset==="normal")return {className:"effect-normal",style:{}};
  return {className:`effect-${normalized.preset}`,style:{"--effect-shadow-x":`${normalized.shadowX}px`,"--effect-shadow-y":`${normalized.shadowY}px`,"--effect-shadow-blur":`${normalized.blur}px`,"--effect-shadow-spread":`${normalized.spread}px`,"--effect-shadow-opacity":normalized.opacity/100}};
}

export function applySmartBadgeStyle(config,targetStyle,fallbackColor=SMART_BADGE_DEFAULT_COLOR){
  const stylePreset=SMART_BADGE_STYLE_PRESETS.includes(targetStyle)?targetStyle:config?.appearance?.stylePreset||"soft",style=SMART_BADGE_STYLES[stylePreset];
  return normalizeSmartBadgeConfig({...config,appearance:{...config.appearance,...style,stylePreset,layoutFamily:config.appearance.layoutFamily,primaryColor:config.appearance.primaryColor}},fallbackColor);
}

export function switchSmartBadgePreset(config,targetLayout,fallbackColor=SMART_BADGE_DEFAULT_COLOR){
  const current=scopeActivePresetState(config),layoutFamily=SMART_BADGE_LAYOUT_FAMILIES.includes(targetLayout)?targetLayout:LEGACY_LAYOUTS[targetLayout]||FALLBACK_LAYOUT;
  const preset=SMART_BADGE_PRESETS[layoutFamily],style=SMART_BADGE_STYLES[preset.stylePreset],elements=current.layoutOverrides?.[layoutFamily]||{},fieldParts=current.fieldPartOverrides?.[layoutFamily]||{};
  const componentSources=Object.fromEntries(SMART_BADGE_COMPONENT_KEYS.map((key)=>[key,layoutFamily]));
  return normalizeSmartBadgeConfig({printSource:current.printSource,content:current.content,appearance:{...current.appearance,...style,...preset,template:layoutFamily,primaryColor:current.appearance.primaryColor},elements,fieldParts,effects:current.effects,layoutOverrides:current.layoutOverrides,fieldPartOverrides:current.fieldPartOverrides,componentSources,sides:current.sides},fallbackColor);
}

export function setSmartBadgeComponentSource(config,component,source,fallbackColor=SMART_BADGE_DEFAULT_COLOR){
  const current=scopeActivePresetState(config);
  if(!SMART_BADGE_COMPONENT_KEYS.includes(component)||!SMART_BADGE_LAYOUT_FAMILIES.includes(source))return current;
  const style=SMART_BADGE_STYLES[SMART_BADGE_LAYOUTS[source].stylePreset],patch={};
  if(component==="header")Object.assign(patch,{headerStyle:style.headerStyle,identityStyle:style.identityStyle});
  if(component==="fieldStyle")Object.assign(patch,{fieldsStyle:style.fieldsStyle,fieldBackground:style.fieldBackground,fieldBorderColor:style.fieldBorderColor,fieldBorderWidth:style.fieldBorderWidth,fieldRadius:style.fieldRadius,fieldPadding:style.fieldPadding});
  if(component==="background")Object.assign(patch,{backgroundStyle:style.backgroundStyle,badgeBackground:style.badgeBackground,decorativeStyle:style.decorativeStyle});
  if(component==="separators")Object.assign(patch,{separatorsStyle:style.separatorsStyle,accentColor:style.accentColor});
  if(component==="footer")Object.assign(patch,{footerStyle:style.footerStyle});
  if(component==="photoFrame")Object.assign(patch,{photoStyle:style.photoStyle});
  return normalizeSmartBadgeConfig({...current,appearance:{...current.appearance,...patch},componentSources:{...current.componentSources,[component]:source}},fallbackColor);
}

export function resolveSmartBadgeComponentAppearance(config){
  const sources=config.componentSources||{},base=config.appearance.layoutFamily;
  const styleFor=(component)=>SMART_BADGE_STYLES[SMART_BADGE_LAYOUTS[sources[component]||base]?.stylePreset||config.appearance.stylePreset];
  return {
    header:styleFor("header"),hero:styleFor("hero"),primaryData:styleFor("primaryData"),secondaryData:styleFor("secondaryData"),
    fieldStyle:styleFor("fieldStyle"),background:styleFor("background"),separators:styleFor("separators"),footer:styleFor("footer"),photoFrame:styleFor("photoFrame"),
  };
}

export function resolveSmartBadgeBackground(config){
  const componentBackground=resolveSmartBadgeComponentAppearance(config).background;
  return {
    color:config.appearance.backgroundColorOverride||componentBackground.badgeBackground||config.appearance.badgeBackground,
    style:componentBackground.backgroundStyle||config.appearance.backgroundStyle||"warm",
    explicit:Boolean(config.appearance.backgroundColorOverride),
  };
}

export const scopeActivePresetState=(config)=>normalizeSmartBadgeConfig(config,config?.appearance?.primaryColor);

export function getAgencyBadgeColor(agency={}){
  const branding=agency.documentBranding||agency.document_branding||{},profile=branding.defaultProfile||branding.default_profile||branding,color=profile.brandColor||profile.brand_color;
  return colorOr(color,SMART_BADGE_DEFAULT_COLOR);
}
