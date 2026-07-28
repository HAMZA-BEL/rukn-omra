import { createInitialCostingDraft } from "./programCosting";

test("costing derives every hotel level from hotel check-in and check-out dates", () => {
  const draft = createInitialCostingDraft({
    program: {
      departure: "2026-09-10",
      returnDate: "2026-09-25",
      duration: 15,
      hotelCheckinDay: "next_day",
      priceTable: [
        { id: "level-1", level: "اقتصادي", madinahNights: 4 },
        { id: "level-2", level: "سياحي", madinahNights: 3 },
      ],
    },
  });

  expect(draft.levels.map((level) => ({
    makkah: level.makkah.nights,
    madinah: level.madinah.nights,
  }))).toEqual([
    { makkah: 10, madinah: 4 },
    { makkah: 11, madinah: 3 },
  ]);
});
