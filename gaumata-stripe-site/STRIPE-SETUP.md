# Stripe donation setup

The Gau Mata page is now the storefront at `/`.

## Payment flow
1. Visitor clicks the donation CTA and reaches the offering section.
2. Visitor chooses USD $5–$500 with the slider, preset buttons, or custom amount.
3. The browser POSTs the amount to `/api/create-donation-checkout`.
4. The server validates the amount and creates a Stripe Checkout Session server-side.
5. Visitor is redirected to Stripe-hosted Checkout.
6. Stripe redirects a successful payment to `/success.html?session_id=...`.
7. The success page calls `/api/donation-status`; the server retrieves the Checkout Session directly from Stripe and displays success only when `payment_status === paid`.
8. Recommended: Stripe also POSTs `checkout.session.completed` to `/api/stripe-webhook`; valid signed paid events are recorded in `data/donations.json`.

## Environment variables
- `BASE_URL`: public HTTPS origin, no trailing slash, e.g. `https://example.com`
- `STRIPE_SECRET_KEY`: use `sk_test_...` first, then `sk_live_...` for production.
- `STRIPE_WEBHOOK_SECRET`: webhook endpoint signing secret `whsec_...`.
- `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET`: legacy demo-shop admin routes remain in the project; change these if you expose them.

No Stripe publishable key is required for this implementation because payment details are entered on Stripe-hosted Checkout, not on your page.

## Stripe webhook
Configure the endpoint as:
`https://YOUR-DOMAIN/api/stripe-webhook`

Subscribe at minimum to:
`checkout.session.completed`

## Local start
`npm install`
`npm start`

Use Stripe test mode first. Do not paste live secret keys into source files or chat messages; store them in the hosting provider's encrypted environment/secrets settings.
