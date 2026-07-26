import {
  buildMarketplaceSnapshot,
  getAgencyMarketplacePrograms,
  getMarketplaceListingCounts,
  getMarketplaceProgramPreview,
  getMarketplaceStartingPrice,
} from "./marketplacePresentation";

test("marketplace programs remain scoped to the current agency", () => {
  const programs = [
    { id: "own", agency_id: "agency-a", name: "Own program" },
    { id: "other", agency_id: "agency-b", name: "Other program" },
    { id: "deleted", agency_id: "agency-a", deleted: true },
  ];

  expect(getAgencyMarketplacePrograms(programs, "agency-a").map(({ id }) => id))
    .toEqual(["own"]);
});

test("program preview exposes public travel, hotel, and room price data only", () => {
  const preview = getMarketplaceProgramPreview({
    name: "عمرة رمضان",
    departure: "2026-03-01",
    returnDate: "2026-03-12",
    duration: 12,
    priceTable: [{
      id: "standard",
      level: "سياحي",
      hotelMecca: "فندق مكة",
      hotelMadina: "فندق المدينة",
      prices: { double: 18000, triple: 16500 },
      programCosting: { internalCost: 12000, margin: 4500 },
    }],
  });

  expect(preview.startingPrice).toBe(16500);
  expect(preview.packages[0]).toEqual({
    id: "standard",
    level: "سياحي",
    hotelMecca: "فندق مكة",
    hotelMadina: "فندق المدينة",
    mealPlan: "",
    prices: { double: 18000, triple: 16500 },
  });
  expect(preview.packages[0]).not.toHaveProperty("programCosting");
});

test("snapshot uses an explicit public allowlist and excludes sensitive internals", () => {
  const snapshot = buildMarketplaceSnapshot({
    id: "internal-program-id",
    agency_id: "agency-a",
    name: "برنامج عام",
    notes: "internal note",
    clients: [{ passport: "secret" }],
    payments: [{ amount: 100 }],
    profit: 9000,
    margin: 8000,
    priceTable: [{
      level: "سياحي",
      hotelMecca: "Public hotel",
      notes: "internal package note",
      prices: { double: 17000 },
      programCosting: { internalCost: 10000 },
    }],
  }, {
    id: "agency-a",
    nameAr: "وكالة عامة",
    phoneTiznit1: "0600000000",
    bankIban: "secret-bank-data",
  });

  expect(snapshot).toEqual({
    schema_version: 1,
    title: "برنامج عام",
    title_fr: "",
    program_type: "",
    departure_date: "",
    return_date: "",
    duration: "",
    transport: "",
    route: "",
    starting_price: 17000,
    packages: [{
      level: "سياحي",
      hotel_mecca: "Public hotel",
      hotel_madina: "",
      madinah_nights: 0,
      meal_plan: "",
      prices: { double: 17000 },
    }],
    agency: {
      name_ar: "وكالة عامة",
      name_fr: "",
      city: "",
      contact_phone: "0600000000",
      website: "",
    },
  });
  expect(JSON.stringify(snapshot)).not.toMatch(
    /programCosting|internalCost|profit|margin|passport|payments|bankIban|internal note/
  );
});

test("marketplace starting price accepts only positive public room prices", () => {
  expect(getMarketplaceStartingPrice({
    priceTable: [{
      prices: {
        single: null,
        double: "not-a-number",
        triple: -50,
        quad: 0,
        quint: "14500",
        child: 100,
      },
      programCosting: { total: 1 },
    }],
  })).toBe(14500);

  expect(getMarketplaceStartingPrice({
    priceTable: [{ prices: { double: 0, triple: -1, child: 500 } }],
  })).toBeNull();
});

test("listing counters are derived from persisted listing statuses", () => {
  expect(getMarketplaceListingCounts([
    { status: "published" },
    { status: "published" },
    { status: "draft" },
    { status: "hidden" },
    { status: "unexpected" },
  ])).toEqual({ published: 2, draft: 1, hidden: 1 });
});
