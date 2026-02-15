const axios = require("axios");

const baseUrl = process.env.BASE_URL || "http://localhost:5000";

const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ wa_id: "919999999999", profile: { name: "Test User" } }],
            messages: [
              {
                from: "919999999999",
                id: "wamid.test",
                type: "interactive",
                interactive: { button_reply: { id: "lang_en", title: "English" }, type: "button_reply" },
              },
            ],
          },
        },
      ],
    },
  ],
};

axios
  .post(`${baseUrl}/webhook`, payload, { headers: { "Content-Type": "application/json" } })
  .then((res) => console.log("Webhook status:", res.status))
  .catch((err) => console.error(err.response?.data || err.message));
