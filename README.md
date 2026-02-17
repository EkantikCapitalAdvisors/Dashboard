# Ekantik Capital — Performance Dashboard v2.9

## Project Overview
A professional, data-driven performance dashboard for demonstrating weekly trading performance of **ECFS Active** (MES futures) and **ECFS Selective** (ES futures) trading strategies. Built for Ekantik Capital Advisors LLC.

**Live Landing Pages:**
- **Cash Flow Strategy:** https://cashflow.ekantikcapital.com/
- **Principal Protection (Income & Growth):** https://founding.ekantikcapital.com/
- **Performance Dashboard:** https://cashflow.ekantikcapital.com/performance

---

## ✅ Completed Features

### Core Dashboard
- **Three-tab layout**: ECFS Active (MES), ECFS Selective (ES), Compare Both
- **Period toggles**: This Week / This Month / All-Time views with week navigation
- **CSV upload**: Drag-and-drop Tradovate Orders CSV for ECFS Active
- **Excel upload**: 10-column Excel format for ECFS Selective
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
- **Food Chain Position Chart** (ECFS Active + ECFS Selective) — horizontal bar benchmark comparison

### New Sections
- **Inception-to-Date Summary** — Total P&L, Return %, Total Trades, Best/Worst Week
- **Monthly Performance Summary Table** — Collapsible table with Trades, W/L, Win%, P&L, Return, EV, PF, Cumulative
- **Enhanced Compare Tab (v2.8)** — Fully R-normalized apples-to-apples comparison:
  - R-Normalized Head-to-Head table (EV, Win Rate, Avg Win/Loss, PF, DD, Recovery — all in R)
  - Side-by-side R-normalized strategy cards (zero raw dollar display in comparison context)
  - R-normalized radar chart (6-axis spider)
  - Dynamic key insights (risk context, EV comparison, win rate, drawdown, data confidence)
  - Dollar translation shown only as small footnote (`1R = $100` / `1R = $500`)
  - Trophy indicators for winning metric per row
- **Edge on the Food Chain (ECFS Active)** — Full interactive section showing:
  - Comparison table: ECFS vs Casino Roulette, HFT, Stat-Arb, CTAs, Retail (dynamically populated)
  - Edge derivation formula with win rate × R:R breakdown
  - Returns scaling bars at 0.25%, 0.5%, 1%, 2% risk levels (animated)
  - "What R Means" explanation with dynamic dollar examples
  - "Why The Numbers Matter" — magnitude comparison, frequency × edge = dollars
  - ECharts horizontal bar chart: edge position vs. industry benchmarks
  - **All values update dynamically based on the selected performance period**
- **Edge on the Food Chain (ECFS Selective)** — Simplified version with:
  - ECharts position chart
  - Quick edge stats (edge/trade, trades/mo, annual R)
  - Compact formula + returns scale + key takeaways
  - Dynamically updates with period selection

### v2.9 — 3-Section Narrative Layout (Theory → Growth → Detail)

**Both ECFS Active and ECFS Selective panels now share an identical 3-section narrative structure:**

#### ECFS Selective: Why 5× Risk
- **"Why 5× Risk Per Trade?" callout box** — positioned before the edge formula in the ECFS Selective panel
- Explains selective execution, manual confirmation filter, and fewer-but-bigger trade philosophy
- Three cards: Selective Execution, Manual Confirmation, Fewer Bigger Trades
- Logic summary: ECFS Active takes every signal at $100 risk; ECFS Selective cherry-picks at $500 risk
- Risk levels reflected accurately everywhere: growth chart boxes ("at 2.5% risk, 5× ECFS"), Compare tab context, CTA cards
- Growth chart JS uses equal 0.5% risk for apples-to-apples comparison (ECFS Selective note shows actual 2.5%)

