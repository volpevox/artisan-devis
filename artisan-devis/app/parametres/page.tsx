"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";
import { notificationsPossibles, abonnementActuel, activerNotifications, desactiverNotifications } from "@/lib/pushClient";

const NUMERO_WHATSAPP_SUPPORT = "33766213674";

function Chevron() {
  return (
    <svg className="reglages-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Parametres() {
  const { session, artisanId, loading: chargementSession } = useArtisanSession();
  const [nomComplet, setNomComplet] = useState("");
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [stripeAccountId, setStripeAccountId] = useState("");
  const [stripePaiementActif, setStripePaiementActif] = useState(false);
  const [enCoursStripe, setEnCoursStripe] = useState(false);
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(true);

  const [etatNotifications, setEtatNotifications] = useState<"verification" | "indisponible" | "inactif" | "actif">(
    "verification"
  );
  const [notifEnCours, setNotifEnCours] = useState(false);
  const [notifMessage, setNotifMessage] = useState("");

  useEffect(() => {
    if (!artisanId) return;

    async function charger() {
      const { data } = await supabase
        .from("artisans")
        .select("nom_complet, nom_entreprise, stripe_account_id, stripe_paiement_actif")
        .eq("id", artisanId)
        .maybeSingle();
      if (data) {
        setNomComplet(data.nom_complet || "");
        setNomEntreprise(data.nom_entreprise || "");
        setStripeAccountId(data.stripe_account_id || "");
        setStripePaiementActif(!!data.stripe_paiement_actif);
      }
      setChargement(false);
    }
    charger();
  }, [artisanId]);

  useEffect(() => {
    if (!notificationsPossibles()) {
      setEtatNotifications("indisponible");
      return;
    }
    abonnementActuel().then((sub) => setEtatNotifications(sub ? "actif" : "inactif"));
  }, []);

  async function basculerNotifications() {
    if (!session) return;
    setNotifEnCours(true);
    setNotifMessage("");

    try {
      if (etatNotifications === "actif") {
        await desactiverNotifications(session.access_token);
        setEtatNotifications("inactif");
      } else {
        await activerNotifications(session.access_token);
        setEtatNotifications("actif");
      }
    } catch (e: any) {
      setNotifMessage(e.message || "Erreur");
    }

    setNotifEnCours(false);
  }

  useEffect(() => {
    if (!session || !stripeAccountId || stripePaiementActif) return;

    async function verifierStatut() {
      const res = await fetch("/api/statut-paiements", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (typeof data.actif === "boolean") setStripePaiementActif(data.actif);
    }
    verifierStatut();
  }, [session, stripeAccountId, stripePaiementActif]);

  async function connecterPaiements() {
    setEnCoursStripe(true);
    setMessage("");

    try {
      let accountToken: string | undefined;

      if (!stripeAccountId) {
        // Obligatoire pour les plateformes basees en France (conformite DSP2) :
        // Stripe exige un jeton de compte v2 cree cote navigateur (avec la cle
        // publique) avant toute creation de compte connecte avec configuration
        // marchand. Ce jeton ne contient que l'acceptation des conditions,
        // le reste des informations est collecte par Stripe lors de l'inscription.
        const resToken = await fetch("https://api.stripe.com/v2/core/account_tokens", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`,
            "Content-Type": "application/json",
            "Stripe-Version": "2026-07-29.dahlia",
          },
          body: JSON.stringify({
            contact_email: session?.user?.email || undefined,
            display_name: nomEntreprise || nomComplet || undefined,
          }),
        });
        const dataToken = await resToken.json();

        if (!resToken.ok) {
          setMessage("Erreur : " + (dataToken.error?.message || "création du jeton Stripe impossible"));
          setEnCoursStripe(false);
          return;
        }
        accountToken = dataToken.id;
      }

      const res = await fetch("/api/connecter-paiements", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ accountToken }),
      });
      const texte = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(texte);
      } catch {
        setMessage(`Erreur serveur (${res.status}) : ${texte.slice(0, 300)}`);
        setEnCoursStripe(false);
        return;
      }

      if (data.erreur) {
        setMessage("Erreur : " + data.erreur);
        setEnCoursStripe(false);
        return;
      }

      window.location.href = data.url;
    } catch (e: any) {
      setMessage("Erreur : " + e.message);
      setEnCoursStripe(false);
    }
  }

  if (chargementSession || chargement) {
    return (
      <main className="page-shell">
        <Topbar />
        <p className="message">Chargement...</p>
      </main>
    );
  }

  const messageDonnees = (sujet: string) =>
    `https://wa.me/${NUMERO_WHATSAPP_SUPPORT}?text=${encodeURIComponent(sujet)}`;

  return (
    <main className="page-shell">
      <Topbar />

      <h1 className="page-title">Paramètres</h1>

      {/* --- Compte --- */}
      <div className="reglages-groupe">
        <p className="reglages-groupe-titre">Compte</p>
        <div className="reglages-liste">
          <Link href="/abonnement" className="reglages-item">
            <span className="reglages-item-icone">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M3 9.5h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <span className="reglages-item-corps">
              <span className="reglages-item-titre">Mon abonnement</span>
              <span className="reglages-item-sous">Gérer mon abonnement VolpeVox</span>
            </span>
            <span className="reglages-item-fin">
              <Chevron />
            </span>
          </Link>

          {stripePaiementActif ? (
            <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" className="reglages-item">
              <span className="reglages-item-icone">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M2.5 9.5h19" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </span>
              <span className="reglages-item-corps">
                <span className="reglages-item-titre">Paiement en ligne</span>
                <span className="reglages-item-sous">Voir mon espace Stripe</span>
              </span>
              <span className="reglages-item-fin">
                <span className="reglages-item-statut">Activé</span>
                <Chevron />
              </span>
            </a>
          ) : (
            <button type="button" className="reglages-item" onClick={connecterPaiements} disabled={enCoursStripe}>
              <span className="reglages-item-icone">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M2.5 9.5h19" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </span>
              <span className="reglages-item-corps">
                <span className="reglages-item-titre">Paiement en ligne</span>
                <span className="reglages-item-sous">
                  {enCoursStripe
                    ? "Ouverture de Stripe..."
                    : stripeAccountId
                    ? "Reprendre l'inscription Stripe"
                    : "Connecter Stripe (sans commission)"}
                </span>
              </span>
              <span className="reglages-item-fin">
                <Chevron />
              </span>
            </button>
          )}

          <Link href="/parametres/mot-de-passe" className="reglages-item">
            <span className="reglages-item-icone">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <span className="reglages-item-corps">
              <span className="reglages-item-titre">Mot de passe</span>
              <span className="reglages-item-sous">Modifier mon mot de passe</span>
            </span>
            <span className="reglages-item-fin">
              <Chevron />
            </span>
          </Link>
        </div>
        {message && <p className="message">{message}</p>}
      </div>

      {/* --- Application --- */}
      <div className="reglages-groupe">
        <p className="reglages-groupe-titre">Application</p>
        <div className="reglages-liste">
          <button
            type="button"
            className="reglages-item"
            onClick={basculerNotifications}
            disabled={notifEnCours || etatNotifications === "verification" || etatNotifications === "indisponible"}
          >
            <span className="reglages-item-icone">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3a5 5 0 0 0-5 5v3.2c0 .5-.2 1-.5 1.4L5 15h14l-1.5-2.4a2 2 0 0 1-.5-1.4V8a5 5 0 0 0-5-5Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <span className="reglages-item-corps">
              <span className="reglages-item-titre">Notifications</span>
              <span className="reglages-item-sous">
                {etatNotifications === "indisponible"
                  ? "Non disponible sur ce navigateur"
                  : etatNotifications === "actif"
                  ? "Alertes activées"
                  : "Être alerté des signatures et paiements"}
              </span>
            </span>
            <span className="reglages-item-fin">
              {etatNotifications === "indisponible" ? (
                <Chevron />
              ) : (
                <span className="interrupteur">
                  <span
                    className="interrupteur-piste"
                    data-actif={etatNotifications === "actif" ? "oui" : "non"}
                  />
                </span>
              )}
            </span>
          </button>

          <Link href="/parametres/export-comptable" className="reglages-item">
            <span className="reglages-item-icone">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M7 3h7l5 5v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M13 3v5h5M12 12v6m0 0-2.5-2.5M12 18l2.5-2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="reglages-item-corps">
              <span className="reglages-item-titre">Export comptable</span>
              <span className="reglages-item-sous">Un fichier de tes factures pour ton comptable</span>
            </span>
            <span className="reglages-item-fin">
              <Chevron />
            </span>
          </Link>

          <Link href="/parametres/comment-ca-marche" className="reglages-item">
            <span className="reglages-item-icone">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M9.5 9.3a2.5 2.5 0 1 1 3.3 2.4c-.7.3-1.3.9-1.3 1.8v.3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="16.8" r="1" fill="currentColor" />
              </svg>
            </span>
            <span className="reglages-item-corps">
              <span className="reglages-item-titre">Comment ça marche</span>
              <span className="reglages-item-sous">Le parcours complet, de la dictée au paiement</span>
            </span>
            <span className="reglages-item-fin">
              <Chevron />
            </span>
          </Link>
        </div>
        {notifMessage && <p className="message">{notifMessage}</p>}
      </div>

      {/* --- Informations légales --- */}
      <div className="reglages-groupe">
        <p className="reglages-groupe-titre">Informations légales</p>
        <div className="reglages-liste">
          {[
            { href: "/mentions-legales", label: "Mentions légales" },
            { href: "/cgu", label: "Conditions générales d'utilisation" },
            { href: "/cgv", label: "Conditions générales de vente" },
            { href: "/confidentialite", label: "Confidentialité & cookies" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="reglages-item">
              <span className="reglages-item-icone">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 3v5h5M8.5 13h7M8.5 16.5h7"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="reglages-item-corps">
                <span className="reglages-item-titre">{l.label}</span>
              </span>
              <span className="reglages-item-fin">
                <Chevron />
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* --- Mes données --- */}
      <div className="reglages-groupe">
        <p className="reglages-groupe-titre">Mes données</p>
        <div className="reglages-liste">
          <a
            href={messageDonnees("Bonjour, je souhaite demander l'export de mes données VolpeVox.")}
            target="_blank"
            rel="noreferrer"
            className="reglages-item"
          >
            <span className="reglages-item-icone">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3v12m0 0-4-4m4 4 4-4M5 19h14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="reglages-item-corps">
              <span className="reglages-item-titre">Demander l'export de mes données</span>
            </span>
            <span className="reglages-item-fin">
              <Chevron />
            </span>
          </a>
          <a
            href={messageDonnees(
              "Bonjour, je souhaite demander la suppression de mon compte VolpeVox et de mes données."
            )}
            target="_blank"
            rel="noreferrer"
            className="reglages-item reglages-item--danger"
          >
            <span className="reglages-item-icone" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 7h14M10 4h4M9 7v11m3-11v11m3-11v11M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="reglages-item-corps">
              <span className="reglages-item-titre">Supprimer mon compte</span>
            </span>
            <span className="reglages-item-fin">
              <Chevron />
            </span>
          </a>
        </div>
        <p className="hint" style={{ margin: "8px 4px 0" }}>
          Écris-moi directement, je m'en occupe. Réponse sous 24&nbsp;h.
        </p>
      </div>
    </main>
  );
}
