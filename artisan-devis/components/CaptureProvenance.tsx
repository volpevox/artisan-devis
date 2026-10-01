"use client";
import { useEffect } from "react";
import { capturerProvenance } from "@/lib/provenance";

// Memorise d'ou arrive le visiteur (voir lib/provenance.ts). N'affiche rien.
export function CaptureProvenance() {
  useEffect(() => {
    capturerProvenance();
  }, []);
  return null;
}
