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
