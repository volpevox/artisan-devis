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
      <p className="splash-tagline">
        <span className="splash-ligne splash-ligne-1">Devis &amp; Factures :</span>
        <span className="splash-ligne splash-ligne-2">Juste la voix. Zéro clic.</span>
      </p>
      <p className="splash-tap">Touchez pour continuer</p>
    </div>
  );
}
