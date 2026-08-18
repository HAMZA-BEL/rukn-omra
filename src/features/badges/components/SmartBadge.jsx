import React from "react";
import { elementStyle, fieldPartPositionStyle } from "../smartBadgeLayout";
import { resolveSmartBadgeBackground, resolveSmartBadgeComponentAppearance, smartBadgeEffectStyle } from "../smartBadgeConfig";
import { useSmartBadgeI18n } from "../smartBadgeI18n";

const text = (value) => String(value ?? "").trim();
const resizeDirections = ["n","e","s","w","ne","se","sw","nw"];

export function SingleLineName({children,autoFit=true,fitKey=""}){
  const ref=React.useRef(null);
  React.useEffect(()=>{
    const node=ref.current;if(!node||!autoFit)return undefined;
    const observed=node.parentElement||node;
    let frame=0,disposed=false;
    node.style.removeProperty("font-size");
    const computed=window.getComputedStyle(node),maxFontSize=parseFloat(computed.fontSize)||21;
    const probe=document.createElement("span");
    probe.dataset.smartBadgeNameMeasure="true";
    probe.textContent=String(children??"");
    Object.assign(probe.style,{position:"fixed",left:"-10000px",top:"-10000px",visibility:"hidden",pointerEvents:"none",whiteSpace:"nowrap",width:"max-content",fontFamily:computed.fontFamily,fontWeight:computed.fontWeight,fontStyle:computed.fontStyle,fontSize:`${maxFontSize}px`,letterSpacing:computed.letterSpacing});
    document.body.appendChild(probe);
    const measure=()=>{
      frame=0;if(disposed)return;
      const available=node.clientWidth||observed.clientWidth,natural=probe.getBoundingClientRect().width||probe.scrollWidth;
      if(!available||!natural)return;
      const target=Math.max(14,Math.min(maxFontSize,Math.floor(maxFontSize*available/natural*10)/10));
      const current=parseFloat(node.style.fontSize)||maxFontSize;
      if(Math.abs(current-target)>.05)node.style.fontSize=`${target}px`;
      node.dataset.fittedFontSize=String(target);
      node.dataset.overflows=String(natural*(target/maxFontSize)>available+1);
    };
    const schedule=()=>{if(disposed||frame)return;frame=window.requestAnimationFrame(measure);};
    schedule();
    document.fonts?.ready?.then(schedule).catch?.(()=>{});
    const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(schedule):null;
    observer?.observe(observed);
    return()=>{disposed=true;if(frame)window.cancelAnimationFrame(frame);observer?.disconnect();probe.remove();};
  },[children,autoFit,fitKey]);
  return <h2 ref={ref} title={children} data-single-line-name="true">{children}</h2>;
}

