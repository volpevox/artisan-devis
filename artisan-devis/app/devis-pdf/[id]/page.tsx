"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";

// pdf.js s'appuie sur des API navigateur (Worker, Canvas) absentes cote
// serveur : le composant doit etre charge uniquement cote client.
const VisionneusePdf = dynamic(() => import("@/components/VisionneusePdf").then((m) => m.VisionneusePdf), {
  ssr: false,
});

export default function VoirPdf({ params }: { params: { id: string } }) {
  const router = useRouter();

  return (
    <div className="pdf-viewer-shell">
      <Topbar forcerRetour onRetour={() => router.back()} />
      <VisionneusePdf url={`/api/devis-pdf/${params.id}`} />
    </div>
  );
}
