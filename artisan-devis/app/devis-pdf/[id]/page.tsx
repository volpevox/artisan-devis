"use client";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";

// Afficher directement le PDF (Content-Type: application/pdf) remplace toute
// la page par le lecteur natif du telephone, sans aucune trace de notre
// interface -- impossible de revenir dans l'app sans la fermer. Ici, le PDF
// est integre dans un iframe a l'interieur de notre propre page, qui garde
// donc son en-tete (et son bouton retour) visible en permanence.
export default function VoirPdf({ params }: { params: { id: string } }) {
  const router = useRouter();

  return (
    <div className="pdf-viewer-shell">
      <Topbar forcerRetour onRetour={() => router.back()} />
      <iframe src={`/api/devis-pdf/${params.id}`} className="pdf-viewer-frame" title="Document PDF" />
    </div>
  );
}
