# Ekantik 10x Strategy — Dashboard Specification

## Overview

A standalone dashboard page for the **Ekantik 10x Strategy** — an aggressive growth futures strategy targeting 10x annual returns. This will be a separate landing page (not embedded in the main Ekantik Futures dashboard) but shares the same codebase, design language, and data infrastructure.

---

## 1. Strategy Parameters

| Parameter | Value |
|---|---|
| **Strategy Name** | Ekantik 10x Strategy |
| **Instruments** | ES (E-mini S&P 500, $50/pt) and MES (Micro E-mini, $5/pt) — mixed |
| **Default PPT** | $5/point (MES as baseline for KPI calculations) |
| **Starting Balance** | $5,000 |
| **Daily Risk** | $500 (10% of portfolio) |
| **Risk Per Trade** | $500 |
| **Goal** | 10x annual return ($5K → $50K) |

### JS Constants (already defined in `js/parser.js`)

```js
const TENX_RISK = 500;              // $500 per day (10% of $5k)
const TENX_PPT = 5;                 // $5 per point (MES default)
const TENX_STARTING_BALANCE = 5000; // $5,000 starting portfolio
```

---

## 2. Color Theme

| Element | Value |
|---|---|
| Primary accent | Emerald (`#34d399` / `emerald-400`) |
| Card gradients | `from-[#0d351d] to-[#0a1628]` |
| Borders | `border-emerald-400/30`, `border-emerald-500/20` |
| Stat card gradient | `from-emerald-900/20 to-emerald-950/40` |
| Active period button class | `active-period` (reuse existing) |
| Edge period button class | `active-edge-period-emerald` (new — or reuse blue) |
| Chart line color | `#34d399` |
| Food chain prefix | `txfc-` |

---

## 3. Page Sections (Top to Bottom)

### 3.1 Info Card

- Title: **"Ekantik 10x Strategy"**
- Subtitle: "Aggressive growth strategy — ES/MES futures with 10% daily risk targeting 10x annual returns"
- Parameter badges: `ES/MES Futures | $5/point (MES) | 1 Contract | Starting: $5,000`
- Risk badge: `Risk: $500/day (10%)`
- Data transparency note (no Discord link — unlike the Futures panel)
- Optional: link to main Ekantik Futures dashboard

### 3.2 Live Update Banner

Shows trade count and last update timestamp.

**Required HTML element IDs:**

| ID | Purpose |
|---|---|
| `tenx-live-trade-count` | "X trades (All-Time)" |
| `tenx-live-last-updated` | Date of last upload or last trade |

### 3.3 Hero Stats (7 metric cards)

A grid of 7 KPI cards, identical layout to the Futures panel but with emerald theme.

| ID | Label | Subtitle ID | Notes |
|---|---|---|---|
| `tenx-hero-pnl` | NET P&L | `tenx-hero-pnl-sub` | Green gradient card |
| `tenx-hero-return` | RETURN | — | Static subtitle: "on $5,000" |
| `tenx-hero-ev` | EV / TRADE | `tenx-hero-ev-sub` | Shows $/trade |
| `tenx-hero-wr` | WIN RATE | `tenx-hero-wr-sub` | Shows "XW / YL" |
| `tenx-hero-pf` | PROFIT FACTOR | `tenx-hero-pf-sub` | Shows gross wins / losses |
| `tenx-hero-dd` | MAX DRAWDOWN | `tenx-hero-dd-sub` | Red gradient card |
| `tenx-hero-mespts` | NET MES PTS | `tenx-hero-mespts-sub` | Shows avg win/loss pts |

### 3.4 Portfolio Parameters Card

4-column grid showing:
- **Portfolio**: $5,000 (starting capital)
- **Daily Risk**: $500 (10% of portfolio)
- **Instrument**: ES/MES (S&P 500 Futures)
- **Contract**: 1 ($5/point MES)

### 3.5 Monthly Returns Summary

Rendered dynamically by `renderMonthlySummary()`.

| ID | Purpose |
|---|---|
| `monthly-summary-tenx` | Container for monthly summary table |

### 3.6 Actual Account Performance / Growth Comparison Chart

Equity curve vs S&P 500 benchmark.

| ID | Purpose |
|---|---|
| `chart-growth-comparison-tenx` | ECharts container (400px height) |
| `growth-subtitle-tenx` | Subtitle text |
| `growth-spy-tenx` | S&P 500 final value label |
| `growth-tenx-tenx` | Strategy final value label |
| `growth-spy-dd-tenx` | S&P 500 drawdown note |
| `growth-ratio-tenx` | vs S&P 500 ratio |
| `growth-dd-tenx-tenx` | Strategy estimated max DD |

