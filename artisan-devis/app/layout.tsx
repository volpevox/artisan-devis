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
        {/* Sur Safari iOS en mode "ajoute a l'ecran d'accueil", ni 100vh ni
            100dvh ne sont fiables au tout premier affichage : la barre
            d'adresse/outils met un court instant a se stabiliser, et la
            valeur du viewport n'est recalculee qu'au prochain scroll -- d'ou
            le menu du bas qui flotte jusqu'a ce que l'utilisateur scrolle
            manuellement. window.visualViewport.height est fiable des le
            depart ; on l'ecrit dans --vh et on la recalcule a quelques
            reprises juste apres le chargement pour remplacer ce scroll
            manuel. Doit s'executer avant l'hydratation (beforeInteractive)
            pour eviter tout flash visible. */}
        <Script id="hauteur-reelle-ios" strategy="beforeInteractive">
          {`
            (function () {
              function ajusterHauteur() {
                var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
                document.documentElement.style.setProperty('--vh', (h * 0.01) + 'px');
              }
              ajusterHauteur();
              window.addEventListener('resize', ajusterHauteur);
              window.addEventListener('orientationchange', ajusterHauteur);
              if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', ajusterHauteur);
                window.visualViewport.addEventListener('scroll', ajusterHauteur);
              }
              setTimeout(ajusterHauteur, 50);
              setTimeout(ajusterHauteur, 300);
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
