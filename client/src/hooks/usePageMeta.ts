/**
 * usePageMeta — sets document.title and Open Graph / Twitter Card meta tags
 * dynamically so each recipe page has its own title and sharing preview.
 *
 * Usage:
 *   usePageMeta({ title: "Lasagna", description: "...", imageUrl: "..." })
 */

import { useEffect } from "react";

const SITE_NAME = "Morelli Family Recipes";
const SITE_URL = "https://mike415.github.io/Recipes";
const DEFAULT_IMAGE = `${SITE_URL}/favicon-512.png`;
const DEFAULT_DESCRIPTION =
  "The Morelli family recipe collection — favorites, meal kit recreations, and Barefoot Contessa classics.";

interface PageMetaOptions {
  /** Page-specific title. Will be shown as "Recipe Title | Morelli Family Recipes" */
  title?: string;
  description?: string;
  /** Absolute or root-relative image URL for the OG image */
  imageUrl?: string;
  /** Canonical URL for this page */
  url?: string;
}

function setMeta(property: string, content: string) {
  // Try og: and name= variants
  let el = document.querySelector<HTMLMetaElement>(
    `meta[property="${property}"], meta[name="${property}"]`
  );
  if (!el) {
    el = document.createElement("meta");
    // og: and twitter: use property=, others use name=
    if (property.startsWith("og:") || property.startsWith("twitter:")) {
      el.setAttribute("property", property);
    } else {
      el.setAttribute("name", property);
    }
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function usePageMeta({ title, description, imageUrl, url }: PageMetaOptions) {
  useEffect(() => {
    const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const pageDesc = description || DEFAULT_DESCRIPTION;
    const pageUrl = url || SITE_URL;

    // Resolve image URL to absolute
    let absImage = DEFAULT_IMAGE;
    if (imageUrl) {
      if (imageUrl.startsWith("http")) {
        absImage = imageUrl;
      } else {
        // Root-relative path — prepend site URL
        absImage = `${SITE_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
      }
    }

    // Document title
    document.title = pageTitle;

    // Standard meta
    setMeta("description", pageDesc);

    // Open Graph (Facebook, iMessage link previews, WhatsApp, Slack)
    setMeta("og:type", "website");
    setMeta("og:site_name", SITE_NAME);
    setMeta("og:title", pageTitle);
    setMeta("og:description", pageDesc);
    setMeta("og:image", absImage);
    setMeta("og:image:width", "1200");
    setMeta("og:image:height", "630");
    setMeta("og:url", pageUrl);

    // Twitter Card (also used by iMessage on newer iOS)
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", pageTitle);
    setMeta("twitter:description", pageDesc);
    setMeta("twitter:image", absImage);

    // Cleanup: restore defaults when component unmounts
    return () => {
      document.title = SITE_NAME;
      setMeta("description", DEFAULT_DESCRIPTION);
      setMeta("og:title", SITE_NAME);
      setMeta("og:description", DEFAULT_DESCRIPTION);
      setMeta("og:image", DEFAULT_IMAGE);
      setMeta("og:url", SITE_URL);
      setMeta("twitter:title", SITE_NAME);
      setMeta("twitter:description", DEFAULT_DESCRIPTION);
      setMeta("twitter:image", DEFAULT_IMAGE);
    };
  }, [title, description, imageUrl, url]);
}
