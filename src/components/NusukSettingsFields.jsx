import React from "react";
import { Button, Input, Modal } from "./UI";

export const NUSUK_SETTINGS_MODAL_TITLE = "إعدادات الرفع إلى نسك";
export const NUSUK_SETTINGS_MODAL_DESCRIPTION = "هذه البيانات ستستعملها إضافة مساعد ركن لنسك تلقائيا عند إدخال المعتمرين في منصة نسك. يمكنك تعديلها لاحقا من الإعدادات.";
export const NUSUK_SETTINGS_SAVE_AND_CONTINUE_LABEL = "حفظ ومتابعة إلى نسك";
export const NUSUK_SETTINGS_CANCEL_LABEL = "إلغاء";

export const NUSUK_CONTACT_FIELD_LABELS = {
  contactEmail: "البريد الإلكتروني المعتمد في نسك",
  phoneCountryCode: "رمز الدولة",
  phoneNumber: "رقم الهاتف",
  postalCode: "الرمز البريدي",
};

export const NUSUK_CONTACT_EMPTY_FORM = {
  contactEmail: "",
  phoneCountryCode: "+212",
  phoneNumber: "",
  postalCode: "",
};

const REQUIRED_FIELD_ERROR = "هذا الحقل مطلوب";
const EMAIL_FIELD_ERROR = "يرجى إدخال بريد إلكتروني صحيح";
const PHONE_COUNTRY_CODE_ERROR = "أدخل رمز الدولة بصيغة +212";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_COUNTRY_CODE_REGEX = /^\+[0-9]{1,4}$/;

const trimValue = (value) => (typeof value === "string" ? value.trim() : "");

export const normalizeNusukContactSettings = (settings = null) => {
  if (!settings || typeof settings !== "object") {
    return { ...NUSUK_CONTACT_EMPTY_FORM };
  }

  return {
    contactEmail: trimValue(
      settings.contactEmail
      ?? settings.contact_email
      ?? NUSUK_CONTACT_EMPTY_FORM.contactEmail
    ),
    phoneCountryCode: trimValue(
      settings.phoneCountryCode
      ?? settings.phone_country_code
      ?? NUSUK_CONTACT_EMPTY_FORM.phoneCountryCode
    ),
    phoneNumber: trimValue(
      settings.phoneNumber
      ?? settings.phone_number
      ?? NUSUK_CONTACT_EMPTY_FORM.phoneNumber
    ),
    postalCode: trimValue(
      settings.postalCode
      ?? settings.postal_code
      ?? NUSUK_CONTACT_EMPTY_FORM.postalCode
    ),
  };
};

export const hasAnyNusukContactValue = (settings = null) => {
  if (!settings || typeof settings !== "object") return false;
  const normalized = normalizeNusukContactSettings(settings);
  return Boolean(
    normalized.contactEmail
    || normalized.phoneNumber
    || normalized.postalCode
    || (
      normalized.phoneCountryCode
      && normalized.phoneCountryCode !== NUSUK_CONTACT_EMPTY_FORM.phoneCountryCode
    )
  );
};

export const validateNusukContactSettings = (settings = null) => {
  const values = normalizeNusukContactSettings(settings);
  const errors = {};

  if (!values.contactEmail) errors.contactEmail = REQUIRED_FIELD_ERROR;
  else if (!EMAIL_REGEX.test(values.contactEmail)) errors.contactEmail = EMAIL_FIELD_ERROR;

  if (!values.phoneCountryCode) errors.phoneCountryCode = REQUIRED_FIELD_ERROR;
  else if (!PHONE_COUNTRY_CODE_REGEX.test(values.phoneCountryCode)) {
    errors.phoneCountryCode = PHONE_COUNTRY_CODE_ERROR;
  }

  if (!values.phoneNumber) errors.phoneNumber = REQUIRED_FIELD_ERROR;
  if (!values.postalCode) errors.postalCode = REQUIRED_FIELD_ERROR;

  return {
    values,
    errors,
    valid: Object.keys(errors).length === 0,
  };
};

