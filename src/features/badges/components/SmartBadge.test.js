import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SmartBadge } from "./SmartBadge";
import { SMART_BADGE_PRESETS, SMART_BADGE_TEMPLATES, normalizeSmartBadgeConfig } from "../smartBadgeConfig";

describe("SmartBadge", () => {
  test("all preserved compositions render with sparse, rich, photo, and no-photo data", () => {
    const richData={name:"اسم معتمر طويل جدا لاختبار استقرار التكوين",passport:"P1234567",program:"برنامج عمرة كامل",group:"G7",room:"214",makkahHotel:"فندق مكة",madinahHotel:"فندق المدينة",city:"الرباط",phone:"+212600",guidePhone:"+966500",travelDate:"2027-01-18"};
    for(const template of SMART_BADGE_TEMPLATES){
      const rich=normalizeSmartBadgeConfig({content:{photo:true,passport:true,program:true,group:true,room:true,makkahHotel:true,madinahHotel:true,city:true,phone:true,guidePhone:true,travelDate:true},appearance:{template,...SMART_BADGE_PRESETS[template]}}),sparse=normalizeSmartBadgeConfig({content:{photo:false,passport:true},appearance:{template,...SMART_BADGE_PRESETS[template]}});
      const stressed=normalizeSmartBadgeConfig({content:{photo:true,passport:true,program:true,makkahHotel:true,madinahHotel:true,guidePhone:true,watermark:true},appearance:{template,...SMART_BADGE_PRESETS[template],badgeBackground:"#26312d"},elements:{pilgrimName:{mode:"custom",xMm:2,yMm:20,widthMm:54,heightMm:16,fontSize:72},agencyName:{mode:"custom",xMm:3,yMm:4,widthMm:52,heightMm:12,fontSize:48},passport:{mode:"custom",xMm:3,yMm:55,widthMm:50,heightMm:10,fontSize:55,labelFontSize:24}}});
      const richHtml=renderToStaticMarkup(<SmartBadge config={rich} agency={{nameAr:"وكالة"}} photoUrl="photo.jpg" data={richData}/>),sparseHtml=renderToStaticMarkup(<SmartBadge config={sparse} agency={{nameAr:"وكالة السفر والسياحة الدولية ذات الاسم الطويل"}} data={{name:"محمد",passport:"P1"}}/>),stressedHtml=renderToStaticMarkup(<SmartBadge config={stressed} agency={{nameAr:"وكالة السفر والسياحة الدولية ذات الاسم الطويل",logoUrl:"logo.png"}} photoUrl="photo.jpg" data={richData}/>);
      expect(richHtml).toContain(`template-${template}`);expect(richHtml).toContain("composition-");expect(richHtml).toContain("has-photo");expect(sparseHtml).toContain("no-photo");expect(stressedHtml).toContain("--element-font-size:72px");expect(stressedHtml).toContain("العلامة المائية للوكالة");
    }
  });

  test("omits disabled and empty fields without reserved rows", () => {
    const config = normalizeSmartBadgeConfig({ content: { photo: false, passport: false } });
    const html = renderToStaticMarkup(<SmartBadge
      config={config}
      agency={{ nameAr: "وكالة الركن" }}
      data={{ name: "اسم طويل لاختبار الشارة", passport: "P123", room: "12", group: "" }}
    />);
    expect(html).toContain("اسم طويل لاختبار الشارة");
    expect(html).toContain("الغرفة");
    expect(html).not.toContain("رقم الجواز");
    expect(html).not.toContain("المجموعة");
    expect(html).toContain("no-photo");
  });

  test("keeps a professional placeholder when photo is enabled but unavailable", () => {
    const html = renderToStaticMarkup(<SmartBadge config={normalizeSmartBadgeConfig({})} agency={{ nameAr:"وكالة" }} data={{ name:"محمد" }} photoUrl="" />);
    expect(html).toContain("smart-badge-photo-placeholder");
    expect(html).toContain("لا توجد صورة");
  });

  test("keeps the logo slot empty without initials, placeholder image, or header reordering",()=>{
    const html=renderToStaticMarkup(<SmartBadge config={normalizeSmartBadgeConfig({})} agency={{nameAr:"وكالة بلا شعار"}} data={{name:"محمد"}}/>);
    expect(html).toContain("smart-badge-logo-empty");expect(html).toContain("وكالة بلا شعار");expect(html).not.toContain("smart-badge-agency-mark");expect(html).not.toContain("<img");
    expect(html.indexOf("smart-badge-logo-empty")).toBeLessThan(html.indexOf("وكالة بلا شعار"));
  });

  test("renders custom overrides in logical coordinates while other elements remain auto", () => {
    const config = normalizeSmartBadgeConfig({ elements:{ photo:{ mode:"custom",xMm:10,yMm:12,widthMm:20,heightMm:25,scale:1 } } });
    const html = renderToStaticMarkup(<SmartBadge config={config} agency={{ nameAr:"وكالة" }} data={{ name:"محمد",passport:"P1" }} />);
    expect(html).toContain('data-element-id="photo"');
    expect(html).toContain('data-element-mode="custom"');
    expect(html).toContain('data-element-id="passport"');
    expect(html).toContain('data-element-mode="auto"');
    expect(html).toContain("left:17.24137931034483%");
  });

  test("renders independent per-field label and value typography", () => {
    const config=normalizeSmartBadgeConfig({elements:{passport:{mode:"custom",xMm:3,yMm:52,widthMm:30,heightMm:9,labelFontSize:9,labelFontWeight:600,labelColor:"#778899",fontSize:17,fontWeight:900,color:"#112233"}}});
    const html=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة"}} data={{name:"محمد",passport:"P123"}}/>);
    for(const token of ["--element-label-font-size:9px","--element-label-font-weight:600","--element-label-color:#778899","--element-font-size:17px","--element-font-weight:900","--element-color:#112233"])expect(html).toContain(token);
  });

  test("uses one stable label/value row contract for every operational field",()=>{
    const config=normalizeSmartBadgeConfig({content:{passport:true,program:true,travelDate:true,makkahHotel:true,madinahHotel:true,phone:true,group:true,room:true}});
    const html=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة"}} data={{name:"محمد",passport:"P1",program:"برنامج طويل",travelDate:"2027-02-20",makkahHotel:"فندق مكة",madinahHotel:"اسم فندق المدينة الطويل",phone:"+212600",group:"الثانية",room:"1203"}}/>);
    for(const id of ["passport","program","travelDate","makkahHotel","madinahHotel","phone","group","room"]){
      const marker=html.indexOf(`data-element-id="${id}"`),field=html.slice(Math.max(0,marker-260),marker+900);
      expect(field).toContain("smart-badge-data-field");
      expect(field).toContain("smart-badge-field-label");
      expect(field).toContain("smart-badge-field-value");
    }
  });

  test("renders explicit background as the final shared preview/export surface",()=>{
    const config=normalizeSmartBadgeConfig({appearance:{layoutFamily:"luxury-white",backgroundColorOverride:"#ff00aa"},componentSources:{background:"minimal-air"}});
    const html=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة"}} data={{name:"محمد",passport:"P1"}}/>);
    expect(html).toContain("has-explicit-background");
    expect(html).toContain("background-clean");
    expect(html).toContain("--badge-background:#ff00aa");
  });

  test("layers mix-and-match with independent hero and field effects",()=>{
    const config=normalizeSmartBadgeConfig({componentSources:{hero:"editorial"},effects:{hero:{preset:"floating"},passport:{preset:"soft-shadow",shadowY:4,blur:12}},elements:{passport:{mode:"custom",xMm:6,yMm:48,widthMm:32,heightMm:9}}});
    const html=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة"}} data={{name:"محمد",passport:"P1"}}/>);
    expect(html).toContain("hero-source-editorial");expect(html).toContain("smart-badge-hero effect-floating");expect(html).toContain("effect-soft-shadow smart-badge-data-field");
    expect(html).toContain("left:10.344827586206897%");expect(html).toContain("width:55.172413793103445%");
  });

  test("specific typography overrides outrank globals while geometry-only fields inherit them",()=>{
    const config=normalizeSmartBadgeConfig({appearance:{valueFontSize:15,labelFontSize:10},elements:{passport:{mode:"custom",xMm:3,yMm:45,widthMm:30,heightMm:9,fontSize:18},program:{mode:"custom",xMm:3,yMm:56,widthMm:40,heightMm:9}}});
    const html=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة"}} data={{name:"محمد",passport:"P1",program:"عمرة"}}/>);
    const passport=html.slice(html.indexOf('data-element-id="passport"')),program=html.slice(html.indexOf('data-element-id="program"'));
    expect(passport.slice(0,1000)).toContain("--element-font-size:18px");
    expect(program.slice(0,1000)).not.toContain("--element-font-size");
    expect(html).toContain("--value-font-size:15px");
  });

  test("renders relative label/value offsets while continuing to inherit global typography",()=>{
    const config=normalizeSmartBadgeConfig({appearance:{valueFontSize:21,labelFontSize:11},fieldParts:{passport:{value:{offsetXmm:2,offsetYmm:4},label:{offsetXmm:-1,offsetYmm:.5}},makkahHotel:{value:{offsetXmm:.5,offsetYmm:-.5}}}});
    const html=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة"}} data={{name:"محمد",passport:"XC0346941",makkahHotel:"زوار البيت"}}/>);
    expect(html).toContain('data-field-id="passport"');
    expect(html).toContain('data-field-part="value"');
    expect(html).toContain("transform:translate(2mm, 4mm)");
    expect(html).toContain("transform:translate(-1mm, 0.5mm)");
    expect(html).toContain("transform:translate(0.5mm, -0.5mm)");
    expect(html).toContain("--value-font-size:21px");
    expect(html).not.toContain("--element-font-size:21px");
  });

  test("custom photo reserves a safe flow gap for an automatic pilgrim name", () => {
    const config = normalizeSmartBadgeConfig({ elements:{ photo:{ mode:"custom",xMm:10,yMm:12,widthMm:15,heightMm:20 } } });
    const html = renderToStaticMarkup(<SmartBadge config={config} agency={{ nameAr:"وكالة" }} data={{ name:"محمد" }} />);
    expect(html).toContain("smart-badge-auto-slot photo-slot");
    expect(html).toContain("smart-badge-custom-layer");
  });

  test("removes the pilgrim pretitle and keeps RUKN footer fixed and non-selectable", () => {
    const config=normalizeSmartBadgeConfig({elements:{footer:{mode:"custom",xMm:10,yMm:10,widthMm:40,heightMm:9,scale:2}}});
    const html=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة"}} data={{name:"محمد"}}/>);
    expect(html).not.toContain("ضيف الرحمن");
    expect(html).toContain("Powered by");
    expect(html).not.toContain('data-element-id="footer"');
    expect(config.elements.footer).toBeUndefined();
  });

  test("auto watermark retains a smart background position after reset", () => {
    const config=normalizeSmartBadgeConfig({content:{watermark:true},elements:{watermark:{mode:"auto"}}});
    const html=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة",logoUrl:"logo.svg"}} data={{name:"محمد"}}/>);
    expect(html).toContain("smart-badge-watermark");
    expect(html).toContain('data-element-mode="auto"');
  });

  test("custom pilgrim name is rendered in the badge-wide custom layer", () => {
    const config=normalizeSmartBadgeConfig({elements:{pilgrimName:{mode:"custom",xMm:2,yMm:20,widthMm:54,heightMm:12,fontSize:42}}});
    const html=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة"}} data={{name:"عبد الله الواحداني المغربي"}}/>);
    const customLayer=html.slice(html.indexOf("smart-badge-custom-layer"));
    expect(customLayer).toContain("عبد الله الواحداني المغربي");
    expect(customLayer).toContain("--element-font-size:42px");
    expect(html).toContain("pilgrim-name-slot");
  });

  test("visual elements use direct drag while text keeps a drag handle", () => {
    const config=normalizeSmartBadgeConfig({content:{watermark:true}});
    for(const id of ["photo","logo","watermark"]){
      const html=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة",logoUrl:"logo.svg"}} data={{name:"محمد",passport:"P1"}} selectedId={id}/>);
      expect(html).not.toContain(`aria-label="تحريك ${id}"`);
    }
    const textHtml=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة",logoUrl:"logo.svg"}} data={{name:"محمد",passport:"P1"}} selectedId="passport"/>);
    expect(textHtml).toContain('aria-label="تحريك passport"');
  });

  test("editor mode allows overflow while output mode remains explicitly clipped", () => {
    const config=normalizeSmartBadgeConfig({elements:{logo:{mode:"custom",xMm:-12,yMm:-10,widthMm:12,heightMm:8}}});
    const output=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة"}} data={{name:"محمد"}}/>);
    const editor=renderToStaticMarkup(<SmartBadge editor config={config} agency={{nameAr:"وكالة"}} data={{name:"محمد"}}/>);
    expect(output).toContain("smart-badge is-output");
    expect(editor).toContain("smart-badge is-editor");
    expect(editor).toContain("left:-20.689655172413794%");
  });

  test("selected custom elements expose eight unobtrusive resize zones", () => {
    const config=normalizeSmartBadgeConfig({elements:{photo:{mode:"custom",xMm:10,yMm:10,widthMm:18,heightMm:22}}});
    const html=renderToStaticMarkup(<SmartBadge editor config={config} agency={{nameAr:"وكالة"}} data={{name:"محمد"}} selectedId="photo"/>);
    for(const direction of ["n","e","s","w","ne","se","sw","nw"])expect(html).toContain(`resize-${direction}`);
  });

  test("migrates legacy selections to an approved direction and preserves live visual variables", () => {
    const config=normalizeSmartBadgeConfig({appearance:{template:"cards",badgeBackground:"#112233",heroBackground:"#223344",heroFrameVisible:false,heroBorderWidth:3,heroRadius:24,labelFontSize:11,valueFontSize:16}});
    const html=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة"}} data={{name:"محمد",passport:"P1"}}/>);
    expect(html).toContain("template-rukn-signature");
    expect(html).toContain("composition-rukn-signature");
    expect(html).toContain("hero-frame-hidden");
    expect(html).toContain("--badge-background:#112233");
    expect(html).toContain("--hero-background:#223344");
    expect(html).toContain("--label-font-size:11px");
    expect(html).toContain("--value-font-size:16px");
  });

  test("legacy luxury selection resolves to the safe RUKN Signature fallback", () => {
    const config=normalizeSmartBadgeConfig({appearance:{template:"luxury",headerStyle:"classic",heroStyle:"stacked",fieldsStyle:"cards",separatorsStyle:"dashed",backgroundStyle:"clean",footerStyle:"minimal"}});
    const html=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة"}} data={{name:"محمد",passport:"P1"}}/>);
    for(const className of ["template-rukn-signature","composition-rukn-signature","header-classic","field-style-cards","background-warm","footer-classic"])expect(html).toContain(className);
  });

  test("remaining presets keep the long Arabic name and their real compositions",()=>{
    const name="عبدالرحمن محمد عبدالسلام العثماني";
    const badge=renderToStaticMarkup(<SmartBadge config={normalizeSmartBadgeConfig({appearance:{layoutFamily:"rukn-signature"}})} agency={{nameAr:"وكالة"}} photoUrl="photo.jpg" data={{name}}/>);
    expect(badge).toContain("composition-rukn-signature");expect(badge).toContain("frame-soft");expect(badge).toContain(name);
  });

  test("renders isolated mix-and-match sources while retaining manual geometry",()=>{
    const config=normalizeSmartBadgeConfig({appearance:{layoutFamily:"rukn-signature"},componentSources:{header:"rukn-signature",hero:"editorial",primaryData:"passport-inspired",secondaryData:"minimal-air",fieldStyle:"centered-ceremony",background:"travel-tag",separators:"editorial",footer:"luxury-white",photoFrame:"centered-ceremony"},elements:{photo:{mode:"custom",xMm:8,yMm:16,widthMm:18,heightMm:24},passport:{mode:"custom",xMm:5,yMm:50,widthMm:36,heightMm:9,internalDisplay:"grid",internalGridColumns:"12px 1fr"}}});
    const html=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة"}} photoUrl="photo.jpg" data={{name:"محمد",passport:"P1",program:"عمرة",travelDate:"2027",makkahHotel:"مكة"}}/>);
    for(const token of ["header-source-rukn-signature","hero-source-editorial","primaryData-source-passport-inspired","secondaryData-source-minimal-air","fieldStyle-source-centered-ceremony","background-source-travel-tag","footer-source-luxury-white","photoFrame-source-centered-ceremony"])expect(html).toContain(token);
    expect(html).toContain("left:13.793103448275861%");
    expect(html).toContain("smart-badge-custom-context smart-badge-details");
  });

  test("renders and fully styles the independent hotel and guide-phone fields", () => {
    const config=normalizeSmartBadgeConfig({content:{makkahHotel:true,madinahHotel:true,guidePhone:true},elements:{makkahHotel:{mode:"custom",xMm:2,yMm:40,widthMm:40,heightMm:8,fontSize:54,labelFontSize:22},madinahHotel:{mode:"custom",xMm:2,yMm:50,widthMm:40,heightMm:8,fontSize:46},guidePhone:{mode:"custom",xMm:2,yMm:60,widthMm:40,heightMm:8,fontSize:42}}});
    const html=renderToStaticMarkup(<SmartBadge config={config} agency={{nameAr:"وكالة"}} data={{name:"محمد",makkahHotel:"مكة الفعلي",madinahHotel:"المدينة الفعلي",guidePhone:"+966500"}}/>);
    for(const value of ["فندق مكة","مكة الفعلي","فندق المدينة","المدينة الفعلي","هاتف المؤطر","+966500"])expect(html).toContain(value);
    expect(html).toContain("--element-font-size:54px");
    expect(html).toContain("--element-label-font-size:22px");
  });

  test("text drag-handle corner is excluded from resize while visual corners remain complete", () => {
    const textConfig=normalizeSmartBadgeConfig({elements:{passport:{mode:"custom",xMm:10,yMm:20,widthMm:20,heightMm:8}}});
    const textHtml=renderToStaticMarkup(<SmartBadge editor config={textConfig} agency={{nameAr:"وكالة"}} data={{name:"محمد",passport:"P1"}} selectedId="passport"/>);
    expect(textHtml).toContain('aria-label="تحريك passport"');
    expect(textHtml).not.toContain("resize-nw");
    const visualConfig=normalizeSmartBadgeConfig({elements:{photo:{mode:"custom",xMm:10,yMm:20,widthMm:20,heightMm:25}}});
    const visualHtml=renderToStaticMarkup(<SmartBadge editor config={visualConfig} agency={{nameAr:"وكالة"}} data={{name:"محمد"}} selectedId="photo"/>);
    expect(visualHtml).toContain("resize-nw");
  });
});
