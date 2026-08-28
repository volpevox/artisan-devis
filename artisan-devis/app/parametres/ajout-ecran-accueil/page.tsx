"use client";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { AideEcranAccueil, estSurEcranAccueil } from "@/components/AideEcranAccueil";

export default function AjoutEcranAccueil() {
  const [installe, setInstalle] = useState(false);

  useEffect(() => {
    setInstalle(estSurEcranAccueil());
  }, []);

  return (
    <main className="page-shell">
      <Topbar />

      <h1 className="page-title">Ajouter à l'écran d'accueil</h1>

      <div className="card">
        {installe ? (
          <p style={{ margin: 0, color: "var(--success)", fontWeight: 600 }}>
            ✓ VolpeVox est déjà installé sur cet appareil.
          </p>
        ) : (
          <AideEcranAccueil />
        )}
      </div>
    </main>
  );
}
