import { Poppins, Montserrat, Patrick_Hand, Roboto } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-poppins",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

const patrickHand = Patrick_Hand({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-manuscrit",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-roboto",
});

export const metadata = {
  title: "VolpeVox",
  description: "Créez vos devis en dictant, en quelques secondes",
  appleWebApp: {
    title: "VolpeVox",
    statusBarStyle: "black-translucent",
  },
};

// maximumScale/userScalable a 1/false desactivent le zoom au pincement :
// sans ca, un pincement accidentel (usage a une main) laisse la page zoomee
// et decalee, ce qui donne l'impression que l'ecran reste "coince" sur un
// coin (ex: bouton deconnexion hors champ) independamment du CSS de la page.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d1b2a",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${poppins.variable} ${montserrat.variable} ${patrickHand.variable} ${roboto.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Sur Safari iOS en mode "ajoute a l'ecran d'accueil" (plein ecran,
            sans barre d'adresse), le vrai probleme n'est pas la valeur de
            100vh/100dvh -- deja correcte -- mais que Safari ne recalcule sa
            mise en page interne qu'apres un vrai geste de scroll, jamais
            juste apres un delai. D'ou le menu du bas qui flotte tant que
            l'utilisateur n'a pas scrolle manuellement une fois. On simule ce
            scroll (1px puis retour) automatiquement juste apres le
            chargement, sur .app-scroll et sur la fenetre, pour declencher ce
            recalcul sans action de l'utilisateur. Doit demarrer avant
            l'hydratation (beforeInteractive) ; les recalculs differes
            s'executent une fois le reste du document (donc .app-scroll)
            present. */}
        <Script id="hauteur-reelle-ios" strategy="beforeInteractive">
          {`
            (function () {
              function ajusterHauteur() {
                var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
                document.documentElement.style.setProperty('--vh', (h * 0.01) + 'px');
              }
              function forcerRecalculMiseEnPage() {
                var conteneur = document.querySelector('.app-scroll');
                if (conteneur) {
                  var y = conteneur.scrollTop;
                  conteneur.scrollTop = y + 1;
                  conteneur.scrollTop = y;
                }
                window.scrollTo(0, 1);
                window.scrollTo(0, 0);
                ajusterHauteur();
              }
              ajusterHauteur();
              window.addEventListener('resize', ajusterHauteur);
              window.addEventListener('orientationchange', ajusterHauteur);
              if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', ajusterHauteur);
                window.visualViewport.addEventListener('scroll', ajusterHauteur);
              }
              setTimeout(forcerRecalculMiseEnPage, 50);
              setTimeout(forcerRecalculMiseEnPage, 300);
              setTimeout(forcerRecalculMiseEnPage, 800);
            })();
          `}
        </Script>
        <div className="app-viewport">
          <div className="app-scroll">{children}</div>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
