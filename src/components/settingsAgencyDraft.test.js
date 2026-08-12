import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { areAgencyDraftsEqual, useAgencySettingsDraft } from "./settingsAgencyDraft";

const agency = (id, overrides = {}) => ({
  id,
  agencyId: id,
  nameAr: "وكالة",
  rc: "100",
  addressTiznit: "عنوان محفوظ",
  addressAgadir: "عنوان إضافي محفوظ",
  logoPath: "old-logo.png",
  logoUrl: "old-logo-url",
  ...overrides,
});

const Harness = React.forwardRef(function Harness({ value, agencyId }, ref) {
  const draft = useAgencySettingsDraft(value, agencyId);
  React.useImperativeHandle(ref, () => draft, [draft]);
  return (
    <div>
      <span data-form>{JSON.stringify(draft.form)}</span>
      <span data-dirty>{String(draft.isDirty)}</span>
      <span data-conflict>{String(draft.hasServerConflict)}</span>
    </div>
  );
});

describe("agency settings draft lifecycle", () => {
  let host;
  let root;
  let api;

  const render = async (value, agencyId = value.id) => {
    await act(async () => root.render(<Harness ref={api} value={value} agencyId={agencyId} />));
  };

  const edit = async (patch) => {
    await act(async () => api.current.setForm((current) => ({ ...current, ...patch })));
  };

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    api = React.createRef();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    jest.useRealTimers();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  });

  test("RC and address draft survives a refresh after more than 60 seconds", async () => {
    const original = agency("agency-a");
    await render(original);
    await edit({ rc: "123456789", addressTiznit: "مسودة العنوان" });
    await act(async () => jest.advanceTimersByTime(61000));
    await render({ ...original });
    expect(api.current.form.rc).toBe("123456789");
    expect(api.current.form.addressTiznit).toBe("مسودة العنوان");
    expect(api.current.isDirty).toBe(true);
  });

  test("same-agency server object and realtime update preserve dirty draft and set conflict", async () => {
    const original = agency("agency-a");
    await render(original);
    await edit({ rc: "draft-rc" });
    await render({ ...original, rc: "server-rc", addressAgadir: "server-change" });
    expect(api.current.form.rc).toBe("draft-rc");
    expect(api.current.form.addressAgadir).toBe(original.addressAgadir);
    expect(api.current.hasServerConflict).toBe(true);
  });

  test("clean same-agency form accepts a newer server snapshot", async () => {
    await render(agency("agency-a"));
    await render(agency("agency-a", { rc: "server-new", addressTiznit: "server-address" }));
    expect(api.current.form.rc).toBe("server-new");
    expect(api.current.form.addressTiznit).toBe("server-address");
    expect(api.current.isDirty).toBe(false);
  });

  test("agency switch discards old draft and clears conflict/revision state", async () => {
    await render(agency("agency-a"));
    await edit({ rc: "agency-a-draft" });
    await render(agency("agency-a", { rc: "remote" }));
    expect(api.current.hasServerConflict).toBe(true);
    await render(agency("agency-b", { rc: "agency-b-rc", addressTiznit: "agency-b-address" }), "agency-b");
    expect(api.current.form.rc).toBe("agency-b-rc");
    expect(api.current.form.addressTiznit).toBe("agency-b-address");
    expect(api.current.isDirty).toBe(false);
    expect(api.current.hasServerConflict).toBe(false);
  });

  test("successful save with no newer edits adopts canonical response and becomes clean", async () => {
    await render(agency("agency-a"));
    await edit({ rc: "saved-rc" });
    const save = api.current.beginSave();
    await act(async () => api.current.completeSave({ ...save.draft, rc: "canonical-rc" }, save.revision));
    expect(api.current.form.rc).toBe("canonical-rc");
    expect(api.current.isDirty).toBe(false);
  });

  test("delayed save response never overwrites edits made after save started", async () => {
    await render(agency("agency-a"));
    await edit({ rc: "value-sent" });
    const save = api.current.beginSave();
    await edit({ rc: "newer-local-value", addressTiznit: "newer-address" });
    await act(async () => api.current.completeSave(save.draft, save.revision, save.hadServerConflict));
    expect(api.current.form.rc).toBe("newer-local-value");
    expect(api.current.form.addressTiznit).toBe("newer-address");
    expect(api.current.isDirty).toBe(true);
  });

  test("save or profile refresh failure leaves the draft untouched", async () => {
    await render(agency("agency-a"));
    await edit({ rc: "unsaved", addressTiznit: "unsaved-address" });
    const beforeFailure = api.current.form;
    await act(async () => Promise.resolve());
    expect(api.current.form).toEqual(beforeFailure);
    expect(api.current.isDirty).toBe(true);
  });

  test("uploading logo while dirty preserves every non-logo draft field", async () => {
    await render(agency("agency-a"));
    await edit({ rc: "draft", addressTiznit: "draft-address" });
    const canonical = agency("agency-a", { logoPath: "new-logo.png", logoUrl: "new-logo-url" });
    await act(async () => api.current.applySavedFields({ logoPath: "new-logo.png", logoUrl: "new-logo-url" }, canonical));
    await render(canonical);
    expect(api.current.form).toMatchObject({
      rc: "draft",
      addressTiznit: "draft-address",
      logoPath: "new-logo.png",
      logoUrl: "new-logo-url",
    });
    expect(api.current.isDirty).toBe(true);
    expect(api.current.hasServerConflict).toBe(false);
  });

  test("removing logo while dirty preserves every non-logo draft field", async () => {
    await render(agency("agency-a"));
    await edit({ rc: "draft", addressAgadir: "draft-extra-address" });
    await act(async () => api.current.applySavedFields({ logoPath: "", logoUrl: "" }));
    expect(api.current.form).toMatchObject({ rc: "draft", addressAgadir: "draft-extra-address", logoPath: "", logoUrl: "" });
    expect(api.current.isDirty).toBe(true);
  });

  test("undefined, null, and blank values do not create false dirty state", async () => {
    expect(areAgencyDraftsEqual({ rc: undefined }, { rc: "" })).toBe(true);
    expect(areAgencyDraftsEqual({ addressTiznit: null }, { addressTiznit: "" })).toBe(true);
    await render(agency("agency-a", { rc: undefined }));
    await edit({ rc: "" });
    expect(api.current.isDirty).toBe(false);
  });

  test("normal edit-save-refresh flow remains clean and accepts later server updates", async () => {
    await render(agency("agency-a"));
    await edit({ rc: "saved" });
    const save = api.current.beginSave();
    await act(async () => api.current.completeSave(save.draft, save.revision));
    await render(agency("agency-a", { ...save.draft, city: "مدينة محدثة" }));
    expect(api.current.form.city).toBe("مدينة محدثة");
    expect(api.current.isDirty).toBe(false);
    expect(api.current.hasServerConflict).toBe(false);
  });

  test("same-agency refresh preserves a dirty branding draft", async () => {
    const original = agency("agency-a", { documentBranding:{ documents:{ invoice:{ enabled:false, style:"minimal" } } } });
    await render(original);
    await edit({ documentBranding:{ documents:{ invoice:{ enabled:true, style:"modern", colorMode:"manual", brandColor:"#123456" } } } });
    await render({ ...original, documentBranding:{ ...original.documentBranding } });
    expect(api.current.form.documentBranding.documents.invoice).toMatchObject({ enabled:true, style:"modern", brandColor:"#123456" });
  });

  test("agency switch hydrates the new agency branding", async () => {
    await render(agency("agency-a", { documentBranding:{ enabled:true, style:"modern" } }));
    await edit({ documentBranding:{ enabled:true, style:"formal", colorMode:"manual", brandColor:"#111111" } });
    await render(agency("agency-b", { documentBranding:{ enabled:false, style:"minimal", colorMode:"auto", brandColor:"#0f766e" } }), "agency-b");
    expect(api.current.form.documentBranding).toMatchObject({ enabled:false, style:"minimal" });
    expect(api.current.isDirty).toBe(false);
  });

  test("editing the Arabic address does not erase the French address",async()=>{await render(agency("agency-a",{addressPrimaryAr:"قديم",addressPrimaryFr:"Adresse conservée"}));await edit({addressPrimaryAr:"عنوان جديد"});expect(api.current.form.addressPrimaryAr).toBe("عنوان جديد");expect(api.current.form.addressPrimaryFr).toBe("Adresse conservée");});
  test("Arabic and Latin address drafts remain independent",async()=>{await render(agency("agency-a",{addressPrimaryAr:"قديم",addressPrimaryLatin:"Latin kept"}));await edit({addressPrimaryAr:"عنوان جديد"});expect(api.current.form.addressPrimaryLatin).toBe("Latin kept");await edit({addressPrimaryLatin:"New Latin"});expect(api.current.form.addressPrimaryAr).toBe("عنوان جديد");});
});
