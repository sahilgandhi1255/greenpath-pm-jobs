# GreenPath PM Jobs 🌿

> **Curated Product Management Roles Aggregator**  
> A high-performance, single-page job feed aggregator designed with a **Modern Forest Green / Deep Nature** aesthetic, built to run effortlessly on the **Netlify Free Tier**.

![GreenPath PM Jobs](/public/logo.svg)

---

## ✨ Features & Capabilities

- 🌲 **Forest Green Design System**: Deep slate/dark pine palette (`#08140E`), glassmorphism cards (`rgba(13, 32, 24, 0.72)`), glowing emerald accents (`#10B981`, `#34D399`), and high-contrast typography.
- ⚡ **Dense Pro Table View & Visual Grid View**: One-click toggle between a comprehensive table view and rich glass cards.
- 🎯 **Multi-Criteria Filter Engine**:
  - **Instant Debounced Search**: Searches across Job Title, Company, Required Skills, and Location.
  - **Role Categories**: APM, Product Manager, Senior PM, Technical PM, Product Owner, AI & Growth PM, Product Lead.
  - **Portal Sources**: LinkedIn, Naukri, Wellfound, IIMJobs, Indeed, and Instahyre with authentic brand badges.
  - **Experience Levels**: 0-2 yrs (Entry/APM), 2-5 yrs (Mid), 5-8 yrs (Senior), 8+ yrs (Lead/Director).
  - **Location & Work Mode**: Remote Only, Hybrid, On-site across Bengaluru, Mumbai, Gurgaon, Hyderabad, Delhi NCR, and Global.
  - **Sorting**: Newest First, Experience (Asc/Desc), Salary, Company (A-Z).
- 📌 **Application Tracker & Bookmarks**:
  - Track application stages (`New`, `Saved ⭐`, `Applied 📝`, `Interviewing 🎯`, `Offer 🎉`, `Archived 📁`).
  - Saved roles and application stages persist locally in browser `localStorage`.
  - Export search results & pipeline progress as a structured JSON file.
- 🚀 **Click-to-Redirect**:
  - "Apply on Source" opens the exact external job posting URL in a new tab (`target="_blank" rel="noopener noreferrer"`).
  - "Copy Link" button with instant toast notification.
- 📂 **Sliding Job Detail Drawer**: View in-depth role overview, key responsibilities, candidate profile, and direct application CTAs.
- 🤖 **GitHub Actions Scheduled Sync**: `.github/workflows/update_jobs.yml` stub for scheduled automated feed scraping into `public/data/jobs.json`.

---

## 🏗️ Architecture (Netlify Free Tier Ready)

```
├── index.html                   # HTML5 shell with Google Fonts & SEO tags
├── netlify.toml                 # Netlify routing, security headers & caching
├── package.json                 # React 19 + TypeScript + Vite + Tailwind CSS
├── public/
│   ├── logo.svg                 # Brand icon
│   └── data/
│       └── jobs.json            # Static JSON datastore (30+ rich mock jobs)
├── src/
│   ├── main.tsx                 # React entry point
│   ├── index.css                # Forest Green design system & glass tokens
│   ├── App.tsx                  # Core app state & filter orchestrator
│   ├── types/
│   │   └── job.ts               # TypeScript data models & interfaces
│   ├── data/
│   │   └── jobs.ts              # Bundled rich job mock data
│   └── components/
│       ├── Header.tsx           # Brand header, metrics & view toggles
│       ├── MetricsBar.tsx       # Live stat badges & analytics
│       ├── FilterBar.tsx        # Multi-dropdown filter bar
│       ├── JobTableView.tsx     # Desktop-first tabular layout
│       ├── JobCardGrid.tsx      # Responsive visual glass cards
│       ├── JobDetailDrawer.tsx  # Slide-over full job drawer
│       ├── ApplicationTrackerModal.tsx # Application pipeline CRM
│       ├── Toast.tsx            # Floating feedback alerts
│       └── Footer.tsx           # Footer with Netlify status
└── .github/
    └── workflows/
        └── update_jobs.yml      # Cron workflow for feed scraping
```

---

## 🚀 Quickstart

### 1. Run Locally
```bash
# Install dependencies
npm install

# Start Vite local development server
npm run dev
```

### 2. Build for Production
```bash
npm run build
```
The optimized static build will be generated in `dist/`.

### 3. Deploy to Netlify Free Tier

#### Method A: Netlify Drop (Zero Configuration)
1. Run `npm run build`.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag and drop the `dist/` folder.
4. Your site is live in 3 seconds!

#### Method B: Netlify Git Continuous Deployment
1. Push this repository to GitHub / GitLab.
2. Link your repository in Netlify Dashboard.
3. Build Settings are automatically configured from `netlify.toml`:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
