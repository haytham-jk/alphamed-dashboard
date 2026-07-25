# Alphamed Operations Hub PWA

Copy all files into the matching repository paths. Preserve your existing `package-lock.json` from the successful `npm install`.

Then run:

```powershell
npm run build
npm run preview
```

After local testing, commit and push. Confirm the Vercel environment variables remain configured. On Android Chrome, open the production URL and use the in-app **Install Operations Hub** button or Chrome menu > **Install app**.

The service worker caches the app shell and same-origin navigation only. Supabase API and authentication responses are not explicitly cached. Operational records still require a network connection.
