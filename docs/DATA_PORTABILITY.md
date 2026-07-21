# UMAYv2 Data Portability

UMAYv2 UI depends on the provider-neutral functions in `src/services/umayData.ts`, not on database calls inside screens.

Current adapter:
- AppDeploy HTTP API and realtime subscriptions
- AppDeploy database records stored by stable collection key
- Automatic one-time migration from legacy browser localStorage
- JSON export through `GET /api/data/export`

To move to Render, Replit, Supabase, Neon, or another PostgreSQL host:
1. Keep component calls to `useUmayCollection` unchanged.
2. Replace the implementation of `src/services/umayData.ts` with the target API adapter.
3. Implement equivalent GET/PUT/export endpoints against PostgreSQL.
4. Import the JSON export, preserving collection keys and values.

Stable collection keys:
- campaigns
- education
- cardRules
- noteRules
- archivedCampaignIds

The AppDeploy SDK is isolated to `backend/*`; UI components do not import it.

