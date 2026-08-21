export const metadata = {
  title: "Artisan Devis",
  description: "Créez vos devis en dictant, en quelques secondes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
