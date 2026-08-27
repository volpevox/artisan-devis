import { Poppins, Montserrat, Patrick_Hand, Roboto } from "next/font/google";
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
  // Application privee : aucune page de app.volpevox.fr ne doit apparaitre
  // dans les moteurs de recherche (voir aussi app/robots.ts).
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
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
        <div className="app-viewport">
          <div className="app-scroll">{children}</div>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
