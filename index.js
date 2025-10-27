// index.js
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const P = require("pino");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        logger: P({ level: "silent" }),
        printQRInTerminal: true,
        auth: state,
        version
    });

    sock.ev.on("creds.update", saveCreds);

    const atendenteNumber = "553496359355@s.whatsapp.net"; // número do atendente
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

    // Função para simular "edição" de mensagens
    async function simulateEdit(sender, texts, interval = 3000) {
        // Envia a primeira mensagem
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
                    `📌 *Informações sobre a Bigo Live:*\n\nNo Bigo Live, você pode ganhar dinheiro fazendo transmissões ao vivo. O sistema funciona com metas mensais de feijões que, se alcançadas, garantem o pagamento de um salário fixo. A principal forma de monetização é através dos presentes virtuais que os espectadores enviam durante suas lives. Esses presentes se convertem em feijões, que são a moeda interna do aplicativo.`
                ]);
                break;

            case "2":
                await simulateEdit(sender, [
                    "> Aguarde um momento...",
                    "> Buscando no servidor...",
                    `🚀 *Para fazer parte da nossa agência, siga os passos abaixo:*\n\n1️⃣ Baixe o aplicativo Bigo Live\n- Android: [Play Store](https://play.google.com/store/apps/details?id=sg.bigo.live)\n- iOS: [App Store](https://apps.apple.com/br/app/bigo-live-transmiss%C3%A3o-ao-vivo/id1077137248)\n2️⃣ Crie sua conta no Bigo Live.\n3️⃣ Envie uma mensagem nesta conversa para iniciarmos seu contrato com a agência.`
                ]);

                await sock.sendMessage(
                    atendenteNumber,
                    { text: `⚠️ Novo chamado: [${sender}](https://wa.me/${sender.replace("@s.whatsapp.net","")}) escolheu a opção "Fazer parte".` }
                );
                blockedUsers.set(sender, Date.now() + 15 * 60 * 1000);
                userToAtendente.set(sender, atendenteNumber);
                break;

            case "3":
                await simulateEdit(sender, [
                    "> Aguarde um momento...",
                    "> Buscando no servidor...",
                    `💬 *Falar com atendente*\n\nUm atendente foi chamado e entrará em contato com você. Enquanto isso, você pode enviar uma mensagem diretamente: wa.me/${atendenteNumber.replace("@s.whatsapp.net","")}`
                ]);

                await sock.sendMessage(
                    atendenteNumber,
                    { text: `⚠️ Novo chamado: [${sender}](https://wa.me/${sender.replace("@s.whatsapp.net","")}) escolheu a opção "Falar com atendente".` }
                );
                blockedUsers.set(sender, Date.now() + 15 * 60 * 1000);
                userToAtendente.set(sender, atendenteNumber);
                break;

            case "4":
                await simulateEdit(sender, [
                    "> Aguarde um momento...",
                    "> Buscando no servidor...",
                    `💎 *💰 Valores e Bônus na Bigo Live* 💎\n\nAlcance suas metas de feijões e receba os seguintes bônus (em USD):\n✨ Metas e Bônus\n➔ 2.000 Feijões: 💵 $14\n➔ 5.000 Feijões: 💵 $35\n➔ 10.000 Feijões: 💵 $74\n...`
                ]);
                break;

            case "5":
                await simulateEdit(sender, [
                    "> Aguarde um momento...",
                    "> Buscando no servidor...",
                    `📞 *Atendimento via chamada*\n\nUm atendente foi notificado e já irá te atender. Aguarde um momento.`
                ]);

                await sock.sendMessage(
                    atendenteNumber,
                    { text: `⚠️ Novo chamado: [${sender}](https://wa.me/${sender.replace("@s.whatsapp.net","")}) escolheu a opção "Atendimento via chamada".` }
                );
                blockedUsers.set(sender, Date.now() + 15 * 60 * 1000);
                userToAtendente.set(sender, atendenteNumber);
                break;

            default:
                await simulateEdit(sender, [
                    "> Aguarde um momento...",
                    "> Buscando no servidor...",
                    "> Opção não reconhecida."
                ]);
        }
    });
}

startBot();