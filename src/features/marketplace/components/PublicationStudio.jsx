import React from "react";
import {
  ArrowDown,
  ArrowUp,
  BedDouble,
  CheckCircle2,
  FileText,
  ListChecks,
  PackageCheck,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "../../../components/UI";

const TEXT = {
  ar: {
    eyebrow: "RUKN PUBLICATION STUDIO",
    intro: "راجع بيانات البرنامج واضبط المعلومات الخاصة بظهوره في السوق.",
    program: "معلومات البرنامج",
    hotels: "الفنادق والأسعار",
    services: "الخدمات المشمولة",
    servicesHelp: "أضف ما تتضمنه الباقة بالترتيب الذي سيظهر للعملاء.",
    servicePlaceholder: "اكتب خدمة مشمولة",
    addService: "إضافة خدمة",
    documents: "الوثائق المطلوبة",
    documentsHelp: "وضّح الوثائق التي يحتاج العميل إلى تجهيزها.",
    documentPlaceholder: "اكتب وثيقة مطلوبة",
    addDocument: "إضافة وثيقة",
    seats: "المقاعد المتاحة",
    seatsHelp: "العدد الذي سيظهر للعملاء في السوق. اتركه فارغًا إذا لم ترد إظهاره.",
    seatsPlaceholder: "غير محدد",
    preview: "ملخص النشر",
    servicesCount: "الخدمات",
    documentsCount: "الوثائق",
    publicationStatus: "حالة النشر",
    ready: "جاهز للنشر",
    needsPrice: "ينقصه سعر صالح",
    unpublishedChanges: "تغييرات غير منشورة",
    saved: "الإعدادات محفوظة",
    noItems: "لم تتم إضافة عناصر بعد.",
    moveUp: "نقل إلى الأعلى",
    moveDown: "نقل إلى الأسفل",
    remove: "حذف",
    save: "حفظ الإعدادات",
    saving: "جاري الحفظ…",
  },
  fr: {
    eyebrow: "RUKN PUBLICATION STUDIO",
    intro: "Vérifiez le programme et configurez les informations propres au marché.",
    program: "Informations du programme",
    hotels: "Hôtels et tarifs",
    services: "Services inclus",
    servicesHelp: "Ajoutez les prestations dans leur ordre d’affichage public.",
    servicePlaceholder: "Saisir un service inclus",
    addService: "Ajouter un service",
    documents: "Documents requis",
    documentsHelp: "Indiquez les documents que le client doit préparer.",
    documentPlaceholder: "Saisir un document requis",
    addDocument: "Ajouter un document",
    seats: "Sièges disponibles",
    seatsHelp: "Nombre affiché aux clients. Laissez vide pour ne pas l’afficher.",
    seatsPlaceholder: "Non défini",
    preview: "Résumé de publication",
    servicesCount: "Services",
    documentsCount: "Documents",
    publicationStatus: "Publication",
    ready: "Prêt à publier",
    needsPrice: "Tarif valide requis",
    unpublishedChanges: "Modifications non publiées",
    saved: "Configuration enregistrée",
    noItems: "Aucun élément ajouté.",
    moveUp: "Monter",
    moveDown: "Descendre",
    remove: "Supprimer",
    save: "Enregistrer",
    saving: "Enregistrement…",
  },
  en: {
    eyebrow: "RUKN PUBLICATION STUDIO",
    intro: "Review the program and control its marketplace-specific information.",
    program: "Program information",
    hotels: "Hotels and pricing",
    services: "Included services",
    servicesHelp: "Add package inclusions in the order customers will see them.",
    servicePlaceholder: "Enter an included service",
    addService: "Add service",
    documents: "Required documents",
    documentsHelp: "Explain what customers need to prepare.",
    documentPlaceholder: "Enter a required document",
    addDocument: "Add document",
    seats: "Available seats",
    seatsHelp: "The number shown to customers. Leave blank if you prefer not to display it.",
    seatsPlaceholder: "Not specified",
    preview: "Publication summary",
    servicesCount: "Services",
    documentsCount: "Documents",
    publicationStatus: "Publication",
    ready: "Ready to publish",
    needsPrice: "Valid price required",
    unpublishedChanges: "Unpublished changes",
    saved: "Settings saved",
    noItems: "No items added yet.",
    moveUp: "Move up",
    moveDown: "Move down",
    remove: "Remove",
    save: "Save settings",
    saving: "Saving…",
  },
};

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="publication-studio__section">
      <div className="publication-studio__section-heading">
        <span className="publication-studio__section-icon"><Icon size={16} aria-hidden="true" /></span>
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      </div>
      <div className="publication-studio__section-body">{children}</div>
    </section>
  );
}

