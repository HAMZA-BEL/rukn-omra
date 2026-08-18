import { BADGE_GRID_MM, BADGE_SAFE_AREA_MM, applyElementOverridePatch, captureElementGeometry, elementStyle, fieldPartPositionStyle, normalizeElementOverride, normalizeFieldPartOverrides, patchFieldPartPosition, resetFieldPartPosition, snapElementPosition } from "./smartBadgeLayout";

describe("smart badge logical layout", () => {
  test("visual elements use the half-mm grid without badge-bound clamping", () => {
    const photo = normalizeElementOverride("photo", { mode:"custom",xMm:-20,yMm:200,widthMm:0,heightMm:100 });
    expect(photo.xMm).toBe(-20);
    expect(photo.yMm).toBe(200);
    expect(photo.widthMm).toBeGreaterThanOrEqual(8);
    expect(photo.heightMm).toBeLessThanOrEqual(880);
    expect(photo.yMm % BADGE_GRID_MM).toBe(0);
  });

  test("text elements remain constrained to the physical badge", () => {
    const passport=normalizeElementOverride("passport",{mode:"custom",xMm:-20,yMm:200,widthMm:20,heightMm:8});
    expect(passport.xMm).toBe(0);
    expect(passport.yMm).toBe(80);
  });

  test("snaps a dragged element to badge center", () => {
    const result = snapElementPosition(18.2, 34.2, 22, 20);
    expect(result.xMm).toBe(18);
    expect(result.yMm).toBe(34);
    expect(result.guides.x).toBe(true);
    expect(result.guides.y).toBe(true);
  });

  test("preserves only valid versioned custom values", () => {
    expect(normalizeElementOverride("photo", { mode:"auto",xMm:12 })).toEqual({ mode:"auto" });
    expect(normalizeElementOverride("unknown", { mode:"custom" })).toEqual({ mode:"auto" });
  });

  test("auto baseline patch changes only the requested coordinate", () => {
    const baseline = normalizeElementOverride("photo", { mode:"custom",xMm:36.5,yMm:12,widthMm:15.5,heightMm:16,scale:1 });
    const changed = applyElementOverridePatch("photo", baseline, { xMm:37 });
    expect(changed).toEqual(expect.objectContaining({ xMm:37,yMm:12,widthMm:15.5,heightMm:16,scale:1 }));
  });

  test("width and height remain independent", () => {
    const baseline = normalizeElementOverride("photo", { mode:"custom",xMm:10,yMm:12,widthMm:15,heightMm:20 });
    expect(applyElementOverridePatch("photo", baseline, { widthMm:18 })).toEqual(expect.objectContaining({ widthMm:18,heightMm:20 }));
    expect(applyElementOverridePatch("photo", baseline, { heightMm:24 })).toEqual(expect.objectContaining({ widthMm:15,heightMm:24 }));
  });

  test("scale preserves box coordinates and shape while scaling from center", () => {
    const baseline = normalizeElementOverride("photo", { mode:"custom",xMm:18,yMm:20,widthMm:15,heightMm:20,scale:1 });
    const enlarged = applyElementOverridePatch("photo", baseline, { scale:1.2 });
    expect(enlarged).toEqual(expect.objectContaining({ xMm:18,yMm:20,widthMm:15,heightMm:20,scale:1.2 }));
    expect(elementStyle(enlarged)).toEqual(expect.objectContaining({ transform:"scale(1.2)",transformOrigin:"center center" }));
    expect(applyElementOverridePatch("photo", enlarged, { scale:1 })).toEqual(expect.objectContaining({ widthMm:15,heightMm:20,scale:1 }));
  });

  test.each(["passport","travelDate","program","group","room","makkahHotel","madinahHotel","city","phone","guidePhone"])("%s inspector edits keep the top-left anchor fixed", (id) => {
    const baseline=normalizeElementOverride(id,{mode:"custom",xMm:29.5,yMm:53,widthMm:20,heightMm:8,fontSize:12,labelFontSize:7,labelFontWeight:700,labelColor:"#778899",fontWeight:800,color:"#112233",padding:6});
    for(const patch of [{widthMm:35},{heightMm:14},{fontSize:22},{labelFontSize:11},{labelFontWeight:900},{labelColor:"#abcdef"},{fontWeight:600},{color:"#fedcba"},{padding:10},{borderWidth:2},{radius:8}]){
      expect(applyElementOverridePatch(id,baseline,patch)).toEqual(expect.objectContaining({xMm:29.5,yMm:53,...patch}));
    }
  });

  test.each(["passport","travelDate","program","makkahHotel"])("%s geometry capture contains no typography or appearance overrides",(id)=>{
    const measured=normalizeElementOverride(id,{mode:"custom",xMm:12,yMm:42,widthMm:28,heightMm:8,fontSize:18,labelFontSize:9,fontWeight:900,labelFontWeight:800,color:"#112233",labelColor:"#445566",padding:7,borderWidth:1,radius:6});
    const geometry=captureElementGeometry(id,measured),resized=applyElementOverridePatch(id,geometry,{heightMm:10});
    expect(resized).toEqual(expect.objectContaining({xMm:12,yMm:42,widthMm:28,heightMm:10}));
    expect(resized.explicitProperties).toEqual(["heightMm"]);
    for(const property of ["fontSize","labelFontSize","fontWeight","labelFontWeight","color","labelColor","padding","borderWidth","radius","backgroundColor"])expect(resized).not.toHaveProperty(property);
  });

  test("migrates the previous captured-style shape back to geometry-only inheritance",()=>{
    const migrated=normalizeElementOverride("passport",{mode:"custom",xMm:12,yMm:42,widthMm:28,heightMm:10,internalDisplay:"block",fontSize:18,labelFontSize:9,fontWeight:900,labelFontWeight:800,color:"#112233",labelColor:"#445566",padding:7,borderWidth:1,radius:6});
    expect(migrated).toEqual(expect.objectContaining({xMm:12,yMm:42,widthMm:28,heightMm:10,explicitProperties:[]}));
    for(const property of ["fontSize","labelFontSize","fontWeight","labelFontWeight","color","labelColor","padding","borderWidth","radius"])expect(migrated).not.toHaveProperty(property);
  });

  test("an explicit field typography edit remains specific after geometry changes",()=>{
    const geometry=captureElementGeometry("passport",{xMm:12,yMm:42,widthMm:28,heightMm:8,scale:1}),typed=applyElementOverridePatch("passport",geometry,{fontSize:18}),resized=applyElementOverridePatch("passport",typed,{heightMm:10});
    expect(resized).toEqual(expect.objectContaining({fontSize:18,heightMm:10,explicitProperties:["fontSize","heightMm"]}));
  });

  test("label and value typography normalize and persist independently", () => {
    const field=normalizeElementOverride("passport",{mode:"custom",xMm:4,yMm:50,widthMm:30,heightMm:9,labelFontSize:9,labelFontWeight:600,labelColor:"#abcdef",fontSize:17,fontWeight:900,color:"#123456"});
    expect(field).toEqual(expect.objectContaining({labelFontSize:9,labelFontWeight:600,labelColor:"#abcdef",fontSize:17,fontWeight:900,color:"#123456"}));
  });

  test.each(["passport","program","travelDate","makkahHotel","madinahHotel","phone","guidePhone","group","room","city"])("%s label and value offsets are independent position-only overrides", (fieldId) => {
    const valueMoved=patchFieldPartPosition({},fieldId,"value",{offsetXmm:2,offsetYmm:4});
    expect(valueMoved[fieldId]).toEqual({value:{offsetXmm:2,offsetYmm:4}});
    expect(valueMoved[fieldId]).not.toHaveProperty("label");
    expect(valueMoved[fieldId].value).not.toEqual(expect.objectContaining({fontSize:expect.anything(),color:expect.anything()}));
    const labelMoved=patchFieldPartPosition(valueMoved,fieldId,"label",{offsetXmm:-.5,offsetYmm:1});
    expect(labelMoved[fieldId]).toEqual({value:{offsetXmm:2,offsetYmm:4},label:{offsetXmm:-.5,offsetYmm:1}});
    expect(fieldPartPositionStyle(labelMoved,fieldId,"value")).toEqual({transform:"translate(2mm, 4mm)"});
    expect(resetFieldPartPosition(labelMoved,fieldId,"value")).toEqual({[fieldId]:{label:{offsetXmm:-.5,offsetYmm:1}}});
  });

  test("field-part normalization drops unknown fields and properties without changing visible zero baseline",()=>{
    expect(normalizeFieldPartOverrides({passport:{value:{offsetXmm:0,offsetYmm:0,fontSize:40}},unknown:{value:{offsetXmm:3}}})).toEqual({passport:{value:{offsetXmm:0,offsetYmm:0}}});
    expect(fieldPartPositionStyle({},"passport","value")).toBeUndefined();
  });

  test("watermark opacity persists inside safe limits", () => {
    expect(normalizeElementOverride("watermark", {mode:"custom",xMm:12,yMm:34,widthMm:35,heightMm:24,opacity:17}).opacity).toBe(17);
    expect(normalizeElementOverride("watermark", {mode:"custom",xMm:12,yMm:34,widthMm:35,heightMm:24,opacity:90}).opacity).toBe(80);
  });

  test("supports expanded visual scales and a hero-sized pilgrim name", () => {
    expect(normalizeElementOverride("photo", {mode:"custom",xMm:20,yMm:20,widthMm:10,heightMm:12,scale:3}).scale).toBe(3);
    expect(normalizeElementOverride("logo", {mode:"custom",xMm:20,yMm:20,widthMm:10,heightMm:8,scale:.25}).scale).toBe(.25);
    expect(normalizeElementOverride("pilgrimName", {mode:"custom",xMm:0,yMm:20,widthMm:58,heightMm:12,fontSize:54}).fontSize).toBe(54);
  });
});
