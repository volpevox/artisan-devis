import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { clientEmail, clientNom, description, prix } = await req.json();

  if (!clientEmail) {
    return NextResponse.json({ erreur: "Aucun email de client fourni" }, { status: 400 });
  }

  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: clientEmail,
      subject: `Votre devis - ${clientNom}`,
      html: `
        <h2>Devis pour ${clientNom}</h2>
        <p><strong>Description :</strong> ${description}</p>
        <p><strong>Montant :</strong> ${prix} €</p>
        <p>N'hésitez pas à nous contacter pour toute question.</p>
      `,
    });

    return NextResponse.json({ succes: true });
  } catch (e: any) {
    return NextResponse.json({ erreur: e.message }, { status: 500 });
  }
}