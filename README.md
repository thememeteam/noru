# noru

React Native onboarding MVP for trusted student rides:

1. Entra login via Convex Auth
2. Mandatory face capture
3. Upload profile photo to Convex storage
4. Persist onboarding completion in Convex DB

## Setup

### 1) Install dependencies

```bash
bun install
```

### 2) Configure Convex + Auth env vars

Set these on Convex:

- `AUTH_MICROSOFT_ENTRA_ID_ID`
- `AUTH_MICROSOFT_ENTRA_ID_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_TENANT`

And ensure your Entra callback URL is:

`https://<your-deployment>.convex.site/api/auth/callback/microsoft-entra-id`

### 3) Start Convex and generate API

```bash
bunx convex dev
```

### 4) Run Expo app

```bash
bun start --tunnel
```

## Files

- Backend auth config: `convex/auth.ts`
- Backend schema: `convex/schema.ts`
- Backend onboarding functions: `convex/onboarding.ts`
- RN app flow: `App.tsx`

A ride-sharing app for students to get you to transit as fast as possible.

Share an auto, cab or your own car. Noru learns your habits and gives you timely notifications so you can effortlessly save money with others on your route. Above all, rest assured in riding only with a trusted audience of your own peers -- with even more safety features on top.

## Onboarding flow (implemented)

The app now includes a full onboarding MVP:

1. Login with university Entra account (via Convex Auth)
2. Mandatory face/profile photo capture
3. Upload photo to Convex Storage
4. Save onboarding completion to Convex DB
5. Show completion screen

## Setup

### Install dependencies

```bash
bun install
```

### Convex environment variables

Set these in your Convex deployment (`bunx convex env set ...`):

- `AUTH_MICROSOFT_ENTRA_ID_ID`
- `AUTH_MICROSOFT_ENTRA_ID_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_TENANT`

Also ensure `SITE_URL` is set correctly for your environment, and your Entra app callback URL points to:

`https://<your-deployment>.convex.site/api/auth/callback/microsoft-entra-id`

### Expo environment variables

Set in `.env.local`:

- `EXPO_PUBLIC_CONVEX_URL`

### Generate Convex types and run

```bash
bunx convex dev
bun start
```

## Notes

- The current onboarding UI lives in `src/app/index.tsx`.
- Onboarding backend functions are in `convex/onboarding.ts`.
- Auth provider configuration is in `convex/auth.ts`.
- Auth tokens are stored with Expo Secure Store.