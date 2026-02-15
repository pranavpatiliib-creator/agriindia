const express = require("express");
const { waVerifyToken, twilioAuthToken, twilioValidateSignature, twilioWebhookUrl } = require("../config/env");
const User = require("../models/User");
const { processIncoming, sendMenu } = require("../utils/stateMachine");
const { normalizePhone, isValidTwilioSignature } = require("../utils/twilio");

const router = express.Router();

function extractActionId(message = {}) {
  if (message?.interactive?.button_reply?.id) return message.interactive.button_reply.id;
  if (message?.interactive?.list_reply?.id) return message.interactive.list_reply.id;
  return null;
}

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === waVerifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post("/", async (req, res) => {
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];
    if (!message || !contact) return res.sendStatus(200);

    const waId = contact.wa_id;
    const profileName = contact?.profile?.name || "";
    const actionId = extractActionId(message);

    let user = await User.findOne({ waId });
    if (!user) user = await User.create({ waId, profileName });
    if (profileName && user.profileName !== profileName) {
      user.profileName = profileName;
      await user.save();
    }

    if (!actionId) {
      await sendMenu(user, user.language ? "main_menu" : "language_select");
    } else {
      await processIncoming(user, actionId);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error", error.message);
    return res.sendStatus(200);
  }
});

router.post("/twilio", async (req, res) => {
  try {
    if (twilioValidateSignature) {
      const signature = req.get("X-Twilio-Signature");
      const resolvedUrl =
        twilioWebhookUrl ||
        `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      const valid = isValidTwilioSignature({
        url: resolvedUrl,
        params: req.body || {},
        authToken: twilioAuthToken,
        signature,
      });

      if (!valid) return res.status(403).send("Invalid Twilio signature");
    }

    const from = req.body?.From;
    const profileName = req.body?.ProfileName || "";
    const actionId = String(req.body?.ButtonPayload || req.body?.Body || "").trim();

    if (!from) return res.sendStatus(200);

    const waId = normalizePhone(from);
    let user = await User.findOne({ waId });
    if (!user) user = await User.create({ waId, profileName });
    if (profileName && user.profileName !== profileName) {
      user.profileName = profileName;
      await user.save();
    }

    if (!actionId) {
      await sendMenu(user, user.language ? "main_menu" : "language_select");
    } else {
      await processIncoming(user, actionId);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Twilio webhook error", error.message);
    return res.sendStatus(200);
  }
});

module.exports = router;