function Selectable({ id, config, selectedId, onSelect, onDragStart, onResizeStart, children, className = "", style = {} }) {
  const {text:uiText}=useSmartBadgeI18n();
  const override = config.elements?.[id] || { mode: "auto" };
  const custom = override.mode === "custom";
  const elementResizeDirections = ["photo","logo","watermark"].includes(id) ? resizeDirections : resizeDirections.filter((direction) => direction !== "nw");
  const customTextStyle = custom ? {
    ...(override.align ? {textAlign:override.align,alignItems:override.align === "center" ? "center" : override.align === "left" ? "flex-end" : "flex-start"} : {}),
    ...(override.verticalAlign ? {justifyContent:override.verticalAlign === "top" ? "flex-start" : override.verticalAlign === "bottom" ? "flex-end" : "center"} : {}),
    ...(override.fontSize ? { "--element-font-size": `${override.fontSize}px` } : {}),
    ...(override.labelFontSize ? { "--element-label-font-size": `${override.labelFontSize}px` } : {}),
    ...(override.labelFontWeight ? { "--element-label-font-weight": override.labelFontWeight } : {}),
    ...(override.labelColor ? { "--element-label-color": override.labelColor } : {}),
    ...(override.fontWeight ? { "--element-font-weight": override.fontWeight } : {}),
    ...(override.lineHeight ? { "--element-line-height": override.lineHeight } : {}),
    ...(override.color ? { "--element-color": override.color } : {}),
    ...(override.backgroundColor ? { "--element-background": override.backgroundColor } : {}),
    ...(override.borderColor ? { "--element-border-color": override.borderColor } : {}),
    ...(Number.isFinite(override.borderWidth) ? { "--element-border-width": `${override.borderWidth}px` } : {}),
    ...(Number.isFinite(override.radius) ? { "--element-radius": `${override.radius}mm` } : {}),
    ...(Number.isFinite(override.padding) ? { "--element-padding": `${override.padding}px` } : {}),
  } : {};
  const effect=smartBadgeEffectStyle(config.effects?.[id]||(id==="photo"?config.effects?.photoFrame:undefined));
  return <div
    className={`smart-badge-selectable ${custom ? "is-custom" : "is-auto"} ${selectedId === id ? "is-selected" : ""} ${effect.className} ${className}`}
    data-element-id={id} data-element-mode={override.mode}
    style={{ ...style, ...effect.style, ...elementStyle(override), ...customTextStyle }}
    onPointerDown={(event) => { event.stopPropagation(); onSelect?.(id, event); if (["photo","logo","watermark"].includes(id)) onDragStart?.(id, event); }}
    role="button" tabIndex={0} aria-label={`${uiText("تخصيص")} ${id}`}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect?.(id, event); }}
  >{children}{selectedId === id && custom&&<div className="smart-badge-resize-zones" aria-hidden="true">{elementResizeDirections.map((direction)=><i key={direction} className={`smart-badge-resize-zone resize-${direction}`} onPointerDown={(event)=>{event.preventDefault();event.stopPropagation();onResizeStart?.(id,direction,event);}}/>)}</div>}{selectedId === id && !["photo","logo","watermark"].includes(id) && <button type="button" className="smart-badge-drag-handle" aria-label={`${uiText("تحريك")} ${id}`} title={uiText("تحريك")} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); onDragStart?.(id, event); }}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2v16M2 10h16M10 2 7.5 4.5M10 2l2.5 2.5M10 18l-2.5-2.5M10 18l2.5-2.5M2 10l2.5-2.5M2 10l2.5 2.5M18 10l-2.5-2.5M18 10l-2.5 2.5"/></svg></button>}</div>;
}

const isCustom = (config, id) => config.elements?.[id]?.mode === "custom";
const Slot = ({ className = "" }) => <span className={`smart-badge-auto-slot ${className}`} aria-hidden="true" />;
const DataFieldPart = ({ fieldId, part, children, config, selectedPart, editor, onSelect, onDragStart }) => {
  const {text:uiText}=useSmartBadgeI18n();
  const selected = selectedPart?.fieldId === fieldId && selectedPart?.part === part;
  const props = editor ? {
    role: "button",
    tabIndex: 0,
    "aria-label": `${uiText("تخصيص")} ${uiText(part === "value" ? "قيمة" : "عنوان")} ${fieldId}`,
    onPointerDown: (event) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect?.(fieldId, part, event);
      onDragStart?.(fieldId, part, event);
    },
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        onSelect?.(fieldId, part, event);
      }
    },
  } : {};
  const Tag = part === "label" ? "small" : "bdi";
  return <Tag
    {...props}
    className={`smart-badge-field-${part} smart-badge-field-part ${selected ? "is-part-selected" : ""}`}
    data-field-id={fieldId}
    data-field-part={part}
    style={fieldPartPositionStyle(config.fieldParts, fieldId, part)}
  >{children}</Tag>;
};

const DataFieldRow = (props) => <>
  <DataFieldPart {...props} part="label">{props.label}</DataFieldPart>
  <DataFieldPart {...props} part="value">{props.value}</DataFieldPart>
</>;