### 3.7 Inception-to-Date Summary

| ID | Purpose |
|---|---|
| `inception-tenx` | Container for inception summary |

### 3.8 Understanding the Edge (Expandable Section)

Toggled by a button. Contains:

#### 3.8.1 Edge Formula & Calculation

| ID | Purpose |
|---|---|
| `tenx-ev-hero-big` | Big EV display (e.g., "+12.3%R") |
| `tenx-ev-hero-sub` | "$/trade (avg risk: $X)" |
| `tenx-ev-actual-risk` | Avg realized risk HTML |
| `tenx-edge-avgwin` | Avg win $ |
| `tenx-edge-avgwin-pts` | Avg win points |
| `tenx-edge-avgloss` | Avg loss $ |
| `tenx-edge-avgloss-pts` | Avg loss points |
| `tenx-edge-wr` | Win rate + W/L count |
| `tenx-edge-explanation` | Plain English edge explanation |
| `tenx-detail-grosswins` | Gross wins $ |
| `tenx-detail-grosslosses` | Gross losses $ |
| `tenx-detail-wlratio` | Win/Loss ratio |
| `tenx-detail-netpts` | Net points |

#### 3.8.2 Edge Period Filter

Buttons to filter edge calculation by time period.

| ID | onclick |
|---|---|
| `edge-period-tenx-1week` | `setEdgePeriod('tenx','1week')` |
| `edge-period-tenx-2weeks` | `setEdgePeriod('tenx','2weeks')` |
| `edge-period-tenx-1month` | `setEdgePeriod('tenx','1month')` |
| `edge-period-tenx-3months` | `setEdgePeriod('tenx','3months')` |
| `edge-period-tenx-alltime` | `setEdgePeriod('tenx','alltime')` |
| `edge-period-label-tenx` | Shows current filter label |

#### 3.8.3 Food Chain Formula (EV visualization)

Uses prefix `txfc-` for all element IDs.

| ID | Purpose |
|---|---|
| `txfc-win-rate` | Win rate in formula |
| `txfc-formula-line1` | Formula calculation line 1 |
| `txfc-formula-line2` | Formula calculation line 2 |
| `txfc-formula-result` | Formula result |
| `txfc-ev-result` | EV result display |

#### 3.8.4 Food Chain Comparison Table

| ID | Purpose |
|---|---|
| `foodchain-tenx` | Container div (must exist for renderFoodChain) |
| `txfc-table-body` | Table body for comparison rows |
| `txfc-summary-callout` | Summary callout div |
| `txfc-summary-text` | Summary text |
| `txfc-period-label` | Period label in header |
| `txfc-annual-r-header-note` | Annual R header note |
| `txfc-why-magnitude` | "Why it matters" card 1 |
| `txfc-why-frequency` | "Why it matters" card 2 |
| `txfc-position-chart` | Edge position chart (ECharts, 220px height) |

#### 3.8.5 Edge Trend by Week Chart

| ID | Purpose |
|---|---|
| `edge-trend-tenx-section` | Section container |
| `chart-edge-trend-tenx` | ECharts container (280px height) |
| `edge-trend-tenx-note` | Note text below chart |

### 3.9 Detailed Charts & Trade Log (Expandable Section)

Toggled by button.

#### Toggle Button

| ID | Purpose |
|---|---|
| `btn-details-tenx` | Toggle button |
| `icon-details-tenx` | Chevron icon inside button |
| `detailed-dashboard-tenx` | Container div (starts with class `hidden`) |

#### Period Filter Buttons

| ID | onclick |
|---|---|
| `period-tenx-weekly` | `setPeriod('tenx','weekly')` |
| `period-tenx-1week` | `setPeriod('tenx','1week')` |
| `period-tenx-monthly` | `setPeriod('tenx','monthly')` |
| `period-tenx-3months` | `setPeriod('tenx','3months')` |
| `period-tenx-6months` | `setPeriod('tenx','6months')` |
| `period-tenx-alltime` | `setPeriod('tenx','alltime')` — starts active |

#### Week Navigation

| ID | Purpose |
|---|---|
| `week-selector-tenx` | `<select>` dropdown, `onchange="selectWeek('tenx')"` |
| `period-range-tenx` | Range label text |
| Prev button | `onclick="prevPeriod('tenx')"` |
| Next button | `onclick="nextPeriod('tenx')"` |

