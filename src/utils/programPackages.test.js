import {
  getBookableHotelPackages,
  getHotelPackageSelectOptions,
  getPackageAvailableRoomTypes,
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
