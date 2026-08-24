"use client";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";

export default function AbonnementSucces() {
  return (
    <main className="page-shell">
      <Topbar />

      <h1 className="page-title">Abonnement confirmé</h1>

      <div className="card">
        <p>Merci ! Ton abonnement VolpeVox est actif.</p>
        <Link href="/" className="btn btn-primary" style={{ display: "inline-block", marginTop: 12 }}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
