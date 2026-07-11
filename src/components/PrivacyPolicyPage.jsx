import React from "react";
import { globalCSS } from "./styles";

const sections = [
  {
    title: "Data processed by the extension",
    items: [
      "Rukn account session information required to keep the user signed in.",
      "Authorized Umrah program information.",
      "Pilgrim information required for the Nusuk upload workflow.",
      "Passport file information selected by the user during the upload process.",
      "Temporary workflow state needed to continue or complete the upload.",
    ],
  },
  {
    title: "How the data is used",
    body: "The data is used only to provide the extension's single purpose: helping authorized Rukn users upload programs, pilgrim data, and passport files to Nusuk. The data is not used for advertising, tracking, profiling, or unrelated purposes.",
  },
  {
    title: "Data sharing",
    body: "Rukn Nusuk Assistant does not sell user data. The extension does not transfer user data to third parties for advertising, analytics, creditworthiness, or unrelated purposes. Data is exchanged only between the user's browser, the Rukn platform, and the Nusuk platform as required to perform the upload workflow.",
  },
  {
    title: "Storage",
    body: "The extension may store the user's Rukn session, preferences, and temporary workflow state in the browser's local storage. This is used to keep the user signed in and allow the upload workflow to continue smoothly.",
  },
  {
    title: "Security",
    body: "Access to Rukn data requires authentication. The extension only loads programs and pilgrims that the authenticated Rukn user is authorized to access.",
  },
  {
    title: "User control",
    body: "Users can sign out from the extension at any time. Signing out removes the active Rukn connection from the extension.",
  },
];

export default function PrivacyPolicyPage() {
  React.useEffect(() => {
    document.title = "Privacy Policy – Rukn Nusuk Assistant";
  }, []);

  return (
    <>
      <style>{globalCSS}</style>
      <main
        dir="ltr"
        style={{
          minHeight: "100vh",
          background: "var(--rukn-bg-page)",
          color: "var(--rukn-text)",
          padding: "48px 20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 880,
            margin: "0 auto",
          }}
        >
          <header
            style={{
              marginBottom: 28,
              borderBottom: "1px solid var(--rukn-border-soft)",
              paddingBottom: 22,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
                color: "var(--rukn-gold)",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "var(--rukn-gold)",
                  display: "inline-block",
                }}
              />
              Rukn Nusuk Assistant
            </div>
            <h1
              style={{
                fontSize: "clamp(30px, 5vw, 48px)",
                lineHeight: 1.12,
                marginBottom: 12,
                letterSpacing: 0,
                color: "var(--rukn-text-strong)",
              }}
            >
              Privacy Policy – Rukn Nusuk Assistant
            </h1>
            <p
              dir="rtl"
              lang="ar"
              style={{
                color: "var(--rukn-text-muted)",
                fontSize: 15,
                marginBottom: 10,
              }}
            >
              سياسة الخصوصية - مساعد ركن لنسك
            </p>
            <p style={{ color: "var(--rukn-text-muted)", fontSize: 14 }}>
              Last updated: July 2026
            </p>
          </header>

          <article
            style={{
              background: "var(--rukn-bg-card)",
              border: "1px solid var(--rukn-border)",
              borderRadius: 14,
              boxShadow: "var(--rukn-shadow-card)",
              padding: "clamp(22px, 4vw, 38px)",
            }}
          >
            <p style={paragraphStyle}>
              Rukn Nusuk Assistant is a browser extension designed for authorized users of the Rukn platform at{" "}
              <a href="https://ruknomra.com" style={linkStyle}>
                https://ruknomra.com
              </a>
              . The extension helps Umrah agencies transfer authorized Umrah programs, pilgrim data, and passport files from Rukn to the Nusuk platform and assists with completing data entry steps inside Nusuk.
            </p>

            {sections.map((section) => (
              <section key={section.title} style={{ marginTop: 28 }}>
                <h2 style={sectionTitleStyle}>{section.title}</h2>
                {section.items ? (
                  <ul style={listStyle}>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={paragraphStyle}>{section.body}</p>
                )}
              </section>
            ))}

            <section style={{ marginTop: 28 }}>
              <h2 style={sectionTitleStyle}>Contact</h2>
              <p style={paragraphStyle}>For privacy questions or support, contact:</p>
              <a href="mailto:support@ruknomra.com" style={{ ...linkStyle, fontWeight: 700 }}>
                support@ruknomra.com
              </a>
            </section>
          </article>
        </div>
      </main>
    </>
  );
}

const paragraphStyle = {
  color: "var(--rukn-text)",
  fontSize: 16,
  lineHeight: 1.8,
};

const sectionTitleStyle = {
  color: "var(--rukn-text-strong)",
  fontSize: 20,
  lineHeight: 1.35,
  marginBottom: 10,
  letterSpacing: 0,
};

const listStyle = {
  color: "var(--rukn-text)",
  fontSize: 16,
  lineHeight: 1.85,
  paddingLeft: 22,
};

const linkStyle = {
  color: "var(--rukn-gold)",
  textDecoration: "none",
};
