"use client";

import Script from "next/script";
import { GA_ID } from "@/lib/analytics";

// Charge le tag Google (gtag.js) pour GA4, uniquement si NEXT_PUBLIC_GA_ID est
// defini -- donc en production seulement (voir lib/analytics.ts).
// En local et sur les previews Vercel, ce composant ne rend rien.
export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
