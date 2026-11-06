# Install PharmaHub on a phone or computer

PharmaHub can be installed as a Progressive Web App (PWA) from its secure Vercel URL. It remains the same web app; installing it adds a home-screen or desktop launcher and does not create an APK or app-store listing.

## Android

1. Open the deployed PharmaHub URL in Chrome.
2. Tap **Install PharmaHub** when the prompt appears, or open Chrome's three-dot menu and choose **Install app** / **Add to Home screen**.
3. Confirm the installation. PharmaHub will appear in the app launcher and on the home screen.

## iPhone or iPad

1. Open the deployed URL in **Safari**.
2. Tap **Share** and choose **Add to Home Screen**.
3. Tap **Add**. Open PharmaHub from its new home-screen icon.

## Laptop or desktop

Open the deployed URL in Chrome or Edge and use the install icon in the address bar, or choose **Install PharmaHub** from the browser menu.

This setup intentionally does not cache pages or authenticated data for offline use. The app needs an internet connection to load its live content. The service worker only passes eligible requests through to the network.

## Deployment

With the repository's production branch set to `main` in Vercel, a commit to `main` should trigger a production deployment automatically. After deployment, visit `/manifest.json` and `/sw.js` on the deployed site to confirm they load, then test the installation flow on a real device.
