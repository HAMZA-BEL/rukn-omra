import React from "react";
import { theme } from "./styles";

const tc = theme.colors;

const firstText = (...values) => {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text && text !== "null" && text !== "undefined") return text;
  }
  return "";
};

const isDirectImageUrl = (value = "") => /^(https?:|data:image\/|blob:)/i.test(String(value).trim());

const getClientDirectImageUrl = (client = {}, explicitUrl = "") => {
  const docs = client.docs || {};
  return firstText(
    explicitUrl,
    client.photoUrl,
    client.photo_url,
    client.avatarUrl,
    client.avatar_url,
    client.imageUrl,
    client.image_url,
    docs.photoUrl,
    docs.photo_url,
    docs.avatarUrl,
    docs.avatar_url,
    docs.imageUrl,
    docs.image_url
  );
};

const getClientBadgePhotoPath = (client = {}) => {
  const docs = client.docs || {};
  return firstText(
    client.badgePhotoPath,
    client.badge_photo_path,
    docs.badgePhotoPath,
    docs.badge_photo_path
  );
};

export default function ClientAvatar({
  client = {},
  name = "",
  imageUrl = "",
  fallbackLetter = "",
  size = 30,
  badgePhotoApi = null,
  style = {},
}) {
  const directImageUrl = getClientDirectImageUrl(client, imageUrl);
  const badgePhotoPath = getClientBadgePhotoPath(client);
  const initial = fallbackLetter || (String(name || "").trim()[0] || "؟");
  const [resolvedUrl, setResolvedUrl] = React.useState(() => (
    directImageUrl
      ? directImageUrl
      : isDirectImageUrl(badgePhotoPath)
        ? badgePhotoPath
        : ""
  ));
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setImageFailed(false);

    if (directImageUrl) {
      setResolvedUrl(directImageUrl);
      return () => { cancelled = true; };
    }

    if (isDirectImageUrl(badgePhotoPath)) {
      setResolvedUrl(badgePhotoPath);
      return () => { cancelled = true; };
    }

    if (!badgePhotoPath || !badgePhotoApi?.isAvailable || !badgePhotoApi.getPhotoUrl) {
      setResolvedUrl("");
      return () => { cancelled = true; };
    }

    badgePhotoApi.getPhotoUrl(badgePhotoPath)
      .then((url) => {
        if (!cancelled) setResolvedUrl(firstText(url));
      })
      .catch(() => {
        if (!cancelled) setResolvedUrl("");
      });

    return () => { cancelled = true; };
  }, [badgePhotoApi, badgePhotoPath, directImageUrl]);

  const showImage = Boolean(resolvedUrl && !imageFailed);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        background: "linear-gradient(135deg,rgba(212,175,55,.25),rgba(212,175,55,.08))",
        border: "1px solid rgba(212,175,55,.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        color: tc.gold,
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: showImage ? "0 3px 10px rgba(15,23,42,.18)" : "none",
        ...style,
      }}
    >
      {showImage ? (
        <img
          src={resolvedUrl}
          alt=""
          onError={() => setImageFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
        />
      ) : (
        initial
      )}
    </div>
  );
}
