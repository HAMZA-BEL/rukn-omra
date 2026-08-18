import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { BadgePrintSourceSetting } from "./BadgePrintSourceSetting";
import { loadSmartBadgeSettings } from "../services/smartBadgeSettingsApi";

test("presents smart and legacy outside either badge workspace and persists the internal values",async()=>{
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const host=document.createElement("div"),root=createRoot(host),agencyId="global-print-source";
  localStorage.removeItem(`rukn-smart-badge-settings-${agencyId}`);
  await act(async()=>root.render(<BadgePrintSourceSetting store={{agencyId,agency:{id:agencyId,nameAr:"وكالة"}}} onToast={()=>{}}/>));
  await act(async()=>Promise.resolve());
  expect(host.querySelectorAll('[role="radiogroup"] input')).toHaveLength(2);
  expect([...host.querySelectorAll("strong")].map((node)=>node.textContent)).toEqual(expect.arrayContaining(["مصدر تصميم الشارة","هوية الشارة","قالب الشارة"]));
  const smart=host.querySelector('input[value="smart"]'),legacy=host.querySelector('input[value="legacy"]');
  expect(legacy.checked).toBe(true);
  await act(async()=>{smart.click();await new Promise((resolve)=>setTimeout(resolve,0));});
  expect((await loadSmartBadgeSettings(agencyId,"#805b0b")).data.printSource).toBe("smart");
  expect(host.textContent).toContain("هوية الشارة");expect(host.textContent).toContain("قالب الشارة");
  await act(async()=>root.unmount());
});