#### Charts (4 chart containers)

| ID | Chart Type | Height |
|---|---|---|
| `chart-equity-tenx` | Equity Curve (line + area) | 280px |
| `chart-weekly-trend-tenx` | Weekly P&L Trend (bar) | 280px |
| `chart-pldist-tenx` | P&L Distribution (histogram) | 280px |
| `chart-daily-tenx` | Daily P&L (bar) | 280px |

All rendered by existing shared JS functions (`renderEquityCurve`, `renderDailyPL`, `renderPLDistribution`, `renderWeeklyTrend`). Chart accent color: `#34d399`.

#### Trade Log Table

| ID | Purpose |
|---|---|
| `tenx-trade-count` | "X trades" count label |
| `tenx-trades-body` | `<tbody>` for trade rows |

**Filter buttons:**

| ID | onclick |
|---|---|
| `tenx-filter-all` | `filterTradeLog('tenx','all')` |
| `tenx-filter-win` | `filterTradeLog('tenx','win')` |
| `tenx-filter-loss` | `filterTradeLog('tenx','loss')` |
| `tenx-filter-long` | `filterTradeLog('tenx','long')` |
| `tenx-filter-short` | `filterTradeLog('tenx','short')` |
| `tenx-filter-label` | Filter description text |

**Sort indicators:**

| ID | onclick |
|---|---|
| `tenx-sort-pts` | `sortTradeLog('tenx','pts')` |
| `tenx-sort-pl` | `sortTradeLog('tenx','pl')` |

**Trade log table columns** (same as Futures/Discord):

| Column | Header |
|---|---|
| Date/Time | Entry timestamp |
| Trade# | Sequential trade number |
| B/S | Buy (Long) or Sell (Short) |
| Entry | Entry price |
| Stop | Stop loss price |
| Trail | Trailing stop (if any) |
| Net Pts | Net points P&L (sortable) |
| Risk(Pts) | Risk in points |
| Net$ | Dollar P&L (sortable) |
| Result | Win/Loss badge |

### 3.10 Upload Section (Admin Only)

Restricted to admin users (class `admin-only`, hidden by default).

**CSV Upload** — accepts Tradovate CSV exports.

| ID | Purpose |
|---|---|
| CSV input | `<input type="file" accept=".csv" onchange="handleTenxCSVUpload(event)">` |
| `export-btn-tenx` | Export button (hidden until data exists) |
| `upload-status-tenx` | Upload progress/success/error messages |
| `sync-status-tenx` | GitHub sync status container |
| `sync-status-tenx-text` | Sync status text |
| Clear button | `onclick="clearData('tenx')"` |
| GitHub sync button | `onclick="showGitHubSettings()"` |

---

## 4. Data Flow

### 4.1 Upload & Persistence

1. Admin uploads Tradovate CSV via file input
2. `handleTenxCSVUpload()` in `dashboard.js` (line 198) handles parsing
3. CSV is parsed by `parseTradovateCSV()` from `parser.js`
4. Trades stored in:
   - `state.tenx.allTrades` (runtime)
   - `localStorage` key `tenx-trades` (client cache)
   - GitHub-backed database table `tenx_trades` (persistent)
5. Weekly snapshots generated and stored in `tenx-snapshots`

### 4.2 Rendering Pipeline

1. `setPeriod('tenx', period)` filters trades for selected period
2. `calculateKPIs(trades, TENX_RISK, TENX_PPT, TENX_STARTING_BALANCE)` computes all metrics
3. `renderTenx(k, trades, allK, allTrades)` populates all DOM elements
4. Shared chart functions render ECharts visualizations

### 4.3 KPI Calculations

All KPIs are computed by the shared `calculateKPIs()` function in `dashboard.js`. Key metrics:

| Metric | Formula |
|---|---|
| Net P&L | Sum of all trade dollarPL |
| Return % | netPL / TENX_STARTING_BALANCE * 100 |
| EV per trade (%R) | (winRate * avgWinR) - (lossRate * avgLossR) |
| Win Rate | wins / totalTrades * 100 |
| Profit Factor | grossWins / abs(grossLosses) |
| Max Drawdown | Largest peak-to-trough equity decline |
| Net Points | Sum of all trade pointsPL |

---

## 5. Panel Registration

The 10x panel is already registered in `switchPanel()` (dashboard.js line 4072):

