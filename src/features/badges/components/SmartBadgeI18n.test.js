import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { LangProvider, useLang } from "../../../hooks/useLang";
import { BadgePrintSourceSetting } from "./BadgePrintSourceSetting";
import { SmartBadgeIdentity } from "./SmartBadgeIdentity";

function LanguageSwitch(){
  const {setLang}=useLang();
  return <div><button data-lang="ar" onClick={()=>setLang("ar")}>ar</button><button data-lang="fr" onClick={()=>setLang("fr")}>fr</button><button data-lang="en" onClick={()=>setLang("en")}>en</button></div>;
}

describe("Smart Badge i18n",()=>{
  let host,root;
  const agencyId="i18n-agency";
  const store={agencyId,agency:{id:agencyId,nameAr:"وكالة الاختبار"},activeClients:[],programs:[],programTravelGroups:[]};
  beforeEach(()=>{global.IS_REACT_ACT_ENVIRONMENT=true;localStorage.clear();localStorage.setItem("umrah_lang","ar");window.requestAnimationFrame=(callback)=>{callback();return 1;};host=document.createElement("div");document.body.appendChild(host);root=createRoot(host);});
  afterEach(async()=>{await act(async()=>root.unmount());host.remove();localStorage.clear();delete global.IS_REACT_ACT_ENVIRONMENT;});
  const render=async()=>{await act(async()=>{root.render(<LangProvider><LanguageSwitch/><BadgePrintSourceSetting store={store} onToast={()=>{}}/><SmartBadgeIdentity store={store} onToast={()=>{}}/></LangProvider>);await Promise.resolve();});};

  test("language changes source, editor, back controls and full preview live without changing config",async()=>{
    await render();
    const configKey=`rukn-smart-badge-settings-${agencyId}`,configBefore=localStorage.getItem(configKey);
    expect(host.textContent).toContain("مصدر تصميم الشارة");
    expect(host.querySelector(".smart-badge-identity").dir).toBe("rtl");
    await act(async()=>host.querySelector('[data-lang="en"]').click());
    expect(host.textContent).toContain("Badge design source");
    expect(host.textContent).toContain("Design system");
    expect(host.querySelector(".smart-badge-identity").dir).toBe("ltr");
    expect(host.querySelector(".smart-badge-print-source-setting").dir).toBe("ltr");
    expect(host.querySelector(".smart-badge-print-source-setting").textContent).not.toMatch(/[\u0600-\u06ff]/);
    expect(host.querySelector(".smart-badge-controls").textContent).not.toMatch(/[\u0600-\u06ff]/);
    expect([...host.querySelectorAll('.smart-badge-source-choice input')].map((input)=>input.value)).toEqual(["smart","legacy"]);
    await act(async()=>host.querySelector('[aria-label="Show back side"]').click());
    expect(host.textContent).toContain("Enable badge back");
    expect(host.textContent).toContain("Back background color");
    expect(host.querySelector(".smart-badge-controls").textContent).not.toMatch(/[\u0600-\u06ff]/);
    await act(async()=>host.querySelector('input[aria-label="Enable badge back"]').click());
    await act(async()=>host.querySelector('[aria-label="Full badge preview"]').click());
    const dialog=host.querySelector('[role="dialog"][aria-label="Full badge preview"]');
    expect(dialog.textContent).toContain("Front");
    expect(dialog.textContent).toContain("Back");
    expect(dialog.querySelector(".smart-badge-back-resize,.is-selected")).toBeNull();
    expect(localStorage.getItem(configKey)).toBe(configBefore);
    await act(async()=>dialog.querySelector('[aria-label="Close badge preview"]').click());
    await act(async()=>host.querySelector('[data-lang="fr"]').click());
    expect(host.textContent).toContain("Source du design du badge");
    expect(host.querySelector('input[aria-label="Activer le verso du badge"]').checked).toBe(true);
    await act(async()=>host.querySelector('[aria-label="Afficher le recto"]').click());
    expect(host.textContent).toContain("Système de design");
    expect(host.querySelector(".smart-badge-identity").dir).toBe("ltr");
  });
});
