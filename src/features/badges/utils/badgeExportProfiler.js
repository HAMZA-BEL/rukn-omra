const isDevelopment = () => {
  try { return process.env.NODE_ENV === "development"; } catch { return false; }
};

const clock = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());
const round = (value) => Math.round(Number(value || 0) * 10) / 10;
const bytesLabel = (value) => {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${round(bytes / 1024)} KiB`;
  return `${round(bytes / 1024 / 1024)} MiB`;
};
const stats = (values = []) => {
  if (!values.length) return { min:0,max:0,average:0,median:0,total:0 };
  const sorted=[...values].sort((a,b)=>a-b),total=values.reduce((sum,value)=>sum+value,0),middle=Math.floor(sorted.length/2);
  return {min:round(sorted[0]),max:round(sorted[sorted.length-1]),average:round(total/values.length),median:round(sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2),total:round(total)};
};

const readHeap = () => {
  const memory = typeof performance !== "undefined" ? performance.memory : null;
  return Number.isFinite(memory?.usedJSHeapSize) ? memory.usedJSHeapSize : null;
};

const NOOP = Object.freeze({
  enabled:false,
  mode:"disabled",
  measure:async(_name,work)=>work(),
  measureSync:(_name,work)=>work(),
  startBadge:()=>null,
  measureBadge:async(_badge,_name,work)=>work(),
  measureBadgeSync:(_badge,_name,work)=>work(),
  finishBadge:()=>{},
  increment:()=>{},
  addBytes:()=>{},
  addPhase:()=>{},
  addBadgePhase:()=>{},
  recordImage:()=>{},
  setCounter:()=>{},
  sampleMemory:()=>{},
  finish:()=>null,
});

export class BadgeExportProfiler {
  constructor({ mode, badges = 0, label = "" } = {}) {
    this.enabled=true;
    this.mode=mode||"badge";
    this.label=label;
    this.startedAt=clock();
    this.phases={};
    this.counters={badges:Number(badges)||0,signedUrlRequests:0,assetFetches:0,reactRoots:0,exportHosts:0,toJpegCalls:0,fontReadinessWaits:0,fontEmbedCSSGenerations:0,uniqueImages:0,uniquePhotos:0,jpegBytes:0,finalPdfBytes:0};
    this.imageUrls=new Set();
    this.badges=[];
    this.memory={available:readHeap()!==null,before:readHeap(),peak:readHeap(),after:null};
    this.finished=false;
    if(typeof window!=="undefined")window.__RUKN_ACTIVE_BADGE_EXPORT_PROFILE__=this;
  }

  sampleMemory(){const value=readHeap();if(value===null)return;this.memory.peak=Math.max(this.memory.peak||0,value);}
  increment(name,amount=1){this.counters[name]=(Number(this.counters[name])||0)+amount;}
  setCounter(name,value){this.counters[name]=Number(value)||0;}
  addBytes(name,value){this.increment(name,Number(value)||0);}
  addPhase(name,duration){const item=this.phases[name]||{total:0,count:0};item.total+=duration;item.count+=1;this.phases[name]=item;this.sampleMemory();}
  addBadgePhase(badge,name,duration){if(!badge)return;const bucket=badge.phases[name]||{total:0,count:0};bucket.total+=duration;bucket.count+=1;badge.phases[name]=bucket;this.addPhase(name,duration);}
  recordImage(url){if(!url)return;this.imageUrls.add(url);this.counters.uniqueImages=this.imageUrls.size;}
  async measure(name,work){const start=clock();try{return await work();}finally{this.addPhase(name,clock()-start);}}
  measureSync(name,work){const start=clock();try{return work();}finally{this.addPhase(name,clock()-start);}}
  startBadge(index,total){const badge={index,totalBadges:total,startedAt:clock(),phases:{}};this.badges.push(badge);return badge;}
  async measureBadge(badge,name,work){const start=clock();try{return await work();}finally{this.addBadgePhase(badge,name,clock()-start);}}
  measureBadgeSync(badge,name,work){const start=clock();try{return work();}finally{this.addBadgePhase(badge,name,clock()-start);}}
  finishBadge(badge){badge.totalMs=clock()-badge.startedAt;this.sampleMemory();}

  finish({ pdfBlob } = {}) {
    if(this.finished)return this.summary;
    this.finished=true;
    if(pdfBlob?.size)this.counters.finalPdfBytes=pdfBlob.size;
    this.memory.after=readHeap();this.sampleMemory();
    const total=clock()-this.startedAt,badgeTotals=this.badges.map((badge)=>badge.totalMs||0),toJpeg=this.badges.map((badge)=>badge.phases.toJpeg?.total||0).filter((value)=>value>0),canvas=this.badges.map((badge)=>(badge.phases.canvasRender?.total||0)+(badge.phases.canvasToBlob?.total||0)).filter((value)=>value>0);
    const phaseSummary=Object.fromEntries(Object.entries(this.phases).map(([name,value])=>[name,{total:round(value.total),count:value.count,average:round(value.total/value.count)}]));
    this.summary={mode:this.mode,label:this.label,badges:this.counters.badges,total:round(total),phases:phaseSummary,counters:{...this.counters,averageJpegBytes:this.counters.badges?Math.round(this.counters.jpegBytes/this.counters.badges):0},badgeTime:stats(badgeTotals),toJpeg:stats(toJpeg),canvas:stats(canvas),memory:{...this.memory,delta:this.memory.after!==null&&this.memory.before!==null?this.memory.after-this.memory.before:null}};
    this.print();
    if(typeof window!=="undefined"){window.__RUKN_BADGE_EXPORT_PROFILES__=[...(window.__RUKN_BADGE_EXPORT_PROFILES__||[]),this.summary].slice(-20);if(window.__RUKN_ACTIVE_BADGE_EXPORT_PROFILE__===this)window.__RUKN_ACTIVE_BADGE_EXPORT_PROFILE__=null;}
    return this.summary;
  }

  print(){
    if(typeof console==="undefined")return;
    const title=`${this.mode.toUpperCase()} BADGE EXPORT — ${this.counters.badges} badge${this.counters.badges===1?"":"s"}`;
    console.groupCollapsed?.(title);
    console.table?.({
      Total:{value:`${this.summary.total} ms`},
      "Average badge":{value:`${this.summary.badgeTime.average} ms`},
      "toJpeg total":{value:`${this.summary.toJpeg.total} ms`},
      "Canvas total":{value:`${this.summary.canvas.total} ms`},
      "PDF total":{value:`${this.summary.phases.pdfTotal?.total||0} ms`},
      "JPEG bytes":{value:bytesLabel(this.counters.jpegBytes)},
      "Final PDF":{value:bytesLabel(this.counters.finalPdfBytes)},
      "Memory before":{value:this.memory.available?bytesLabel(this.memory.before):"unavailable"},
      "Memory peak":{value:this.memory.available?bytesLabel(this.memory.peak):"unavailable"},
      "Memory after":{value:this.memory.available?bytesLabel(this.memory.after):"unavailable"},
    });
    console.log("Resources",this.summary.counters);
    console.table?.(Object.entries(this.summary.phases).map(([phase,value])=>({phase,...value})));
    console.groupCollapsed?.("Per badge details");
    console.table?.(this.badges.map((badge)=>({badge:`${badge.index}/${badge.totalBadges}`,totalMs:round(badge.totalMs),assetLoadingMs:round(badge.phases.assetLoading?.total),renderPreparationMs:round(badge.phases.renderPreparation?.total),toJpegMs:round(badge.phases.toJpeg?.total),canvasRenderMs:round(badge.phases.canvasRender?.total),toBlobMs:round(badge.phases.canvasToBlob?.total),cleanupMs:round(badge.phases.cleanup?.total)})));
    console.groupEnd?.();console.groupEnd?.();
  }
}

export const createBadgeExportProfiler = (options) => isDevelopment() ? new BadgeExportProfiler(options) : NOOP;
