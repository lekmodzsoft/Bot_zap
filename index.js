// index.js
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const P = require("pino");
const qrcode = require("qrcode-terminal"); // npm install qrcode-terminal
const fs = require("fs");
const path = require("path");

async function startBot() {
    // Certifica que a pasta auth existe
    const authFolder = path.join(__dirname, "auth");
    if (!fs.existsSync(authFolder)) fs.mkdirSync(authFolder);

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        logger: P({ level: "silent" }),
        auth: state,
        version
    });

    sock.ev.on("creds.update", saveCreds);

    // Evento de conexão
    sock.ev.on("connection.update", (update) => {
        const { connection, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log("📲 Escaneie este QR code com o WhatsApp");
        }
        if (connection === "open") {
            console.log("✅ Bot conectado ao WhatsApp!");
        }
    });

    const atendenteNumber = "553496359355@s.whatsapp.net"; // número do atendente
    const blockedUsers = new Map();
    const userToAtendente = new Map();

    function isBlocked(user) {
        const unblockTime = blockedUsers.get(user);
        if (!unblockTime) return false;
