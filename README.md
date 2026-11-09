# Gridiron Dash v0.2: your own web link

This folder is the whole game plus a small server. The server shows the game page and relays online
multiplayer, so friends can play you from any network with just a link. Nobody needs a Claude account.

## Put it on Render (free)

Render deploys from a GitHub repository, so there are two parts. A computer is easiest for both.

### 1. Put the files on GitHub
1. Sign in at https://github.com (make a free account if you need one).
2. Click **+** at the top right, then **New repository**. Name it `gridiron-dash`, keep it Public or Private, and click **Create repository**.
3. On the new repository page, click **uploading an existing file**.
4. Unzip `gridiron-dash-render.zip` on your computer. Drag everything inside the unzipped folder into the upload box: `server.js`, `package.json`, `render.yaml`, `README.md`, `.gitignore` and the `public` folder.
   - If the `public` folder doesn’t upload as a folder, open it and drag `index.html` and `room-shim.js` in, then rename each one on GitHub to `public/index.html` and `public/room-shim.js`.
5. Click **Commit changes**.

### 2. Create the web service on Render
1. Sign in at https://render.com with your GitHub account.
2. Click **New**, then **Web Service**, and pick your `gridiron-dash` repository.
3. Fill in:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
4. Click **Create Web Service**. After a minute or two you get a link like `https://gridiron-dash-xxxx.onrender.com`.

(Or click **New**, then **Blueprint**, and pick the repository. Render reads `render.yaml` and sets everything up for you.)

## Playing a friend
1. Open your Render link and tap **Quick game vs a friend** (or **1v1 draft** and choose Online).
2. Tap **Copy invite link** and send it. When your friend opens it, they join your game automatically.
   They can also open the site, tap **Join a friend** and type the 6-letter code.

## Good to know
- On the free plan the site goes to sleep after about 15 minutes without visitors. The first visit after
  that takes up to a minute to load. Then it’s fast.
- Saves (dynasty, 32-team season, settings) stay in each person’s own browser on their own device.
- To update the game later, replace `public/index.html` on GitHub. Render redeploys automatically.

## Run it on your own computer (optional)
With Node.js 18 or newer installed: `npm install`, then `npm start`, then open http://localhost:3000.
