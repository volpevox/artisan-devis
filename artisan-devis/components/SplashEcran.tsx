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
      <img src="/fox-icon.png" alt="VolpeVox" className="splash-logo" />
      <p className="splash-brand splash-ligne splash-ligne-1">
        <span className="splash-brand-volpe">Volpe</span>
        <span className="splash-brand-vox">Vox</span>
      </p>
      <p className="splash-sub splash-ligne splash-ligne-2">
        Vos devis à la voix, la signature au doigt, la facture payée en ligne.
      </p>
      <p className="splash-tap">Touchez pour continuer</p>
    </div>
  );
}