function OrderedListEditor({ items, onChange, placeholder, addLabel, emptyLabel, labels, disabled }) {
  const update = (index, value) => onChange(items.map((item, position) => (
    position === index ? value : item
  )));
  const add = () => {
    if (items.length < 20) onChange([...items, ""]);
  };
  const remove = (index) => onChange(items.filter((_, position) => position !== index));
  const move = (index, offset) => {
    const target = index + offset;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="publication-list-editor">
      {!items.length && <p className="publication-list-editor__empty">{emptyLabel}</p>}
      {items.map((item, index) => (
        <div className="publication-list-editor__row" key={index}>
          <span className="publication-list-editor__index">{index + 1}</span>
          <input
            value={item}
            maxLength={160}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(event) => update(index, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && index === items.length - 1 && item.trim()) {
                event.preventDefault();
                add();
              }
            }}
          />
          <div className="publication-list-editor__controls">
            <button type="button" disabled={disabled || index === 0} onClick={() => move(index, -1)} aria-label={labels.moveUp}>
              <ArrowUp size={14} />
            </button>
            <button type="button" disabled={disabled || index === items.length - 1} onClick={() => move(index, 1)} aria-label={labels.moveDown}>
              <ArrowDown size={14} />
            </button>
            <button type="button" disabled={disabled} onClick={() => remove(index)} aria-label={labels.remove} className="is-danger">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="publication-list-editor__add" onClick={add} disabled={disabled || items.length >= 20}>
        <Plus size={15} aria-hidden="true" />
        {addLabel}
      </button>
    </div>
  );
}

export default function PublicationStudio({
  preview,
  listing,
  config,
  onConfigChange,
  dirty,
  unpublishedChanges,
  lang,
  copy,
  formatDate,
  action,
  onClose,
  onSave,
  onPublish,
}) {
  const text = TEXT[lang] || TEXT.ar;
  const published = listing?.status === "published";
  const canPublish = Boolean(preview.startingPrice);
  const setField = (field, value) => onConfigChange({ ...config, [field]: value });

  return (
    <div className="publication-studio">
      <header className="publication-studio__intro">
        <span><Sparkles size={14} aria-hidden="true" />{text.eyebrow}</span>
        <p>{text.intro}</p>
      </header>

      <Section icon={FileText} title={text.program}>
        <div className="publication-studio__program">
          <h2>{preview.name || copy.unnamedProgram}</h2>
          <div className="marketplace-modal-meta">
            <ModalMeta label={copy.typeDestination} value={preview.type} />
            <ModalMeta label={copy.departureDate} value={formatDate(preview.departure, lang)} />
            <ModalMeta label={copy.returnDate} value={formatDate(preview.returnDate, lang)} />
            <ModalMeta label={copy.duration} value={preview.duration ? `${preview.duration} ${copy.day}` : "—"} />
            <ModalMeta label={copy.transport} value={preview.transport} />
            <ModalMeta label={copy.publicRoute} value={preview.route} />
          </div>
        </div>
      </Section>

      <Section icon={BedDouble} title={text.hotels}>
        <div className="publication-studio__packages">
          {preview.packages.map((pkg) => (
            <div className="publication-studio__package" key={pkg.id}>
              <strong>{pkg.level || copy.unspecified}</strong>
              <span>{pkg.hotelMecca || copy.unspecified}</span>
              <span>{pkg.hotelMadina || copy.unspecified}</span>
              <span>{Object.keys(pkg.prices).length ? copy.multipleByRoom : copy.unspecified}</span>
            </div>
          ))}
        </div>
        <div className={`publication-studio__price${canPublish ? "" : " is-danger"}`}>
          <span>{copy.availableStartingPrice}</span>
          <strong>{canPublish ? `${preview.startingPrice} MAD` : copy.unspecified}</strong>
          {!canPublish && <p>{copy.missingPrice}</p>}
        </div>
      </Section>

      <Section icon={PackageCheck} title={text.services} description={text.servicesHelp}>
        <OrderedListEditor
          items={config.included_services}
          onChange={(value) => setField("included_services", value)}
          placeholder={text.servicePlaceholder}
          addLabel={text.addService}
          emptyLabel={text.noItems}
          labels={text}
          disabled={Boolean(action)}
        />
      </Section>

      <Section icon={ListChecks} title={text.documents} description={text.documentsHelp}>
        <OrderedListEditor
          items={config.required_documents}
          onChange={(value) => setField("required_documents", value)}
          placeholder={text.documentPlaceholder}
          addLabel={text.addDocument}
          emptyLabel={text.noItems}
          labels={text}
          disabled={Boolean(action)}
        />
      </Section>

      <Section icon={Users} title={text.seats} description={text.seatsHelp}>
        <input
          className="publication-studio__seats"
          type="number"
          inputMode="numeric"
          min="0"
          max="100000"
          step="1"
          value={config.available_seats ?? ""}
          placeholder={text.seatsPlaceholder}
          disabled={Boolean(action)}
          onChange={(event) => setField("available_seats", event.target.value)}
        />
      </Section>

      <Section icon={CheckCircle2} title={text.preview}>
        <div className="publication-studio__summary">
          <Summary label={copy.availableStartingPrice} value={canPublish ? `${preview.startingPrice} MAD` : "—"} />
          <Summary label={text.seats} value={config.available_seats === "" || config.available_seats == null ? copy.unspecified : config.available_seats} />
          <Summary label={text.servicesCount} value={config.included_services.filter((item) => item.trim()).length} />
          <Summary label={text.documentsCount} value={config.required_documents.filter((item) => item.trim()).length} />
          <Summary label={text.publicationStatus} value={canPublish ? text.ready : text.needsPrice} />
        </div>
        {published && (
          <p className={`publication-studio__change-state${unpublishedChanges ? " is-dirty" : ""}`}>
            {unpublishedChanges ? text.unpublishedChanges : text.saved}
          </p>
        )}
      </Section>

      <footer className="publication-studio__actions">
        <Button variant="ghost" onClick={onClose}>{copy.close}</Button>
        <Button variant="ghost" disabled={Boolean(action) || !dirty} onClick={onSave}>
          {action === "save" ? text.saving : text.save}
        </Button>
        <Button disabled={Boolean(action) || !canPublish || dirty} onClick={onPublish}>
          {action === "publish"
            ? copy.publishing
            : published
              ? copy.updatePublished
              : copy.publish}
        </Button>
      </footer>
    </div>
  );
}

function ModalMeta({ label, value }) {
  return <div><small>{label}</small><strong>{value || "—"}</strong></div>;
}

function Summary({ label, value }) {
  return <div><small>{label}</small><strong>{value}</strong></div>;
}
