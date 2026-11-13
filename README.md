# Friendsgiving sign-up

A one-page sign-up where guests add what they're bringing. Everyone sees the same live list.

## Deploy (about 10 minutes)

1. Install the Vercel CLI and log in: `npm i -g vercel` then `vercel login`.
2. In this folder run `vercel` and accept the defaults. Then run `vercel --prod`.
3. In the Vercel dashboard open your project, go to **Storage**, choose **Upstash Redis** from the Marketplace, create a free database and connect it to the project. This adds the environment variables the app needs.
4. Optional: add an environment variable `ADMIN_KEY` with any password you like. Visit `https://your-site.vercel.app/?admin=YOUR_PASSWORD` once on your own device and every dish gets a Remove button, so you can clean up the list.
5. Redeploy once so the new variables load: `vercel --prod`.

Send guests the site link. They only need to enter their name and add dishes; no accounts.

## Notes

- Guests can remove only the dishes they added (from the same browser). You can remove any with the admin link.
- To change the date, address or sections, edit `public/index.html`.
- The list refreshes every 20 seconds and when someone returns to the tab.
