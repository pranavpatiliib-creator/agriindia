# WhatsApp Menu Bot Backend

Complete menu-driven WhatsApp bot backend using Node.js, Express, MongoDB, and WhatsApp Cloud API.

## Features
- Menu-only state machine (no free text required)
- Language selection (first-time user)
- Main modules: Crop Info, MSP, Subsidy, Loan, Insurance
- Dynamic menus from MongoDB (`menus` collection)
- User state stored in MongoDB (`users.state`)
- Interactive WhatsApp buttons and list menus
- REST APIs for all entities

## Project Structure
- `package.json`
- `src/app.js`
- `src/config/*`
- `src/models/*.js`
- `src/routes/*.js`
- `src/services/whatsapp.js`
- `src/utils/stateMachine.js`
- `scripts/seedMenus.js`
- `scripts/testWebhook.js`

## Environment Variables
Copy `.env.example` to `.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/whatsapp-bot
WHATSAPP_API_VERSION=v21.0
WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID
WHATSAPP_TOKEN=YOUR_CLOUD_API_TOKEN
WHATSAPP_VERIFY_TOKEN=YOUR_VERIFY_TOKEN

TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_NUMBER=+14155238886
TWILIO_VALIDATE_SIGNATURE=false
TWILIO_WEBHOOK_URL=https://<your-domain>/webhook/twilio
```

Set `WHATSAPP_PROVIDER=meta` for Meta Cloud API or `WHATSAPP_PROVIDER=twilio` for Twilio.

## Setup
```bash
npm install
npm run seed:menus
npm run sync:crops
npm run dev
```

## WhatsApp Cloud API Webhook Setup
1. Deploy backend (or expose local with ngrok).
2. In Meta App Dashboard:
   - Webhook URL: `https://<your-domain>/webhook`
   - Verify token: same as `WHATSAPP_VERIFY_TOKEN`
3. Subscribe to `messages` field.

## Twilio Webhook Setup
1. Set `WHATSAPP_PROVIDER=twilio` in `.env`.
2. In Twilio WhatsApp sender config, set incoming webhook URL to `https://<your-domain>/webhook/twilio`.
3. If signature validation is enabled, set `TWILIO_VALIDATE_SIGNATURE=true` and make sure `TWILIO_WEBHOOK_URL` exactly matches the public webhook URL.

## Navigation Flow
1. First contact -> `language_select`
2. Language selected -> `main_menu`
3. Main menu options:
   - Crop Info
   - MSP
   - Subsidy
   - Loan
   - Insurance
4. Crop flow: Category -> Crop -> Information Type -> Details
5. Every module supports `Back` and `Main Menu`

## REST APIs
Base: `/api`

- `GET/POST /users`
- `GET/POST /menus`
- `GET/POST /crops`
- `GET/POST /diseases`
- `GET/POST /fertilizers`
- `GET/POST /msp`
- `GET/POST /subsidies`
- `GET/POST /loans`
- `GET/POST /insurance`

And for each:
- `GET /:id`
- `PUT /:id`
- `DELETE /:id`

## Testing Scripts
Trigger webhook simulation:
```bash
npm run test:webhook
```

You can also set custom base URL:
```bash
BASE_URL=https://<your-domain> npm run test:webhook
```

## Deployment Notes
- Set production environment variables.
- Use MongoDB Atlas for production DB.
- Use HTTPS domain for webhook.
- Scale stateless app instances; user state is persisted in MongoDB.

## Crop Dataset Sync
Run this to import Kharif, Rabi, Cash, and Fruit crops into the `crops` collection:
```bash
npm run sync:crops
```

