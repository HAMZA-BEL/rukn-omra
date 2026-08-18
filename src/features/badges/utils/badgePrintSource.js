export const BADGE_PRINT_SOURCE_SMART="smart";
export const BADGE_PRINT_SOURCE_LEGACY="legacy";

export function resolveBadgePrintSource(config){
  return config?.printSource===BADGE_PRINT_SOURCE_SMART?BADGE_PRINT_SOURCE_SMART:BADGE_PRINT_SOURCE_LEGACY;
}

export function runBadgePrintSource(config,{smart,legacy}){
  return resolveBadgePrintSource(config)===BADGE_PRINT_SOURCE_SMART?smart():legacy();
}
