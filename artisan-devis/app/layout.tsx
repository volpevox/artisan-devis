import { Poppins, Montserrat, Patrick_Hand } from "next/font/google";
import "./globals.css";

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

export const metadata = {
  title: "VolpeVox",
  description: "Créez vos devis en dictant, en quelques secondes",
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${poppins.variable} ${montserrat.variable} ${patrickHand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
