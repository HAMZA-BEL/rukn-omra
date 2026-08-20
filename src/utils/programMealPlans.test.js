import { formatMealPlan, getMealPlanSelectOptions, normalizeMealPlan } from "./programMealPlans";

test.each([
  ["none", "بدون"],
  ["breakfast", "إفطار"],
  ["half_board", "نصف إعاشة — إفطار وعشاء"],
  ["full_board", "إعاشة كاملة — إفطار وغداء وعشاء"],
  ["", ""],
  ["نصف إعاشة", "نصف إعاشة — إفطار وعشاء"],
])("formats meal plan %p", (value, expected) => {
  expect(formatMealPlan(value)).toBe(expected);
});

test("known legacy values normalize while unknown legacy text is preserved", () => {
  expect(normalizeMealPlan("إفطار")).toBe("breakfast");
  expect(normalizeMealPlan("وجبة خاصة قديمة")).toBe("وجبة خاصة قديمة");
  expect(getMealPlanSelectOptions("وجبة خاصة قديمة")[0]).toEqual({ value: "وجبة خاصة قديمة", label: "وجبة خاصة قديمة" });
});
