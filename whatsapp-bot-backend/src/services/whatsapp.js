const axios = require("axios");
const {
  whatsappProvider,
  waApiVersion,
  waPhoneNumberId,
  waToken,
  twilioAccountSid,
  twilioAuthToken,
  twilioWhatsappNumber,
} = require("../config/env");
const { toTwilioWhatsappAddress } = require("../utils/twilio");

function endpoint() {
  return `https://graph.facebook.com/${waApiVersion}/${waPhoneNumberId}/messages`;
}

async function sendMetaPayload(payload) {
  return axios.post(endpoint(), payload, {
    headers: {
      Authorization: `Bearer ${waToken}`,
      "Content-Type": "application/json",
    },
  });
}

function twilioEndpoint() {
  return `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
}

async function sendTwilioText(to, body) {
  const from = toTwilioWhatsappAddress(twilioWhatsappNumber);
  const destination = toTwilioWhatsappAddress(to);
  return axios.post(
    twilioEndpoint(),
    new URLSearchParams({
      From: from,
      To: destination,
      Body: body,
    }),
    {
      auth: {
        username: twilioAccountSid,
        password: twilioAuthToken,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
}

async function sendText(to, body) {
  if (whatsappProvider === "twilio") return sendTwilioText(to, body);
  return sendMetaPayload({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
}

async function sendButtons(to, body, buttons) {
  if (whatsappProvider === "twilio") {
    const lines = [body, "", "Reply with one option id:"];
    for (const btn of buttons) lines.push(`${btn.id} - ${btn.title}`);
    return sendTwilioText(to, lines.join("\n"));
  }
  return sendMetaPayload({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

async function sendList(to, body, buttonText, sections) {
  if (whatsappProvider === "twilio") {
    const lines = [body, "", `Reply with one option id (${buttonText}):`];
    for (const section of sections || []) {
      lines.push(`- ${section.title}`);
      for (const row of section.rows || []) {
        lines.push(`${row.id} - ${row.title}`);
      }
    }
    return sendTwilioText(to, lines.join("\n"));
  }
  return sendMetaPayload({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body },
      action: { button: buttonText, sections },
    },
  });
}

module.exports = { sendText, sendButtons, sendList };
