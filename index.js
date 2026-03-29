import express from "express";
import nodemailer from "nodemailer";
import he from "he";

const app = express();
const port = process.env.PORT || 3000;

const SELF_URL = process.env.SELF_URL;
const PHP_URL = process.env.PHP_URL;
const API_TOKEN = process.env.API_TOKEN;

const PAGE_URL = "https://complexe-citelium.fr/module-inscriptions/reserver/";

// Mode test par variable d'environnement
const TEST_MODE = (process.env.TEST_MODE || "false").toLowerCase() === "true";

// Notifications
const ENABLE_EMAIL = (process.env.ENABLE_EMAIL || "false").toLowerCase() === "true";
const ENABLE_TELEGRAM = (process.env.ENABLE_TELEGRAM || "false").toLowerCase() === "true";

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

async function setLog(message, level = "INFO") {
  const msg = encodeURIComponent(message);
  const lvl = encodeURIComponent(level);
  await fetch(`${PHP_URL}?action=setlog&message=${msg}&level=${lvl}&token=${API_TOKEN}`);
}

async function setHistory(type, oldValue, newValue, detectedAt) {
  const t = encodeURIComponent(type);
  const o = encodeURIComponent(oldValue);
  const n = encodeURIComponent(newValue);
  const d = encodeURIComponent(detectedAt);
  await fetch(`${PHP_URL}?action=sethistory&type=${t}&old=${o}&new=${n}&detected_at=${d}&token=${API_TOKEN}`);
}

app.get("/run", async (req, res) => {
  try {
    // Mode test par URL ou env
    const urlTest = req.query.test === "1";
    const isTest = TEST_MODE || urlTest;

    // Récupération de la valeur courante
    const currentResp = await fetch(`${PHP_URL}?action=get&token=${API_TOKEN}`);
    const currentData = await currentResp.json();
    const periode_courante = parseInt(currentData.valeur, 10);

    // Récupération du nom de semaine courant
    const nomResp = await fetch(`${PHP_URL}?action=getnom&token=${API_TOKEN}`);
    const nomData = await nomResp.json();
    const nom_courant = nomData.nom || "";

    // Page HTML
    const pageResp = await fetch(PAGE_URL);
    const html = await pageResp.text();

    const matchPeriode = html.match(/onclick='update_link_periodes\((\d+)\)'/);
    const matchNom = html.match(/<span class='span_nom_semaine'>(.*?)<\/span>/);

    const nouvelle_periode = matchPeriode ? parseInt(matchPeriode[1], 10) : null;

    // Normalisation des entités HTML
    const nouveau_nom = matchNom ? he.decode(matchNom[1]).trim() : null;

    if (isTest) {
      const now = new Date().toISOString();
      await setLog(`TEST réalisé - détecté à ${now}`, "TEST");
    } else {
      let changements = [];
      const now = new Date().toISOString();

      if (nouvelle_periode !== null && nouvelle_periode !== periode_courante) {
        await fetch(`${PHP_URL}?action=set&valeur=${nouvelle_periode}&token=${API_TOKEN}`);
        changements.push(`periode_courante : ${periode_courante} -> ${nouvelle_periode}`);

        await setHistory("periode_courante", String(periode_courante), String(nouvelle_periode), now);
      }

      if (nouveau_nom !== null && nouveau_nom !== nom_courant) {
        const msg = encodeURIComponent(nouveau_nom);
        await fetch(`${PHP_URL}?action=setnom&nom=${msg}&token=${API_TOKEN}`);
        changements.push(`nom_semaine : "${nom_courant}" -> "${nouveau_nom}"`);

        await setHistory("nom_semaine", nom_courant, nouveau_nom, now);
      }

      if (changements.length > 0) {
        await setLog(`CHANGEMENT détecté à ${now} | ${changements.join(" | ")}`, "INFO");
        await notifier(`CHANGEMENT : ${changements.join(" | ")}`);
      }
    }
  } catch (err) {
    await setLog(`Erreur : ${err.message}`, "ERROR");
  }

  // Auto-appel
  if (SELF_URL) {
    setTimeout(() => {
      fetch(`${SELF_URL}/run`).catch(() => {});
    }, 60 * 1000);
  }

  res.send("OK");
});

app.listen(port, () => console.log("Service actif"));
