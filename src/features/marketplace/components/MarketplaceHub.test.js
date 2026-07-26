import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Ticket } from "lucide-react";
import {
  MarketplaceModuleCard,
  MarketplaceProgramRow,
  MarketplaceTabs,
} from "./MarketplaceHub";
import PublicationStudio from "./PublicationStudio";

const copy = {
  marketNavigation: "Marketplace navigation",
  overview: "Overview",
  programs: "Programs",
  seatMarket: "Seat exchange",
  soon: "Coming soon",
  unnamedProgram: "Unnamed program",
  liveInMarket: "Live in marketplace",
  travelDate: "Travel date",
  duration: "Duration",
  day: "days",
  internalStatus: "Rukn status",
  active: "Active",
  archived: "Archived",
  startingPrice: "Starting price",
  statuses: {
    published: "Published",
    draft: "Draft",
    hidden: "Hidden",
    unpublished: "Unpublished",
  },
  actions: {
    published: "Manage listing",
    draft: "Continue setup",
    hidden: "Manage",
    unpublished: "Prepare to publish",
  },
  moreActions: "More actions",
  hideFromMarket: "Hide from marketplace",
  hiding: "Hiding",
};

test("marketplace navigation exposes future seat exchange as disabled", () => {
  const markup = renderToStaticMarkup(
    <MarketplaceTabs activeTab="overview" onChange={() => {}} copy={copy} />
  );
  expect(markup).toContain("Seat exchange");
  expect(markup).toContain("Coming soon");
  expect(markup).toMatch(/disabled=""/);
});

test("future marketplace modules use the same reusable card architecture", () => {
  const markup = renderToStaticMarkup(
    <MarketplaceModuleCard
      icon={Ticket}
      title="Seat exchange"
      description="B2B seats"
      badge="Coming soon"
      actionLabel="Future release"
      disabled
    />
  );
  expect(markup).toContain("marketplace-module is-disabled");
  expect(markup).toContain("B2B seats");
});

test("published program rows expose real live status and the correct primary action", () => {
  const markup = renderToStaticMarkup(
    <MarketplaceProgramRow
      program={{ id: "p1", name: "Umrah Premium", duration: 12, status: "active" }}
      listing={{ publicData: { starting_price: 16500 } }}
      status="published"
      copy={copy}
      lang="en"
      formattedDate="1 Aug 2026"
      busy={false}
      onOpen={() => {}}
      onHide={() => {}}
    />
  );
  expect(markup).toContain("Live in marketplace");
  expect(markup).toContain("Manage listing");
  expect(markup).toContain("16,500 MAD");
});

test("publication studio renders ordered marketplace editors and unpublished state", () => {
  const markup = renderToStaticMarkup(
    <PublicationStudio
      preview={{
        name: "Umrah Premium",
        type: "Umrah",
        departure: "2026-08-01",
        returnDate: "2026-08-12",
        duration: 12,
        transport: "Flight",
        route: "CMN - MED",
        startingPrice: 16500,
        packages: [],
      }}
      listing={{ status: "published" }}
      config={{
        included_services: ["Visa", "Hotel"],
        required_documents: ["Passport"],
        available_seats: 25,
      }}
      onConfigChange={() => {}}
      dirty
      unpublishedChanges
      lang="en"
      copy={{
        unnamedProgram: "Unnamed",
        typeDestination: "Type",
        departureDate: "Departure",
        returnDate: "Return",
        duration: "Duration",
        day: "days",
        transport: "Transport",
        publicRoute: "Route",
        unspecified: "Not specified",
        multipleByRoom: "Room prices",
        availableStartingPrice: "Starting price",
        missingPrice: "Price required",
        close: "Close",
        publishing: "Publishing",
        updatePublished: "Update published version",
        publish: "Publish",
      }}
      formatDate={(value) => value}
      action=""
      onClose={() => {}}
      onSave={() => {}}
      onPublish={() => {}}
    />
  );
  expect(markup).toContain("RUKN PUBLICATION STUDIO");
  expect(markup).toContain("Visa");
  expect(markup).toContain("Passport");
  expect(markup).toContain("Unpublished changes");
  expect(markup).toContain('value="25"');
});