#### Section 1: Understanding The Edge (Theory & Concepts)
- **Live Edge Banner**: Pulsing green dot with "Live Edge — Updated Weekly", shows all-time trade count and last-updated date (auto-populated from trade data)
- **1A. How Is The Edge Calculated?** — Visual EV formula (Win Rate × Avg Win − Loss Rate × Avg Loss = Edge Per Trade), with live numbers, mono-font formula breakdown, and plain-English explanation
- **1B. What Makes This Edge Powerful?** — Food Chain comparison table (ECFS Active/Selective vs. Casino, HFT, Stat-Arb, CTAs, Retail), summary callout with explicit math (`edge × trades/mo × 12 = Annual R`), 3-card explainer (Magnitude, Frequency, Compounding), and ECharts position chart
  - **Annual R header note**: Dynamically shows "extrapolated · N trades · as of [date]" under the "Annual R" column
  - **Table footnote**: "Annual R is extrapolated from N trades as of [date]. Updated weekly with new trade data — projections recalculate automatically."
- **1C. Returns Multiplier — A Function of Risk** — Animated scaling bars at 0.25%, 0.5%, 1%, 2% risk levels, "What R Means" explanation with dynamic dollar examples, and casino/HFT edge comparison
  - **Data confidence indicator**: Shows ⚠️ Early projection (<30 trades), Developing confidence (30-100), or ✅ Statistically significant (100+)
  - **All labels clearly state**: "Extrapolated from N all-time trades as of [date] · updated weekly with new data"
  - **Math formula line**: Includes data-as-of context inline
  - **Key insight**: Includes "Data as of [date], updated weekly" note

#### Section 2: $100 Growth Comparison
- **ECharts line chart**: 5-year projected growth of $100 invested in S&P 500 (14.6% CAGR — 15-year average total return with dividends reinvested, 2011–2025), ECFS Active, and ECFS Selective
- Compounding model: Annual R × 0.5% risk per trade, compounded weekly over 260 weeks
- Logarithmic Y-axis for clear visualization of exponential growth
- Summary boxes showing final values for each strategy, with risk context:
  - **S&P 500**: Shows 14.6% CAGR with avg intra-year drawdown of −14% (15-year history)
  - **ECFS Active / ECFS Selective**: Shows Monte Carlo simulated max drawdown (95th percentile, 5,000 simulations resampling actual trade outcomes over 1-year horizon)
- **Monte Carlo Max Drawdown Engine** (`monteCarloMaxDD()`): Resamples trade P&L outcomes (in R-multiples) with replacement, simulates tradesPerYear paths, tracks peak-to-trough drawdown per path, returns 50th/95th/99th percentile max DD in R, %, and $
- **Dynamic subtitle**: "Annual R extrapolated from N all-time trades (ECFS Active: X, ECFS Selective: Y) as of [date]. Updated weekly with new trade data."
- Appears on both ECFS Active and ECFS Selective panels (cross-strategy comparison from any tab)

#### Section 3: Detailed Performance Numbers (Collapsed by Default)
- **CTA button**: "See Detailed Numbers — By Week, Month, or All Time" with chevron animation
- Opens to reveal: Period toggle (Week/Month/All-Time), Hero Stats bar (6 KPIs), Risk Management, Equity Curve, Charts grid (Weekly Trend, P&L Distribution, Daily P&L, Efficiency), Inception Summary, Monthly Summary, Trade Log
- Charts auto-resize when panel opens (delayed resize trigger after reveal)
- User can explore without being overwhelmed by numbers on first view

### Data Architecture
- **ecfs_trades** table: Per-trade data from Tradovate CSV
- **discord_trades** table: Per-trade data from Excel upload
- **weekly_snapshots** table: Weekly summary KPIs for historical tracking

