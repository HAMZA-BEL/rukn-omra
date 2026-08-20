import {
  getBookableHotelPackages,
  getHotelPackageSelectOptions,
  getPackageAvailableRoomTypes,
  normalizeProgramPackages,
  parseOptionalHaramDistance,
} from "./programPackages";

const packages = [
  {
    id: "tourist",
    level: "سياحي",
    hotelMecca: "جميرا",
    hotelMadina: "وورت",
    prices: { double: 12000, triple: 11000 },
  },
  {
    id: "economy",
    level: "اقتصادي",
    hotelMecca: "إسكان التيسير",
    hotelMadina: "مثابة",
    prices: { quad: 9000 },
  },
];

test("hotel options keep the package id while showing both hotels and level", () => {
  expect(getHotelPackageSelectOptions(packages)).toEqual([
    {
      value: "tourist",
      label: "مكة: جميرا — المدينة: وورت — سياحي",
    },
    {
      value: "economy",
      label: "مكة: إسكان التيسير — المدينة: مثابة — اقتصادي",
    },
  ]);
});

test("duplicate hotel packages remain distinguishable", () => {
  const duplicated = [packages[0], { ...packages[0], id: "tourist-2" }];
  expect(getHotelPackageSelectOptions(duplicated).map((option) => option.label)).toEqual([
    "مكة: جميرا — المدينة: وورت — سياحي — الباقة 1",
    "مكة: جميرا — المدينة: وورت — سياحي — الباقة 2",
  ]);
});

test("room types are limited to prices available in the selected package", () => {
  expect(getPackageAvailableRoomTypes(packages[0])).toEqual(["double", "triple"]);
  expect(getPackageAvailableRoomTypes(packages[1])).toEqual(["quad"]);
});

test("programs without hotel names have no bookable hotel package", () => {
  expect(getBookableHotelPackages([
    { id: "empty", level: "اقتصادي", prices: { double: 1000 } },
  ])).toEqual([]);
});

test.each([
  ["", true, null],
  [100, true, 100],
  ["250", true, 250],
  ["12.5", true, 12.5],
  ["نص", false, null],
  ["100 متر", false, null],
])("validates optional Haram distance %p", (input, valid, value) => {
  expect(parseOptionalHaramDistance(input)).toEqual({ valid, value });
});

test("package normalization persists distances as numbers and accepts snake case input", () => {
  const [pkg] = normalizeProgramPackages({ priceTable: [{
    id: "with-distance",
    level: "اقتصادي",
    hotelMecca: "فندق مكة",
    hotelMadina: "فندق المدينة",
    makkah_haram_distance: "120",
    madinah_haram_distance: 300,
    prices: {},
  }] });
  expect(pkg.makkahHaramDistance).toBe(120);
  expect(pkg.madinahHaramDistance).toBe(300);
});
