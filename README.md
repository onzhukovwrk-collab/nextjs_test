# Pushwoosh Web SDK — Next.js Demo

Minimal working example of Pushwoosh Web Push integration in a **Next.js 14 + React + TypeScript** app.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the page must be served over **HTTPS or localhost** for push subscriptions to work.

## Project structure

```
public/
  manifest.json                  # Required: served from the site root
  pushwoosh-service-worker.js    # Required: served from the site root

app/
  layout.tsx                     # Links manifest.json in <head>
  page.tsx                       # Entry point
  globals.css
  components/
    PushwooshDemo.tsx             # 'use client' — all SDK logic lives here
```

## Key integration points

### 1. Client-only SDK (`'use client'` + dynamic import)

```tsx
'use client';

useEffect(() => {
  (async () => {
    // Dynamic import ensures Pushwoosh is never imported on the server
    const { default: Pushwoosh } = await import('web-push-notifications');

    Pushwoosh.push(['init', {
      applicationCode: 'YOUR-APP-CODE',
      apiToken: 'YOUR-API-TOKEN',
      autoSubscribe: false,
      serviceWorkerUrl: '/pushwoosh-service-worker.js',
    }]);

    Pushwoosh.push(['onReady', async () => {
      const subscribed = await Pushwoosh.isSubscribed();
      // update your state here
    }]);
  })();
}, []);
```

### 2. Static files in `/public`

`manifest.json` and `pushwoosh-service-worker.js` must be accessible at the **root URL** of your site.
In Next.js — place them in the `/public` folder.

### 3. Link manifest in layout

```tsx
// app/layout.tsx
<head>
  <link rel="manifest" href="/manifest.json" />
</head>
```

## Config

Edit `app/components/PushwooshDemo.tsx`:

```ts
const APP_CODE  = 'YOUR-APP-CODE';
const API_TOKEN = 'YOUR-API-TOKEN';
```