```js
const panels = { discord: 'panel-discord', options: 'panel-options', tenx: 'panel-tenx' };
const navs = { discord: 'nav-discord', options: 'nav-options', tenx: 'nav-tenx' };
const activeColors = { discord: 'text-blue-400', options: 'text-purple-400', tenx: 'text-emerald-400' };
```

The nav link already exists in `index.html` (line 236):
```html
<a href="#" class="... admin-only" style="display:none;" id="nav-tenx" onclick="switchPanel('tenx');return false;">
    <i class="fas fa-rocket mr-1.5 text-xs"></i>Ekantik 10x Strategy
</a>
```

If building as a **separate page**, you can either:
- (A) Keep the nav link pointing to the separate page URL instead of `switchPanel`
- (B) Create a completely standalone HTML page that loads the same JS/CSS

---

## 6. Existing JS Functions That Support Tenx

All of these already exist and work with `method = 'tenx'`:

| Function | File | Purpose |
|---|---|---|
| `handleTenxCSVUpload(event)` | dashboard.js:198 | CSV upload handler |
| `renderTenx(k, trades, allK, allTrades)` | dashboard.js:1344 | Main render function |
| `renderFoodChain('tenx', ...)` | dashboard.js:1418 | Food chain comparison |
| `renderInceptionSummary('tenx', allK)` | dashboard.js:2202 | Inception stats |
| `renderMonthlySummary(...)` | dashboard.js | Monthly table |
| `renderEquityCurve(...)` | dashboard.js | Equity chart |
| `renderDailyPL(...)` | dashboard.js | Daily P&L chart |
| `renderPLDistribution(...)` | dashboard.js | Distribution histogram |
| `renderWeeklyTrend(...)` | dashboard.js | Weekly trend chart |
| `renderEdgeTrendByWeek(...)` | dashboard.js | Edge trend chart |
| `renderGrowthComparisonFromState(...)` | dashboard.js:1726 | Growth vs S&P 500 |
| `setPeriod('tenx', period)` | dashboard.js | Period filter |
| `setEdgePeriod('tenx', period)` | dashboard.js | Edge period filter |
| `filterTradeLog('tenx', filter)` | dashboard.js | Trade log filter |
| `sortTradeLog('tenx', column)` | dashboard.js | Trade log sort |
| `switchPanel('tenx')` | dashboard.js:4071 | Panel switching |
| `parseTradovateCSV(csv)` | parser.js | CSV parser |
| `calculateKPIs(trades, risk, ppt, bal)` | parser.js/dashboard.js | KPI engine |

---

## 7. Dependencies

| Dependency | CDN | Purpose |
|---|---|---|
| Tailwind CSS | CDN v3 | Styling (utility-first) |
| ECharts | CDN v5 | All charts |
| Font Awesome | CDN v6 | Icons |
| Clerk JS | CDN v5 | Authentication |
| SheetJS (XLSX) | CDN | Excel parsing (optional) |

---

## 8. Authentication

- Uses Clerk (invitation-only magic link auth)
- The 10x panel is admin-only (`admin-only` CSS class)
- Admin emails: `hjdesai@gmail.com`, `hd@ekantikcapital.com`
- If building as separate page, include the same Clerk auth gate from `index.html` lines 85-170

---

## 9. What the Developer Needs to Build

### If embedding in existing page:
Create a `<div id="panel-tenx" class="execution-panel admin-only" style="display:none;">` in `index.html` after `</div><!-- /panel-options -->` (line 1506). Populate it with all the HTML sections listed above, ensuring every element ID exists. The JS is already complete — no JS changes needed.

### If building as separate standalone page:
1. Create a new HTML file (e.g., `10x.html` or `tenx/index.html`)
2. Include the same `<head>` section (Tailwind, ECharts, Font Awesome, Clerk)
3. Include `js/parser.js` and `js/dashboard.js` and `js/auth.js`
4. Build the page body with all sections from Section 3 above
5. On page load, call the same initialization flow that loads tenx trades from localStorage/DB and calls `renderTenx()`
6. The `panel-tenx` div should be the main visible panel (not hidden)

### Key implementation notes:
- **Every element ID listed in this spec MUST exist** in the HTML or the JS will throw null reference errors
- Use the Discord panel (`panel-discord`) in `index.html` as your HTML template — adapt colors and IDs
- The trade log uses `renderDiscordTradeLog()` since it's the same Tradovate CSV format
- Charts are 280-400px height ECharts containers — they auto-resize
- All toggle functions (`toggleDetailedDashboard`, `toggleEdgeSection`) need corresponding button+container pairs
