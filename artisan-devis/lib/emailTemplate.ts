interface EmailHtmlOptions {
  titre: string;
  corpsHtml: string;
  boutonUrl?: string | null;
  boutonTexte?: string;
}

// Le logo est JOINT au mail (piece jointe "inline") plutot que charge depuis
// une URL : Gmail et Mail iOS l'affichent alors sans demander l'autorisation
// (Outlook la demande encore une fois). L'en-tete le reference par "cid:
// volpevox-logo". Si le telechargement echoue, le mot "VolpeVox" sous le
// logo sert de repli. A ajouter dans le champ "attachments" de chaque
// resend.emails.send(...) : attachments: [...(await logoInline()), ...autres].
type PieceJointe = { filename: string; content: Buffer; contentId: string };
let logoCache: PieceJointe[] | null = null;

export async function logoInline(): Promise<PieceJointe[]> {
  if (logoCache) return logoCache;
  try {
    const res = await fetch("https://app.volpevox.fr/fox-icon.png");
    if (!res.ok) return [];
    logoCache = [
      {
        filename: "volpevox.png",
        content: Buffer.from(await res.arrayBuffer()),
        contentId: "volpevox-logo",
      },
    ];
    return logoCache;
  } catch {
    return [];
  }
}

export function emailHtml({ titre, corpsHtml, boutonUrl, boutonTexte }: EmailHtmlOptions) {
  return `
    <div style="background:#f4f6f8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e6ee;">
        <div style="padding:26px 28px 20px;text-align:center;border-bottom:2px solid #d4af37;">
          <img src="cid:volpevox-logo" alt="" width="46" height="46" style="display:block;margin:0 auto 6px;width:46px;height:46px;border:0;" />
          <span style="font-size:20px;font-weight:800;font-family:Arial,Helvetica,sans-serif;">
            <span style="color:#0d1b2a;">Volpe</span><span style="color:#d4af37;">Vox</span>
          </span>
        </div>
        <div style="padding:28px;color:#1c2230;font-size:14px;line-height:1.6;">
          <h2 style="margin:0 0 16px;color:#0d1b2a;font-size:18px;">${titre}</h2>
          ${corpsHtml}
        </div>
        ${
          boutonUrl
            ? `<div style="padding:0 28px 28px;">
                <a href="${boutonUrl}" style="display:inline-block;padding:12px 24px;background:#d4af37;color:#0d1b2a;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">${boutonTexte}</a>
              </div>`
            : ""
        }
        <div style="background:#f4f6f8;padding:16px 28px;text-align:center;border-top:1px solid #e2e6ee;">
          <span style="font-size:11px;color:#93a0b3;">Propulsé par VolpeVox — devis &amp; factures à la voix</span>
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Mails envoyes AU CLIENT de l'artisan (devis, puis facture/relances) :
// l'artisan est en vedette (bandeau a son nom, sa signature), VolpeVox reste
// discret en bas. Le client ne connait pas VolpeVox : un mail signe
// "VolpeVox" sans le nom de l'artisan ressemble a du spam.

// Le texte saisi (descriptions, noms) est echappe avant d'aller dans le HTML.
export function echapperHtml(texte: string | null | undefined) {
  return String(texte ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 1240 -> "1 240,00 €" (espace insecable fine comme separateur de milliers).
export function formaterEuros(montant: number) {
  return (
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(montant || 0) +
    "\u00a0€"
  );
}

// Nom affiche dans "De :" : "Plomberie Durand via VolpeVox". Les caracteres
// qui casseraient l'en-tete email (<>",) sont retires.
export function expediteur(nomArtisan: string | null | undefined) {
  const nom = String(nomArtisan ?? "").replace(/[<>",;]/g, "").trim();
  // Pas de "VolpeVox via VolpeVox" (artisan dont l entreprise s appelle ainsi).
  if (nom.toLowerCase() === "volpevox") return "VolpeVox <devis@volpevox.fr>";
  return nom ? `${nom} via VolpeVox <devis@volpevox.fr>` : "VolpeVox <devis@volpevox.fr>";
}

// "Devis", 12, "Plomberie Durand" -> "Devis-12-Plomberie-Durand.pdf"
export function nomFichierPdf(type: string, numero: string | number | null | undefined, nomArtisan?: string | null) {
  const propre = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const morceaux = [type, numero != null && numero !== "" ? String(numero) : "", propre(nomArtisan || "").slice(0, 40)];
  return morceaux.filter(Boolean).join("-") + ".pdf";
}

const BLEU = "#0b2a5b";
const OR = "#d4af37";

interface LigneTicket {
  libelle: string;
  montant: string;
}

interface EmailClientOptions {
  nomArtisan: string;
  etiquette: string; // "Devis n°12", "Facture n°8"...
  corpsHtml: string; // paragraphes au-dessus du ticket (deja echappes)
  ticket?: {
    lignes: LigneTicket[];
    totaux?: LigneTicket[]; // Total HT, TVA... (petits, au-dessus du total)
    totalLibelle: string;
    total: string;
    note?: string | null;
  };
  apresTicketHtml?: string;
  boutonUrl?: string | null;
  boutonTexte?: string;
  sousBouton?: string | null;
  apresBoutonHtml?: string;
  signature: { personne?: string | null; entreprise?: string | null; telephone?: string | null };
}

export function emailClientHtml(o: EmailClientOptions) {
  const ligne = (l: LigneTicket, style = "") =>
    `<tr><td style="padding:3px 0;font-size:14px;color:#1c2230;${style}">${l.libelle}</td><td style="padding:3px 0 3px 12px;font-size:14px;color:#1c2230;text-align:right;white-space:nowrap;${style}">${l.montant}</td></tr>`;

  const ticket = o.ticket
    ? `<div style="background:#f8f6ef;border:1px solid #ece4c8;border-radius:10px;padding:14px 16px;margin:16px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${o.ticket.lignes.map((l) => ligne(l)).join("")}
          <tr><td colspan="2" style="padding:8px 0 6px;"><div style="border-top:1px dashed #cdbf8f;"></div></td></tr>
          ${(o.ticket.totaux || []).map((l) => ligne(l, "color:#56606e;font-size:13px;")).join("")}
          <tr>
            <td style="padding-top:4px;font-size:15px;font-weight:700;color:#1c2230;">${o.ticket.totalLibelle}</td>
            <td style="padding-top:4px;font-size:22px;font-weight:800;color:${BLEU};text-align:right;white-space:nowrap;">${o.ticket.total}</td>
          </tr>
        </table>
        ${o.ticket.note ? `<div style="font-size:12px;color:#6b7686;margin-top:6px;">${o.ticket.note}</div>` : ""}
      </div>`
    : "";

  const sig = o.signature;
  const lignesSignature = [
    sig.personne ? `<strong>${echapperHtml(sig.personne)}</strong>` : "",
    [sig.entreprise && sig.entreprise !== sig.personne ? echapperHtml(sig.entreprise) : "", echapperHtml(sig.telephone)]
      .filter(Boolean)
      .join(" · "),
  ].filter(Boolean);

  return `
    <div style="background:#f4f6f8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e6ee;">
        <div style="background:${BLEU};padding:18px 24px;border-bottom:3px solid ${OR};">
          <div style="color:#ffffff;font-size:19px;font-weight:800;">${echapperHtml(o.nomArtisan)}</div>
          <div style="color:${OR};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-top:3px;">${echapperHtml(o.etiquette)}</div>
        </div>
        <div style="padding:24px;color:#1c2230;font-size:15px;line-height:1.55;">
          ${o.corpsHtml}
          ${ticket}
          ${o.apresTicketHtml || ""}
          ${
            o.boutonUrl
              ? `<a href="${o.boutonUrl}" style="display:block;text-align:center;margin:22px 0 6px;padding:15px 12px;background:${OR};color:${BLEU};text-decoration:none;border-radius:10px;font-weight:800;font-size:16px;">${o.boutonTexte}</a>
                 ${o.sousBouton ? `<div style="text-align:center;font-size:12px;color:#6b7686;">${o.sousBouton}</div>` : ""}`
              : ""
          }
          ${o.apresBoutonHtml || ""}
          <div style="margin-top:22px;padding-top:16px;border-top:1px solid #e2e6ee;font-size:14px;line-height:1.6;">
            ${lignesSignature.join("<br>")}${lignesSignature.length ? "<br>" : ""}
            <span style="color:#6b7686;font-size:13px;">Une question ? Répondez simplement à ce mail.</span>
          </div>
        </div>
        <div style="background:#f4f6f8;padding:12px;text-align:center;font-size:11px;color:#93a0b3;">
          <img src="cid:volpevox-logo" alt="" width="14" height="14" style="vertical-align:middle;margin-right:4px;width:14px;height:14px;border:0;" />Envoyé avec VolpeVox
        </div>
      </div>
    </div>
  `;
}

// Lignes du ticket depuis les lignes du document : "Pose carrelage (12 m²)
// 540,00 €" (montants HT, comme sur le PDF). Au-dela de 6 lignes, le reste
// est resume.
export function lignesTicket(
  lignes: { description?: string | null; quantite?: number | string | null; unite?: string | null; prixUnitaire?: number | string | null }[]
): LigneTicket[] {
  const quantiteCourte = (q: number, unite: string) => {
    const n = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(q);
    const abrev: Record<string, string> = { heure: "h", jour: "j", "m²": "m²", ml: "ml" };
    if (abrev[unite]) return `${n} ${abrev[unite]}`;
    return q !== 1 ? `× ${n}` : "";
  };
  const toutes = lignes
    .filter((l) => l.description || Number(l.prixUnitaire))
    .map((l) => {
      const q = Number(l.quantite) || 1;
      const qte = quantiteCourte(q, l.unite || "forfait");
      return {
        libelle: `${echapperHtml(l.description) || "Prestation"}${qte ? ` <span style="color:#6b7686;">(${qte})</span>` : ""}`,
        montant: formaterEuros(q * (Number(l.prixUnitaire) || 0)),
      };
    });
  const MAX = 6;
  if (toutes.length <= MAX) return toutes;
  return [
    ...toutes.slice(0, MAX - 1),
    {
      libelle: `<span style="color:#6b7686;">… et ${toutes.length - (MAX - 1)} autres lignes (voir le PDF)</span>`,
      montant: "",
    },
  ];
}

// Bas du ticket : Total HT + TVA (petits) puis le total. Sans TVA : "Total".
export function totauxTicket(totalHT: number, tauxTva: number) {
  const montantTva = (totalHT * tauxTva) / 100;
  return {
    totaux:
      tauxTva > 0
        ? [
            { libelle: "Total HT", montant: formaterEuros(totalHT) },
            { libelle: `TVA ${String(tauxTva).replace(".", ",")} %`, montant: formaterEuros(montantTva) },
          ]
        : [],
    totalLibelle: tauxTva > 0 ? "Total TTC" : "Total",
    total: formaterEuros(totalHT + montantTva),
  };
}

// Signature : la personne, puis l'entreprise si elle a un nom a part.
export function signatureArtisan(
  profil: { nom_complet?: string | null; nom_entreprise?: string | null; telephone?: string | null } | null | undefined,
  nomArtisan: string
) {
  return {
    personne: profil?.nom_complet,
    entreprise: profil?.nom_entreprise || (profil?.nom_complet ? null : nomArtisan),
    telephone: profil?.telephone,
  };
}