export const hasCompleteNusukContactSettings = (settings = {}) => (
  validateNusukContactSettings(settings).valid
);

export function NusukSettingsFields({
  value,
  onChange,
  errors = {},
  disabled = false,
}) {
  const fieldErrors = errors && typeof errors === "object" ? errors : {};
  const form = normalizeNusukContactSettings(value);
  const setField = (field) => (event) => {
    onChange?.({
      ...form,
      [field]: event.target.value,
    });
  };

  return (
    <div
      className="form-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 12,
      }}
    >
      <Input
        label={NUSUK_CONTACT_FIELD_LABELS.contactEmail}
        type="email"
        value={form.contactEmail}
        onChange={setField("contactEmail")}
        required
        disabled={disabled}
        error={fieldErrors.contactEmail}
        inputStyle={{ direction: "ltr", textAlign: "left" }}
      />
      <Input
        label={NUSUK_CONTACT_FIELD_LABELS.phoneCountryCode}
        value={form.phoneCountryCode}
        onChange={setField("phoneCountryCode")}
        required
        disabled={disabled}
        placeholder="+212"
        error={fieldErrors.phoneCountryCode}
        inputMode="tel"
        inputStyle={{ direction: "ltr", textAlign: "left" }}
      />
      <Input
        label={NUSUK_CONTACT_FIELD_LABELS.phoneNumber}
        value={form.phoneNumber}
        onChange={setField("phoneNumber")}
        required
        disabled={disabled}
        error={fieldErrors.phoneNumber}
        inputMode="tel"
        inputStyle={{ direction: "ltr", textAlign: "left" }}
      />
      <Input
        label={NUSUK_CONTACT_FIELD_LABELS.postalCode}
        value={form.postalCode}
        onChange={setField("postalCode")}
        required
        disabled={disabled}
        error={fieldErrors.postalCode}
        inputMode="text"
        inputStyle={{ direction: "ltr", textAlign: "left" }}
      />
    </div>
  );
}

export function NusukSettingsModal({
  open,
  initialSettings = null,
  saving = false,
  onCancel,
  onSave,
}) {
  const [form, setForm] = React.useState(() => normalizeNusukContactSettings(initialSettings));
  const [errors, setErrors] = React.useState({});
  const [submitError, setSubmitError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setForm(normalizeNusukContactSettings(initialSettings));
    setErrors({});
    setSubmitError("");
  }, [initialSettings, open]);

  const handleSave = async () => {
    if (saving) return;
    const validation = validateNusukContactSettings(form);
    setErrors(validation.errors);
    if (!validation.valid) return;

    setSubmitError("");
    const result = await onSave?.(validation.values);
    if (result?.error) {
      setSubmitError("تعذر حفظ إعدادات نسك. يرجى المحاولة مرة أخرى.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={NUSUK_SETTINGS_MODAL_TITLE}
      width={620}
    >
      <div style={{ display: "grid", gap: 18, direction: "rtl" }}>
        <p style={{ margin: 0, color: "var(--rukn-text-muted)", fontSize: 13, lineHeight: 1.8 }}>
          {NUSUK_SETTINGS_MODAL_DESCRIPTION}
        </p>
        <NusukSettingsFields
          value={form}
          onChange={(next) => {
            setForm(next);
            setErrors({});
            setSubmitError("");
          }}
          errors={errors}
          disabled={saving}
        />
        {submitError && (
          <p style={{ margin: 0, color: "var(--rukn-danger)", fontSize: 12, fontWeight: 800, lineHeight: 1.7 }}>
            {submitError}
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            {NUSUK_SETTINGS_CANCEL_LABEL}
          </Button>
          <Button variant="primary" icon="upload" onClick={handleSave} disabled={saving}>
            {saving ? "جاري الحفظ..." : NUSUK_SETTINGS_SAVE_AND_CONTINUE_LABEL}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