export function SmartBadge({ data = {}, config, agency = {}, photoUrl = "", selectedId = "", selectedPart, onSelect, onDragStart, onResizeStart, onFieldPartSelect, onFieldPartDragStart, guides = {}, editor = false }) {
  const enabled=config.content,hidden=new Set(config.hiddenElements||[]),agencyName=text(agency.nameAr||agency.name_ar||agency.nameFr||agency.name_fr)||"RUKN",agencyLatin=text(agency.agencyNameLatin||agency.nameFr||agency.name_fr),showPhoto=Boolean(enabled.photo&&!hidden.has("photo")),selectableProps={config,selectedId,onSelect,onDragStart,onResizeStart},fieldPartProps={config,selectedPart,editor,onSelect:onFieldPartSelect,onDragStart:onFieldPartDragStart},componentAppearance=resolveSmartBadgeComponentAppearance(config),sources=config.componentSources||{};
  const defaultPhotoShape=componentAppearance.photoFrame.photoStyle==="circle"?"circle":componentAppearance.photoFrame.photoStyle==="passport"?"square":"soft",photoShape=config.elements?.photo?.mode==="custom"?(config.elements.photo.frameShape||defaultPhotoShape):defaultPhotoShape;
  const resolvedBackground=resolveSmartBadgeBackground(config),explicitBackground=resolvedBackground.explicit,badgeBackground=resolvedBackground.color,backgroundStyle=resolvedBackground.style;
  const fieldVisualStyle={"--field-background":config.appearance.fieldBackground,"--field-border-color":config.appearance.fieldBorderColor,"--field-border-width":`${config.appearance.fieldBorderWidth}px`,"--field-radius":`${config.appearance.fieldRadius}px`,"--field-padding":`${config.appearance.fieldPadding}px`};
  const effect=(id)=>smartBadgeEffectStyle(config.effects?.[id]);
  const logoContent=(agency.logoUrl||agency.logo_url)?<img draggable="false" src={agency.logoUrl||agency.logo_url} alt={`شعار ${agencyName}`}/>:<span className="smart-badge-logo-empty" aria-hidden="true"/>;
  const fieldMap={
    logo:()=> <Selectable id="logo" {...selectableProps} className="smart-badge-logo-element">{logoContent}</Selectable>,
    agencyName:()=> <Selectable id="agencyName" {...selectableProps} className="smart-badge-agency-name"><strong>{agencyName}</strong>{agencyLatin&&<small>{agencyLatin}</small>}</Selectable>,
    photo:()=> <Selectable id="photo" {...selectableProps} className={`smart-badge-photo-element frame-${photoShape}`} style={{"--photo-radius":`${config.elements?.photo?.radius??4}mm`}}>{photoUrl?<img draggable="false" className="smart-badge-photo" src={photoUrl} alt={text(data.name)}/>:<span className="smart-badge-photo-placeholder" aria-label="لا توجد صورة"><svg viewBox="0 0 48 58" aria-hidden="true"><circle cx="24" cy="18" r="10"/><path d="M7 53c1.5-14 8-21 17-21s15.5 7 17 21"/></svg></span>}</Selectable>,
    pilgrimName:()=> <Selectable id="pilgrimName" {...selectableProps} className="smart-badge-person"><SingleLineName autoFit={config.elements?.pilgrimName?.mode!=="custom"} fitKey={config.appearance.layoutFamily}>{text(data.name)||"اسم المعتمر"}</SingleLineName></Selectable>,
  };
  const quick=[enabled.room&&!hidden.has("room")&&data.room?["room","الغرفة",data.room]:null,enabled.group&&!hidden.has("group")&&data.group?["group","المجموعة",data.group]:null].filter(Boolean);
  const details=[enabled.passport&&!hidden.has("passport")&&data.passport?["passport","رقم الجواز",data.passport]:null,enabled.program&&!hidden.has("program")&&data.program?["program","البرنامج",data.program]:null,enabled.travelDate&&!hidden.has("travelDate")&&data.travelDate?["travelDate","تاريخ السفر",data.travelDate]:null,enabled.makkahHotel&&!hidden.has("makkahHotel")&&data.makkahHotel?["makkahHotel","فندق مكة",data.makkahHotel]:null,enabled.madinahHotel&&!hidden.has("madinahHotel")&&data.madinahHotel?["madinahHotel","فندق المدينة",data.madinahHotel]:null,enabled.city&&!hidden.has("city")&&data.city?["city","المدينة",data.city]:null,enabled.phone&&!hidden.has("phone")&&data.phone?["phone","الهاتف",data.phone]:null,enabled.guidePhone&&!hidden.has("guidePhone")&&data.guidePhone?["guidePhone","هاتف المؤطر",data.guidePhone]:null].filter(Boolean);
  quick.forEach(([id,label,value])=>{fieldMap[id]=()=> <Selectable id={id} {...selectableProps} style={fieldVisualStyle} className="smart-badge-data-field smart-badge-quick-element"><DataFieldRow fieldId={id} label={label} value={value} {...fieldPartProps}/></Selectable>;});
  details.forEach(([id,label,value])=>{const role=["passport","program","travelDate"].includes(id)?"primary":"secondary";fieldMap[id]=()=> <Selectable id={id} {...selectableProps} style={fieldVisualStyle} className={`smart-badge-data-field smart-badge-detail-element is-${role}-data`}><DataFieldRow fieldId={id} label={label} value={value} {...fieldPartProps}/></Selectable>;});
  const primaryDetails=details.filter(([id])=>["passport","program","travelDate"].includes(id)),secondaryDetails=details.filter(([id])=>!["passport","program","travelDate"].includes(id));
  const customIds=Object.keys(fieldMap).filter((id)=>!hidden.has(id)&&isCustom(config,id));
  const sourceClasses=Object.entries(sources).map(([part,source])=>`${part}-source-${source}`).join(" ");
  return <article className={`smart-badge ${editor?"is-editor":"is-output"} template-${config.appearance.template||"rukn-signature"} composition-${config.appearance.compositionStyle||"rukn-signature"} ${sourceClasses} header-${config.appearance.headerStyle||"classic"} field-style-${config.appearance.fieldsStyle||"lines"} separators-${config.appearance.separatorsStyle||"soft"} background-${backgroundStyle} footer-${config.appearance.footerStyle||"classic"} identity-${config.appearance.identityStyle||"classic"} photo-style-${config.appearance.photoStyle||"portrait"} decorative-${config.appearance.decorativeStyle||"editorial"} density-${config.appearance.density} ${explicitBackground?"has-explicit-background":""} ${config.appearance.heroContainerVisible===false?"hero-container-hidden":"hero-container-visible"} ${config.appearance.heroFrameVisible===false?"hero-frame-hidden":"hero-frame-visible"} ${config.appearance.heroShadowVisible===false?"hero-shadow-hidden":"hero-shadow-visible"} ${showPhoto?"has-photo":"no-photo"} fields-${Math.min(details.length,6)}`} style={{"--badge-primary":config.appearance.primaryColor,"--badge-background":badgeBackground,"--hero-background":config.appearance.heroBackground,"--hero-opacity":`${config.appearance.heroOpacity}%`,"--hero-padding":`${config.appearance.heroPadding}px`,"--hero-border-color":config.appearance.heroBorderColor,"--hero-border-width":`${config.appearance.heroBorderWidth}px`,"--hero-radius":`${config.appearance.heroRadius}px`,"--badge-accent":config.appearance.accentColor,"--label-font-size":`${config.appearance.labelFontSize}px`,"--label-font-weight":config.appearance.labelFontWeight,"--label-color":config.appearance.labelColor,"--value-font-size":`${config.appearance.valueFontSize}px`,"--value-font-weight":config.appearance.valueFontWeight,"--value-color":config.appearance.valueColor}} dir="rtl" onPointerDown={(event)=>{if(!event.target.closest?.("[data-element-id]"))onSelect?.("",event);}}>
    <div className="smart-badge-background-layer"><div className="smart-badge-ornament" aria-hidden="true"/></div>
    {enabled.watermark&&!hidden.has("watermark")&&(agency.logoUrl||agency.logo_url)&&<Selectable id="watermark" {...selectableProps} className="smart-badge-watermark"><img draggable="false" src={agency.logoUrl||agency.logo_url} alt="العلامة المائية للوكالة" style={{opacity:(config.elements?.watermark?.opacity??8)/100}}/></Selectable>}
    <div className="smart-badge-auto-layer">
      <header className={`smart-badge-brand ${effect("header").className}`} style={effect("header").style}>{!hidden.has("logo")&&(isCustom(config,"logo")?<Slot className="logo-slot"/>:fieldMap.logo())}{!hidden.has("agencyName")&&(isCustom(config,"agencyName")?<Slot className="agency-name-slot"/>:fieldMap.agencyName())}<span className="smart-badge-rukn">RUKN</span></header>
      <section className={`smart-badge-hero ${effect("hero").className} ${selectedId==="heroContainer"?"is-selected-container":""}`} style={effect("hero").style} data-element-id="heroContainer" role="button" tabIndex={0} aria-label="تخصيص حاوية الاسم والصورة" onPointerDown={(event)=>{if(event.target===event.currentTarget){event.stopPropagation();onSelect?.("heroContainer",event);}}} onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" ")onSelect?.("heroContainer",event);}}>{showPhoto&&(isCustom(config,"photo")?<Slot className="photo-slot"/>:fieldMap.photo())}{!hidden.has("pilgrimName")&&(isCustom(config,"pilgrimName")?<Slot className="pilgrim-name-slot"/>:fieldMap.pilgrimName())}</section>
      {quick.length>0&&<section className="smart-badge-quick">{quick.map(([id])=><React.Fragment key={id}>{isCustom(config,id)?<Slot className="quick-slot"/>:fieldMap[id]()}</React.Fragment>)}</section>}
      {details.length>0&&<div className="smart-badge-details-stack">{primaryDetails.length>0&&<section className={`smart-badge-details smart-badge-primary-data ${effect("primaryData").className}`} style={effect("primaryData").style}>{primaryDetails.map(([id])=><React.Fragment key={id}>{isCustom(config,id)?<Slot className="detail-slot"/>:fieldMap[id]()}</React.Fragment>)}</section>}{secondaryDetails.length>0&&<section className={`smart-badge-details smart-badge-secondary-data ${effect("secondaryData").className}`} style={effect("secondaryData").style}>{secondaryDetails.map(([id])=><React.Fragment key={id}>{isCustom(config,id)?<Slot className="detail-slot"/>:fieldMap[id]()}</React.Fragment>)}</section>}</div>}
      <footer className={`smart-badge-footer ${effect("footer").className}`} style={effect("footer").style} onPointerDown={(event)=>event.stopPropagation()}><span>بطاقة تعريف المعتمر</span><span>Powered by <b>RUKN</b></span></footer>
    </div>
    <div className="smart-badge-custom-layer">{customIds.map((id)=><div className={`smart-badge-custom-context ${id==="logo"||id==="agencyName"?"smart-badge-brand":id==="photo"||id==="pilgrimName"?"smart-badge-hero":quick.some(([quickId])=>quickId===id)?"smart-badge-quick":"smart-badge-details"}`} key={id}>{fieldMap[id]()}</div>)}</div>
    <div className="smart-badge-editor-overlay">{selectedId==="watermark"&&config.elements?.watermark?.mode==="custom"&&<div className="smart-badge-watermark-drag-surface" data-element-id="watermark" data-drag-proxy="true" style={elementStyle(config.elements.watermark)} aria-label="تحريك العلامة المائية" onPointerDown={(event)=>{event.stopPropagation();onSelect?.("watermark",event);onDragStart?.("watermark",event);}}><div className="smart-badge-resize-zones" aria-hidden="true">{resizeDirections.map((direction)=><i key={direction} className={`smart-badge-resize-zone resize-${direction}`} onPointerDown={(event)=>{event.preventDefault();event.stopPropagation();onResizeStart?.("watermark",direction,event);}}/>)}</div></div>}{guides.x&&<i className="smart-badge-guide guide-x"/>}{guides.y&&<i className="smart-badge-guide guide-y"/>}{guides.safe&&<i className="smart-badge-safe-guide"/>}</div>
  </article>;
}
