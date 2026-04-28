import React from "react";
import { AppIcon } from "./Icon";

/**
 * ErrorBoundary — wraps page-level components so a crash in one section
 * never brings down the entire application.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console for debugging; won't pollute production UX
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: "60vh", padding: "40px 24px", gap: 18,
        fontFamily: "'Cairo', sans-serif",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36,
        }}><AppIcon name="alert" size={36} color="#ef4444" /></div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc", textAlign: "center", margin: 0 }}>
          {this.props.fallbackTitle || "حدث خطأ في هذا القسم"}
        </h2>
        <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", maxWidth: 380, margin: 0, lineHeight: 1.8 }}>
          {this.props.fallbackDesc || "يمكنك الانتقال لقسم آخر أو الضغط على إعادة المحاولة."}
        </p>

        {process.env.NODE_ENV !== "production" && this.state.error && (
          <pre style={{
            fontSize: 11, color: "#ef4444", maxWidth: 560, overflow: "auto",
            background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)",
            borderRadius: 10, padding: "10px 14px", margin: 0,
            fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all",
          }}>
            {this.state.error.message}
          </pre>
        )}

        <button
          onClick={this.handleRetry}
          style={{
            padding: "10px 28px", borderRadius: 10, cursor: "pointer",
            background: "rgba(212,175,55,.12)", border: "1px solid rgba(212,175,55,.3)",
            color: "#d4af37", fontSize: 14, fontWeight: 700,
            fontFamily: "'Cairo', sans-serif", transition: "all .2s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(212,175,55,.22)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(212,175,55,.12)"}
        >
          <AppIcon name="refresh" size={15} color="#d4af37" /> إعادة المحاولة
        </button>
      </div>
    );
  }
}
