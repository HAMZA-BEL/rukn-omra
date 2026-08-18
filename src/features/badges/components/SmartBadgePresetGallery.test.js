import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SMART_BADGE_LAYOUTS, SMART_BADGE_TEMPLATES } from "../smartBadgeConfig";
import { SMART_BADGE_PRESET_SAMPLE, SmartBadgePresetGallery } from "./SmartBadgePresetGallery";

test("renders every restored preset once and excludes every explicitly rejected design",()=>{
  const html=renderToStaticMarkup(<SmartBadgePresetGallery/>);
  expect((html.match(/class="smart-badge is-output/g)||[])).toHaveLength(8);
  expect((html.match(/data-preset-id=/g)||[])).toHaveLength(8);
  SMART_BADGE_TEMPLATES.forEach((id)=>{
    expect((html.match(new RegExp(`data-preset-id="${id}"`,"g"))||[])).toHaveLength(1);
    expect(html).toContain(SMART_BADGE_LAYOUTS[id].name);
  });
  expect((html.match(new RegExp(SMART_BADGE_PRESET_SAMPLE.name,"g"))||[]).length).toBeGreaterThanOrEqual(8);
  ["Typographic","Photo Hero","RUKN Signature V2","Editorial V2","Vertical Split V2","Centered Ceremony V2","Mosaic Frame V2","Ribbon Focus V2","Gallery Strip V2","Profile Ledger V2","Horizon Card V2","Dual Panel V2","Editorial Luxury","Modern RUKN Signature","هندسة حادة","تكوين عائم","هوية سفلية","انقسام عمودي","بطاقة معيارية","فخامة داكنة","مسار جانبي","شريط علوي","شبكة معلومات","هندسة ناعمة"].forEach((label)=>expect(html).not.toContain(label));
});
