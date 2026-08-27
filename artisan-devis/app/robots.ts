import type { MetadataRoute } from "next";

// app.volpevox.fr est l'application privee : rien ne doit etre indexe par les
// moteurs de recherche (pages de connexion, pages legales, et surtout les
// pages publiques de signature client /signer/[id]). Seul le site vitrine
// volpevox.fr (WordPress) a vocation a etre reference.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
