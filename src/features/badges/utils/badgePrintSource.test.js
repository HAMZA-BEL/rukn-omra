import { resolveBadgePrintSource, runBadgePrintSource } from "./badgePrintSource";

test("legacy remains the backward-compatible source when no choice was saved",()=>{
  expect(resolveBadgePrintSource({})).toBe("legacy");
});

test("the saved source routes export without mixing both renderers",()=>{
  const smart=jest.fn(()=>"smart-output"),legacy=jest.fn(()=>"legacy-output");
  expect(runBadgePrintSource({printSource:"smart"},{smart,legacy})).toBe("smart-output");
  expect(smart).toHaveBeenCalledTimes(1);expect(legacy).not.toHaveBeenCalled();
  smart.mockClear();
  expect(runBadgePrintSource({printSource:"legacy"},{smart,legacy})).toBe("legacy-output");
  expect(legacy).toHaveBeenCalledTimes(1);expect(smart).not.toHaveBeenCalled();
});
