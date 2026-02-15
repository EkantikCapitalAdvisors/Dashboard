# Ekantik Capital — Performance Dashboard v2.6

## Project Overview
A professional, data-driven performance dashboard for demonstrating weekly trading performance of **ECFS Active** (MES futures) and **Discord Selective** (ES futures) trading strategies. Built for Ekantik Capital Advisors LLC.

**Live Landing Pages:**
- **Cash Flow Strategy:** https://cashflow.ekantikcapital.com/
- **Principal Protection (Income & Growth):** https://founding.ekantikcapital.com/
- **Performance Dashboard:** https://cashflow.ekantikcapital.com/performance

---

## ✅ Completed Features

### Core Dashboard
- **Three-tab layout**: ECFS Active (MES), Discord Selective (ES), Compare Both
- **Period toggles**: This Week / This Month / All-Time views with week navigation
- **CSV upload**: Drag-and-drop Tradovate Orders CSV for ECFS Active
- **Excel upload**: 10-column Excel format for Discord Selective
- **localStorage caching**: Instant reload without re-upload
- **Database persistence**: Trades saved to REST API tables for cross-session access

### 30 KPIs Calculated (per period)

#### Tier 1 — Core Performance (Hero Stats Bar)
1. Net P&L ($)
2. Return (%) on $20,000 starting capital
3. EV per Trade (%R of planned risk)
4. Win Rate (%)
5. Profit Factor
6. Max Drawdown ($)

#### Tier 2 — The Edge (EV Analysis Panel)
7. EV per Trade (planned $100 risk → %R)
8. EV per Trade (actual avg risk → %R)
9. Avg Win ($, pts)
10. Avg Loss ($, pts)
11. Win/Loss Ratio
12. Expectancy (R)
13. Avg R:R (Winners)
14. Avg R:R (Losers)
15. Gross Wins / Gross Losses

#### Tier 3 — Risk Management
16. Max Drawdown ($, %)
17. Current Drawdown
18. Recovery Factor
19. Max Consecutive Wins/Losses
20. Current Streak
21. Risk Distribution per Trade (histogram)
22. Avg Risk Taken ($)
23. Risk Budget Adherence (%)
24. Avg Loss Cut Level (% of risk)

#### Tier 4 — Efficiency & Consistency
25. Profit per Day ($)
26. Trades per Day
27. Winning Days (%)
28. Best / Worst Trade ($, %R)
29. Long vs Short breakdown
30. Trading Days count

### Charts (ECharts)
- **Equity Curve** with drawdown overlay (per-trade resolution)
- **Daily P&L** bar chart (green/red)
- **Weekly P&L Trend** — bar + cumulative line overlay
- **P&L Distribution Histogram** — win/loss trade distribution
- **Performance Radar** (Compare tab) — 6-axis spider chart
- **Food Chain Position Chart** (ECFS + Discord) — horizontal bar benchmark comparison

### New Sections
- **Inception-to-Date Summary** — Total P&L, Return %, Total Trades, Best/Worst Week
- **Monthly Performance Summary Table** — Collapsible table with Trades, W/L, Win%, P&L, Return, EV, PF, Cumulative
- **Enhanced Compare Tab** — Side-by-side KPIs + radar chart + key insights
- **Edge on the Food Chain (ECFS Active)** — Full interactive section showing:
  - Comparison table: ECFS vs Casino Roulette, HFT, Stat-Arb, CTAs, Retail (dynamically populated)
  - Edge derivation formula with win rate × R:R breakdown
  - Returns scaling bars at 0.25%, 0.5%, 1%, 2% risk levels (animated)
  - "What R Means" explanation with dynamic dollar examples
  - "Why The Numbers Matter" — magnitude comparison, frequency × edge = dollars
  - ECharts horizontal bar chart: edge position vs. industry benchmarks
  - **All values update dynamically based on the selected performance period**
- **Edge on the Food Chain (Discord Selective)** — Simplified version with:
  - ECharts position chart
  - Quick edge stats (edge/trade, trades/mo, annual R)
  - Compact formula + returns scale + key takeaways
  - Dynamically updates with period selection

### Data Architecture
- **ecfs_trades** table: Per-trade data from Tradovate CSV
- **discord_trades** table: Per-trade data from Excel upload
- **weekly_snapshots** table: Weekly summary KPIs for historical tracking

### Strategy Chooser CTA (v2.5)
- **"Two Ways to Access This Edge"** — dual-path conversion section after data panels:
  - **Cash Flow Strategy** (gold card) → https://cashflow.ekantikcapital.com/ — active trading, auto-copy, MES/ES futures
  - **Principal Protection** (emerald card) → https://founding.ekantikcapital.com/ — managed income & growth, founding member badge
- Each card: icon, description, 4 benefit checkmarks, "best for" audience tag, CTA button
- Trust line + compliance disclaimer at bottom
- **Header "Strategies" dropdown** with both product links (hover-activated, desktop)
- **Footer quick links** updated with both strategy pages

### Compliance & Sharing (v2.4 — Widely Shareable)
- **5-layer compliance architecture** — regulatory-complete yet investor-friendly:
  1. **Welcome modal** (first visit only) — branded, clean, one-click "View Dashboard" with brief risk note + link to full disclosure. Stored in localStorage so only shown once
  2. **Panel-specific disclaimers** — ECFS, Discord, and Compare panels each have compact one-line disclaimers with "Full disclosure" link
  3. **CTA section risk note** — subtle line below call-to-action buttons
  4. **Collapsible regulatory footer** — full CFTC/NFA-style disclosures (Risk, Not Investment Advice, Hypothetical Projections, Real Execution Data, CFTC Rule 4.41) hidden behind a click-to-expand toggle
  5. **Footer one-liner** — persistent "Past performance is not indicative of future results" in small text
