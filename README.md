# Matteo's Posting Hub

One composer that publishes to every channel in a group: Instagram, Facebook Page and YouTube through Postiz, TikTok through Postforme.

## Pages

| Page | What it does |
|---|---|
| `/` Create | Pick a group, choose **Reel** or **Carousel**, add media, caption, music (Instagram carousels only), then schedule, post now or save a draft. Live Instagram phone preview. |
| `/queue` | Upcoming and past posts. Drag to swap time slots, toggle a post off to pull it from every platform, edit the time once to move it everywhere. |
| `/gallery` | Every uploaded file. Move to the recycle bin, restore, or delete forever. |
| `/setup` | Group accounts (one box per brand), refresh connected accounts, connect a new TikTok. |
| `/settings` | Recycle-bin timings (default: bin after 30 days, delete after 7), posting defaults. |

## How a post fans out

- One remote post per channel. Postiz IDs and Postforme IDs are stored on `PostTarget`.
- Editing a time: Postiz copies are deleted and recreated; Postforme copies are updated in place.
- Platform rules (`src/lib/rules.ts`): a reel is one video; a carousel is 2–10 items. YouTube skips carousels; Facebook and TikTok skip carousels that contain video.
- Statuses are checked every 5 minutes, and whenever the Queue opens.

## Deploy on Easypanel

1. **Postgres service**: create one, then copy its *internal* connection URL.
2. **App service**: Source = this GitHub repo, branch `main`, Build = **Dockerfile**.
3. **Environment**: copy `.env.example` and fill it in.
4. **Mounts**: add a volume mounted at `/data/uploads`. Without it, uploads vanish on redeploy.
5. **Domains**: point `matteopostinghub.vzzn.studio` at port `3000`.
6. Deploy. Migrations run automatically on boot.

## Local dev

```bash
npm install
cp .env.example .env   # fill in, DATABASE_URL can be any Postgres
npx prisma migrate deploy
npm run dev
npm test               # rule unit tests
```

Fonts (Editorial Today, Xenon Nue) are commercial licences and are bundled in `src/app/fonts`. Keep this repository private.
