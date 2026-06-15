# Outbound Qualifyier Agent
This repository contains the foundational structure for an outbound lead qualifier workflow powered by Trigger.dev and supporting client integrations.

## Architecture
- `src/trigger/leadPipeline.ts`: Main webhook intake, lead queueing orchestration, and execution entrypoint.
- `src/utils/pricingEngine.ts`: Pure computation helpers for pricing estimates and local solar/utility variables.
- `src/config/apiClients.ts`: Centralized initialization for external API clients (Vapi, HubSpot, Twilio).
- `.env.example`: Template for runtime secrets and base URLs.
- `.github/workflows/`: CI/CD workflow definitions.

## Next implementation steps
1. Add TypeScript config (`tsconfig.json`) and install dependencies.
2. Replace placeholder logic in `leadPipeline.ts` with Trigger.dev tasks and webhook handlers.
3. Implement concrete SDK clients in `apiClients.ts`.
4. Add CI workflow files under `.github/workflows/`.