- **EPIG Portfolio Context Section (v2.9)** — Positioned before the strategy CTA, connects dashboard performance to the broader portfolio:
  - **Flow order**: SPY comparison first (introduces EPIG) → Architecture (explains it) → Allocation (the numbers)
  - **SPY vs EPIG Return-to-Pain** (leads the section): Image + two data cards + footnote
    - Image: Coffee Shop vs Amazon Network illustration (introduces EPIG concept)
    - Two data cards: SPY (14%↑ / 14%↓ = 1:1) vs ECFS Income Sleeve (dynamic R↑ / MC DD↓ = X:1)
    - All ECFS numbers dynamically populated from `computeAnnualRFromAllTrades()` + `monteCarloMaxDD()`
  - **Header callout**: "Where This Edge Fits" — bridges from SPY comparison into architecture
  - **Three-Layer Architecture**: Visual cards for Core (~80%, SPY/Cash), Tactical (5-10%, Futures/Options, highlighted with "You Are Here" badge), Episodic Pivot (5-10%, Strategic Growth Plays)
  - **Typical Portfolio Allocation**: Horizontal bar chart showing barbell structure — 80% capital preservation, 5-10% tactical, 5-10% episodic pivots (totaling 100%)
  - **Key Insight Box**: "~80% of capital is always protected" with amber accent
  - **Founding Member Note**: EPIG available exclusively to founding members, dashboard demonstrates Layer B engine
  - Color coding: Emerald (Core), Amber (Tactical), Purple (Episodic Pivot)

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
  2. **Panel-specific disclaimers** — ECFS Active, ECFS Selective, and Compare panels each have compact one-line disclaimers with "Full disclosure" link
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
js/dashboard.js         Dashboard rendering engine + charts + export + DB persistence
images/og-dashboard.png OG image for social media sharing previews
orders_sample.csv       Cumulative Tradovate export (grows weekly — full ECFS history)
discord_trades.json     Cumulative ECFS Selective trades (grows weekly — full trade history)
README.md               This file
```

---

## 🔗 Functional Entry URIs

| Path | Description |
|------|-------------|
| `/index.html` | Main performance dashboard |
| `tables/ecfs_trades` | REST API for ECFS trade data |
| `tables/discord_trades` | REST API for ECFS Selective trade data |
| `tables/weekly_snapshots` | REST API for weekly summary snapshots |

---

## 📊 Data Flow

### Auto-Load / Demo Mode (v2.6)
- **3-tier data loading for BOTH tabs**: localStorage (fastest) → Database API → Static file fallback
- **ECFS Active**: Falls back to `orders_sample.csv` (full cumulative Tradovate export)
- **ECFS Selective**: Falls back to `discord_trades.json` (cumulative trade history)
- All 30+ KPIs, equity curves, charts, food chain, period toggles work immediately on both tabs
- Shows a green "Live Results Loaded" banner with trade count
- When the user uploads their own CSV/Excel, it replaces the sample data and saves to localStorage + DB
- **Result**: Shared links always land on a fully populated dashboard — never empty placeholders

### Export for GitHub Deployment (v2.7)
- **Export buttons** appear after any successful data load (upload, cache, or DB)
- **ECFS Active → Export**: Downloads the raw Tradovate CSV as `orders_sample.csv` — commit to GitHub
- **ECFS Selective → Export**: Downloads all accumulated trades as `discord_trades.json` — commit to GitHub
- **Discord merge logic**: Uploading a new weekly Excel **merges** new trades with existing data (deduplication by trade ID). This means the dashboard accumulates history over time:
  - Week 1: Upload Excel (10 trades) → Export = 10 trades
  - Week 2: Upload Excel (8 new trades) → Export = 18 trades
  - Week 12: Upload Excel (6 new trades) → Export = ~120 trades
  - Year 1: → Export = ~500+ trades (full history)

### Long-Term Data Architecture

**The #1 asset is the historical track record.** The data files grow cumulatively:

| Time | `orders_sample.csv` (ECFS) | `discord_trades.json` (Discord) |
|------|---------------------------|----------------------------------|
| Week 2 | 55 trades | 10 trades |
| Month 3 | ~300 trades | ~80 trades |
| Month 6 | ~600 trades | ~160 trades |
| Year 1 | ~1,200 trades | ~350 trades |
| Year 2 | ~2,400 trades | ~700 trades |

**Why this works forever:**
- **ECFS**: Tradovate's CSV export already includes ALL historical orders. Each week you export the full history and replace the file. Zero data-loss risk.
- **Discord**: The dashboard merges new Excel uploads with existing trades. The export button downloads the full cumulative JSON. Replace the file in GitHub.
- **GitHub Pages** serves these static files → visitors always see the complete track record.
- **No database dependency** for the public site. The Genspark DB is a convenience layer; the static files are the source of truth.

### Weekly Workflow (~2 minutes, every Monday)

#### Step 1: ECFS Active
1. Open Tradovate → Orders → History → **Export ALL** (full date range)
2. Save as CSV (this file contains the entire trading history)
3. Go to the dashboard → ECFS Active tab → Upload CSV
4. Verify KPIs update correctly
5. Click the green **Export** button → downloads `orders_sample.csv`

#### Step 2: ECFS Selective
1. Open your weekly Excel (10-column format) with only the **new** week's trades
2. Go to the dashboard → ECFS Selective tab → Upload Excel
3. The dashboard **merges** new trades with existing history (duplicates are skipped)
4. Verify the total trade count increased
5. Click the green **Export** button → downloads `discord_trades.json` (full cumulative history)

#### Step 3: Deploy to GitHub
```bash
cd path/to/cashflow-repo/performance

