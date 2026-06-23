import React from "react";
import { useLang } from "../hooks/useLang";
import { AppIcon } from "./Icon";

const MRZReader = React.lazy(() => import("./MRZReader"));

function MRZReaderFallback() {
  const { t } = useLang();

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: 180,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        color: "var(--rukn-text-muted)",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      <AppIcon name="loading" size={20} style={{ animation: "spin 1s linear infinite" }} />
      <span>{t.loading || "Loading..."}</span>
    </div>
  );
}

export default function LazyMRZReader(props) {
  return (
    <React.Suspense fallback={<MRZReaderFallback />}>
      <MRZReader {...props} />
    </React.Suspense>
  );
}
