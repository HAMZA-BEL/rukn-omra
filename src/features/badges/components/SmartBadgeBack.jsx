import React from "react";
import { useSmartBadgeI18n } from "../smartBadgeI18n";

const mm=(value)=>`${value}mm`;
export const RUKN_BACK_LOGO_URL="/branding/rukn-logo.png";
const elementStyle=(element)=>({position:"absolute",left:mm(element.xMm),top:mm(element.yMm),width:mm(element.widthMm),height:mm(element.heightMm),opacity:(element.opacity??100)/100,borderRadius:mm(element.radius||0),boxShadow:element.shadow?"0 2mm 5mm rgba(33,29,20,.18)":"none"});

export const moveBackElement=(base,dxMm,dyMm)=>({...base,xMm:base.xMm+dxMm,yMm:base.yMm+dyMm});
export const resizeBackElement=(base,direction,dxMm,dyMm)=>{
  const west=direction.includes("w"),north=direction.includes("n"),aspect=base.widthMm/base.heightMm||1,rawWidth=Math.max(3,base.widthMm+(west?-dxMm:dxMm)),rawHeight=Math.max(3,base.heightMm+(north?-dyMm:dyMm));
  let widthMm=rawWidth,heightMm=rawHeight;
  if(base.lockAspectRatio){const widthDelta=Math.abs(rawWidth-base.widthMm)/base.widthMm,heightDelta=Math.abs(rawHeight-base.heightMm)/base.heightMm;if(widthDelta>=heightDelta)heightMm=widthMm/aspect;else widthMm=heightMm*aspect;}
  return {...base,widthMm,heightMm,xMm:west?base.xMm+base.widthMm-widthMm:base.xMm,yMm:north?base.yMm+base.heightMm-heightMm:base.yMm};
};

export function resolveBackImageSource(back){
  const image=back?.elements?.image||{};
  return image.customDataUrl||"";
}

export function SmartBadgeBack({config,editor=false,selectedId="",onSelect,onPointerStart}){
  const {text}=useSmartBadgeI18n();
  const back=config?.sides?.back||config?.back;
  if(!back)return null;
  const imageUrl=resolveBackImageSource(back),elements=back.elements||{};
  const render=(id,content)=>{const element=elements[id];if(!element?.enabled)return null;return <div className={`smart-badge-back-element is-${id} ${selectedId===id?"is-selected":""}`} data-back-element-id={id} style={elementStyle(element)} onPointerDown={(event)=>{if(!editor)return;event.stopPropagation();onSelect?.(id);onPointerStart?.(id,event,{mode:"drag"});}} tabIndex={editor?0:undefined}>{content}{editor&&selectedId===id&&["nw","ne","se","sw"].map((direction)=><i key={direction} className={`smart-badge-back-resize resize-${direction}`} data-resize-direction={direction} onPointerDown={(event)=>{event.preventDefault();event.stopPropagation();onPointerStart?.(id,event,{mode:"resize",direction});}}/>)}</div>};
  const background=back.appearance?.backgroundColor||"#f7f3ea";
  return <article className={`smart-badge smart-badge-back ${editor?"is-editor":"is-output"}`} style={{"--back-background":background,"--badge-background":background,background,backgroundColor:background}} dir="rtl" onPointerDown={(event)=>{if(event.target===event.currentTarget)onSelect?.("");}}>
    {render("logo",<img draggable="false" src={RUKN_BACK_LOGO_URL} alt={text("شعار RUKN")}/>)}
    {render("image",imageUrl?<img draggable="false" src={imageUrl} alt={text("صورة ظهر الشارة")}/>:<span className="smart-badge-back-empty" aria-hidden="true"/>)}
    {render("text",<span style={{fontSize:`${elements.text?.fontSize||22}px`,fontWeight:elements.text?.fontWeight||800,color:elements.text?.color||"#292722",background:elements.text?.backgroundColor||"transparent"}}>{elements.text?.text||""}</span>)}
  </article>;
}
