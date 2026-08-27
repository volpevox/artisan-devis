import { Poppins, Montserrat, Patrick_Hand, Roboto } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { DebugOverlay } from "@/components/DebugOverlay";

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
    >
      <body>
        {/* window.innerHeight / dvh peuvent inclure en trop la zone de
            securite du haut sur iOS en mode standalone (confirme par
            mesures le 27/08/2026 : ecart exact = env(safe-area-inset-top)).
            document.documentElement.clientHeight reste correct dans les deux
            cas -- on l'utilise ici comme source fiable pour --app-height,
            au lieu de compter uniquement sur dvh. Script inline (avant le
            reste du body) pour eviter un flash avec la mauvaise hauteur. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function m(){document.documentElement.style.setProperty("--app-height",document.documentElement.clientHeight+"px")}m();window.addEventListener("resize",m);window.addEventListener("orientationchange",m);})();`,
          }}
        />
        <DebugOverlay />
        <div className="app-viewport">
          <div className="app-scroll">{children}</div>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
