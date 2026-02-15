const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,
  whatsappProvider: process.env.WHATSAPP_PROVIDER || "meta",
  waToken: process.env.WHATSAPP_TOKEN,
  waPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  waVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  waApiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
  twilioValidateSignature: String(process.env.TWILIO_VALIDATE_SIGNATURE || "false").toLowerCase() === "true",
  twilioWebhookUrl: process.env.TWILIO_WEBHOOK_URL,
};
