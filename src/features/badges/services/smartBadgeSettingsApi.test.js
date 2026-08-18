import { loadSmartBadgeSettings, saveSmartBadgeSettings } from "./smartBadgeSettingsApi";
import { normalizeSmartBadgeConfig, setSmartBadgeComponentSource } from "../smartBadgeConfig";

test("save and reload preserve component sources with manual overrides",async()=>{
  const agencyId="mix-persistence-test";
  localStorage.removeItem(`rukn-smart-badge-settings-${agencyId}`);
  const base=normalizeSmartBadgeConfig({appearance:{valueFontSize:16,backgroundColorOverride:"#ff00aa"},hiddenElements:["logo"],effects:{hero:{preset:"floating"},passport:{preset:"soft-shadow",blur:12}},elements:{photo:{mode:"custom",xMm:9,yMm:17,widthMm:18,heightMm:25},passport:{mode:"custom",xMm:7,yMm:48,widthMm:34,heightMm:10}},fieldParts:{passport:{value:{offsetXmm:2,offsetYmm:4}},makkahHotel:{label:{offsetXmm:-.5,offsetYmm:1}}},sides:{back:{enabled:true,initialized:true,appearance:{backgroundColor:"#112233"},elements:{logo:{enabled:false},text:{enabled:true,text:"ظهر محفوظ"},image:{enabled:true,source:"custom",customDataUrl:"data:image/png;base64,AA=="}}}}});
  const mixed={...setSmartBadgeComponentSource(setSmartBadgeComponentSource(base,"hero","editorial"),"fieldStyle","centered-ceremony"),printSource:"smart"};
  const saved=await saveSmartBadgeSettings(agencyId,mixed,"#805b0b"),loaded=await loadSmartBadgeSettings(agencyId,"#805b0b");
  expect(saved.error).toBeNull();expect(loaded.error).toBeNull();
  expect(loaded.data.componentSources).toEqual(expect.objectContaining({header:"rukn-signature",hero:"editorial",fieldStyle:"centered-ceremony"}));
  expect(loaded.data.elements.photo).toEqual(expect.objectContaining({mode:"custom",xMm:9,yMm:17,widthMm:18,heightMm:25}));
  expect(loaded.data.elements.passport).toEqual(expect.objectContaining({mode:"custom",xMm:7,yMm:48,widthMm:34,heightMm:10}));
  expect(loaded.data.elements.passport).not.toHaveProperty("fontSize");
  expect(loaded.data.fieldParts).toEqual(expect.objectContaining({passport:{value:{offsetXmm:2,offsetYmm:4}},makkahHotel:{label:{offsetXmm:-.5,offsetYmm:1}}}));
  expect(loaded.data.appearance.valueFontSize).toBe(16);
  expect(loaded.data.appearance.backgroundColorOverride).toBe("#ff00aa");
  expect(loaded.data.effects).toEqual(expect.objectContaining({hero:expect.objectContaining({preset:"floating"}),passport:expect.objectContaining({preset:"soft-shadow",blur:12})}));
  expect(loaded.data.printSource).toBe("smart");
  expect(loaded.data.sides.back).toEqual(expect.objectContaining({enabled:true,appearance:{backgroundColor:"#112233"}}));
  expect(loaded.data.sides.back.elements.text.text).toBe("ظهر محفوظ");
  expect(loaded.data.sides.back.elements.image).toEqual(expect.objectContaining({enabled:true,source:"custom",customDataUrl:"data:image/png;base64,AA=="}));
  expect(loaded.data.sides.back.elements.logo.enabled).toBe(false);
  expect(loaded.data.hiddenElements).toContain("logo");
});
