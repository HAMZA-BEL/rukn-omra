import React from "react";
import { getAgencyBadgeColor, normalizeSmartBadgeConfig } from "../smartBadgeConfig";
import { loadSmartBadgeSettings, saveSmartBadgeSettings } from "../services/smartBadgeSettingsApi";
import { SmartBadgeUi, useSmartBadgeI18n } from "../smartBadgeI18n";

export function BadgePrintSourceSetting({store,onToast,onSourceChange}){
  const {dir,text}=useSmartBadgeI18n();
  const agency=store?.agency||{},agencyId=store?.agencyId||agency.id||"",agencyColor=getAgencyBadgeColor(agency);
  const [source,setSource]=React.useState("legacy"),[saving,setSaving]=React.useState(false);
  React.useEffect(()=>{let active=true;loadSmartBadgeSettings(agencyId,agencyColor).then(({data})=>{if(!active)return;const value=data?.printSource==="smart"?"smart":"legacy";setSource(value);onSourceChange?.(value);});return()=>{active=false;};},[agencyId,agencyColor,onSourceChange]);
  const choose=async(next)=>{if(next===source||saving)return;const previous=source;setSource(next);onSourceChange?.(next);setSaving(true);const {data:latest}=await loadSmartBadgeSettings(agencyId,agencyColor),config=normalizeSmartBadgeConfig({...latest,printSource:next},agencyColor),{error}=await saveSmartBadgeSettings(agencyId,config,agencyColor);setSaving(false);if(error){setSource(previous);onSourceChange?.(previous);onToast?.(text("تعذر حفظ مصدر تصميم الشارة"),"error");return;}onToast?.(text("تم حفظ مصدر تصميم الشارة"),"success");};
  return <SmartBadgeUi><section className="smart-badge-print-source-setting" dir={dir} aria-busy={saving}><header><strong>مصدر تصميم الشارة</strong><small>يحدد التصميم المستخدم عند التنزيل والطباعة فقط</small></header><div className="smart-badge-source-choice" role="radiogroup" aria-label="مصدر تصميم الشارة"><label><input type="radio" name="badge-print-source-global" value="smart" checked={source==="smart"} onChange={()=>choose("smart")}/><span><strong>هوية الشارة</strong><small>استعمال تصميم Smart Badge المحفوظ</small></span></label><label><input type="radio" name="badge-print-source-global" value="legacy" checked={source==="legacy"} onChange={()=>choose("legacy")}/><span><strong>قالب الشارة</strong><small>استعمال القالب المرتبط بالبرنامج</small></span></label></div></section></SmartBadgeUi>;
}
