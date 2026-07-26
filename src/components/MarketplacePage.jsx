import React from "react";
import {
  AlertTriangle,
  FolderKanban,
  Plane,
  Store,
  Ticket,
} from "lucide-react";
import { Modal } from "./UI";
import { getLocalizedAgencyName } from "../utils/agencyDisplay";
import { useLang } from "../hooks/useLang";
import {
  getAgencyMarketplacePrograms,
  getMarketplaceListingCounts,
  getMarketplaceProgramPreview,
} from "../features/marketplace/marketplacePresentation";
import {
  fetchMarketplaceListings,
  hideMarketplaceListing,
  publishMarketplaceListing,
  saveMarketplaceListingConfig,
} from "../features/marketplace/marketplaceService";
import {
  MarketplaceHero,
  MarketplaceInlineState,
  MarketplaceMetric,
  MarketplaceModuleCard,
  MarketplaceProgramRow,
  MarketplaceSkeleton,
  MarketplaceTabs,
  MarketplaceToolbar,
} from "../features/marketplace/components/MarketplaceHub";
import PublicationStudio from "../features/marketplace/components/PublicationStudio";

const COPY = {
  ar: {
    marketplace: "السوق",
    heroLead: "مركز أعمال وكالتك داخل منظومة ركن",
    heroDescription: "أدر ظهور وكالتك، انشر برامجك، واستعد للوصول إلى أسواق ركن المتخصصة من مكان واحد.",
    marketEnabled: "السوق مفعّل",
    marketNavigation: "التنقل داخل السوق",
    overview: "نظرة عامة",
    programs: "البرامج",
    seatMarket: "سوق المقاعد",
    soon: "قريبًا",
    performance: "ملخص السوق",
    performanceSub: "قراءة سريعة لحالة برامج الوكالة في السوق.",
    publishedPrograms: "البرامج المنشورة",
    drafts: "المسودات",
    hiddenPrograms: "البرامج المخفية",
    totalPrograms: "إجمالي برامج الوكالة",
    liveHint: "مباشرة للعملاء",
    draftHint: "تنتظر استكمال النشر",
    hiddenHint: "غير ظاهرة للعامة",
    totalHint: "من بيانات ركن الحالية",
    ruknMarkets: "أسواق ركن",
    marketsSub: "وحدات تجارية قابلة للتوسع ضمن مركز السوق.",
    travelPrograms: "برامج السفر",
    travelProgramsDescription: "نشر برامج العمرة والحج والرحلات وإدارتها على منصة ركن العامة.",
    available: "متاح",
    managePrograms: "إدارة البرامج",
    seatMarketDescription: "سوق B2B مخصص لعرض وتبادل المقاعد بين وكالات ركن.",
    unavailableNow: "سيكون متاحًا في إصدار لاحق",
    agencyPrograms: "برامج الوكالة",
    programsSub: "ابحث، راجع حالة السوق، وانتقل إلى إعداد النشر.",
    searchPrograms: "ابحث باسم البرنامج…",
    filterStatus: "تصفية حسب حالة السوق",
    results: "نتيجة",
    filters: {
      all: "كل الحالات",
      published: "منشور",
      draft: "مسودة",
      unpublished: "غير منشور",
      hidden: "مخفي",
    },
    statuses: {
      published: "منشور",
      draft: "مسودة",
      unpublished: "غير منشور",
      hidden: "مخفي",
    },
    actions: {
      published: "إدارة المنشور",
      draft: "متابعة الإعداد",
      unpublished: "إعداد للنشر",
      hidden: "إدارة",
    },
    liveInMarket: "مباشر في السوق",
    travelDate: "تاريخ السفر",
    duration: "المدة",
    day: "يوم",
    internalStatus: "حالة ركن",
    active: "نشط",
    archived: "مؤرشف",
    startingPrice: "السعر الابتدائي",
    moreActions: "إجراءات إضافية",
    hideFromMarket: "إخفاء من السوق",
    hiding: "جاري الإخفاء…",
    unnamedProgram: "برنامج دون اسم",
    noPrograms: "لا توجد برامج جاهزة للسوق بعد",
    noProgramsDescription: "أضف برنامجًا في ركن ليظهر هنا ويمكن تجهيزه للنشر.",
    noResults: "لا توجد نتائج مطابقة",
    noResultsDescription: "جرّب تغيير عبارة البحث أو حالة التصفية.",
    loadError: "تعذر تحميل بيانات السوق",
    loadErrorDescription: "تحقق من الاتصال ثم حاول مجددًا.",
    retry: "إعادة المحاولة",
    featureOff: "السوق غير مفعّل لهذه الوكالة",
    featureOffDescription: "تحتاج هذه الميزة إلى تفعيلها قبل استعمال مركز السوق.",
    preparingMarket: "جاري تجهيز مركز السوق…",
    publishSetup: "إعداد نشر البرنامج",
    snapshotDescription: "معاينة للبيانات العامة التي ستُحفظ كنسخة مستقلة. تعديل البرنامج الداخلي لا يغيّر النسخة المنشورة دون إعادة نشر.",
    typeDestination: "النوع / الوجهة",
    departureDate: "تاريخ الذهاب",
    returnDate: "تاريخ العودة",
    transport: "النقل",
    publicRoute: "المسار العام",
    hotelsPrices: "الفنادق والأسعار العامة",
    meccaHotel: "فندق مكة",
    madinahHotel: "فندق المدينة",
    mealPlan: "نظام الوجبات",
    roomPrices: "أسعار الغرف",
    multipleByRoom: "متعددة حسب نوع الغرفة",
    unspecified: "غير محدد",
    availableStartingPrice: "السعر الابتدائي المتاح",
    missingPrice: "أضف سعر غرفة عام صالحًا إلى البرنامج قبل النشر النهائي.",
    close: "إغلاق",
    saveDraft: "متابعة إعداد النشر",
    savingDraft: "جاري حفظ المسودة…",
    publish: "نشر في السوق",
    publishing: "جاري النشر…",
    updatePublished: "تحديث النسخة المنشورة",
  },
  fr: {
    marketplace: "Marché",
    heroLead: "Le centre d’affaires de votre agence dans l’écosystème Rukn",
    heroDescription: "Gérez votre présence, publiez vos programmes et accédez bientôt aux marchés spécialisés Rukn.",
    marketEnabled: "Marché activé",
    marketNavigation: "Navigation du marché",
    overview: "Aperçu",
    programs: "Programmes",
    seatMarket: "Marché des sièges",
    soon: "Bientôt",
    performance: "Résumé du marché",
    performanceSub: "Vue rapide de la présence de vos programmes.",
    publishedPrograms: "Programmes publiés",
    drafts: "Brouillons",
    hiddenPrograms: "Programmes masqués",
    totalPrograms: "Total des programmes",
    liveHint: "Visibles aux clients",
    draftHint: "À finaliser",
    hiddenHint: "Non publics",
    totalHint: "Données Rukn actuelles",
    ruknMarkets: "Marchés Rukn",
    marketsSub: "Des modules commerciaux conçus pour évoluer.",
    travelPrograms: "Programmes de voyage",
    travelProgramsDescription: "Publiez et gérez Omra, Hajj et voyages sur la plateforme publique Rukn.",
    available: "Disponible",
    managePrograms: "Gérer les programmes",
    seatMarketDescription: "Un marché B2B pour proposer et échanger des sièges entre agences Rukn.",
    unavailableNow: "Disponible dans une prochaine version",
    agencyPrograms: "Programmes de l’agence",
    programsSub: "Recherchez, vérifiez le statut et préparez la publication.",
    searchPrograms: "Rechercher un programme…",
    filterStatus: "Filtrer par statut",
    results: "résultat(s)",
    filters: { all: "Tous", published: "Publié", draft: "Brouillon", unpublished: "Non publié", hidden: "Masqué" },
    statuses: { published: "Publié", draft: "Brouillon", unpublished: "Non publié", hidden: "Masqué" },
    actions: { published: "Gérer la publication", draft: "Continuer", unpublished: "Préparer", hidden: "Gérer" },
    liveInMarket: "En ligne",
    travelDate: "Départ",
    duration: "Durée",
    day: "jour(s)",
    internalStatus: "Statut Rukn",
    active: "Actif",
    archived: "Archivé",
    startingPrice: "À partir de",
    moreActions: "Plus d’actions",
    hideFromMarket: "Masquer du marché",
    hiding: "Masquage…",
    unnamedProgram: "Programme sans nom",
    noPrograms: "Aucun programme prêt pour le marché",
    noProgramsDescription: "Ajoutez un programme dans Rukn pour le préparer à la publication.",
    noResults: "Aucun résultat",
    noResultsDescription: "Modifiez la recherche ou le filtre.",
    loadError: "Impossible de charger le marché",
    loadErrorDescription: "Vérifiez la connexion puis réessayez.",
    retry: "Réessayer",
    featureOff: "Le marché n’est pas activé pour cette agence",
    featureOffDescription: "Cette fonctionnalité doit être activée avant utilisation.",
    preparingMarket: "Préparation du marché…",
    publishSetup: "Préparer la publication",
    snapshotDescription: "Aperçu des données publiques indépendantes. Une modification interne ne change pas la version publiée sans republication.",
    typeDestination: "Type / destination",
    departureDate: "Départ",
    returnDate: "Retour",
    transport: "Transport",
    publicRoute: "Itinéraire public",
    hotelsPrices: "Hôtels et tarifs publics",
    meccaHotel: "Hôtel à La Mecque",
    madinahHotel: "Hôtel à Médine",
    mealPlan: "Repas",
    roomPrices: "Tarifs chambres",
    multipleByRoom: "Selon le type de chambre",
    unspecified: "Non défini",
    availableStartingPrice: "Tarif de départ disponible",
    missingPrice: "Ajoutez un tarif public valide avant de publier.",
    close: "Fermer",
    saveDraft: "Enregistrer le brouillon",
    savingDraft: "Enregistrement…",
    publish: "Publier",
    publishing: "Publication…",
    updatePublished: "Mettre à jour",
  },
  en: {
    marketplace: "Marketplace",
    heroLead: "Your agency’s business hub inside the Rukn ecosystem",
    heroDescription: "Manage your presence, publish programs, and access Rukn’s specialized markets from one place.",
    marketEnabled: "Marketplace enabled",
    marketNavigation: "Marketplace navigation",
    overview: "Overview",
    programs: "Programs",
    seatMarket: "Seat exchange",
    soon: "Coming soon",
    performance: "Marketplace summary",
    performanceSub: "A quick view of your program presence.",
    publishedPrograms: "Published programs",
    drafts: "Drafts",
    hiddenPrograms: "Hidden programs",
    totalPrograms: "Total agency programs",
    liveHint: "Visible to customers",
    draftHint: "Awaiting completion",
    hiddenHint: "Not public",
    totalHint: "Current Rukn data",
    ruknMarkets: "Rukn markets",
    marketsSub: "Business modules designed to grow with your agency.",
    travelPrograms: "Travel programs",
    travelProgramsDescription: "Publish and manage Umrah, Hajj, and travel programs on Rukn’s public platform.",
    available: "Available",
    managePrograms: "Manage programs",
    seatMarketDescription: "A B2B market for offering and exchanging seats between Rukn agencies.",
    unavailableNow: "Available in a future release",
    agencyPrograms: "Agency programs",
    programsSub: "Search, review marketplace status, and prepare publication.",
    searchPrograms: "Search programs…",
    filterStatus: "Filter by marketplace status",
    results: "result(s)",
    filters: { all: "All statuses", published: "Published", draft: "Draft", unpublished: "Unpublished", hidden: "Hidden" },
    statuses: { published: "Published", draft: "Draft", unpublished: "Unpublished", hidden: "Hidden" },
    actions: { published: "Manage listing", draft: "Continue setup", unpublished: "Prepare to publish", hidden: "Manage" },
    liveInMarket: "Live in marketplace",
    travelDate: "Travel date",
    duration: "Duration",
    day: "day(s)",
    internalStatus: "Rukn status",
    active: "Active",
    archived: "Archived",
    startingPrice: "Starting price",
    moreActions: "More actions",
    hideFromMarket: "Hide from marketplace",
    hiding: "Hiding…",
    unnamedProgram: "Unnamed program",
    noPrograms: "No programs ready for marketplace yet",
    noProgramsDescription: "Add a program in Rukn to prepare it for publishing.",
    noResults: "No matching programs",
    noResultsDescription: "Try changing the search or status filter.",
    loadError: "Marketplace data could not be loaded",
    loadErrorDescription: "Check your connection and try again.",
    retry: "Try again",
    featureOff: "Marketplace is not enabled for this agency",
    featureOffDescription: "This feature must be enabled before using the marketplace hub.",
    preparingMarket: "Preparing marketplace hub…",
    publishSetup: "Program publishing setup",
    snapshotDescription: "Preview of the independent public snapshot. Internal edits do not change the published version without republishing.",
    typeDestination: "Type / destination",
    departureDate: "Departure",
    returnDate: "Return",
    transport: "Transport",
    publicRoute: "Public route",
    hotelsPrices: "Hotels and public prices",
    meccaHotel: "Makkah hotel",
    madinahHotel: "Madinah hotel",
    mealPlan: "Meal plan",
    roomPrices: "Room prices",
    multipleByRoom: "Varies by room type",
    unspecified: "Not specified",
    availableStartingPrice: "Available starting price",
    missingPrice: "Add a valid public room price before publishing.",
    close: "Close",
    saveDraft: "Save publishing draft",
    savingDraft: "Saving draft…",
    publish: "Publish",
    publishing: "Publishing…",
    updatePublished: "Update published version",
  },
};

