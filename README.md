# VS Developers website

## Admin blog on Vercel and Neon

The public blog and admin editor use Neon. The database stores the single administrator's email and a salted scrypt password hash; it never stores the plaintext password. The hash is initialized locally from ignored environment settings.

1. Rotate the Neon database password because the previous connection string was exposed in chat. Then run [`migrations/001_blog.sql`](./migrations/001_blog.sql) in the Neon SQL Editor. It creates the blog, admin, and login-rate-limit tables and imports the four existing articles. Re-running it will not duplicate those articles.
2. In Vercel **Settings > Environment Variables**, set `DATABASE_URL` to the rotated Neon pooled connection string and set `SESSION_SECRET` to a random secret of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`, then redeploy.
3. In the repository root, run `npm install`, copy `.env.example` to `.env.local`, and replace the placeholders with the rotated `DATABASE_URL`, `ADMIN_EMAIL`, and a new private `ADMIN_PASSWORD` of at least 16 characters. `.env.local` is git-ignored. Run `npm run bootstrap-admin` to store the email and salted password hash in Neon. Re-run this command to replace the one admin account/password.
4. Open `/admin.html` to sign in and create, edit, or delete posts. Changes publish to the public blog immediately.

Do not put credentials in `index.html`, `admin.js`, or a committed file. After bootstrapping, the app reads administrator credentials from Neon; `ADMIN_EMAIL` and `ADMIN_PASSWORD` are only read by the local bootstrap script. Cover images are added by URL and article text is plain text with line breaks.

For local sign-in testing, run `npx vercel dev` after configuring `.env.local` and applying the migration. A static server such as Python's `http.server` serves the page files only; it does not run `/api` functions.
