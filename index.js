// index.js
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const path = require("path");

async function startBot() {
    // pasta de autenticação
    const authFolder = path.join(__dirname, "auth");
    if (!fs.existsSync(authFolder)) fs.mkdirSync(authFolder);

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    // Criando socket
    const sock = makeWASocket({
        logger: P({ level: "silent" }),
        auth: state,
        version
    });

    sock.ev.on("creds.update", saveCreds);

    // Evento de conexão
    sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update;

        if (qr) {
            // salva QR como texto
            const qrPath = path.join(__dirname, "qr.txt");
            fs.writeFileSync(qrPath, qr, "utf-8");

            // lê o QR do arquivo e mostra no console
            const qrText = fs.readFileSync(qrPath, "utf-8");
            console.log("📲 Novo QR gerado! Escaneie este código com o WhatsApp:\n");
            console.log(qrText); // mostra a string no console
        }

        if (connection === "open") {
            console.log("✅ Bot conectado ao WhatsApp!");
        }
    });

    // --- Lógica original do bot ---
    const atendenteNumber = "553496359355@s.whatsapp.net";
    const blockedUsers = new Map();
    const userToAtendente = new Map();

    function isBlocked(user) {
        const unblockTime = blockedUsers.get(user);
        if (!unblockTime) return false;
        if (Date.now() > unblockTime) {
            blockedUsers.delete(user);
            sock.sendMessage(user, { text: `✅ *Atendimento Finalizado*\n\n> O seu atendimento foi encerrado pelo sistema.` });
            userToAtendente.delete(user);
            return false;
        }
        return true;
    }

    async function simulateEdit(sender, texts, interval = 3000) {
        await sock.sendMessage(sender, { text: texts[0] });
        for (let i = 1; i < texts.length; i++) {
            await new Promise(r => setTimeout(r, interval));
            await sock.sendMessage(sender, { text: texts[i] });
        }
    }

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        const sender = m.key.remoteJid;
        let text = "";

        if (m.message.conversation) text = m.message.conversation.trim();
        else if (m.message.extendedTextMessage?.text) text = m.message.extendedTextMessage.text.trim();

        // --- Comandos do atendente ---
        if (sender === atendenteNumber && text === "/fechar") {
            for (let [user, atendente] of userToAtendente.entries()) {
                if (atendente === atendenteNumber) {
                    await sock.sendMessage(user, { text: `✅ *Atendimento Finalizado*\n\n> O seu atendimento foi encerrado pelo sistema.` });
                    blockedUsers.delete(user);
                    userToAtendente.delete(user);
                }
            }
            return;
        }

        if (sender === atendenteNumber && text.startsWith("/chat ")) {
            const msgToSend = text.replace("/chat ", "").trim();
            for (let [user, atendente] of userToAtendente.entries()) {
                if (atendente === atendenteNumber) {
                    await sock.sendMessage(user, { text: `💬 *Mensagem do Servidor:*\n\n${msgToSend}` });
                }
            }
            return;
        }

        if (m.key.fromMe) return;
        if (isBlocked(sender)) return;

        const menu = `📋 *Menu Bigo Live*  
Digite o número da opção desejada:

1 ➔ Informações  
2 ➔ Fazer parte  
3 ➔ Falar com atendente  
4 ➔ Valores ganhos  
5 ➔ Atendimento via chamada`;

        if (!["1","2","3","4","5"].includes(text)) {
            await sock.sendMessage(sender, { text: menu });
            return;
        }

        switch (text) {
            case "1":
                await simulateEdit(sender, [
                    "> Aguarde um momento...",
                    "> Buscando no servidor...",
                    `📌 *Informações sobre a Bigo Live:*\n\nNo Bigo Live, você pode ganhar dinheiro fazendo transmissões ao vivo...`
                ]);
                break;

            case "2":
                await simulateEdit(sender, [
                    "> Aguarde um momento...",
                    "> Buscando no servidor...",
                    `🚀 *Para fazer parte da nossa agência, siga os passos abaixo:*\n1️⃣ Baixe o app Bigo Live...`
                ]);
                await sock.sendMessage(atendenteNumber, { text: `⚠️ Novo chamado: [${sender}] escolheu a opção "Fazer parte".` });
                blockedUsers.set(sender, Date.now() + 15 * 60 * 1000);
                userToAtendente.set(sender, atendenteNumber);
                break;

            case "3":
                await simulateEdit(sender, [
                    "> Aguarde um momento...",
                    "> Buscando no servidor...",
                    `💬 *Falar com atendente*\n`
                ]);
                await sock.sendMessage(atendenteNumber, { text: `⚠️ Novo chamado: [${sender}] escolheu a opção "Falar com atendente".` });
                blockedUsers.set(sender, Date.now() + 15 * 60 * 1000);
                userToAtendente.set(sender, atendenteNumber);
                break;

            case "4":
            case "5":
                await simulateEdit(sender, [
                    "> Aguarde um momento...",
                    "> Buscando no servidor...",
                    "> Função específica da opção selecionada."
                ]);
                break;

            default:
                await simulateEdit(sender, ["> Opção não reconhecida."]);
        }
    });
}

startBot();
