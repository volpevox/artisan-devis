import { Topbar } from "@/components/Topbar";

export default function CommentCaMarche() {
  return (
    <main className="page-shell">
      <Topbar />

      <h1 className="page-title">Comment ça marche</h1>
      <p className="hint ccm-intro">
        Le parcours complet, de la dictée du chantier jusqu'au paiement de la facture. Chaque étape se fait en
        quelques secondes.
      </p>

      <div className="ccm-timeline">
        {/* 1. Dictée vocale */}
        <div className="ccm-etape">
          <div className="ccm-numero-col">
            <span className="ccm-numero">1</span>
            <span className="ccm-ligne-verticale" />
          </div>
          <div className="ccm-etape-corps">
            <p className="ccm-etape-titre">Tu dictes le chantier</p>
            <p className="ccm-etape-texte">
              Appuie sur le micro et raconte à voix haute : le client, ce que tu vas faire, ton prix. Pas besoin de
              taper quoi que ce soit.
            </p>
            <div className="ccm-demo">
              <div className="ccm-mic-mini">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="ccm-wave-mini" aria-hidden="true">
                {[0.4, 0.9, 0.55, 1, 0.35, 0.75, 0.5].map((amp, i) => (
                  <span key={i} style={{ ["--amp" as any]: amp, animationDelay: `${i * 0.08}s` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. IA structure le devis */}
        <div className="ccm-etape">
          <div className="ccm-numero-col">
            <span className="ccm-numero">2</span>
            <span className="ccm-ligne-verticale" />
          </div>
          <div className="ccm-etape-corps">
            <p className="ccm-etape-titre">Le devis se remplit tout seul</p>
            <p className="ccm-etape-texte">
              Une IA transcrit ta voix, puis une seconde IA remplit le devis : client, description, prix — avec un
              prix déjà suggéré si tu as fait une prestation similaire avant (ton carnet de prix).
            </p>
            <div className="ccm-demo">
              <div className="ccm-lignes" aria-hidden="true">
                <span className="ccm-ligne-texte" style={{ width: "95%", animationDelay: "0s" }} />
                <span className="ccm-ligne-texte" style={{ width: "78%", animationDelay: "0.3s" }} />
                <span className="ccm-ligne-texte" style={{ width: "55%", animationDelay: "0.6s" }} />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Vérification et envoi */}
        <div className="ccm-etape">
          <div className="ccm-numero-col">
            <span className="ccm-numero">3</span>
            <span className="ccm-ligne-verticale" />
          </div>
          <div className="ccm-etape-corps">
            <p className="ccm-etape-titre">Tu vérifies et tu envoies</p>
            <p className="ccm-etape-texte">
              Tu relis, tu corriges si besoin, puis tu envoies le devis par email en un clic. Le client reçoit un
              joli PDF à ton nom, avec ton logo.
            </p>
            <div className="ccm-demo">
              <div className="ccm-enveloppe" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M3 6.5 12 13l9-6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Signature électronique */}
        <div className="ccm-etape">
          <div className="ccm-numero-col">
            <span className="ccm-numero">4</span>
            <span className="ccm-ligne-verticale" />
          </div>
          <div className="ccm-etape-corps">
            <p className="ccm-etape-titre">Le client signe sur son téléphone</p>
            <p className="ccm-etape-texte">
              Il ouvre le lien reçu par email et signe avec son doigt, directement sur son téléphone. Pas besoin
              d'imprimer ni de se déplacer.
            </p>
            <div className="ccm-demo">
              <div className="ccm-telephone" aria-hidden="true">
                <svg viewBox="0 0 120 40" width="44" height="15">
                  <path
                    d="M6 28 C 18 6, 28 40, 40 18 S 62 4, 74 22 S 96 34, 114 12"
                    stroke="var(--ink)"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    pathLength={1}
                    style={{ strokeDasharray: 1 }}
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Relance devis */}
        <div className="ccm-etape">
          <div className="ccm-numero-col">
            <span className="ccm-numero">5</span>
            <span className="ccm-ligne-verticale" />
          </div>
          <div className="ccm-etape-corps">
            <p className="ccm-etape-titre">Tu es prévenu, et relancé si besoin</p>
            <p className="ccm-etape-texte">
              Tu es notifié dès que le devis est signé. S'il ne répond pas, une relance automatique part toute seule
              (à J+3 puis J+7) — tu n'as rien à faire.
            </p>
            <div className="ccm-demo">
              <div className="ccm-cloche" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3a5 5 0 0 0-5 5v3.2c0 .5-.2 1-.5 1.4L5 15h14l-1.5-2.4a2 2 0 0 1-.5-1.4V8a5 5 0 0 0-5-5Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span className="ccm-point-relance" />
              </div>
            </div>
          </div>
        </div>

        {/* 6. Transformation en facture */}
        <div className="ccm-etape">
          <div className="ccm-numero-col">
            <span className="ccm-numero">6</span>
            <span className="ccm-ligne-verticale" />
          </div>
          <div className="ccm-etape-corps">
            <p className="ccm-etape-titre">Le devis devient une facture</p>
            <p className="ccm-etape-texte">
              Une fois le chantier fait, transforme le devis en facture en un clic — numérotée automatiquement. Tu
              peux aussi dicter une facture directement si tout a été convenu à l'oral avec le client.
            </p>
            <div className="ccm-demo">
              <div className="ccm-transform" aria-hidden="true">
                <span className="ccm-mini-doc">DEVIS</span>
                <svg className="ccm-fleche-icone" viewBox="0 0 24 24" fill="none">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="ccm-mini-doc ccm-mini-doc--facture">FACTURE</span>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Paiement en ligne */}
        <div className="ccm-etape">
          <div className="ccm-numero-col">
            <span className="ccm-numero">7</span>
            <span className="ccm-ligne-verticale" />
          </div>
          <div className="ccm-etape-corps">
            <p className="ccm-etape-titre">Le client paie en ligne</p>
            <p className="ccm-etape-texte">
              La facture part par email avec un bouton de paiement. Le client paie par carte, l'argent arrive
              directement sur ton compte — sans commission VolpeVox.
            </p>
            <div className="ccm-demo">
              <div className="ccm-paiement" aria-hidden="true">
                <span className="ccm-euro">€</span>
                <span className="ccm-check">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" pathLength={1} style={{ strokeDasharray: 1 }} />
                    <path
                      d="M8 12.5 11 15.5 16 9"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={1}
                      style={{ strokeDasharray: 1 }}
                    />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 8. Relance facture */}
        <div className="ccm-etape">
          <div className="ccm-numero-col">
            <span className="ccm-numero">8</span>
            <span className="ccm-ligne-verticale" />
          </div>
          <div className="ccm-etape-corps">
            <p className="ccm-etape-titre">Relance si la facture traîne</p>
            <p className="ccm-etape-texte">
              Facture impayée après quelques jours ? Une relance automatique part toute seule, comme pour un devis
              non signé — tu n'as pas à y penser.
            </p>
            <div className="ccm-demo">
              <div className="ccm-cloche" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3a5 5 0 0 0-5 5v3.2c0 .5-.2 1-.5 1.4L5 15h14l-1.5-2.4a2 2 0 0 1-.5-1.4V8a5 5 0 0 0-5-5Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span className="ccm-point-relance" />
              </div>
            </div>
          </div>
        </div>

        {/* 9. Suivi centralisé */}
        <div className="ccm-etape">
          <div className="ccm-numero-col">
            <span className="ccm-numero">9</span>
          </div>
          <div className="ccm-etape-corps">
            <p className="ccm-etape-titre">Tout est suivi au même endroit</p>
            <p className="ccm-etape-texte">
              Tes devis et factures restent dans l'appli, avec leur statut toujours à jour : brouillon, envoyé,
              signé, payé.
            </p>
            <div className="ccm-demo">
              <div className="ccm-suivi" aria-hidden="true">
                <span className="ccm-suivi-pt" style={{ animationDelay: "0s" }} />
                <span className="ccm-suivi-trait" />
                <span className="ccm-suivi-pt" style={{ animationDelay: "0.4s" }} />
                <span className="ccm-suivi-trait" />
                <span className="ccm-suivi-pt" style={{ animationDelay: "0.8s" }} />
                <span className="ccm-suivi-trait" />
                <span className="ccm-suivi-pt" style={{ animationDelay: "1.2s" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
