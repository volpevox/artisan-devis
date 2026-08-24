interface EmailHtmlOptions {
  titre: string;
  corpsHtml: string;
  boutonUrl?: string | null;
  boutonTexte?: string;
  logoUrl?: string | null;
  nomEntreprise?: string | null;
}

export function emailHtml({ titre, corpsHtml, boutonUrl, boutonTexte, logoUrl, nomEntreprise }: EmailHtmlOptions) {
  const entete = logoUrl
    ? `<div style="background:#ffffff;padding:20px 28px;border-bottom:1px solid #e2e6ee;">
        <img src="${logoUrl}" alt="${nomEntreprise || ""}" style="display:block;max-height:48px;max-width:220px;" />
      </div>`
    : `<div style="background:#0d1b2a;padding:22px 28px;">
        <span style="font-size:20px;font-weight:800;font-family:Arial,Helvetica,sans-serif;">
          <span style="color:#ffffff;">Volpe</span><span style="color:#d4af37;">Vox</span>
        </span>
      </div>`;

  return `
    <div style="background:#f4f6f8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e6ee;">
        ${entete}
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