const formatDate = (value, lang) => {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(
    lang === "fr" ? "fr-MA" : lang === "en" ? "en-GB" : "ar-MA",
    { year: "numeric", month: "short", day: "numeric" }
  ).format(date);
};

const listingStatus = (listing) => (
  ["published", "draft", "hidden"].includes(listing?.status)
    ? listing.status
    : "unpublished"
);

const marketplaceErrorMessage = (error) => {
  const message = String(error?.message || "");
  if (message.includes("marketplace_valid_price_required")) return "لا يمكن النشر دون سعر عام صالح.";
  if (message.includes("marketplace_access_required")) return "السوق غير مفعّل لهذه الوكالة.";
  if (message.includes("marketplace_draft_required")) return "يجب حفظ مسودة السوق أولًا.";
  if (message.includes("marketplace_program_not_found")) return "البرنامج غير موجود أو لا يتبع الوكالة الحالية.";
  if (message.includes("marketplace_backend_unavailable")) return "خدمة السوق غير متاحة في الوضع المحلي.";
  return "تعذر إكمال العملية. تحقق من الاتصال وتطبيق Migration السوق.";
};

const EMPTY_MARKETPLACE_CONFIG = {
  included_services: [],
  required_documents: [],
  available_seats: null,
};

const editableMarketplaceConfig = (listing) => ({
  included_services: [...(listing?.marketplaceConfig?.included_services || [])],
  required_documents: [...(listing?.marketplaceConfig?.required_documents || [])],
  available_seats: listing?.marketplaceConfig?.available_seats ?? null,
});

