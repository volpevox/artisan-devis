import { useEffect, useRef } from "react";
import Image from "next/image";

interface SplashEcranProps {
  onContinuer: () => void;
}

// Duree de l'ecran avant de passer tout seul a l'appli (toucher pour passer
// plus tot reste possible).
const DUREE_SPLASH_MS = 3000;

// Hauteurs des barres de l'onde sonore (en % de la hauteur max).
const ONDE = [30, 55, 80, 45, 100, 65, 35, 90, 60, 40, 75, 50, 28];

export function SplashEcran({ onContinuer }: SplashEcranProps) {
  // onContinuer change a chaque rendu de la page : on garde la derniere
  // version dans une ref pour ne pas relancer le minuteur a chaque fois.
  const continuerRef = useRef(onContinuer);
  continuerRef.current = onContinuer;

  useEffect(() => {
    const minuteur = setTimeout(() => continuerRef.current(), DUREE_SPLASH_MS);
    return () => clearTimeout(minuteur);
  }, []);

  return (
    <div
      className="splash-screen"
      role="button"
      tabIndex={0}
      onClick={onContinuer}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onContinuer();
      }}
    >
      {/* unoptimized : image servie telle quelle (pas de recompression par Next),
          sinon le renard parait flou en grand sur iPhone. */}
      <Image src="/fox-icon.png" alt="VolpeVox" width={354} height={360} className="splash-logo" priority unoptimized />
      <div className="splash-onde" aria-hidden="true">
        {ONDE.map((h, i) => (
          <span key={i} style={{ height: `${h}%`, animationDelay: `${0.9 + i * 0.05}s, ${1.9 + (i % 5) * 0.12}s` }} />
        ))}
      </div>
      <p className="splash-brand splash-ligne splash-ligne-1">
        <span className="splash-brand-volpe">Volpe</span>
        <span className="splash-brand-vox">Vox</span>
      </p>
      <p className="splash-sub splash-ligne splash-ligne-2">Tes devis à la voix.</p>
      <p className="splash-credit">Développé par Volpe-Tech</p>
    </div>
  );
}
