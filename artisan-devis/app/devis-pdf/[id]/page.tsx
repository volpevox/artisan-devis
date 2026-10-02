"use client";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { chargerPdf } from "@/lib/prechargementPdf";

// pdf.js s'appuie sur des API navigateur (Worker, Canvas) absentes cote
// serveur : le composant doit etre charge uniquement cote client.
const VisionneusePdf = dynamic(() => import("@/components/VisionneusePdf").then((m) => m.VisionneusePdf), {
  ssr: false,
});

export default function VoirPdf({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { avoir?: string; acompte?: string };
}) {
  const router = useRouter();
  const url = `/api/devis-pdf/${params.id}${
    searchParams.avoir === "1" ? "?avoir=1" : searchParams.acompte === "1" ? "?acompte=1" : ""
  }`;

  // Le PDF est demande tout de suite, en parallele du chargement de la
  // visionneuse (s'il n'a pas deja ete demande au toucher du bouton).
  useEffect(() => {
    chargerPdf(url).catch(() => {});
  }, [url]);

  return (
    <div className="pdf-viewer-shell">
      <Topbar forcerRetour onRetour={() => router.back()} />
      <VisionneusePdf url={url} />
    </div>
  );
}
