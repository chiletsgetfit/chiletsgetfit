# ChiletsGetFit

Marketing site and (eventually) client portal for ChiletsGetFit, a fitness and
nutrition coaching business.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- Hosted on Vercel; domain via GoDaddy
- Supabase (auth + database) — added in a later phase for the client portal

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production build

```bash
npm run build
npm start
```

## Project layout

```
src/
  app/
    (marketing)/           # public-facing pages share a header/footer layout
      page.tsx             # home
      about/, services/, contact/, blog/
    layout.tsx             # root metadata + fonts
    globals.css            # brand theme (gold palette)
    favicon.ico
  components/
    Header.tsx, Footer.tsx, Container.tsx
public/
  brand/                   # logos and photos served on the site
```

The original brand assets (logo source files, photo originals, social media
kits) live in `brand/` at the repo root and are git-ignored — only the
production-ready copies in `public/brand/` are deployed.