const listingHasUnpublishedConfig = (listing) => {
  if (listing?.status !== "published") return false;
  const config = editableMarketplaceConfig(listing);
  const published = {
    included_services: Array.isArray(listing.publicData?.included_services)
      ? listing.publicData.included_services
      : [],
    required_documents: Array.isArray(listing.publicData?.required_documents)
      ? listing.publicData.required_documents
      : [],
    available_seats: listing.publicData?.available_seats ?? null,
  };
  return JSON.stringify(config) !== JSON.stringify(published);
};

export default function MarketplacePage({ store, feature, onToast }) {
  const { lang } = useLang();
  const copy = COPY[lang] || COPY.ar;
  const [activeTab, setActiveTab] = React.useState("overview");
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selectedProgram, setSelectedProgram] = React.useState(null);
  const [listings, setListings] = React.useState([]);
  const [listingsLoading, setListingsLoading] = React.useState(false);
  const [listingsError, setListingsError] = React.useState("");
  const [action, setAction] = React.useState("");
  const [studioConfig, setStudioConfig] = React.useState(EMPTY_MARKETPLACE_CONFIG);
  const [configDirty, setConfigDirty] = React.useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = React.useState(false);

  const programs = React.useMemo(
    () => getAgencyMarketplacePrograms(store.programs, store.agencyId),
    [store.agencyId, store.programs]
  );
  const listingsByProgram = React.useMemo(() => {
    const map = new Map();
    listings.forEach((listing) => map.set(String(listing.programId), listing));
    return map;
  }, [listings]);
  const counts = React.useMemo(
    () => getMarketplaceListingCounts(listings),
    [listings]
  );
  const preview = React.useMemo(
    () => selectedProgram ? getMarketplaceProgramPreview(selectedProgram) : null,
    [selectedProgram]
  );
  const selectedListing = selectedProgram
    ? listingsByProgram.get(String(selectedProgram.id)) || null
    : null;
  const filteredPrograms = React.useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return programs.filter((program) => {
      const status = listingStatus(listingsByProgram.get(String(program.id)));
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesQuery = !normalizedQuery
        || String(program.name || "").toLocaleLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [listingsByProgram, programs, query, statusFilter]);

  const loadListings = React.useCallback(async () => {
    if (!feature.enabled || !store.agencyId) return;
    setListingsLoading(true);
    const result = await fetchMarketplaceListings(store.agencyId);
    setListingsLoading(false);
    if (result.error) {
      setListingsError(marketplaceErrorMessage(result.error));
      return;
    }
    setListingsError("");
    setListings(result.data || []);
  }, [feature.enabled, store.agencyId]);

  React.useEffect(() => {
    loadListings();
  }, [loadListings]);

  const replaceListing = React.useCallback((listing) => {
    if (!listing) return;
    setListings((current) => [
      listing,
      ...current.filter((item) => item.id !== listing.id),
    ]);
  }, []);
  const handleOpenProgram = React.useCallback((program) => {
    const listing = listingsByProgram.get(String(program.id));
    setStudioConfig(editableMarketplaceConfig(listing));
    setConfigDirty(!listing);
    setHasUnpublishedChanges(listingHasUnpublishedConfig(listing));
    setSelectedProgram(program);
  }, [listingsByProgram]);

  const handleConfigChange = React.useCallback((nextConfig) => {
    setStudioConfig(nextConfig);
    setConfigDirty(true);
    if (selectedListing?.status === "published") setHasUnpublishedChanges(true);
  }, [selectedListing?.status]);

  const handleSaveConfig = async () => {
    if (!selectedProgram?.id || action) return;
    const availableSeats = studioConfig.available_seats;
    if (
      availableSeats !== null
      && availableSeats !== ""
      && (!Number.isInteger(Number(availableSeats))
        || Number(availableSeats) < 0
        || Number(availableSeats) > 100000)
    ) {
      onToast?.("أدخل عدد مقاعد صحيحًا بين 0 و100000.", "error");
      return;
    }
    const cleanConfig = {
      included_services: studioConfig.included_services
        .map((item) => item.trim())
        .filter(Boolean),
      required_documents: studioConfig.required_documents
        .map((item) => item.trim())
        .filter(Boolean),
      available_seats: availableSeats === null || availableSeats === ""
        ? null
        : Number(availableSeats),
    };
    setAction("save");
    const result = await saveMarketplaceListingConfig(selectedProgram.id, cleanConfig);
    setAction("");
    if (result.error) {
      onToast?.(marketplaceErrorMessage(result.error), "error");
      return;
    }
    replaceListing(result.data);
    setStudioConfig(editableMarketplaceConfig(result.data));
    setConfigDirty(false);
    setHasUnpublishedChanges(result.data?.status === "published");
    onToast?.("تم حفظ إعدادات السوق دون تغيير النسخة العامة المنشورة.", "success");
  };

  const handlePublish = async () => {
    if (!selectedProgram?.id || action) return;
    if (!preview?.startingPrice) {
      onToast?.(copy.missingPrice, "error");
      return;
    }
    setAction("publish");
    const result = await publishMarketplaceListing(selectedProgram.id);
    setAction("");
    if (result.error) {
      onToast?.(marketplaceErrorMessage(result.error), "error");
      return;
    }
    replaceListing(result.data);
    setConfigDirty(false);
    setHasUnpublishedChanges(false);
    setSelectedProgram(null);
    onToast?.(
      selectedListing?.status === "published"
        ? "تم تحديث النسخة المنشورة."
        : "تم نشر البرنامج في السوق.",
      "success"
    );
  };

  const handleHide = React.useCallback(async (program) => {
    if (!program?.id) return;
    setAction(`hide:${program.id}`);
    const result = await hideMarketplaceListing(program.id);
    setAction("");
    if (result.error) {
      onToast?.(marketplaceErrorMessage(result.error), "error");
      return;
    }
    replaceListing(result.data);
    onToast?.("تم إخفاء البرنامج من السوق.", "success");
  }, [onToast, replaceListing]);

  if (feature.loading) {
    return (
      <div className="marketplace-hub">
        <MarketplaceInlineState
          icon={Store}
          title={copy.preparingMarket}
          description={copy.heroDescription}
        />
        <MarketplaceSkeleton />
      </div>
    );
  }

  if (!feature.enabled) {
    return (
      <div className="marketplace-hub">
        <MarketplaceInlineState
          icon={Store}
          title={copy.featureOff}
          description={copy.featureOffDescription}
        />
      </div>
    );
  }

  const agencyName = getLocalizedAgencyName(store.agency, lang, "الوكالة الحالية");

  return (
    <div className="marketplace-hub">
      <MarketplaceHero agencyName={agencyName} copy={copy} />
      <MarketplaceTabs activeTab={activeTab} onChange={setActiveTab} copy={copy} />

      {activeTab === "overview" && (
        <>
          <section className="marketplace-section" aria-labelledby="marketplace-overview-title">
            <div className="marketplace-section__header">
              <div>
                <h2 id="marketplace-overview-title">{copy.performance}</h2>
                <p>{copy.performanceSub}</p>
              </div>
            </div>
            {listingsLoading ? (
              <MarketplaceSkeleton />
            ) : listingsError ? (
              <MarketplaceInlineState
                icon={AlertTriangle}
                title={copy.loadError}
                description={copy.loadErrorDescription}
                actionLabel={copy.retry}
                onAction={loadListings}
                danger
              />
            ) : (
              <div className="marketplace-metrics">
                <MarketplaceMetric kind="published" value={counts.published} label={copy.publishedPrograms} hint={copy.liveHint} />
                <MarketplaceMetric kind="draft" value={counts.draft} label={copy.drafts} hint={copy.draftHint} />
                <MarketplaceMetric kind="hidden" value={counts.hidden} label={copy.hiddenPrograms} hint={copy.hiddenHint} />
                <MarketplaceMetric kind="total" value={programs.length} label={copy.totalPrograms} hint={copy.totalHint} />
              </div>
            )}
          </section>

          <section className="marketplace-section" aria-labelledby="marketplace-modules-title">
            <div className="marketplace-section__header">
              <div>
                <h2 id="marketplace-modules-title">{copy.ruknMarkets}</h2>
                <p>{copy.marketsSub}</p>
              </div>
            </div>
            <div className="marketplace-modules">
              <MarketplaceModuleCard
                icon={Plane}
                title={copy.travelPrograms}
                description={copy.travelProgramsDescription}
                badge={copy.available}
                actionLabel={copy.managePrograms}
                onAction={() => setActiveTab("programs")}
                available
              />
              <MarketplaceModuleCard
                icon={Ticket}
                title={copy.seatMarket}
                description={copy.seatMarketDescription}
                badge={copy.soon}
                actionLabel={copy.unavailableNow}
                disabled
              />
            </div>
          </section>
        </>
      )}

      {activeTab === "programs" && (
        <section className="marketplace-section" aria-labelledby="marketplace-programs-title">
          <div className="marketplace-section__header">
            <div>
              <h2 id="marketplace-programs-title">{copy.agencyPrograms}</h2>
              <p>{copy.programsSub}</p>
            </div>
          </div>
          <div className="marketplace-programs-panel">
            <MarketplaceToolbar
              query={query}
              onQueryChange={setQuery}
              filter={statusFilter}
              onFilterChange={setStatusFilter}
              resultCount={filteredPrograms.length}
              copy={copy}
            />
            {listingsLoading ? (
              <MarketplaceSkeleton />
            ) : listingsError ? (
              <MarketplaceInlineState
                icon={AlertTriangle}
                title={copy.loadError}
                description={copy.loadErrorDescription}
                actionLabel={copy.retry}
                onAction={loadListings}
                danger
              />
            ) : !programs.length ? (
              <MarketplaceInlineState
                icon={FolderKanban}
                title={copy.noPrograms}
                description={copy.noProgramsDescription}
              />
            ) : !filteredPrograms.length ? (
              <MarketplaceInlineState
                icon={FolderKanban}
                title={copy.noResults}
                description={copy.noResultsDescription}
              />
            ) : (
              <div className="marketplace-program-list">
                {filteredPrograms.map((program) => {
                  const listing = listingsByProgram.get(String(program.id));
                  const status = listingStatus(listing);
                  return (
                    <MarketplaceProgramRow
                      key={program.id}
                      program={program}
                      listing={listing}
                      status={status}
                      copy={copy}
                      lang={lang}
                      formattedDate={formatDate(program.departure, lang)}
                      busy={action === `hide:${program.id}`}
                      onOpen={handleOpenProgram}
                      onHide={handleHide}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      <Modal
        open={Boolean(selectedProgram)}
        onClose={() => setSelectedProgram(null)}
        title={copy.publishSetup}
        width={980}
      >
        {preview && (
          <PublicationStudio
            preview={preview}
            listing={selectedListing}
            config={studioConfig}
            onConfigChange={handleConfigChange}
            dirty={configDirty}
            unpublishedChanges={hasUnpublishedChanges}
            lang={lang}
            copy={copy}
            formatDate={formatDate}
            action={action}
            onClose={() => setSelectedProgram(null)}
            onSave={handleSaveConfig}
            onPublish={handlePublish}
          />
        )}
      </Modal>
    </div>
  );
}
