"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";

// pdf.js s'appuie sur des API navigateur (Worker, Canvas) absentes cote
// serveur : le composant doit etre charge uniquement cote client.
const VisionneusePdf = dynamic(() => import("@/components/VisionneusePdf").then((m) => m.VisionneusePdf), {
  ssr: false,
});

// Apercu d'un devis de demonstration avec les infos du compte (voir
// /api/exemple-devis/[id]), ouvert depuis Mon compte.
export default function ExempleDevis() {
  const router = useRouter();
  const { artisanId } = useArtisanSession();

  return (
    <div className="pdf-viewer-shell">
      <Topbar forcerRetour onRetour={() => router.back()} />
      {artisanId ? <VisionneusePdf url={`/api/exemple-devis/${artisanId}`} /> : null}
    </div>
  );
}
