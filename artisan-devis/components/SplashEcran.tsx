import Image from "next/image";

interface SplashEcranProps {
  onContinuer: () => void;
}

export function SplashEcran({ onContinuer }: SplashEcranProps) {
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
      <Image src="/fox-icon.png" alt="VolpeVox" width={260} height={260} className="splash-logo" priority />
      <p className="splash-brand splash-ligne splash-ligne-1">
        <span className="splash-brand-volpe">Volpe</span>
        <span className="splash-brand-vox">Vox</span>
      </p>
      <p className="splash-sub splash-ligne splash-ligne-2">
        Devis et facturations à la voix, signatures et paiements en ligne
      </p>
      <p className="splash-tap">Touchez pour continuer</p>
      <p className="splash-credit">Développé par Volpe-Tech</p>
    </div>
  );
}
