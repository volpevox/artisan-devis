"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Script from "next/script";
import { GA_ID, META_PIXEL_ID } from "@/lib/analytics";
import { lireConsentement, enregistrerConsentement, ecouterConsentement, type Consentement } from "@/lib/consentement";

// Charge Google Analytics (GA4) et le pixel Meta, UNIQUEMENT apres
// acceptation des cookies. Tant que le visiteur n'a pas repondu, affiche le
// bandeau Accepter / Refuser. En local et sur les previews Vercel (variables
// absentes, voir lib/analytics.ts), ce composant ne rend rien du tout.
export function Traceurs() {
  const [pret, setPret] = useState(false);
  const [choix, setChoix] = useState<Consentement>(null);

  useEffect(() => {
    setChoix(lireConsentement());
    setPret(true);
    return ecouterConsentement(setChoix);
  }, []);

  if (!GA_ID && !META_PIXEL_ID) return null;
  if (!pret) return null;

  if (choix === null) {
    // Portail vers document.body : un element fixe dans .app-viewport peut
    // passer sous le menu du bas sur iPhone (voir PropositionNotifications).
    return createPortal(
      <div className="cookies-bandeau" role="dialog" aria-label="Cookies">
        <p className="cookies-texte">
          On utilise des cookies de mesure d&apos;audience (Google) et publicitaires (Meta) pour savoir d&apos;où
          viennent nos utilisateurs. Tu peux refuser, l&apos;appli marche pareil.{" "}
          <a href="/confidentialite">En savoir plus</a>
        </p>
        <div className="cookies-actions">
          <button type="button" className="btn btn-outline" onClick={() => enregistrerConsentement("non")}>
            Refuser
          </button>
          <button type="button" className="btn btn-outline" onClick={() => enregistrerConsentement("oui")}>
            Accepter
          </button>
        </div>
      </div>,
      document.body
    );
  }

  if (choix !== "oui") return null;

  return (
    <>
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      )}
      {META_PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}
