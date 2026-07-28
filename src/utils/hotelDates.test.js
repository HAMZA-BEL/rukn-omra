import {
  calculateHotelNightAllocation,
  calculateHotelStayDates,
  calculateTotalHotelNights,
} from "./hotelDates";

const trip = {
  departureDate: "2026-09-10",
  returnDate: "2026-09-25",
  hotelCheckinDay: "next_day",
};

test("counts hotel nights from check-in through the night before check-out", () => {
  expect(calculateTotalHotelNights(trip)).toBe(14);
  expect(calculateTotalHotelNights({
    ...trip,
    hotelCheckinDay: "same_day",
  })).toBe(15);
});

test("allocates all hotel nights between Makkah and Madinah", () => {
  expect(calculateHotelNightAllocation({
    ...trip,
    madinahNights: 4,
  })).toEqual({
    totalHotelNights: 14,
    makkahNights: 10,
    madinahNights: 4,
  });

  expect(calculateHotelNightAllocation({
    ...trip,
    madinahNights: 3,
  })).toEqual({
    totalHotelNights: 14,
    makkahNights: 11,
    madinahNights: 3,
  });
});

test("hotel stay dates use return day as check-out, not as a hotel night", () => {
  expect(calculateHotelStayDates({
    ...trip,
    visitOrder: "madinah_first",
    madinahNights: 4,
  })).toEqual({
    medinaCheckIn: "2026-09-11",
    medinaCheckOut: "2026-09-15",
    makkahCheckIn: "2026-09-15",
    makkahCheckOut: "2026-09-25",
  });
});
