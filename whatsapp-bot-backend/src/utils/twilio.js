const crypto = require("crypto");

function normalizePhone(value = "") {
  return String(value).replace(/^whatsapp:/i, "").trim();
}

function toTwilioWhatsappAddress(value = "") {
  const phone = normalizePhone(value);
  return phone ? `whatsapp:${phone}` : "";
}

function computeSignature(url, params, authToken) {
  const sortedKeys = Object.keys(params || {}).sort();
  const data = sortedKeys.reduce((acc, key) => `${acc}${key}${params[key] ?? ""}`, url);
  return crypto.createHmac("sha1", authToken).update(data).digest("base64");
}

function isValidTwilioSignature({ url, params, authToken, signature }) {
  if (!url || !authToken || !signature) return false;
  const expected = computeSignature(url, params, authToken);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = {
  normalizePhone,
  toTwilioWhatsappAddress,
  isValidTwilioSignature,
};
