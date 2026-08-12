import React, {act} from "react";
import {createRoot} from "react-dom/client";
import {AgencyDocumentBranding} from "./AgencyDocumentBranding";
import {TRANSLATIONS} from "../../data/initialData";

describe("document watermark preview",()=>{let host,root;beforeEach(()=>{global.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement("div");document.body.appendChild(host);root=createRoot(host);});afterEach(async()=>{await act(async()=>root.unmount());host.remove();delete global.IS_REACT_ACT_ENVIRONMENT;});
  const draw=(watermark,orientation="portrait")=>act(async()=>root.render(<AgencyDocumentBranding agency={{nameAr:"وكالة",logoUrl:"logo.png"}} config={{enabled:true,orientation,headerLogoSize:22,watermark}} t={TRANSLATIONS.ar} lang="ar" dir="rtl"/>));
  test("off and missing logo render nothing",async()=>{await draw({enabled:false,size:40,opacity:0});expect(host.querySelector("[data-document-watermark]")).toBeNull();await act(async()=>root.render(<AgencyDocumentBranding agency={{nameAr:"وكالة"}} config={{enabled:true,watermark:{enabled:true,size:110,opacity:10}}} t={TRANSLATIONS.ar} lang="ar" dir="rtl"/>));expect(host.querySelector("[data-document-watermark]")).toBeNull();});
  test.each([[40,0,"portrait"],[110,10,"portrait"],[160,100,"landscape"],[240,10,"portrait"],[320,100,"landscape"]])("size %s opacity %s stays centered in %s",async(size,opacity,orientation)=>{await draw({enabled:true,size,opacity},orientation);const paper=host.querySelector("[data-preview-paper]"),mark=host.querySelector("[data-document-watermark]");expect(mark).not.toBeNull();expect(paper.style.getPropertyValue("--branding-watermark-size")).toBe(`${size}mm`);expect(paper.style.getPropertyValue("--branding-watermark-opacity")).toBe(`${opacity/100}`);expect(paper.style.getPropertyValue("--branding-logo-size")).toBe("22mm");expect(mark.nextElementSibling.tagName).toBe("HEADER");});
});