# Replace the two data files with exported versions
cp ~/Downloads/orders_sample.csv .
cp ~/Downloads/discord_trades.json .

git add orders_sample.csv discord_trades.json
git commit -m "Weekly update: trades through [DATE] — [N] ECFS, [M] Discord trades"
git push
```
GitHub Pages redeploys in 1–2 minutes. Done.

#### Step 4: (Optional) Share Update
- WhatsApp/Telegram: "📊 Weekly update — real Tradovate fills through [DATE]. 30+ KPIs, equity curves & edge analysis. https://cashflow.ekantikcapital.com/performance"
- Use the dashboard's built-in share buttons

### Tradovate CSV Parsing
- Filters `Status = Filled` orders only
- Pairs trades using position tracking (handles scaling, partial exits, variable contracts)
- Extracts stop-loss from nearby bracket orders (Canceled Stop rows)
- Calculates actual risk per trade from real stop distances
- Groups by week (Mon-Fri) automatically

### Key Parameters
| Parameter | ECFS Active | ECFS Selective |
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
4. ~~S&P 500 Benchmarking~~ ✅ **Implemented** (v2.9 — $100 Growth Comparison chart with 5-year projection using 14.6% CAGR best-case passive benchmark)
5. **Admin Password Protection** — Restrict upload to authorized users
6. **Automated Screenshot Upload** — Link dashboard screenshots to weeks
7. **Multiple Account Support** — Track different Tradovate accounts
8. **Notification System** — Alert when new weekly data is uploaded

---

## 🚀 Recommended Next Steps

### Phase 1 (Quick Wins)
- Upload several weeks of real Tradovate data to populate historical charts
- Fill in ECFS Selective Excel data for comparison
- Take a dashboard screenshot for the screenshot section

### Phase 2 (Customer-Facing Polish)
- Add PDF export using html2canvas + jsPDF
- Add email capture form for potential customers (ConvertKit / Mailchimp embed)
- Implement admin mode with password for upload access

### Phase 3 (Advanced)
- Add real-time data via Tradovate API (if available)
- ~~Implement S&P 500 benchmark comparison~~ ✅ Done in v2.9
- Add notification webhooks for new data uploads

---

## 🛠 Technology Stack
- **HTML5 + Tailwind CSS** (CDN) — Responsive layout
- **ECharts 5** — Interactive charts
- **SheetJS (xlsx)** — Excel file parsing
- **REST API** — Database persistence (tables API)
- **Font Awesome 6** — Icons
- **Google Fonts** — Inter + Playfair Display
