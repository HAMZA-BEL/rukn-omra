import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeSmartBadgeConfig } from "../smartBadgeConfig";
import { SmartBadgeBack, moveBackElement, resizeBackElement } from "./SmartBadgeBack";

test("back canvas has no automatic image source and applies its explicit background",()=>{
  const config=normalizeSmartBadgeConfig({sides:{back:{enabled:true,appearance:{backgroundColor:"#123456"},elements:{image:{enabled:true,source:"visa"}}}}});
  const html=renderToStaticMarkup(<SmartBadgeBack config={config} agency={{}} photoUrl="data:image/png;base64,PILGRIM"/>);
  expect(config.sides.back.elements.image.source).toBe("custom");
  expect(html).toContain("background-color:#123456");
  expect(html).not.toContain("PILGRIM");
  expect(html).toContain('src="/branding/rukn-logo.png"');
  expect(html).toContain('alt="شعار RUKN"');
});

test("free logo drag is one-to-one and preserves size and grab-relative geometry",()=>{
  const base={xMm:9,yMm:16,widthMm:40,heightMm:24,opacity:65};
  expect(moveBackElement(base,0,0)).toEqual(base);
  expect(moveBackElement(base,7.5,-4)).toEqual({...base,xMm:16.5,yMm:12});
});

test("corner resize preserves ratio and opposite corner when locked",()=>{
  const base={xMm:9,yMm:16,widthMm:40,heightMm:24,lockAspectRatio:true};
  const resized=resizeBackElement(base,"nw",-10,-2);
  expect(resized.widthMm/resized.heightMm).toBeCloseTo(40/24,8);
  expect(resized.xMm+resized.widthMm).toBeCloseTo(base.xMm+base.widthMm,8);
  expect(resized.yMm+resized.heightMm).toBeCloseTo(base.yMm+base.heightMm,8);
});
