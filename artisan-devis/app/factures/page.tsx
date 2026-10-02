"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";
import { useDevisRealtime } from "@/lib/useDevisRealtime";
import { CarteDocument, euros } from "@/components/CarteDocument";
import { RappelIban } from "@/components/RappelIban";

export default function MesFactures() {
  const { session, artisanId, profilArtisan, loading: chargementSession } = useArtisanSession();
  const [factures, setFactures] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string>("");
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [voirArchives, setVoirArchives] = useState(false);

  async function charger() {
    const { data } = await supabase
      .from("devis")
      .select("*")
      .eq("est_facture", true)
      .order("facture_creee_le", { ascending: false });
    setFactures(data || []);
    setChargement(false);

    // Marque les factures comme vues, pour faire disparaitre la pastille de
    // notification dans l'en-tete et le menu du bas.
    const idsNonVues = (data || []).filter((d) => !d.facture_vue_le).map((d) => d.id);
    if (idsNonVues.length > 0) {
      await supabase.from("devis").update({ facture_vue_le: new Date().toISOString() }).in("id", idsNonVues);
    }
  }

  useEffect(() => {
    if (!artisanId) return;
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artisanId]);

  // Rafraichit automatiquement la liste (ex: une facture qui vient d'etre
  // payee en ligne) sans que l'artisan ait besoin de recharger la page.
  useDevisRealtime(artisanId, charger);

  async function envoyerFacture(id: string) {
    setEnCours(id);
    setMessages((m) => ({ ...m, [id]: "Envoi de la facture en cours..." }));

    const res = await fetch(`/api/facture/${id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const data = await res.json();

    setEnCours("");

    if (data.erreur) {
      setMessages((m) => ({ ...m, [id]: "Erreur : " + data.erreur }));
      return;
    }

    const factureEnvoyeeLe = new Date().toISOString();
    setFactures((liste) => liste.map((d) => (d.id === id ? { ...d, facture_envoyee_le: factureEnvoyeeLe } : d)));
    setMessages((m) => ({ ...m, [id]: "Facture envoyée au client !" }));
  }

  async function marquerPayee(id: string, moyenPaiement: string) {
    setEnCours(id);
    const payeeLe = new Date().toISOString();

    const { error } = await supabase.from("devis").update({ payee_le: payeeLe, moyen_paiement: moyenPaiement }).eq("id", id);

    setEnCours("");

    if (error) {
      setMessages((m) => ({ ...m, [id]: "Erreur : " + error.message }));
      return;
    }

    setFactures((liste) => liste.map((d) => (d.id === id ? { ...d, payee_le: payeeLe, moyen_paiement: moyenPaiement } : d)));
    setMessages((m) => ({ ...m, [id]: "Facture marquée comme payée !" }));
  }

  async function annulerPaiement(id: string) {
    setEnCours(id);

    // Une facture archivee redevenue impayee revient dans la liste principale,
    // pour ne pas oublier de l'encaisser.
    const facture = factures.find((d) => d.id === id);
    const changements: Record<string, null> = { payee_le: null, moyen_paiement: null };
    if (facture?.archivee_le && !facture.avoir_numero) changements.archivee_le = null;

    const { error } = await supabase.from("devis").update(changements).eq("id", id);

    setEnCours("");

    if (error) {
      setMessages((m) => ({ ...m, [id]: "Erreur : " + error.message }));
      return;
    }

    setFactures((liste) => liste.map((d) => (d.id === id ? { ...d, ...changements } : d)));
    setMessages((m) => ({ ...m, [id]: "" }));
  }

  async function archiver(id: string, archiver: boolean) {
    setEnCours(id);
    const archiveeLe = archiver ? new Date().toISOString() : null;

    const { error } = await supabase.from("devis").update({ archivee_le: archiveeLe }).eq("id", id);

    setEnCours("");

    if (error) {
      setMessages((m) => ({ ...m, [id]: "Erreur : " + error.message }));
      return;
    }

    setFactures((liste) => liste.map((d) => (d.id === id ? { ...d, archivee_le: archiveeLe } : d)));
  }

  async function annulerParAvoir(id: string) {
    setEnCours(id);
    setMessages((m) => ({ ...m, [id]: "Création de l'avoir..." }));

    const res = await fetch(`/api/avoir/${id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const data = await res.json();

    setEnCours("");

    if (data.erreur) {
      setMessages((m) => ({ ...m, [id]: "Erreur : " + data.erreur }));
      return;
    }

    const avoirCreeLe = new Date().toISOString();
    setFactures((liste) =>
      liste.map((d) => (d.id === id ? { ...d, avoir_numero: data.numero, avoir_cree_le: avoirCreeLe } : d))
    );
    setMessages((m) => ({
      ...m,
      [id]: data.envoye
        ? `Avoir AV-${data.numero} créé et envoyé au client.`
        : `Avoir AV-${data.numero} créé${data.erreurEnvoi ? " (l'email n'a pas pu partir : partage le PDF de l'avoir)" : " (pas d'email client : partage le PDF de l'avoir)"}.`,
    }));
  }

  async function supprimer(id: string) {
    setEnCours(id);

    // Pas de suppression en cascade cote base : on retire d'abord les
    // lignes, avant la ligne "devis" (ici une facture) elle-meme.
    await supabase.from("lignes_devis").delete().eq("devis_id", id);
    const { error } = await supabase.from("devis").delete().eq("id", id);

    setEnCours("");

    if (error) {
      setMessages((m) => ({ ...m, [id]: "Erreur : " + error.message }));
      return;
    }

    setFactures((liste) => liste.filter((d) => d.id !== id));
  }

  // Resume : ce qui reste a encaisser, et ce qui est encaisse ce mois-ci
  // (factures annulees par un avoir exclues).
  const actives = factures.filter((d) => !d.avoir_numero);
  const somme = (liste: any[]) => liste.reduce((s, d) => s + (Number(d.total) || 0), 0);
  const aEncaisser = somme(actives.filter((d) => !d.payee_le));
  const maintenant = new Date();
  const encaisseCeMois = somme(
    actives.filter((d) => {
      if (!d.payee_le) return false;
      const p = new Date(d.payee_le);
      return p.getMonth() === maintenant.getMonth() && p.getFullYear() === maintenant.getFullYear();
    })
  );
  const moisCourt = maintenant.toLocaleDateString("fr-FR", { month: "short" });

  // Archives : simple rangement, les totaux ci-dessus comptent toutes les
  // factures (archivees comprises).
  const archivees = factures.filter((d) => d.archivee_le);
  const enCoursListe = factures.filter((d) => !d.archivee_le);
  const affichees = voirArchives ? archivees : enCoursListe;

  return (
    <main className="page-shell page-shell--large">
      <Topbar />

      <h1 className="page-title">{voirArchives ? "Factures archivées" : "Factures"}</h1>

      {/* Rappel IBAN seulement s'il reste une facture a envoyer. */}
      {!voirArchives && factures.some((d) => !d.facture_envoyee_le && !d.payee_le) && (
        <RappelIban profil={profilArtisan} artisanId={artisanId} style={{ marginBottom: 16 }} />
      )}

      {voirArchives && (
        <button type="button" className="lien-archives" onClick={() => setVoirArchives(false)}>
          ← Retour aux factures
        </button>
      )}

      {!voirArchives && actives.length > 0 && (
        <div className="resume-docs">
          <div>
            <small>À encaisser</small>
            <strong>{euros(aEncaisser)}</strong>
          </div>
          <div className="vert">
            <small>Encaissé en {moisCourt}</small>
            <strong>{euros(encaisseCeMois)}</strong>
          </div>
        </div>
      )}

      {(chargementSession || chargement) && <p className="message">Chargement...</p>}
      {!chargementSession && !chargement && factures.length === 0 && (
        <p className="message">Aucune facture pour l'instant.</p>
      )}
      {!chargementSession && !chargement && factures.length > 0 && affichees.length === 0 && (
        <p className="message">{voirArchives ? "Aucune facture archivée." : "Aucune facture en cours : tout est rangé."}</p>
      )}

      {affichees.map((d) => (
        <CarteDocument
          key={d.id}
          d={d}
          type="facture"
          enCours={enCours}
          message={messages[d.id]}
          onEnvoyerFacture={envoyerFacture}
          onMarquerPayee={marquerPayee}
          onAnnulerPaiement={annulerPaiement}
          onSupprimer={supprimer}
          onAnnulerParAvoir={annulerParAvoir}
          onArchiver={archiver}
        />
      ))}

      {!voirArchives && archivees.length > 0 && (
        <button type="button" className="lien-archives" onClick={() => setVoirArchives(true)}>
          🗄 Voir les archives ({archivees.length})
        </button>
      )}
    </main>
  );
}
