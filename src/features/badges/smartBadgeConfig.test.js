import { DEFAULT_SMART_BADGE_CONFIG, SMART_BADGE_COMPONENT_KEYS, SMART_BADGE_LAYOUTS, SMART_BADGE_LAYOUT_FAMILIES, SMART_BADGE_STYLES, SMART_BADGE_STYLE_PRESETS, applySmartBadgeStyle, getAgencyBadgeColor, normalizeSmartBadgeConfig, setSmartBadgeComponentSource, switchSmartBadgePreset } from "./smartBadgeConfig";

const restoredOriginal=["rukn-signature","editorial","centered-ceremony","passport-inspired","minimal-air","travel-tag","luxury-white","rukn-future"];
const rejectedIds=["typographic","photo-hero","hero-portrait","classic-editorial","split-vertical","modular-cards","luxury-brand","side-ribbon","topbar","information-grid","soft-geometry","sharp-geometric","floating-elements","bottom-identity","rukn-signature-v2","editorial-v2","vertical-split-v2","centered-ceremony-v2","mosaic-frame-v2","ribbon-focus-v2","gallery-strip-v2","profile-ledger-v2","horizon-card-v2","dual-panel-v2","editorial-luxury","modern-rukn-signature"];

describe("smart badge restored presets",()=>{
  test("new back config owns a centered official RUKN logo and preserves its deletion",()=>{
    const fresh=normalizeSmartBadgeConfig({});
    expect(fresh.sides.back).toEqual(expect.objectContaining({enabled:false,initialized:false}));
    expect(fresh.sides.back.elements.logo).toEqual(expect.objectContaining({enabled:true,xMm:13,yMm:23,widthMm:32,heightMm:42,lockAspectRatio:true}));
    const deleted=normalizeSmartBadgeConfig({...fresh,sides:{...fresh.sides,back:{...fresh.sides.back,enabled:true,initialized:true,elements:{...fresh.sides.back.elements,logo:{...fresh.sides.back.elements.logo,enabled:false}}}}});
    expect(deleted.sides.back.elements.logo.enabled).toBe(false);
    expect(normalizeSmartBadgeConfig(JSON.parse(JSON.stringify(deleted))).sides.back.elements.logo.enabled).toBe(false);
  });
  test("persists independent front and back settings without changing front overrides",()=>{
    const config=normalizeSmartBadgeConfig({elements:{photo:{mode:"custom",xMm:4,yMm:8,widthMm:20,heightMm:30}},sides:{back:{enabled:true,appearance:{backgroundColor:"#112233"},elements:{logo:{enabled:true,xMm:2,yMm:3,widthMm:52,heightMm:60},image:{enabled:true,source:"custom",customDataUrl:"data:image/png;base64,AA=="},text:{enabled:true,text:"نص الظهر",xMm:7,yMm:70}}}}});
    const restored=normalizeSmartBadgeConfig(JSON.parse(JSON.stringify(config)));
    expect(restored.sides.back.enabled).toBe(true);
    expect(restored.sides.back.appearance.backgroundColor).toBe("#112233");
    expect(restored.sides.back.elements.image).toEqual(expect.objectContaining({enabled:true,source:"custom",customDataUrl:"data:image/png;base64,AA=="}));
    expect(restored.sides.back.elements.text.text).toBe("نص الظهر");
    expect(restored.elements.photo).toEqual(expect.objectContaining({xMm:4,yMm:8,widthMm:20,heightMm:30}));
    expect(restored.sides.front.elements.photo).toEqual(expect.objectContaining({xMm:4,yMm:8}));
    expect(restored.sides.back.elements.logo.xMm).toBe(2);
  });
  test("keeps only the approved original IDs with no duplicate IDs or labels",()=>{
    expect(SMART_BADGE_LAYOUT_FAMILIES).toEqual(restoredOriginal);
    expect(new Set(SMART_BADGE_LAYOUT_FAMILIES).size).toBe(SMART_BADGE_LAYOUT_FAMILIES.length);
    const labels=SMART_BADGE_LAYOUT_FAMILIES.map((id)=>SMART_BADGE_LAYOUTS[id].name);
    expect(new Set(labels).size).toBe(labels.length);
    rejectedIds.forEach((id)=>expect(SMART_BADGE_LAYOUT_FAMILIES).not.toContain(id));
    SMART_BADGE_STYLE_PRESETS.forEach((id)=>expect(SMART_BADGE_STYLES[id]).not.toHaveProperty("compositionStyle"));
  });

  test("provides readable 58x88 defaults and safely normalizes identity",()=>{
    const config=normalizeSmartBadgeConfig({content:{photo:false},appearance:{primaryColor:"#AABBCC",density:"wide"}});
    expect(config.content).toEqual(expect.objectContaining({photo:false,passport:true}));
    expect(config.appearance).toEqual(expect.objectContaining({layoutFamily:"rukn-signature",stylePreset:"soft",primaryColor:"#aabbcc",density:"balanced",labelFontSize:9.5,valueFontSize:13}));
    expect(config.appearance).not.toHaveProperty("editorMode");
    expect(config.elements).toEqual(expect.objectContaining({photo:{mode:"auto"},passport:{mode:"auto"}}));
    expect(config.componentSources).toEqual(Object.fromEntries(SMART_BADGE_COMPONENT_KEYS.map((key)=>[key,"rukn-signature"])));
    expect(DEFAULT_SMART_BADGE_CONFIG.appearance.compositionStyle).toBe("rukn-signature");
  });

  test.each(rejectedIds)("normalizes rejected or retired preset %s to the safe fallback",(id)=>{
    const config=normalizeSmartBadgeConfig({appearance:{layoutFamily:id,template:id,compositionStyle:id},elements:{passport:{mode:"custom",xMm:4,yMm:40,widthMm:32,heightMm:8,fontSize:20}}});
    expect(config.appearance).toEqual(expect.objectContaining({layoutFamily:"rukn-signature",compositionStyle:"rukn-signature"}));
    expect(config.elements.passport).toEqual(expect.objectContaining({mode:"custom",xMm:4,yMm:40}));
  });

  test("switching presets isolates overrides and restores each preset state",()=>{
    const signature=normalizeSmartBadgeConfig({printSource:"smart",content:{city:true},appearance:{layoutFamily:"rukn-signature"},elements:{photo:{mode:"custom",xMm:4,yMm:18,widthMm:18,heightMm:24},passport:{mode:"custom",xMm:4,yMm:50,widthMm:32,heightMm:8,fontSize:20}},fieldParts:{passport:{value:{offsetXmm:2,offsetYmm:1}}},sides:{back:{enabled:true,initialized:true,appearance:{backgroundColor:"#123456"},elements:{text:{text:"Draft back"}}}}});
    const editorial=switchSmartBadgePreset(signature,"editorial");
    expect(editorial.content.city).toBe(true);
    expect(editorial.printSource).toBe("smart");
    expect(editorial.appearance).toEqual(expect.objectContaining({layoutFamily:"editorial",compositionStyle:"editorial"}));
    expect(editorial.elements.photo).toEqual({mode:"auto"});
    expect(editorial.elements.passport).toEqual({mode:"auto"});
    expect(editorial.fieldParts).toEqual({});
    expect(editorial.sides.back).toEqual(expect.objectContaining({enabled:true,initialized:true,appearance:{backgroundColor:"#123456"}}));
    expect(editorial.sides.back.elements.text.text).toBe("Draft back");
    const restored=switchSmartBadgePreset(editorial,"rukn-signature");
    expect(restored.printSource).toBe("smart");
    expect(restored.elements.photo).toEqual(expect.objectContaining({mode:"custom",xMm:4,yMm:18}));
    expect(restored.elements.passport).toEqual(expect.objectContaining({mode:"custom",fontSize:20}));
    expect(restored.fieldParts.passport.value).toEqual({offsetXmm:2,offsetYmm:1});
  });

  test("switching style preserves the selected preset and every X/Y override",()=>{
    const source=normalizeSmartBadgeConfig({appearance:{layoutFamily:"editorial",stylePreset:"minimal"},elements:{passport:{mode:"custom",xMm:6,yMm:42,widthMm:30,heightMm:8}}});
    const next=applySmartBadgeStyle(source,"bold");
    expect(next.appearance).toEqual(expect.objectContaining({layoutFamily:"editorial",compositionStyle:"editorial",stylePreset:"bold",fieldBorderWidth:1}));
    expect(next.elements.passport).toEqual(expect.objectContaining({xMm:6,yMm:42}));
  });

  test("mixes one component source without changing other sources or manual overrides",()=>{
    const base=normalizeSmartBadgeConfig({appearance:{layoutFamily:"rukn-signature"},elements:{photo:{mode:"custom",xMm:7,yMm:18,widthMm:18,heightMm:24},passport:{mode:"custom",xMm:5,yMm:52,widthMm:30,heightMm:8}},fieldParts:{passport:{value:{offsetXmm:1.5,offsetYmm:-.5}}}});
    const hero=setSmartBadgeComponentSource(base,"hero","editorial"),fields=setSmartBadgeComponentSource(hero,"fieldStyle","centered-ceremony");
    expect(hero.componentSources).toEqual(expect.objectContaining({header:"rukn-signature",hero:"editorial",fieldStyle:"rukn-signature"}));
    expect(fields.componentSources).toEqual(expect.objectContaining({header:"rukn-signature",hero:"editorial",fieldStyle:"centered-ceremony"}));
    expect(fields.elements.photo).toEqual(expect.objectContaining({xMm:7,yMm:18,widthMm:18,heightMm:24}));
    expect(fields.elements.passport).toEqual(expect.objectContaining({xMm:5,yMm:52,widthMm:30,heightMm:8}));
    expect(fields.fieldParts.passport.value).toEqual({offsetXmm:1.5,offsetYmm:-.5});
  });

  test("save/reload normalization persists only label/value offsets",()=>{
    const saved=normalizeSmartBadgeConfig({appearance:{valueFontSize:17},fieldParts:{passport:{value:{offsetXmm:2,offsetYmm:4,fontSize:99},label:{offsetXmm:-1,offsetYmm:.5}},hotel:{value:{offsetXmm:3,offsetYmm:2}}}});
    const reloaded=normalizeSmartBadgeConfig(JSON.parse(JSON.stringify(saved)));
    expect(reloaded.fieldParts).toEqual({passport:{label:{offsetXmm:-1,offsetYmm:.5},value:{offsetXmm:2,offsetYmm:4}},hotel:{value:{offsetXmm:3,offsetYmm:2}}});
    expect(reloaded.appearance.valueFontSize).toBe(17);
    expect(reloaded.fieldParts.passport.value).not.toHaveProperty("fontSize");
  });

  test("persists an explicit background above mix-and-match and resets only that override",()=>{
    const manual=normalizeSmartBadgeConfig({appearance:{layoutFamily:"rukn-signature",backgroundColorOverride:"#ff00aa"}});
    const mixed=setSmartBadgeComponentSource(manual,"background","minimal-air");
    expect(mixed.componentSources.background).toBe("minimal-air");
    expect(mixed.appearance.backgroundColorOverride).toBe("#ff00aa");
    const reset=normalizeSmartBadgeConfig({...mixed,appearance:{...mixed.appearance,backgroundColorOverride:""}});
    expect(reset.appearance.backgroundColorOverride).toBe("");
    expect(reset.componentSources.background).toBe("minimal-air");
    expect(reset.appearance.badgeBackground).toBe(SMART_BADGE_STYLES.minimal.badgeBackground);
  });

  test("upgrades a legacy non-default badge color to the explicit background cascade",()=>{
    const config=normalizeSmartBadgeConfig({appearance:{layoutFamily:"rukn-signature",badgeBackground:"#123456"}});
    expect(config.appearance.backgroundColorOverride).toBe("#123456");
  });

  test("normalizes visual effects without touching element geometry",()=>{
    const config=normalizeSmartBadgeConfig({elements:{passport:{mode:"custom",xMm:7,yMm:48,widthMm:34,heightMm:10}},effects:{hero:{preset:"floating"},passport:{preset:"elevated",shadowX:2,shadowY:5,blur:16,spread:1,opacity:18}}});
    expect(config.effects.hero).toEqual(expect.objectContaining({preset:"floating",shadowY:2,blur:8}));
    expect(config.effects.passport).toEqual(expect.objectContaining({preset:"elevated",shadowX:2,shadowY:5,blur:16,spread:1,opacity:18}));
    expect(config.elements.passport).toEqual(expect.objectContaining({xMm:7,yMm:48,widthMm:34,heightMm:10}));
  });

  test("normalizes invalid component sources and resets all sources with a new base",()=>{
    const mixed=normalizeSmartBadgeConfig({appearance:{layoutFamily:"editorial"},componentSources:{header:"deleted-v2",hero:"travel-tag"}});
    expect(mixed.componentSources.header).toBe("editorial");
    expect(mixed.componentSources.hero).toBe("travel-tag");
    const switched=switchSmartBadgePreset(mixed,"minimal-air");
    expect(new Set(Object.values(switched.componentSources))).toEqual(new Set(["minimal-air"]));
    expect(Object.keys(switched.componentSources)).toEqual(SMART_BADGE_COMPONENT_KEYS);
  });

  test("uses the agency branding color",()=>expect(getAgencyBadgeColor({documentBranding:{defaultProfile:{brandColor:"#AABBCC"}}})).toBe("#aabbcc"));
});
