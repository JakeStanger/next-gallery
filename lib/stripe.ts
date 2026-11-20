import Stripe from 'stripe';

// Uses the API version pinned by the installed stripe SDK.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default stripe;
