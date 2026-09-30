// Copie le moteur pdf.js (« worker ») de node_modules vers public/, pour que
// la visionneuse PDF le charge depuis l'appli elle-meme plutot que depuis
// unpkg.com (un site externe de plus a joindre a la premiere ouverture).
// Lance automatiquement avant `npm run dev` et `npm run build` (predev /
// prebuild) : la copie suit toujours la version de pdfjs-dist installee.
const fs = require("fs");
const path = require("path");

const source = require.resolve("pdfjs-dist/build/pdf.worker.min.js");
const cible = path.join(__dirname, "..", "public", "pdf.worker.min.js");
fs.copyFileSync(source, cible);
console.log(`pdf.worker.min.js copie (pdfjs-dist ${require("pdfjs-dist/package.json").version})`);
