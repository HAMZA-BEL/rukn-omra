import React from "react";
import { SMART_BADGE_LAYOUTS, SMART_BADGE_PRESETS, SMART_BADGE_TEMPLATES, normalizeSmartBadgeConfig } from "../smartBadgeConfig";
import { SmartBadge } from "./SmartBadge";
import "../smartBadge.css";
import "../smartBadgeControls.css";
import "../smartBadgeThemes.css";
import "../smartBadgeCompositions.css";

export const SMART_BADGE_PRESET_SAMPLE = Object.freeze({
  name: "عبد الرحمن محمد الأمين الإدريسي الحسني",
  passport: "MA5080731",
  program: "برنامج عمرة رمضان المتكامل مع زيارة المدينة المنورة",
  group: "مجموعة الرحمة الدولية — الفوج الثالث",
  room: "١٢٠٨",
  makkahHotel: "فندق أبراج الصفوة رويال أوركيد — مكة المكرمة",
  madinahHotel: "فندق دار التقوى إنتركونتيننتال — المدينة المنورة",
  city: "الدار البيضاء",
  phone: "+212 6 12 34 56 78",
  guidePhone: "+966 55 123 4567",
  travelDate: "السبت 18 رمضان 1448 — 27 فبراير 2027",
});

export const SMART_BADGE_PRESET_AGENCY = Object.freeze({
  nameAr: "وكالة الركن الدولية للأسفار والسياحة وخدمات الحج والعمرة",
  nameFr: "RUKN Voyages Internationaux & Omra",
});

export const SMART_BADGE_PRESET_PHOTO = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300"><rect width="240" height="300" fill="#ded7ca"/><circle cx="120" cy="102" r="48" fill="#f9f7f2"/><path d="M31 282c7-76 45-114 89-114s82 38 89 114" fill="#f9f7f2"/></svg>');

export function SmartBadgePresetGallery() {
  const content = { photo:true,passport:true,program:true,group:true,room:true,makkahHotel:true,madinahHotel:true,city:true,phone:true,guidePhone:true,travelDate:true };
  return <main className="smart-badge-preset-gallery-page">
    <header><h1>قوالب هوية الشارة المتبقية</h1><p>القوالب الأصلية المعتمدة بالحجم الحقيقي وبيانات عربية طويلة.</p></header>
    <div className="smart-badge-preset-gallery" data-testid="smart-badge-preset-gallery">
      {SMART_BADGE_TEMPLATES.map((template,index)=>{
        const config=normalizeSmartBadgeConfig({content,appearance:{template,...SMART_BADGE_PRESETS[template]}});
        return <figure className="smart-badge-preset-gallery-card" data-preset-id={template} key={template}>
          <SmartBadge config={config} agency={SMART_BADGE_PRESET_AGENCY} photoUrl={SMART_BADGE_PRESET_PHOTO} data={SMART_BADGE_PRESET_SAMPLE}/>
          <figcaption>{index+1}. {SMART_BADGE_LAYOUTS[template].name}</figcaption>
        </figure>;
      })}
    </div>
  </main>;
}
