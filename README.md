# VS Developers website

## Admin blog setup

The admin page and public blog use Vercel Functions with a Neon PostgreSQL database. Administrator passwords are salted and hashed before storage; they are not included in the website source.

1. Create a Neon database and run [`migrations/001_blog.sql`](./migrations/001_blog.sql) in its SQL editor.
2. In Vercel project settings, set `DATABASE_URL` to the Neon connection string and set `SESSION_SECRET` to a random value of at least 32 characters. Redeploy after setting these values.
3. For local setup, copy `.env.example` to `.env.local`, set `DATABASE_URL`, `ADMIN_EMAIL`, and a private `ADMIN_PASSWORD` of at least 16 characters. `.env.local` is ignored by Git.
4. Run `npm install` and `npm run bootstrap-admin` to create or update the administrator account. The password is stored in Neon as a salted hash.
5. Open `/admin` (or `/admin.html`) to sign in, create, edit, or delete posts. Published posts appear on the website's Blog page.

For local development, run the site with `npx vercel dev` so the `/api` functions are available. A static file server cannot handle authentication or save blog posts.

Keep all database and admin credentials in private environment settings. Do not put them in HTML, JavaScript, or committed files.
