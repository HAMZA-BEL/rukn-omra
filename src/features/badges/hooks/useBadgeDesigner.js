import React from "react";
import {
  addBadgeFieldToLayout,
  createDefaultBadgeLayout,
  normalizeBadgeLayout,
  removeBadgeFieldFromLayout,
  updateBadgeFieldBox,
} from "../utils/badgeLayout";

export function useBadgeDesigner(initialLayout) {
  const [layout, setLayout] = React.useState(() => normalizeBadgeLayout(initialLayout || createDefaultBadgeLayout()));
  const [selectedFieldId, setSelectedFieldId] = React.useState("");

  React.useEffect(() => {
    setLayout(normalizeBadgeLayout(initialLayout || createDefaultBadgeLayout()));
  }, [initialLayout]);

  const addField = React.useCallback((key, position) => {
    setLayout((current) => {
      const next = addBadgeFieldToLayout(current, key, position);
      const added = next.fields[next.fields.length - 1];
      if (added) setSelectedFieldId(added.id);
      return next;
    });
  }, []);

  const updateField = React.useCallback((fieldId, patch) => {
    setLayout((current) => updateBadgeFieldBox(current, fieldId, patch));
    setSelectedFieldId(fieldId);
  }, []);

  const removeField = React.useCallback((fieldId) => {
    setLayout((current) => removeBadgeFieldFromLayout(current, fieldId));
    setSelectedFieldId("");
  }, []);

  return {
    layout,
    selectedFieldId,
    selectedField: layout.fields.find((field) => field.id === selectedFieldId) || null,
    setSelectedFieldId,
    addField,
    updateField,
    removeField,
    setLayout,
  };
}
