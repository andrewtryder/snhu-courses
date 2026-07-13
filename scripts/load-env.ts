import { config } from 'dotenv';

// Prefer Next.js local secrets; then fill gaps from .env. Do not override
// vars already present in the shell (e.g. POSTGRES_URL='...' npm run ...).
config({ path: '.env.local' });
config({ path: '.env' });
