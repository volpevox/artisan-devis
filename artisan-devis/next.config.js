/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf.js (utilise par react-pdf pour afficher les devis/factures) tente de
  // resoudre le module Node "canvas" meme cote navigateur, ou il n'est ni
  // installe ni necessaire (uniquement utile pour un rendu PDF cote
  // serveur). Sans cet alias, la compilation echoue en le cherchant en vain.
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  // Polices et renard du PDF lus sur le disque par lib/devisPdf.tsx : on les
  // embarque explicitement dans les fonctions serveur qui fabriquent des PDF.
  experimental: {
    outputFileTracingIncludes: {
      "/api/**/*": ["./lib/polices/**/*", "./public/fox-icon.png"],
    },
  },
};

module.exports = nextConfig;
