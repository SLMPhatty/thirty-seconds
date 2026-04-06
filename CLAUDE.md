# thirty — Marketing Website

## What This Is
Marketing website for the thirty meditation app. Contains landing page, healthcare workers niche page, privacy policy, and support page.

## Tech Stack
- Plain HTML/CSS (no framework)
- Vite for build/dev server (multi-page config in vite.config.js)
- Static files deployed to Vercel
- GitHub repo: SLMPhatty/thirty-seconds

## Pages
- `index.html` — Main landing page with breathing animation, features, physician credibility section, healthcare workers banner
- `healthcare.html` — Niche landing page for healthcare workers (doctors, nurses, clinical staff) — 6 clinical scenarios, burnout stats, physician-built positioning
- `privacy.html` — Privacy policy
- `support.html` — Support/FAQ page
- `sitemap.xml` — SEO sitemap
- `robots.txt` — Search engine crawler rules

## Build
```bash
npx vite build    # Outputs to dist/
npx vite          # Dev server
```

## Deployment
Push to `main` → Vercel auto-deploys from the repo.

## Key Positioning
- **Physician-built** — Dr. Seth Miller (GP) built this for himself, then for his patients
- **Healthcare workers niche** — dedicated page targeting physicians, nurses, clinical staff
- **$4.99 lifetime** — no subscription, anti-Calm/Headspace positioning
- **Privacy-first** — no analytics, no tracking, all data local

## SEO
- Schema.org SoftwareApplication structured data on index.html
- Schema.org WebPage + author data on healthcare.html
- Sitemap submitted for Google indexing
- Target keywords: meditation app, healthcare worker meditation, physician burnout, 30 second meditation

## 🍎 Apple App Store Review Guidelines
Before submitting to the App Store, READ: /Users/slm/.openclaw/workspace/memory/apple-review-guidelines.md
Contains complete guidelines + pre-submission checklist. Pep Stack Pro was rejected 2026-03-24 for 2.1 + 1.4.1.