- **Sharing (3 surfaces, 7 platforms)**:
  - **Floating sidebar** (desktop) — appears on scroll past hero; X/Twitter, LinkedIn, Facebook, WhatsApp, Email, Copy Link
  - **Hero share row** — inline share icons right below "Last Updated" for instant visibility
  - **Footer share bar** — full 7-button row (X, LinkedIn, Facebook, WhatsApp, Telegram, Email, Copy Link)
  - **Mobile FAB** — floating gold share button (bottom-right) → native `navigator.share()` or bottom sheet fallback with all 6 options
  - **Toast notification** — "Link copied to clipboard!" green toast on copy
- **7 share channels**: X/Twitter, LinkedIn, Facebook, WhatsApp, Telegram, Email, Copy Link
- **Rich link previews for all platforms**:
  - Open Graph meta tags (title, description, image, dimensions, alt, locale, site name, type, URL)
  - Twitter Card `summary_large_image` with `image:alt`
  - OG image (`images/og-dashboard.png`) — branded preview card
  - `og:image:width` / `og:image:height` for fast rendering
  - `theme-color` meta for mobile browser chrome
  - Canonical URL
  - JSON-LD structured data for SEO

---

## 📂 Project Structure

```
index.html              Main dashboard page
css/style.css           Custom styles (tabs, cards, tables, animations)
js/parser.js            Tradovate CSV parser + Excel parser + KPI calculator + DB API
js/dashboard.js         Dashboard rendering engine + charts + tab switching + DB persistence
images/og-dashboard.png OG image for social media sharing previews
orders_sample.csv       Sample Tradovate export (Feb 2-13, 2026)
README.md               This file
```

---

## 🔗 Functional Entry URIs

| Path | Description |
|------|-------------|
| `/index.html` | Main performance dashboard |
| `tables/ecfs_trades` | REST API for ECFS trade data |
| `tables/discord_trades` | REST API for Discord trade data |
| `tables/weekly_snapshots` | REST API for weekly summary snapshots |

---

## 📊 Data Flow

### Auto-Load / Demo Mode (v2.6)
- **3-tier data loading**: localStorage (fastest) → Database API → Sample CSV fallback
- When a cold visitor arrives via shared link with no cached data and empty DB, the dashboard **automatically fetches and parses `orders_sample.csv`** to show a fully populated dashboard
- All 30+ KPIs, equity curves, charts, food chain, period toggles work immediately
- Shows a green "Live Results Loaded" banner with trade count
- When the user uploads their own CSV, it replaces the sample data and saves to localStorage + DB
- **Result**: Shared links always land on a live, data-rich dashboard — never empty placeholders

### Weekly Workflow (~30 seconds)
1. **ECFS Active**: Export Tradovate CSV → Upload on ECFS tab → Auto-parse → All KPIs populate
2. **Discord Selective**: Prepare 10-column Excel → Upload on Discord tab → Auto-parse → All KPIs populate
3. Data is saved to database and localStorage simultaneously

### Tradovate CSV Parsing
- Filters `Status = Filled` orders only
- Pairs trades using position tracking (handles scaling, partial exits, variable contracts)
- Extracts stop-loss from nearby bracket orders (Canceled Stop rows)
- Calculates actual risk per trade from real stop distances
- Groups by week (Mon-Fri) automatically

### Key Parameters
| Parameter | ECFS Active | Discord Selective |
|-----------|-------------|-------------------|
| Contract | MES (Micro E-mini S&P 500) | ES (E-mini S&P 500) |
| Point Value | $5/point | $50/point |
| Risk Budget | $100/trade (0.5% of $20k) | $500/trade |
| Commission | $0 (Tradovate free tier) | $0 |
| Starting Balance | $20,000 | $20,000 |

---

## ❌ Features Not Yet Implemented

1. **PDF Report Export** — One-click weekly report generation
2. **Email Signup / Lead Capture** — Collect potential customer emails
3. ~~Social Sharing~~ ✅ **Implemented** (Twitter/X, LinkedIn, copy link, native share)
4. **S&P 500 Benchmarking** — Overlay SPX performance for context
5. **Admin Password Protection** — Restrict upload to authorized users
6. **Automated Screenshot Upload** — Link dashboard screenshots to weeks
7. **Multiple Account Support** — Track different Tradovate accounts
8. **Notification System** — Alert when new weekly data is uploaded

---

## 🚀 Recommended Next Steps

### Phase 1 (Quick Wins)
- Upload several weeks of real Tradovate data to populate historical charts
- Fill in Discord Selective Excel data for comparison
- Take a dashboard screenshot for the screenshot section

### Phase 2 (Customer-Facing Polish)
- Add PDF export using html2canvas + jsPDF
- Add email capture form for potential customers (ConvertKit / Mailchimp embed)
- Implement admin mode with password for upload access

### Phase 3 (Advanced)
- Add real-time data via Tradovate API (if available)
- Implement S&P 500 benchmark comparison
- Add notification webhooks for new data uploads

---

## 🛠 Technology Stack
- **HTML5 + Tailwind CSS** (CDN) — Responsive layout
- **ECharts 5** — Interactive charts
- **SheetJS (xlsx)** — Excel file parsing
- **REST API** — Database persistence (tables API)
- **Font Awesome 6** — Icons
- **Google Fonts** — Inter + Playfair Display
