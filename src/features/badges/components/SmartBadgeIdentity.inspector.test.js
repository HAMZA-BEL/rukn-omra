import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { SmartBadgeFullPreview, SmartBadgeIdentity, buildSmartBadgeData } from "./SmartBadgeIdentity";
import { normalizeSmartBadgeConfig } from "../smartBadgeConfig";

describe("SmartBadgeIdentity inspector", () => {
  let host;
  let root;
  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.requestAnimationFrame = (callback) => { callback(); return 1; };
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    localStorage.clear();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  });

  const render = async () => {
    await act(async () => root.render(<SmartBadgeIdentity store={{
      agencyId:"agency-test", agency:{ id:"agency-test",nameAr:"وكالة الاختبار" }, activeClients:[], programs:[], programTravelGroups:[],
    }} onToast={() => {}} />));
  };
  const openSection = async (title) => {
    const button=[...host.querySelectorAll(".smart-badge-collapsible-header")].find((candidate)=>candidate.querySelector("h3")?.textContent===title);
    if(button?.getAttribute("aria-expanded")!=="true")await act(async()=>button.click());
    return button?.closest(".smart-badge-collapsible");
  };

  test("shows either general settings or the selected element, then returns without duplication", async () => {
    await render();
    expect(host.textContent).toContain("بيانات المعاينة");
    expect(host.querySelector(".smart-badge-inspector.is-general")).not.toBeNull();
    await act(async () => host.querySelector('[data-element-id="photo"]').dispatchEvent(new Event("pointerdown", { bubbles:true })));
    expect(host.querySelector(".smart-badge-inspector.is-element")).not.toBeNull();
    expect(host.textContent).toContain("صورة المعتمر");
    expect(host.textContent).not.toContain("بيانات المعاينة");
    expect(host.textContent).toContain("الحجم");
    expect(host.textContent).not.toContain("قفل النسبة");
    for (const removed of ["يمين","يسار","أعلى","أسفل"]) expect(host.textContent).not.toContain(removed);
    await act(async () => [...host.querySelectorAll("button")].find((button) => button.textContent.includes("رجوع")).click());
    expect(host.querySelector(".smart-badge-inspector.is-general")).not.toBeNull();
    expect(host.textContent).toContain("بيانات المعاينة");
  });

  test("enables and edits an independent back side with logo image and text controls",async()=>{
    await render();
    const sideSwitch=host.querySelector(".smart-badge-side-switch");
    expect(sideSwitch.closest(".smart-badge-preview-panel")).not.toBeNull();
    expect(host.querySelector(".smart-badge-side-tabs")).toBeNull();
    await act(async()=>host.querySelector('[aria-label="عرض ظهر الشارة"]').click());
    expect(host.querySelector(".smart-badge-back")).not.toBeNull();
    const enabled=host.querySelector('input[aria-label="تفعيل ظهر الشارة"]');
    expect(enabled.checked).toBe(false);
    await act(async()=>enabled.parentElement.querySelector("span").click());
    expect(enabled.checked).toBe(false);
    await act(async()=>enabled.click());
    expect(enabled.checked).toBe(true);
    expect(host.textContent).toContain("اللوغو");expect(host.textContent).toContain("صورة");expect(host.textContent).toContain("النص");
    expect(host.textContent).not.toContain("صورة المعتمر");
    expect(host.textContent).not.toMatch(/فيزا|Visa/i);
    await act(async()=>[...host.querySelectorAll(".smart-badge-back-element-list button")].find((button)=>button.textContent==="النص").click());
    const textarea=host.querySelector('textarea[aria-label="نص ظهر الشارة"]');
    await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(textarea,"تعريف خلفي");textarea.dispatchEvent(new Event("change",{bubbles:true}));});
    expect(host.querySelector(".smart-badge-back").textContent).toContain("تعريف خلفي");
    await act(async()=>host.querySelector('[aria-label="رجوع عن تعديل"]').click());
    expect(host.querySelector(".smart-badge-back").textContent).toContain("رحلة مباركة");
    await act(async()=>host.querySelector('[aria-label="عرض الوجه الأمامي"]').click());
    expect(host.querySelector(".smart-badge-back")).toBeNull();
    expect(host.querySelector(".smart-badge-person")).not.toBeNull();
  });

  test("back background and free logo geometry update independently and precisely",async()=>{
    await render();await act(async()=>host.querySelector('[aria-label="عرض ظهر الشارة"]').click());
    const badge=host.querySelector(".smart-badge-back"),logo=host.querySelector('[data-back-element-id="logo"]');
    expect(badge.style.backgroundColor).toBe("rgb(247, 243, 234)");
    const background=host.querySelector('input[aria-label="لون خلفية ظهر الشارة"]');
    await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(background,"#123456");background.dispatchEvent(new Event("change",{bubbles:true}));});
    expect(badge.style.backgroundColor).toBe("rgb(18, 52, 86)");
    expect(host.querySelector('input[aria-label="الحفاظ على نسبة اللوغو"]').checked).toBe(true);
    const width=host.querySelector('input[aria-label="عرض عنصر الظهر"]'),height=host.querySelector('input[aria-label="ارتفاع عنصر الظهر"]');
    await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(width,"50");width.dispatchEvent(new Event("change",{bubbles:true}));});
    expect(Number(width.value)).toBe(50);expect(Number(height.value)).toBe(65.625);
    await act(async()=>window.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true})));
    expect(Number(host.querySelector('input[aria-label="X الظهر"]').value)).toBe(13.5);
    await act(async()=>window.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowDown",shiftKey:true,bubbles:true})));
    expect(Number(host.querySelector('input[aria-label="Y الظهر"]').value)).toBe(25);
    expect(logo.style.width).toBe("50mm");
    await act(async()=>host.querySelector('[aria-label="عرض الوجه الأمامي"]').click());
    expect(host.querySelector('[data-element-id="logo"]')).not.toBeNull();
  });

  test("RUKN back logo defaults centrally, deletes through history, and full preview is read-only",async()=>{
    await render();
    const dirtyBefore=host.querySelector(".smart-badge-status").textContent;
    await act(async()=>host.querySelector('[aria-label="معاينة الشارة كاملة"]').click());
    let dialog=host.querySelector('[role="dialog"][aria-label="معاينة الشارة كاملة"]');
    expect(dialog).not.toBeNull();
    expect(dialog.querySelectorAll("figure")).toHaveLength(1);
    expect(dialog.querySelector(".smart-badge-back")).toBeNull();
    expect(dialog.querySelector(".smart-badge-resize-zone,.smart-badge-back-resize,.is-selected")).toBeNull();
    expect(host.querySelector(".smart-badge-status").textContent).toBe(dirtyBefore);
    await act(async()=>dialog.querySelector('[aria-label="إغلاق معاينة الشارة"]').click());
    await act(async()=>host.querySelector('[aria-label="عرض ظهر الشارة"]').click());
    const logo=host.querySelector('[data-back-element-id="logo"]');
    expect(logo.querySelector('img[src="/branding/rukn-logo.png"]')).not.toBeNull();
    expect([logo.style.left,logo.style.top,logo.style.width,logo.style.height]).toEqual(["13mm","23mm","32mm","42mm"]);
    await act(async()=>host.querySelector('input[aria-label="تفعيل ظهر الشارة"]').click());
    await act(async()=>host.querySelector(".smart-badge-delete-back-element").click());
    expect(host.querySelector('[data-back-element-id="logo"]')).toBeNull();
    await act(async()=>host.querySelector('[aria-label="رجوع عن تعديل"]').click());
    expect(host.querySelector('[data-back-element-id="logo"]')).not.toBeNull();
    await act(async()=>host.querySelector('[aria-label="إعادة تعديل"]').click());
    expect(host.querySelector('[data-back-element-id="logo"]')).toBeNull();
    await act(async()=>host.querySelector('[aria-label="معاينة الشارة كاملة"]').click());
    dialog=host.querySelector('[role="dialog"][aria-label="معاينة الشارة كاملة"]');
    expect(dialog.querySelectorAll("figure")).toHaveLength(2);
    expect(dialog.querySelector(".smart-badge-back")).not.toBeNull();
    expect(dialog.querySelector(".smart-badge-back-resize,.is-selected")).toBeNull();
  });

  test("full preview projects the current draft and renders an enabled empty back",async()=>{
    const disabled=normalizeSmartBadgeConfig({sides:{back:{enabled:false}}});
    await act(async()=>root.render(<SmartBadgeFullPreview config={disabled} data={{name:"اختبار"}} agency={{}} onClose={()=>{}}/>));
    expect(host.querySelector('[data-preview-sides="front"]')).not.toBeNull();
    expect(host.querySelector('[data-preview-side="back"]')).toBeNull();
    const enabled=normalizeSmartBadgeConfig({...disabled,sides:{...disabled.sides,back:{...disabled.sides.back,enabled:true,appearance:{backgroundColor:"#123456"},elements:Object.fromEntries(Object.entries(disabled.sides.back.elements).map(([id,element])=>[id,{...element,enabled:false}]))}}});
    await act(async()=>root.render(<SmartBadgeFullPreview config={enabled} data={{name:"اختبار"}} agency={{}} onClose={()=>{}}/>));
    const back=host.querySelector('[data-preview-side="back"] .smart-badge-back');
    expect(host.querySelector('[data-preview-sides="front-back"]')).not.toBeNull();
    expect(host.querySelectorAll("figure")).toHaveLength(2);
    expect(back).not.toBeNull();
    expect(back.style.backgroundColor).toBe("rgb(18, 52, 86)");
    expect(back.querySelector("[data-back-element-id]")).toBeNull();
    expect(host.querySelector(".smart-badge-resize-zone,.smart-badge-back-resize,.is-selected")).toBeNull();
  });

  test("keyboard delete is side-scoped, undoable, and ignored while editing or without selection",async()=>{
    await render();
    const frontLogo=host.querySelector('[data-element-id="logo"]');
    await act(async()=>frontLogo.dispatchEvent(new Event("pointerdown",{bubbles:true})));
    const xInput=host.querySelector('input[aria-label="X"]');
    await act(async()=>xInput.dispatchEvent(new KeyboardEvent("keydown",{key:"Backspace",bubbles:true})));
    expect(host.querySelector('[data-element-id="logo"]')).not.toBeNull();
    await act(async()=>window.dispatchEvent(new KeyboardEvent("keydown",{key:"Delete",bubbles:true})));
    expect(host.querySelector('[data-element-id="logo"]')).toBeNull();
    await act(async()=>host.querySelector('[aria-label="رجوع عن تعديل"]').click());
    expect(host.querySelector('[data-element-id="logo"]')).not.toBeNull();
    await act(async()=>host.querySelector(".smart-badge").dispatchEvent(new Event("pointerdown",{bubbles:true})));
    await act(async()=>window.dispatchEvent(new KeyboardEvent("keydown",{key:"Delete",bubbles:true})));
    expect(host.querySelector('[data-element-id="logo"]')).not.toBeNull();
    await act(async()=>host.querySelector('[aria-label="عرض ظهر الشارة"]').click());
    expect(host.querySelector('[data-back-element-id="logo"]')).not.toBeNull();
    const backX=host.querySelector('input[aria-label="X الظهر"]');
    await act(async()=>backX.dispatchEvent(new KeyboardEvent("keydown",{key:"Delete",bubbles:true})));
    expect(host.querySelector('[data-back-element-id="logo"]')).not.toBeNull();
    const editable=document.createElement("div");editable.setAttribute("contenteditable","true");host.appendChild(editable);
    await act(async()=>editable.dispatchEvent(new KeyboardEvent("keydown",{key:"Backspace",bubbles:true})));
    expect(host.querySelector('[data-back-element-id="logo"]')).not.toBeNull();editable.remove();
    for(const tag of ["textarea","select"]){const control=document.createElement(tag);host.appendChild(control);await act(async()=>control.dispatchEvent(new KeyboardEvent("keydown",{key:"Delete",bubbles:true})));expect(host.querySelector('[data-back-element-id="logo"]')).not.toBeNull();control.remove();}
    await act(async()=>window.dispatchEvent(new KeyboardEvent("keydown",{key:"Backspace",bubbles:true})));
    expect(host.querySelector('[data-back-element-id="logo"]')).toBeNull();
    await act(async()=>host.querySelector('[aria-label="رجوع عن تعديل"]').click());
    expect(host.querySelector('[data-back-element-id="logo"]')).not.toBeNull();
    await act(async()=>host.querySelector('[aria-label="عرض الوجه الأمامي"]').click());
    expect(host.querySelector('[data-element-id="logo"]')).not.toBeNull();
  });

  test("shows every restored preset and none of the rejected designs", async () => {
    await render();
    const templates=host.querySelectorAll(".smart-badge-template-grid button");
    expect(templates).toHaveLength(8);
    expect(host.querySelectorAll(".smart-badge-design-thumbnail")).toHaveLength(8);
    expect([...host.querySelectorAll(".smart-badge-design-thumbnail")].every((thumbnail)=>thumbnail.children.length===7)).toBe(true);
    const labels=[...templates].map((button)=>button.textContent);
    expect(labels).toEqual(expect.arrayContaining(["RUKN Signature","Editorial","Centered Ceremony","Passport Inspired","Minimal Air","Travel Tag","Luxury White","RUKN Future"]));
    ["Typographic","Photo Hero","RUKN Signature V2","Editorial V2","Vertical Split V2","Centered Ceremony V2","Mosaic Frame V2","Ribbon Focus V2","Gallery Strip V2","Profile Ledger V2","Horizon Card V2","Dual Panel V2","Editorial Luxury","Modern RUKN Signature","هندسة حادة","تكوين عائم","هوية سفلية","انقسام عمودي","بطاقة معيارية","فخامة داكنة","مسار جانبي","شريط علوي","شبكة معلومات","هندسة ناعمة"].forEach((label)=>expect(labels).not.toContain(label));
    expect(host.textContent).not.toContain("Template Mode");
    expect(host.textContent).not.toContain("Free Customize");
    await act(async()=>[...templates].find((button)=>button.textContent==="Editorial").click());
    expect(host.querySelector(".smart-badge").classList.contains("template-editorial")).toBe(true);
    expect(host.querySelector(".smart-badge").classList.contains("composition-editorial")).toBe(true);
    await act(async()=>[...host.querySelectorAll(".smart-badge-collapsible-header")].find((button)=>button.textContent.includes("حاوية الاسم والصورة")).click());
    const frame=host.querySelector('input[aria-label="إظهار إطار الاسم والصورة"]');
    const frameWasVisible=host.querySelector(".smart-badge").classList.contains("hero-frame-visible");
    await act(async()=>frame.click());
    expect(host.querySelector(".smart-badge").classList.contains("hero-frame-visible")).toBe(!frameWasVisible);
    await act(async()=>[...host.querySelectorAll(".smart-badge-collapsible-header")].find((button)=>button.textContent.includes("نصوص الحقول")).click());
    const labelSize=host.querySelector('input[aria-label="حجم عناوين الحقول"]');
    await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(labelSize,"12");labelSize.dispatchEvent(new Event("change",{bubbles:true}));});
    expect(host.querySelector(".smart-badge").style.getPropertyValue("--label-font-size")).toBe("12px");
    await act(async()=>host.querySelector('[aria-label="رجوع عن تعديل"]').click());
    expect(host.querySelector(".smart-badge").style.getPropertyValue("--label-font-size")).toBe("9.5px");
  });

  test("mix-and-match selectors expose only approved sources and history changes one component",async()=>{
    await render();
    await openSection("تخصيص مكونات التصميم");
    const selects=[...host.querySelectorAll(".smart-badge-parts-grid select")];
    expect(selects).toHaveLength(9);
    expect(selects.every((select)=>select.options.length===8)).toBe(true);
    expect(new Set(selects.flatMap((select)=>[...select.options].map((option)=>option.value))).size).toBe(8);
    const header=host.querySelector('select[aria-label="الهوية العلوية"]'),hero=host.querySelector('select[aria-label="الاسم والصورة"]');
    expect(header.value).toBe("rukn-signature");expect(hero.value).toBe("rukn-signature");
    await act(async()=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(hero,"editorial");hero.dispatchEvent(new Event("change",{bubbles:true}));});
    expect(header.value).toBe("rukn-signature");expect(hero.value).toBe("editorial");
    expect(host.querySelector(".smart-badge").classList.contains("header-source-rukn-signature")).toBe(true);
    expect(host.querySelector(".smart-badge").classList.contains("hero-source-editorial")).toBe(true);
    await act(async()=>host.querySelector('[aria-label="رجوع عن تعديل"]').click());
    expect(hero.value).toBe("rukn-signature");expect(header.value).toBe("rukn-signature");
    await act(async()=>host.querySelector('[aria-label="إعادة تعديل"]').click());
    expect(hero.value).toBe("editorial");expect(header.value).toBe("rukn-signature");
  });

  test("all general setting groups are collapsible and only the color swatch owns picker clicks", async () => {
    await render();
    const sections=[...host.querySelectorAll("section.smart-badge-collapsible")],byTitle=(title)=>sections.find((section)=>section.querySelector("h3").textContent===title),toggle=async(title)=>act(async()=>byTitle(title).querySelector(".smart-badge-collapsible-header").click());
    expect(sections).toHaveLength(12);
    expect(sections.slice(0,8).map((section)=>section.querySelector("h3").textContent)).toEqual(["بيانات المعاينة","نظام التصميم","تخصيص مكونات التصميم","مظهر المكونات","الخلفية","حاوية الاسم والصورة","نصوص الحقول","شكل الحقول"]);
    expect(sections.filter((section)=>section.classList.contains("is-open")).map((section)=>section.querySelector("h3").textContent)).toEqual(expect.arrayContaining(["نظام التصميم","بيانات المعاينة","المحتوى"]));
    expect(byTitle("نظام التصميم").querySelector(".smart-badge-collapsible-body")).not.toBeNull();
    expect(byTitle("مصدر تصميم الشارة")).toBeUndefined();
    expect(byTitle("مظهر المكونات")).not.toBeUndefined();
    expect(byTitle("الخلفية").querySelector(".smart-badge-collapsible-body")).toBeNull();
    const statusBefore=host.querySelector(".smart-badge-status").textContent,undoBefore=host.querySelector('[aria-label="رجوع عن تعديل"]').disabled;
    await toggle("الخلفية");
    expect(byTitle("الخلفية").querySelector(".smart-badge-collapsible-body")).not.toBeNull();
    expect(byTitle("نظام التصميم").querySelector(".smart-badge-collapsible-body")).not.toBeNull();
    await toggle("نظام التصميم");
    expect(byTitle("نظام التصميم").querySelector(".smart-badge-collapsible-body")).toBeNull();
    expect(byTitle("الخلفية").querySelector(".smart-badge-collapsible-body")).not.toBeNull();
    await toggle("نظام التصميم");
    for(const title of ["حاوية الاسم والصورة","نصوص الحقول","العلامة المائية","الهوية","الكثافة"]){await toggle(title);expect(byTitle(title).querySelector(".smart-badge-collapsible-body")).not.toBeNull();}
    expect(byTitle("بيانات المعاينة").querySelector(".smart-badge-collapsible-body")).not.toBeNull();
    expect(byTitle("المحتوى").querySelector(".smart-badge-collapsible-body")).not.toBeNull();
    expect(host.querySelector(".smart-badge-status").textContent).toBe(statusBefore);
    expect(host.querySelector('[aria-label="رجوع عن تعديل"]').disabled).toBe(undoBefore);
    const colorRow=host.querySelector('input[aria-label="لون خلفية الشارة"]').parentElement,input=colorRow.querySelector('input[type="color"]'),title=colorRow.querySelector("span");
    expect(colorRow.tagName).toBe("DIV");
    expect([...host.querySelectorAll('input[type="color"]')].every((color)=>color.parentElement.tagName==="DIV")).toBe(true);
    let pickerClicks=0;input.addEventListener("click",()=>pickerClicks++);
    await act(async()=>title.click());
    expect(pickerClicks).toBe(0);
    await act(async()=>input.click());
    expect(pickerClicks).toBe(1);
    await toggle("الخلفية");
    expect(byTitle("الخلفية").querySelector(".smart-badge-collapsible-body")).toBeNull();
  });

  test("hero container can be hidden, selected, styled, and undone without hiding its children", async () => {
    await render();
    await openSection("حاوية الاسم والصورة");
    const toggle=host.querySelector('input[aria-label="إظهار حاوية الاسم والصورة"]');
    await act(async()=>toggle.click());
    expect(host.querySelector(".smart-badge").classList.contains("hero-container-hidden")).toBe(true);
    expect(host.querySelector('[data-element-id="pilgrimName"]')).not.toBeNull();
    expect(host.querySelector('[data-element-id="photo"]')).not.toBeNull();
    await act(async()=>host.querySelector('[aria-label="رجوع عن تعديل"]').click());
    expect(host.querySelector(".smart-badge").classList.contains("hero-container-visible")).toBe(true);
    const hero=host.querySelector('[data-element-id="heroContainer"]');
    await act(async()=>hero.dispatchEvent(new Event("pointerdown",{bubbles:true})));
    expect(host.querySelector(".smart-badge-inspector-header strong").textContent).toBe("حاوية الاسم والصورة");
    for(const label of ["لون خلفية منطقة الاسم","لون الإطار","سماكة الإطار","Radius الإطار","شفافية الحاوية","Padding الداخلي"])expect(host.querySelector(`[aria-label="${label}"]`)).not.toBeNull();
  });

  test("uses real hotel precedence and one practical guide phone", () => {
    const data=buildSmartBadgeData({programId:"program-1",packageId:"package-2",hotelMecca:"فندق العميل",phone:"+212600",passport:{number:"P9"}},[{id:"program-1",name:"برنامج",guidePhone:"+966500",saudiPhone1:"+966511",hotelMecca:"فندق مكة العام",hotelMadina:"فندق المدينة العام",packages:[{id:"package-2",hotelMecca:"فندق مكة للحزمة",hotelMadina:"فندق المدينة للحزمة"}]}],[]);
    expect(data).toEqual(expect.objectContaining({makkahHotel:"فندق العميل",madinahHotel:"فندق المدينة للحزمة",guidePhone:"+966500"}));
  });

  test("switches immediately between selected elements and blank badge space restores general settings", async () => {
    await render();
    await act(async () => host.querySelector('[data-element-id="photo"]').dispatchEvent(new Event("pointerdown", { bubbles:true })));
    const inspector = host.querySelector(".smart-badge-inspector");
    const inspectorContent = inspector.querySelector(".smart-badge-inspector-content");
    inspectorContent.scrollTop = 240;
    await act(async () => host.querySelector('[data-element-id="pilgrimName"]').dispatchEvent(new Event("pointerdown", { bubbles:true })));
    expect(host.querySelector(".smart-badge-inspector-header strong").textContent).toBe("اسم المعتمر");
    expect(inspectorContent.scrollTop).toBe(0);
    await act(async () => host.querySelector(".smart-badge").dispatchEvent(new Event("pointerdown", { bubbles:true })));
    expect(host.querySelector(".smart-badge-inspector.is-general")).not.toBeNull();
  });

  test("first X adjustment captures the live auto box and changes X alone", async () => {
    await render();
    const badge = host.querySelector(".smart-badge");
    const photo = host.querySelector('[data-element-id="photo"]');
    badge.getBoundingClientRect = () => ({ left:0,top:0,width:580,height:880,right:580,bottom:880 });
    photo.getBoundingClientRect = () => ({ left:365,top:120,width:155,height:160,right:520,bottom:280 });
    await act(async () => photo.dispatchEvent(new Event("pointerdown", { bubbles:true })));
    const read = (label) => Number(host.querySelector(`input[aria-label="${label}"]`).value);
    expect([read("X"),read("Y"),read("العرض"),read("الارتفاع"),read("الحجم")]).toEqual([36.5,12,15.5,16,100]);
    const plus = (label) => host.querySelector(`input[aria-label="${label}"]`).closest("label").parentElement.querySelectorAll("button")[1];
    await act(async () => plus("X").click());
    expect([read("X"),read("Y"),read("العرض"),read("الارتفاع"),read("الحجم")]).toEqual([37,12,15.5,16,100]);
    await act(async () => plus("العرض").click());
    expect([read("العرض"),read("الارتفاع")]).toEqual([16,16]);
    const centerBefore = read("X") + read("العرض") / 2;
    await act(async () => plus("الحجم").click());
    expect(read("الحجم")).toBe(105);
    expect(read("X") + read("العرض") / 2).toBe(centerBefore);
  });

  test("data-field geometry and typography controls never drift X or Y and remain undoable", async () => {
    await render();
    const badge=host.querySelector(".smart-badge"),field=host.querySelector('[data-element-id="passport"]');
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    field.getBoundingClientRect=()=>({left:295,top:530,width:200,height:80,right:495,bottom:610});
    await act(async()=>field.dispatchEvent(new Event("pointerdown",{bubbles:true})));
    const read=(label)=>host.querySelector(`input[aria-label="${label}"]`),number=(label)=>Number(read(label).value);
    expect(host.textContent).toContain("عنوان الحقل");
    expect(host.textContent).toContain("قيمة الحقل");
    expect([number("X"),number("Y")]).toEqual([29.5,53]);
    for(const label of ["العرض","الارتفاع","حجم عنوان الحقل","لون عنوان الحقل","حجم قيمة الحقل","لون قيمة الحقل"])expect(read(label)).not.toBeNull();
    const widthBefore=number("العرض"),widthPlus=read("العرض").closest("label").parentElement.querySelectorAll("button")[1];
    await act(async()=>widthPlus.click());
    expect([number("X"),number("Y")]).toEqual([29.5,53]);
    expect(number("العرض")).toBeGreaterThan(widthBefore);
    const labelWeight=host.querySelector('[role="group"][aria-label="وزن عنوان الحقل"]');
    const valueWeight=host.querySelector('[role="group"][aria-label="وزن قيمة الحقل"]');
    for(const [group,weight] of [[labelWeight,"800"],[valueWeight,"900"]]){
      const button=[...group.querySelectorAll("button")].find((candidate)=>candidate.textContent===weight);
      await act(async()=>button.click());
      expect(button.getAttribute("aria-pressed")).toBe("true");
      expect([number("X"),number("Y")]).toEqual([29.5,53]);
    }
    await act(async()=>host.querySelector('[aria-label="رجوع عن تعديل"]').click());
    expect([number("X"),number("Y")]).toEqual([29.5,53]);
  });

  test.each([["passport","رقم الجواز"],["program","البرنامج"],["travelDate","تاريخ السفر"],["makkahHotel","فندق مكة"]])("%s height promotion stays visually anchored and continues inheriting global field text",async(id)=>{
    await render();
    const badge=host.querySelector(".smart-badge"),field=host.querySelector(`[data-element-id="${id}"]`);
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    field.getBoundingClientRect=()=>({left:120,top:420,width:280,height:80,right:400,bottom:500});
    const children=[...field.children].map((child)=>child.tagName);
    await act(async()=>field.dispatchEvent(new Event("pointerdown",{bubbles:true})));
    const number=(label)=>Number(host.querySelector(`input[aria-label="${label}"]`).value),heightPlus=host.querySelector('input[aria-label="الارتفاع"]').closest("label").parentElement.querySelectorAll("button")[1];
    expect([number("X"),number("Y"),number("العرض"),number("الارتفاع")]).toEqual([12,42,28,8]);
    await act(async()=>heightPlus.click());
    expect([number("X"),number("Y"),number("العرض"),number("الارتفاع")]).toEqual([12,42,28,8.5]);
    const custom=host.querySelector(`.smart-badge-custom-layer [data-element-id="${id}"]`);
    expect(custom.parentElement.classList.contains("smart-badge-details")).toBe(true);
    expect([...custom.children].filter((child)=>!child.classList.contains("smart-badge-resize-zones")&&!child.classList.contains("smart-badge-drag-handle")).map((child)=>child.tagName)).toEqual(children);
    for(const property of ["--element-font-size","--element-label-font-size","--element-font-weight","--element-label-font-weight","--element-color","--element-label-color"])expect(custom.style.getPropertyValue(property)).toBe("");
    await act(async()=>host.querySelector('.smart-badge-inspector-header button').click());
    await openSection("نصوص الحقول");
    const globalValue=host.querySelector('input[aria-label="حجم قيم الحقول"]'),globalPlus=globalValue.closest("label").parentElement.querySelectorAll("button")[1];
    await act(async()=>globalPlus.click());
    expect(host.querySelector(".smart-badge").style.getPropertyValue("--value-font-size")).toBe("13.5px");
    expect(host.querySelector(`.smart-badge-custom-layer [data-element-id="${id}"]`).style.getPropertyValue("--element-font-size")).toBe("");
  });

  test("preset switching isolates and restores live customizations", async()=>{
    await render();
    const preset=(name)=>[...host.querySelectorAll(".smart-badge-template-grid button")].find((button)=>button.textContent===name);
    let badge=host.querySelector(".smart-badge"),photo=host.querySelector('[data-element-id="photo"]');
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    photo.getBoundingClientRect=()=>({left:360,top:120,width:150,height:180,right:510,bottom:300});
    await act(async()=>photo.dispatchEvent(new Event("pointerdown",{bubbles:true})));
    const xInput=()=>host.querySelector('input[aria-label="X"]'),plus=()=>xInput().closest("label").parentElement.querySelectorAll("button")[1];
    await act(async()=>plus().click());
    const signatureX=Number(xInput().value);
    await act(async()=>host.querySelector('.smart-badge-inspector-header button').click());
    const confirm=jest.spyOn(window,"confirm").mockReturnValue(true);
    await act(async()=>preset("Editorial").click());
    expect(host.querySelector('[data-element-id="photo"]').dataset.elementMode).toBe("auto");
    await act(async()=>preset("RUKN Signature").click());
    expect(host.querySelector('[data-element-id="photo"]').dataset.elementMode).toBe("custom");
    expect(Number(host.querySelector('[data-element-id="photo"]').style.left.replace("%",""))).toBeCloseTo(signatureX/58*100,5);
    confirm.mockRestore();
  });

  test("text press selects only and movement starts exclusively from the drag handle", async () => {
    await render();
    const badge=host.querySelector(".smart-badge"),name=host.querySelector('[data-element-id="pilgrimName"]');
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    name.getBoundingClientRect=()=>({left:180,top:180,width:260,height:80,right:440,bottom:260});
    const pointer=(type,props={})=>{const event=new Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:7,clientX:200,clientY:200,...props});return event;};
    await act(async()=>name.dispatchEvent(pointer("pointerdown")));
    expect(name.dataset.elementMode).toBe("auto");
    await act(async()=>window.dispatchEvent(pointer("pointermove",{clientX:260,clientY:240})));
    expect(host.querySelector('[data-element-id="pilgrimName"]').dataset.elementMode).toBe("auto");
    const handle=host.querySelector('[aria-label="تحريك pilgrimName"]');
    await act(async()=>handle.dispatchEvent(pointer("pointerdown")));
    await act(async()=>window.dispatchEvent(pointer("pointermove",{clientX:220,clientY:210})));
    expect(host.querySelector('[data-element-id="pilgrimName"]').style.left).not.toBe("");
    await act(async()=>window.dispatchEvent(pointer("pointerup",{clientX:220,clientY:210})));
    expect(host.querySelector('[data-element-id="pilgrimName"]').dataset.elementMode).toBe("custom");
    expect(Number(host.querySelector('input[aria-label="العرض"]')?.value||26)).toBe(26);
  });

  test("watermark is disabled without logo and enabled as an independent selectable element with logo", async () => {
    await render();
    await openSection("العلامة المائية");
    const watermarkToggle=[...host.querySelectorAll('.smart-badge-panel input[type="checkbox"]')].at(-1);
    expect(watermarkToggle.disabled).toBe(true);
    await act(async()=>root.render(<SmartBadgeIdentity store={{agencyId:"agency-logo",agency:{id:"agency-logo",nameAr:"وكالة",logoUrl:"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"},activeClients:[],programs:[],programTravelGroups:[]}} onToast={()=>{}}/>));
    const toggle=[...host.querySelectorAll('.smart-badge-panel input[type="checkbox"]')].at(-1);
    expect(toggle.disabled).toBe(false);
    await act(async()=>toggle.click());
    expect(host.querySelector('[data-element-id="watermark"]')).not.toBeNull();
    expect(host.querySelector('[data-element-id="logo"]')).not.toBeNull();
  });

  test("watermark inspector exposes full controls and keyboard movement without changing the header logo", async () => {
    await act(async()=>root.render(<SmartBadgeIdentity store={{agencyId:"watermark-controls",agency:{id:"watermark-controls",nameAr:"وكالة",logoUrl:"logo.svg"},activeClients:[],programs:[],programTravelGroups:[]}} onToast={()=>{}}/>));
    await openSection("العلامة المائية");
    const toggle=[...host.querySelectorAll('.smart-badge-panel input[type="checkbox"]')].at(-1);
    await act(async()=>toggle.click());
    await act(async()=>[...host.querySelectorAll("button")].find((button)=>button.textContent==="تخصيص العلامة المائية").click());
    const badge=host.querySelector(".smart-badge"),watermark=host.querySelector('[data-element-id="watermark"]');
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    watermark.getBoundingClientRect=()=>({left:115,top:340,width:350,height:240,right:465,bottom:580});
    for(const label of ["X","Y","العرض","الارتفاع","الحجم","الشفافية"])expect(host.querySelector(`input[aria-label="${label}"]`)).not.toBeNull();
    const beforeLogo=host.querySelector('.smart-badge-logo-element img').getAttribute("style")||"";
    const event=new Event("keydown",{bubbles:true,cancelable:true});Object.assign(event,{key:"ArrowDown",shiftKey:true});
    await act(async()=>window.dispatchEvent(event));
    expect(Number(host.querySelector('input[aria-label="Y"]').value)).toBe(36);
    const opacity=host.querySelector('input[aria-label="الشفافية"]');
    await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(opacity,"60");opacity.dispatchEvent(new Event("change",{bubbles:true}));});
    expect(host.querySelector('.smart-badge-watermark img').style.opacity).toBe("0.6");
    expect(host.querySelector('.smart-badge-logo-element img').getAttribute("style")||"").toBe(beforeLogo);
  });

  test("dragging a photo handle updates X and Y without changing dimensions or scale", async () => {
    await render();
    const badge=host.querySelector(".smart-badge"),photo=host.querySelector('[data-element-id="photo"]');
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    photo.getBoundingClientRect=()=>({left:365,top:120,width:155,height:160,right:520,bottom:280});
    const pointer=(type,x,y)=>{const event=new Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:4,clientX:x,clientY:y});return event;};
    await act(async()=>photo.dispatchEvent(pointer("pointerdown",365,120)));
    const read=(label)=>Number(host.querySelector(`input[aria-label="${label}"]`).value);
    const before={x:read("X"),y:read("Y"),w:read("العرض"),h:read("الارتفاع"),s:read("الحجم")};
    await act(async()=>window.dispatchEvent(pointer("pointermove",385,140)));
    expect(host.querySelector('.smart-badge-custom-layer [data-element-id="photo"]').style.left).not.toBe("");
    await act(async()=>window.dispatchEvent(pointer("pointerup",385,140)));
    const after={x:read("X"),y:read("Y"),w:read("العرض"),h:read("الارتفاع"),s:read("الحجم")};
    expect(after.x).not.toBe(before.x);expect(after.y).not.toBe(before.y);
    expect(after.w).toBe(before.w);expect(after.h).toBe(before.h);expect(after.s).toBe(before.s);
    expect(host.querySelector('[aria-label="تحريك photo"]')).toBeNull();
  });

  test("keeps the exact pointer anchor while promoting an auto photo to the custom layer", async () => {
    await render();
    const badge=host.querySelector(".smart-badge"),photo=host.querySelector('[data-element-id="photo"]');
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    photo.getBoundingClientRect=()=>({left:365,top:120,width:155,height:160,right:520,bottom:280});
    const pointer=(type,x,y)=>{const event=new Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:9,clientX:x,clientY:y});return event;};
    await act(async()=>photo.dispatchEvent(pointer("pointerdown",500,135)));
    await act(async()=>window.dispatchEvent(pointer("pointermove",450,500)));
    const custom=host.querySelector('.smart-badge-custom-layer [data-element-id="photo"]');
    expect(parseFloat(custom.style.left)).toBeCloseTo(31.5/58*100,4);
    expect(parseFloat(custom.style.top)).toBeCloseTo(48.5/88*100,4);
    await act(async()=>window.dispatchEvent(pointer("pointerup",450,500)));
    const read=(label)=>Number(host.querySelector(`input[aria-label="${label}"]`).value);
    expect([read("X"),read("Y"),read("العرض"),read("الارتفاع"),read("الحجم")]).toEqual([31.5,48.5,15.5,16,100]);
  });

  test("keyboard nudges promote an auto name without changing its measured box or typography", async () => {
    await render();
    const badge=host.querySelector(".smart-badge"),name=host.querySelector('[data-element-id="pilgrimName"]'),heading=name.querySelector("h2");
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    name.getBoundingClientRect=()=>({left:180,top:180,width:260,height:80,right:440,bottom:260});
    heading.style.fontSize="25px";heading.style.fontWeight="900";heading.style.lineHeight="32px";
    await act(async()=>name.dispatchEvent(new Event("pointerdown",{bubbles:true})));
    const key=(key,shiftKey=false)=>{const event=new Event("keydown",{bubbles:true,cancelable:true});Object.assign(event,{key,shiftKey});return event;};
    await act(async()=>window.dispatchEvent(key("ArrowRight")));
    const read=(label)=>Number(host.querySelector(`input[aria-label="${label}"]`).value);
    expect([read("X"),read("Y")]).toEqual([18.5,18]);
    const customName=host.querySelector('.smart-badge-custom-layer [data-element-id="pilgrimName"]');
    expect(customName.dataset.elementMode).toBe("custom");
    expect([parseFloat(customName.style.width),parseFloat(customName.style.height)]).toEqual([26/58*100,8/88*100]);
    await act(async()=>window.dispatchEvent(key("ArrowRight",true)));
    expect(read("X")).toBe(20.5);
    expect([parseFloat(host.querySelector('.smart-badge-custom-layer [data-element-id="pilgrimName"]').style.width),parseFloat(host.querySelector('.smart-badge-custom-layer [data-element-id="pilgrimName"]').style.height)]).toEqual([26/58*100,8/88*100]);
  });

  test("arrow keys do not nudge the selected element while an inspector input has focus", async () => {
    await render();
    const badge=host.querySelector(".smart-badge"),name=host.querySelector('[data-element-id="pilgrimName"]');
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    name.getBoundingClientRect=()=>({left:180,top:180,width:260,height:80,right:440,bottom:260});
    await act(async()=>name.dispatchEvent(new Event("pointerdown",{bubbles:true})));
    const input=host.querySelector('input[aria-label="X"]'),before=Number(input.value),event=new Event("keydown",{bubbles:true,cancelable:true});
    Object.assign(event,{key:"ArrowRight",shiftKey:false});
    await act(async()=>input.dispatchEvent(event));
    expect(Number(input.value)).toBe(before);
    expect(event.defaultPrevented).toBe(false);
  });

  test("undo and redo restore an auto detail cell around one keyboard nudge", async () => {
    await render();
    const badge=host.querySelector(".smart-badge"),passport=host.querySelector('[data-element-id="passport"]'),value=passport.querySelector("bdi");
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    passport.getBoundingClientRect=()=>({left:290,top:500,width:210,height:42,right:500,bottom:542});
    value.style.fontSize="9px";value.style.fontWeight="800";value.style.lineHeight="12px";
    await act(async()=>passport.dispatchEvent(new Event("pointerdown",{bubbles:true})));
    const event=new Event("keydown",{bubbles:true,cancelable:true});Object.assign(event,{key:"ArrowRight",shiftKey:false});
    await act(async()=>window.dispatchEvent(event));
    let custom=host.querySelector('.smart-badge-custom-layer [data-element-id="passport"]');
    expect(custom.dataset.elementMode).toBe("custom");
    expect([parseFloat(custom.style.width),parseFloat(custom.style.height)]).toEqual([21/58*100,4/88*100]);
    const undoButton=host.querySelector('[aria-label="رجوع عن تعديل"]'),redoButton=host.querySelector('[aria-label="إعادة تعديل"]');
    expect(undoButton.disabled).toBe(false);
    await act(async()=>undoButton.click());
    expect(host.querySelector('.smart-badge-auto-layer [data-element-id="passport"]').dataset.elementMode).toBe("auto");
    expect(host.querySelector(".smart-badge-status").textContent).toBe("تم الحفظ");
    await act(async()=>redoButton.click());
    custom=host.querySelector('.smart-badge-custom-layer [data-element-id="passport"]');
    expect(custom.dataset.elementMode).toBe("custom");
  });

  test("design history supports platform shortcuts but leaves input undo untouched", async () => {
    await render();
    await openSection("الكثافة");
    const densityButtons=[...host.querySelectorAll(".smart-badge-density button")];
    await act(async()=>densityButtons.find((button)=>button.textContent==="هادئ").click());
    expect(host.querySelector(".smart-badge").classList.contains("density-calm")).toBe(true);
    const shortcut=(key,props={})=>{const event=new Event("keydown",{bubbles:true,cancelable:true});Object.assign(event,{key,ctrlKey:true,metaKey:false,shiftKey:false,...props});return event;};
    await act(async()=>window.dispatchEvent(shortcut("z")));
    expect(host.querySelector(".smart-badge").classList.contains("density-balanced")).toBe(true);
    await act(async()=>window.dispatchEvent(shortcut("z",{shiftKey:true})));
    expect(host.querySelector(".smart-badge").classList.contains("density-calm")).toBe(true);
    const search=host.querySelector('input[type="search"]'),inputUndo=shortcut("z");
    await act(async()=>search.dispatchEvent(inputUndo));
    expect(inputUndo.defaultPrevented).toBe(false);
    expect(host.querySelector(".smart-badge").classList.contains("density-calm")).toBe(true);
  });

  test("restore initial is itself one undoable history step", async () => {
    await render();
    await openSection("الكثافة");
    const densityButtons=[...host.querySelectorAll(".smart-badge-density button")];
    await act(async()=>densityButtons.find((button)=>button.textContent==="هادئ").click());
    const confirm=jest.spyOn(window,"confirm").mockReturnValue(true);
    await act(async()=>host.querySelector(".smart-badge-restore-initial").click());
    expect(host.querySelector(".smart-badge").classList.contains("density-balanced")).toBe(true);
    await act(async()=>host.querySelector('[aria-label="رجوع عن تعديل"]').click());
    expect(host.querySelector(".smart-badge").classList.contains("density-calm")).toBe(true);
    confirm.mockRestore();
  });

  test("watermark customize button opens its inspector without hunting for the transparent image", async () => {
    await act(async()=>root.render(<SmartBadgeIdentity store={{agencyId:"watermark-entry",agency:{id:"watermark-entry",nameAr:"وكالة",logoUrl:"logo.svg"},activeClients:[],programs:[],programTravelGroups:[]}} onToast={()=>{}}/>));
    await openSection("العلامة المائية");
    const toggle=[...host.querySelectorAll('.smart-badge-panel input[type="checkbox"]')].at(-1);
    await act(async()=>toggle.click());
    const customize=[...host.querySelectorAll("button")].find((button)=>button.textContent==="تخصيص العلامة المائية");
    expect(customize).toBeTruthy();
    await act(async()=>customize.click());
    expect(host.querySelector(".smart-badge-inspector-header strong").textContent).toBe("العلامة المائية");
    expect(host.querySelector('[data-element-id="watermark"]').classList.contains("is-selected")).toBe(true);
  });

  test("selected watermark keeps its inspector while dragging through the transparent editor surface", async () => {
    await act(async()=>root.render(<SmartBadgeIdentity store={{agencyId:"watermark-drag",agency:{id:"watermark-drag",nameAr:"وكالة",logoUrl:"logo.svg"},activeClients:[],programs:[],programTravelGroups:[]}} onToast={()=>{}}/>));
    await openSection("العلامة المائية");
    await act(async()=>[...host.querySelectorAll('.smart-badge-panel input[type="checkbox"]')].at(-1).click());
    await act(async()=>[...host.querySelectorAll("button")].find((button)=>button.textContent==="تخصيص العلامة المائية").click());
    const badge=host.querySelector(".smart-badge"),watermark=host.querySelector('.smart-badge-watermark'),surface=host.querySelector('[data-drag-proxy="true"]');
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    watermark.getBoundingClientRect=()=>({left:115,top:340,width:350,height:240,right:465,bottom:580});
    const pointer=(type,x,y)=>{const event=new Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:22,clientX:x,clientY:y});return event;};
    await act(async()=>surface.dispatchEvent(pointer("pointerdown",200,400)));
    expect(host.querySelector(".smart-badge-inspector-header strong").textContent).toBe("العلامة المائية");
    await act(async()=>window.dispatchEvent(pointer("pointermove",240,440)));
    expect(watermark.style.left).not.toBe("");
    await act(async()=>window.dispatchEvent(pointer("pointerup",240,440)));
    expect(host.querySelector(".smart-badge-inspector-header strong").textContent).toBe("العلامة المائية");
    expect(host.querySelector('[data-drag-proxy="true"]')).not.toBeNull();
  });

  test("custom logo can leave badge bounds and return safely through its inspector", async () => {
    await act(async()=>root.render(<SmartBadgeIdentity store={{agencyId:"logo-free",agency:{id:"logo-free",nameAr:"وكالة",logoUrl:"logo.svg"},activeClients:[],programs:[],programTravelGroups:[]}} onToast={()=>{}}/>));
    const badge=host.querySelector(".smart-badge"),logo=host.querySelector('[data-element-id="logo"]');
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    logo.getBoundingClientRect=()=>({left:430,top:30,width:90,height:50,right:520,bottom:80});
    const pointer=(type,x,y)=>{const event=new Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:23,clientX:x,clientY:y});return event;};
    await act(async()=>logo.dispatchEvent(pointer("pointerdown",475,55)));
    await act(async()=>window.dispatchEvent(pointer("pointermove",45,870)));
    await act(async()=>window.dispatchEvent(pointer("pointerup",45,870)));
    const custom=host.querySelector('.smart-badge-custom-layer [data-element-id="logo"]');
    expect(custom).not.toBeNull();
    expect(Number(host.querySelector('input[aria-label="X"]').value)).toBe(0);
    expect(Number(host.querySelector('input[aria-label="Y"]').value)).toBe(84.5);
    expect(host.querySelector('[aria-label="تحريك logo"]')).toBeNull();
    const returnInside=[...host.querySelectorAll("button")].find((button)=>button.textContent==="إرجاع إلى داخل الشارة");
    expect(returnInside).toBeTruthy();
    await act(async()=>returnInside.click());
    expect(Number(host.querySelector('input[aria-label="X"]').value)).toBe(24.5);
    expect(Number(host.querySelector('input[aria-label="Y"]').value)).toBe(41.5);
  });

  test("mouse edge resize is live and commits width only as one undoable step", async () => {
    await render();
    const badge=host.querySelector(".smart-badge"),photo=host.querySelector('[data-element-id="photo"]');
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    photo.getBoundingClientRect=()=>({left:365,top:120,width:155,height:160,right:520,bottom:280});
    const pointer=(type,x,y,id=31)=>{const event=new Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:id,clientX:x,clientY:y});return event;};
    await act(async()=>photo.dispatchEvent(pointer("pointerdown",400,150)));
    await act(async()=>window.dispatchEvent(pointer("pointerup",400,150)));
    const key=new Event("keydown",{bubbles:true,cancelable:true});Object.assign(key,{key:"ArrowRight",shiftKey:false});
    await act(async()=>window.dispatchEvent(key));
    const custom=host.querySelector('.smart-badge-custom-layer [data-element-id="photo"]'),east=custom.querySelector(".resize-e");
    await act(async()=>east.dispatchEvent(pointer("pointerdown",520,200,32)));
    await act(async()=>window.dispatchEvent(pointer("pointermove",540,200,32)));
    expect(parseFloat(custom.style.width)).toBeCloseTo(17.5/58*100,3);
    await act(async()=>window.dispatchEvent(pointer("pointerup",540,200,32)));
    const read=(label)=>Number(host.querySelector(`input[aria-label="${label}"]`).value);
    expect([read("العرض"),read("الارتفاع")]).toEqual([17.5,16]);
    await act(async()=>host.querySelector('[aria-label="رجوع عن تعديل"]').click());
    expect(Number(host.querySelector('input[aria-label="العرض"]').value)).toBe(15.5);
  });

  test("corner geometry resize does not create an implicit agency-name typography override", async () => {
    await render();
    const badge=host.querySelector(".smart-badge"),name=host.querySelector('[data-element-id="agencyName"]'),strong=name.querySelector("strong");
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    name.getBoundingClientRect=()=>({left:150,top:30,width:220,height:50,right:370,bottom:80});
    strong.style.fontSize="12px";strong.style.fontWeight="900";strong.style.lineHeight="15px";
    await act(async()=>name.dispatchEvent(new Event("pointerdown",{bubbles:true})));
    const key=new Event("keydown",{bubbles:true,cancelable:true});Object.assign(key,{key:"ArrowRight",shiftKey:false});
    await act(async()=>window.dispatchEvent(key));
    const custom=host.querySelector('.smart-badge-custom-layer [data-element-id="agencyName"]'),corner=custom.querySelector(".resize-se"),pointer=(type,x,y)=>{const event=new Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:33,clientX:x,clientY:y});return event;};
    await act(async()=>corner.dispatchEvent(pointer("pointerdown",370,80)));
    await act(async()=>window.dispatchEvent(pointer("pointermove",425,92.5)));
    await act(async()=>window.dispatchEvent(pointer("pointerup",425,92.5)));
    expect(host.querySelector('.smart-badge-custom-layer [data-element-id="agencyName"]').style.getPropertyValue("--element-font-size")).toBe("");
    expect(custom.querySelector("strong").textContent).toBe("وكالة الاختبار");
  });

  test("preview picker filters by program and searches by pilgrim name", async () => {
    const pickerStore={agencyId:"picker",agency:{id:"picker",nameAr:"وكالة"},programs:[{id:"p1",name:"برنامج أول"},{id:"p2",name:"برنامج ثان"}],activeClients:[{id:"c1",name:"أحمد علي",programId:"p1",passport:{number:"AA11"}},{id:"c2",name:"سعيد أمين",programId:"p2",passport:{number:"BB22"}}],programTravelGroups:[]};
    await act(async()=>root.render(<SmartBadgeIdentity store={pickerStore} onToast={()=>{}}/>));
    const program=host.querySelector(".smart-badge-preview-picker select");
    const undoBefore=host.querySelector('[aria-label="رجوع عن تعديل"]').disabled,statusBefore=host.querySelector(".smart-badge-status").textContent;
    await act(async()=>{program.value="p2";program.dispatchEvent(new Event("change",{bubbles:true}));});
    expect(host.querySelector(".smart-badge-picker-list").textContent).toContain("سعيد أمين");
    expect(host.querySelector(".smart-badge-picker-list").textContent).not.toContain("أحمد علي");
    const search=host.querySelector('.smart-badge-preview-picker input[type="search"]');
    await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(search,"غير موجود");search.dispatchEvent(new Event("input",{bubbles:true}));});
    expect(host.querySelector(".smart-badge-picker-list").textContent).toContain("لا توجد نتائج مطابقة");
    expect(host.querySelector('[aria-label="رجوع عن تعديل"]').disabled).toBe(undoBefore);
    expect(host.querySelector(".smart-badge-status").textContent).toBe(statusBefore);
  });

  test("selects, nudges, undoes, resets, and independently moves field values and labels",async()=>{
    await render();
    const passport=host.querySelector('[data-element-id="passport"]'),value=passport.querySelector('[data-field-part="value"]'),label=passport.querySelector('[data-field-part="label"]');
    const pointer=(type,id=71)=>{const event=new Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:id,clientX:100,clientY:100});return event;};
    await act(async()=>{value.dispatchEvent(pointer("pointerdown"));window.dispatchEvent(pointer("pointerup"));});
    expect(host.querySelector(".smart-badge-inspector-header strong").textContent).toContain("قيمة رقم الجواز");
    expect(value.classList.contains("is-part-selected")).toBe(true);
    expect(label.classList.contains("is-part-selected")).toBe(false);
    expect(passport.style.left).toBe("");
    const key=(name,shiftKey=false)=>{const event=new Event("keydown",{bubbles:true,cancelable:true});Object.assign(event,{key:name,shiftKey});return event;};
    await act(async()=>window.dispatchEvent(key("ArrowLeft")));
    expect(value.style.transform).toBe("translate(-0.5mm, 0mm)");
    expect(label.style.transform).toBe("");
    expect(passport.style.left).toBe("");
    expect(host.querySelector('.smart-badge-custom-layer [data-element-id="passport"]')).toBeNull();
    await act(async()=>window.dispatchEvent(key("ArrowDown",true)));
    expect(value.style.transform).toBe("translate(-0.5mm, 2mm)");
    expect(Number(host.querySelector('input[aria-label="X"]').value)).toBe(-.5);
    expect(Number(host.querySelector('input[aria-label="Y"]').value)).toBe(2);
    await act(async()=>host.querySelector('[aria-label="رجوع عن تعديل"]').click());
    expect(value.style.transform).toBe("");
    await act(async()=>host.querySelector('[aria-label="إعادة تعديل"]').click());
    expect(value.style.transform).toBe("translate(-0.5mm, 2mm)");
    await act(async()=>[...host.querySelectorAll("button")].find((button)=>button.textContent==="إعادة موضع القيمة").click());
    expect(value.style.transform).toBe("");
    await act(async()=>{label.dispatchEvent(pointer("pointerdown",72));window.dispatchEvent(pointer("pointerup",72));});
    await act(async()=>window.dispatchEvent(key("ArrowRight")));
    expect(label.style.transform).toBe("translate(0.5mm, 0mm)");
    expect(value.style.transform).toBe("");
  });

  test("direct field-value drag is live, jump-free, and commits as one undo step",async()=>{
    await render();
    const badge=host.querySelector(".smart-badge"),passport=host.querySelector('[data-element-id="passport"]'),value=passport.querySelector('[data-field-part="value"]'),label=passport.querySelector('[data-field-part="label"]');
    badge.getBoundingClientRect=()=>({left:0,top:0,width:580,height:880,right:580,bottom:880});
    const pointer=(type,x,y)=>{const event=new Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:81,clientX:x,clientY:y});return event;};
    await act(async()=>value.dispatchEvent(pointer("pointerdown",100,100)));
    expect(value.style.transform).toBe("");
    await act(async()=>window.dispatchEvent(pointer("pointermove",120,110)));
    expect(value.style.transform).toBe("translate(2mm, 1mm)");
    await act(async()=>window.dispatchEvent(pointer("pointerup",120,110)));
    expect(value.style.transform).toBe("translate(2mm, 1mm)");
    expect(label.style.transform).toBe("");
    expect(passport.style.left).toBe("");
    await act(async()=>host.querySelector('[aria-label="رجوع عن تعديل"]').click());
    expect(value.style.transform).toBe("");
    expect(host.querySelector('[aria-label="رجوع عن تعديل"]').disabled).toBe(true);
  });

  test("resolves a stored agency logo path for watermark availability", async () => {
    const getLogoUrl=jest.fn().mockResolvedValue("https://assets.test/agency-logo.png");
    await act(async()=>root.render(<SmartBadgeIdentity store={{agencyId:"logo-path",agency:{id:"logo-path",nameAr:"وكالة",logoPath:"agencies/logo.png"},agencyLogoApi:{isAvailable:true,getLogoUrl},activeClients:[],programs:[],programTravelGroups:[]}} onToast={()=>{}}/>));
    await act(async()=>Promise.resolve());
    await openSection("العلامة المائية");
    expect(getLogoUrl).toHaveBeenCalledWith("agencies/logo.png");
    const watermarkCard=host.querySelector(".smart-badge-watermark-card");
    expect(watermarkCard.textContent).toContain("شعار الوكالة جاهز");
    expect(watermarkCard.querySelector('input[type="checkbox"]').disabled).toBe(false);
  });
});
