import nodemailer from "nodemailer";

// Variables initiales
let limite_boucle = 10;
let periode_courante = 269680;

let compteur = 0;
const url = "https://complexe-citelium.fr/module-inscriptions/reserver/";

// --- CONFIG Email via variables d’environnement (OVH SSL) ---
const EMAIL_HOST = process.env.EMAIL_HOST; // ssl0.ovh.net
const EMAIL_PORT = process.env.EMAIL_PORT || 465;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_TO = process.env.EMAIL_TO;

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: Number(EMAIL_PORT),
  secure: true, // ✅ SSL obligatoire sur le port 465
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

const envoyerEmail = async (sujet, message) => {
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS || !EMAIL_TO) return;

  await transporter.sendMail({
    from: EMAIL_USER,
    to: EMAIL_TO,
    subject: sujet,
    text: message
  });
};

const interval = setInterval(async () => {
  compteur++;

  try {
    const response = await fetch(url);
    const html = await response.text();

    const match = html.match(/onclick='update_link_periodes\((\d+)\)'/);

    if (match) {
      const nouvelle_periode = parseInt(match[1], 10);

      if (nouvelle_periode !== periode_courante) {
        periode_courante = nouvelle_periode;

        await envoyerEmail(
          "Changement détecté",
          "CHANGEMENT : " + periode_courante
        );
      }
    }
  } catch (err) {
    await envoyerEmail(
      "Erreur de récupération",
      "Erreur lors de la récupération : " + err.message
    );
  }

  if (compteur >= limite_boucle) {
    clearInterval(interval);
    await envoyerEmail(
      "Fin de boucle",
      "La boucle s'est arrêtée après " + limite_boucle + " itérations."
    );
  }
}, 60 * 1000);
