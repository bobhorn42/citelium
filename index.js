import express from "express";
import nodemailer from "nodemailer";

const app = express();
const port = process.env.PORT || 3000;

const SELF_URL = process.env.SELF_URL;
const PHP_URL = process.env.PHP_URL;
const API_TOKEN = process.env.API_TOKEN; // token partagé

const PAGE_URL = "https://complexe-citelium.fr/module-inscriptions/reserver/";

// Activation notifications
const ENABLE_EMAIL = (process.env.ENABLE_EMAIL || "false").toLowerCase() === "true";
const ENABLE_TELEGRAM = (process.env.ENABLE_TELEGRAM || "false").toLowerCase() === "true";

// Email SMTP (ex: OVH)
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = process.env.EMAIL_PORT || 465;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_TO = process.env.EMAIL_TO;

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: Number(EMAIL_PORT),
  secure: true,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

async function envoyerEmail(sujet, message) {
  if (!ENABLE_EMAIL) return;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS || !EMAIL_TO) return;

  await transporter.sendMail({
    from: EMAIL_USER,
    to: EMAIL_TO,
    subject: sujet,
    text: message
  });
}

async function envoyerTelegram(message) {
  if (!ENABLE_TELEGRAM) return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message })
  });
}

async function notifier(message) {
  await envoyerEmail("Notification", message);
  await envoyerTelegram(message);
}

app.get("/run", async (req, res) => {
  try {
    // 1) Récupère la valeur courante depuis PHP (sécurisé par token)
    const currentResp = await fetch(`${PHP_URL}?action=get&token=${API_TOKEN}`);
    const currentData = await currentResp.json();
    const periode_courante = parseInt(currentData.valeur, 10);

    // 2) Récupère la page une seule fois
    const pageResp = await fetch(PAGE_URL);
    const html = await pageResp.text();

    const match = html.match(/onclick='update_link_periodes\((\d+)\)'/);
    if (match) {
      const nouvelle_periode = parseInt(match[1], 10);

      if (nouvelle_periode !== periode_courante) {
        // 3) Mise à jour via PHP
        await fetch(`${PHP_URL}?action=set&valeur=${nouvelle_periode}&token=${API_TOKEN}`);

        // 4) Notifications
        await notifier(`De nouveaux créneaux sont disponibles (code : ${nouvelle_periode}) !!!`);
      }
    }
  } catch (err) {
    await notifier(`Erreur : ${err.message}`);
  }

  // Auto-appel dans 1 min (sans boucle)
  if (SELF_URL) {
    setTimeout(() => {
      fetch(`${SELF_URL}/run`).catch(() => {});
    }, 60 * 1000);
  }

  res.send("OK");
});

app.listen(port, () => console.log("Service actif"));

