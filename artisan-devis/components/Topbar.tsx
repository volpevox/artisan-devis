import Link from "next/link";

export function Topbar() {
  return (
    <div className="topbar">
      <Link href="/" className="topbar-brand">
        Artisan Devis
      </Link>
      <div className="topbar-links">
        <Link href="/">Nouveau devis</Link>
        <Link href="/devis">Mes devis</Link>
        <Link href="/profil">Mon profil</Link>
      </div>
    </div>
  );
}
