// =====================================================
// DASHBOARD RENDERING ENGINE v2.0
// Ekantik Capital Performance Dashboard
// =====================================================

// State
const state = {
    active: { allTrades: [], currentPeriod: 'weekly', selectedWeek: null, kpis: null, snapshots: [] },
    discord: { allTrades: [], currentPeriod: 'weekly', selectedWeek: null, kpis: null, snapshots: [] }
};

const chartInstances = {};

// ===== FILE UPLOAD HANDLERS =====
async function handleCSVUpload(event, method) {
    const file = event.target.files[0];
    if (!file) return;

    showUploadProgress('active', 'Parsing CSV...');

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const csvText = e.target.result;
            const trades = parseTradovateCSV(csvText);
            state.active.allTrades = trades;
            state.active.isSampleData = false;
            localStorage.setItem('ecfs-trades', JSON.stringify(trades));
            localStorage.setItem('ecfs-filename', file.name);
            // Store raw CSV for export to GitHub
            localStorage.setItem('ecfs-raw-csv', csvText);

            const weeks = getWeeksList(trades);
            state.active.selectedWeek = weeks[0];
            populateWeekSelector('active', weeks);
            refreshDashboard('active');

            showUploadSuccess('active', `${file.name} — ${trades.length} round-trip trades parsed`);

            // Save to DB in background
            showUploadProgress('active', 'Saving to database...');
            const batchId = `ecfs-${Date.now()}`;
            await DB.saveTrades('ecfs_trades', trades, batchId);

            // Generate and save weekly snapshots
            const snapshots = generateWeeklySnapshots(trades, 'active', ECFS_RISK, ECFS_PPT);
            for (const snap of snapshots) {
                await DB.saveWeeklySnapshot(snap);
            }
            state.active.snapshots = snapshots;

            showUploadSuccess('active', `${file.name} — ${trades.length} trades parsed & saved`);
            showExportButton('active');
        } catch (err) {
            showUploadError('active', 'Error parsing CSV: ' + err.message);
            console.error(err);
        }
    };
    reader.readAsText(file);
}

async function handleExcelUpload(event, method) {
    const file = event.target.files[0];
    if (!file) return;

    showUploadProgress('discord', 'Parsing Excel...');

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const newTrades = parseDiscordExcel(data);

            // MERGE: Combine new trades with existing historical data
            // Dedup by tradeNum to avoid duplicates on re-upload
            const existingTrades = state.discord.allTrades.filter(t => !t._isSample);
            const existingNums = new Set(existingTrades.map(t => t.tradeNum));
            const uniqueNew = newTrades.filter(t => !existingNums.has(t.tradeNum));
            const trades = [...existingTrades, ...uniqueNew].sort((a, b) => {
                const da = new Date(a.datetime), db = new Date(b.datetime);
                return da - db;
            });

            state.discord.allTrades = trades;
            state.discord.isSampleData = false;
            localStorage.setItem('discord-trades', JSON.stringify(trades));
            localStorage.setItem('discord-filename', file.name);

            const weeks = getWeeksList(trades);
            state.discord.selectedWeek = weeks[0];
            populateWeekSelector('discord', weeks);
            refreshDashboard('discord');

            showUploadSuccess('discord', `${file.name} — ${trades.length} trades parsed`);

            // Save to DB
            showUploadProgress('discord', 'Saving to database...');
            const batchId = `discord-${Date.now()}`;
            await DB.saveTrades('discord_trades', trades, batchId);

            const snapshots = generateWeeklySnapshots(trades, 'discord', DISCORD_RISK, DISCORD_PPT);
            for (const snap of snapshots) {
                await DB.saveWeeklySnapshot(snap);
            }
            state.discord.snapshots = snapshots;

            const addedMsg = uniqueNew.length < newTrades.length 
                ? ` (${uniqueNew.length} new, ${newTrades.length - uniqueNew.length} duplicates skipped)`
                : '';
            showUploadSuccess('discord', `${file.name} — ${trades.length} total trades${addedMsg}`);
            showExportButton('discord');
        } catch (err) {
            showUploadError('discord', 'Error parsing Excel: ' + err.message);
            console.error(err);
        }
    };
    reader.readAsArrayBuffer(file);
}

function showUploadProgress(method, msg) {
    const statusEl = document.getElementById(`upload-status-${method}`);
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = `<div class="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 flex items-center gap-2">
        <i class="fas fa-spinner fa-spin text-blue-400"></i>
        <span class="text-blue-300 text-sm font-semibold">${msg}</span>
    </div>`;
}

function showUploadSuccess(method, msg) {
    const statusEl = document.getElementById(`upload-status-${method}`);
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = `<div class="bg-green-900/30 border border-green-500/50 rounded-lg p-3 flex items-center gap-2">
        <i class="fas fa-check-circle text-green-400"></i>
        <span class="text-green-300 text-sm font-semibold">${msg}</span>
    </div>`;
}

function showUploadError(method, msg) {
    const statusEl = document.getElementById(`upload-status-${method}`);
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = `<div class="bg-red-900/30 border border-red-500/50 rounded-lg p-3 flex items-center gap-2">
        <i class="fas fa-exclamation-circle text-red-400"></i>
        <span class="text-red-300 text-sm font-semibold">${msg}</span>
    </div>`;
}

function clearData(method) {
    if (!confirm('Clear all uploaded data? This will remove it from this browser only. Database records are preserved.')) return;
    localStorage.removeItem(method === 'active' ? 'ecfs-trades' : 'discord-trades');
    localStorage.removeItem(method === 'active' ? 'ecfs-filename' : 'discord-filename');
    state[method].allTrades = [];
    state[method].kpis = null;
    location.reload();
}

// ===== TAB SWITCHING =====
function switchExecution(method) {
    document.querySelectorAll('.execution-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(`panel-${method}`).classList.remove('hidden');
    document.querySelectorAll('.tab-button').forEach(t => {
        t.classList.remove('active');
        t.classList.add('bg-[#0d1d35]', 'text-gray-300', 'border-gray-600');
    });
    const tab = document.getElementById(`tab-${method}`);
    tab.classList.add('active');
    tab.classList.remove('bg-[#0d1d35]', 'text-gray-300', 'border-gray-600');

    // Update header nav link highlighting
    const navLinks = { active: 'nav-active', discord: 'nav-discord', compare: 'nav-compare' };
    Object.entries(navLinks).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (key === method) {
            el.classList.remove('text-gray-300');
            el.classList.add(key === 'discord' ? 'text-blue-400' : 'text-[#d4af37]', 'font-semibold');
        } else {
            el.classList.remove('text-[#d4af37]', 'text-blue-400', 'font-semibold');
            el.classList.add('text-gray-300');
        }
    });

    if (method === 'compare') renderCompare();

    // Resize charts after tab switch
    setTimeout(() => {
        Object.values(chartInstances).forEach(c => { if (c && c.resize) c.resize(); });
    }, 100);

    // Scroll to panel area
    const panelArea = document.getElementById(`panel-${method}`);
    if (panelArea) {
        panelArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ===== PERIOD CONTROLS =====
function setPeriod(method, period) {
    state[method].currentPeriod = period;
    document.querySelectorAll(`#panel-${method} .period-btn`).forEach(b => {
        b.classList.remove('active-period');
        b.classList.add('bg-[#0d1d35]', 'text-gray-400', 'border', 'border-gray-700');
    });
    const btn = document.getElementById(`period-${method}-${period}`);
    btn.classList.add('active-period');
    btn.classList.remove('bg-[#0d1d35]', 'text-gray-400', 'border', 'border-gray-700');
    refreshDashboard(method);
}

function selectWeek(method) {
    const sel = document.getElementById(`week-selector-${method}`);
    state[method].selectedWeek = sel.value;
    refreshDashboard(method);
}

function prevPeriod(method) {
    const sel = document.getElementById(`week-selector-${method}`);
    if (sel.selectedIndex < sel.options.length - 1) { sel.selectedIndex++; selectWeek(method); }
}
function nextPeriod(method) {
    const sel = document.getElementById(`week-selector-${method}`);
    if (sel.selectedIndex > 0) { sel.selectedIndex--; selectWeek(method); }
}

function populateWeekSelector(method, weeks) {
    const sel = document.getElementById(`week-selector-${method}`);
    sel.innerHTML = '';
    weeks.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = `Week of ${getWeekRange(w)}`;
        sel.appendChild(opt);
    });
}

// ===== TOGGLE DETAILS =====
function toggleDetails(method) {
    const el = document.getElementById(`${method}-edge-details`);
    const icon = document.getElementById(`${method}-details-icon`);
    el.classList.toggle('hidden');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
}

// ===== MAIN REFRESH =====
function refreshDashboard(method) {
    const allTrades = state[method].allTrades;
    if (!allTrades || allTrades.length === 0) return;

    const period = state[method].currentPeriod;
    const selectedWeek = state[method].selectedWeek;
    let trades;

    if (period === 'weekly') {
        trades = filterByWeek(allTrades, selectedWeek);
    } else if (period === 'monthly') {
        trades = filterByMonth(allTrades, selectedWeek);
    } else {
        trades = allTrades;
    }

    if (trades.length === 0) {
        // No trades for selected period — fall back to all-time and update UI
        trades = allTrades;
        state[method].currentPeriod = 'alltime';
        // Update period button UI to reflect the fallback
        document.querySelectorAll(`#panel-${method} .period-btn`).forEach(b => {
            b.classList.remove('active-period');
            b.classList.add('bg-[#0d1d35]', 'text-gray-400', 'border', 'border-gray-700');
        });
        const btn = document.getElementById(`period-${method}-alltime`);
        if (btn) {
            btn.classList.add('active-period');
            btn.classList.remove('bg-[#0d1d35]', 'text-gray-400', 'border', 'border-gray-700');
        }
    }

    const risk = method === 'active' ? ECFS_RISK : DISCORD_RISK;
    const ppt = method === 'active' ? ECFS_PPT : DISCORD_PPT;
    const kpis = calculateKPIs(trades, risk, ppt);
    state[method].kpis = kpis;

    // Also calculate all-time KPIs for cumulative metrics
    const allTimeKPIs = calculateKPIs(allTrades, risk, ppt);

    const rangeEl = document.getElementById(`period-range-${method}`);
    if (rangeEl) {
        if (period === 'weekly') rangeEl.textContent = getWeekRange(selectedWeek);
        else if (period === 'monthly') rangeEl.textContent = `Month view`;
        else rangeEl.textContent = `All-time (${allTrades.length} trades)`;
    }

    updateLastUpdated(allTrades);

    if (method === 'active') renderActive(kpis, trades, allTimeKPIs, allTrades);
    else if (method === 'discord') renderDiscord(kpis, trades, allTimeKPIs, allTrades);
}

function updateLastUpdated(trades) {
    if (!trades || trades.length === 0) return;
    
    // Find the most recent date across ALL trades (don't trust array order)
    let maxTime = 0;
    let maxDateStr = '';
    
    for (const t of trades) {
        const dateStr = t.exitTime || t.datetime || '';
        if (!dateStr) continue;
        const parts = dateStr.split(' ')[0].split('/');
        if (parts.length < 3) continue;
        const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        const ts = new Date(parseInt(y), parseInt(parts[0]) - 1, parseInt(parts[1])).getTime();
        if (ts > maxTime) {
            maxTime = ts;
            maxDateStr = dateStr;
        }
    }
    
    if (maxTime > 0) {
        const d = new Date(maxTime);
        document.getElementById('last-updated').textContent = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
}

// ===== ANIMATED COUNT UP =====
function animateValue(el, end, prefix = '', suffix = '', decimals = 2) {
    if (!el) return;
    const duration = 800;
    const startTime = performance.now();
    const startVal = 0;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = startVal + (end - startVal) * eased;
        el.textContent = `${prefix}${Math.abs(current).toFixed(decimals)}${suffix}`;
        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = `${prefix}${Math.abs(end).toFixed(decimals)}${suffix}`;
    }
    requestAnimationFrame(update);
}

// ===== RENDER ECFS ACTIVE =====
function renderActive(k, trades, allK, allTrades) {
    // Hero Stats
    setColor('active-hero-pnl', fmtDollar(k.netPL), k.netPL);
    document.getElementById('active-hero-pnl-sub').textContent = `${k.totalTrades} trade${k.totalTrades !== 1 ? 's' : ''}`;
    setColor('active-hero-return', fmtPct(k.returnPct), k.returnPct);
    setColor('active-hero-ev', `${fmtPct(k.evPlannedR)}R`, k.evPlannedR);
    document.getElementById('active-hero-ev-sub').textContent = `${fmtDollar(k.evPerTrade)}/trade`;
    document.getElementById('active-hero-wr').textContent = `${k.winRate.toFixed(1)}%`;
    document.getElementById('active-hero-wr-sub').textContent = `${k.winCount}W / ${k.lossCount}L`;
    document.getElementById('active-hero-pf').textContent = k.profitFactor === Infinity ? '∞' : k.profitFactor.toFixed(2);
    document.getElementById('active-hero-pf-sub').textContent = `${fmtDollar(k.grossWins)} / ${fmtDollar(k.grossLosses)}`;
    setColor('active-hero-dd', `-${fmtDollar(k.maxDD)}`, k.maxDD > 0 ? -1 : 0);
    document.getElementById('active-hero-dd-sub').textContent = `-${k.maxDDPct.toFixed(2)}%`;

    // The Edge
    document.getElementById('active-ev-hero-big').textContent = `${k.evPlannedR >= 0 ? '+' : ''}${k.evPlannedR.toFixed(1)}%R`;
    document.getElementById('active-ev-hero-sub').textContent = `${fmtDollar(k.evPerTrade)} per trade (planned $100 risk)`;
    document.getElementById('active-ev-actual-risk').innerHTML = `<strong>Actual risk-adjusted:</strong> ${k.evActualR >= 0 ? '+' : ''}${k.evActualR.toFixed(1)}%R (avg risk: ${fmtDollar(k.avgRiskDollars)})`;

    setColor('active-edge-avgwin', fmtDollar(k.avgWinDollar), 1);
    document.getElementById('active-edge-avgwin-pts').textContent = `+${k.avgWinPts.toFixed(2)} pts`;
    setColor('active-edge-avgloss', fmtDollar(k.avgLossDollar), -1);
    document.getElementById('active-edge-avgloss-pts').textContent = `${k.avgLossPts.toFixed(2)} pts`;
    document.getElementById('active-edge-wr').textContent = `${k.winRate.toFixed(1)}% (${k.winCount}W / ${k.lossCount}L)`;

    // Plain English
    document.getElementById('active-edge-explanation').textContent = buildEdgeExplanation(k);

    document.getElementById('active-edge-avgrisk').textContent = `${fmtDollar(k.avgRiskDollars)} (vs $100 budget)`;
    document.getElementById('active-edge-adherence').textContent = `${k.riskAdherence.toFixed(0)}%`;
    document.getElementById('active-edge-losscut').textContent = `${(k.avgLossCut * 100).toFixed(0)}% of risk on avg`;

    // Details
    document.getElementById('active-detail-grosswins').textContent = fmtDollar(k.grossWins);
    document.getElementById('active-detail-grosslosses').textContent = `-${fmtDollar(k.grossLosses)}`;
    document.getElementById('active-detail-wlratio').textContent = k.wlRatio === Infinity ? '∞' : k.wlRatio.toFixed(2);
    document.getElementById('active-detail-expectancy').textContent = `${k.expectancyR.toFixed(2)}R`;
    document.getElementById('active-detail-netpts').textContent = `${k.netPoints >= 0 ? '+' : ''}${k.netPoints.toFixed(2)}`;
    document.getElementById('active-detail-rr-wins').textContent = `+${k.avgRRWins.toFixed(2)}R`;
    document.getElementById('active-detail-rr-losses').textContent = `${k.avgRRLosses.toFixed(2)}R`;

    // Risk Management
    document.getElementById('active-risk-maxdd').textContent = `-${fmtDollar(k.maxDD)}`;
    document.getElementById('active-risk-maxdd-pct').textContent = `-${k.maxDDPct.toFixed(2)}% of portfolio`;
    document.getElementById('active-risk-curdd').textContent = k.currentDD > 0 ? `-${fmtDollar(k.currentDD)}` : '$0';
    document.getElementById('active-risk-curdd-status').textContent = k.currentDD > 0 ? 'From equity peak' : 'At new highs';
    document.getElementById('active-risk-recovery').textContent = k.recoveryFactor === Infinity ? '∞' : k.recoveryFactor.toFixed(2);
    document.getElementById('active-risk-maxcw').textContent = k.maxCW;
    document.getElementById('active-risk-maxcl').textContent = k.maxCL;
    document.getElementById('active-risk-curstreak').textContent = `${k.streak > 0 ? '+' : ''}${k.streak}`;

    // Risk Distribution
    renderRiskDistribution('active-risk-distribution', k.riskDist);

    // Efficiency
    document.getElementById('active-eff-ppd').textContent = fmtDollar(k.profitPerDay);
    document.getElementById('active-eff-tpd').textContent = k.tradesPerDay.toFixed(1);
    document.getElementById('active-eff-wdays').textContent = `${k.profitableDays}/${k.tradingDays.length} (${(k.profitableDays / k.tradingDays.length * 100).toFixed(0)}%)`;
    document.getElementById('active-eff-best').textContent = `+${fmtDollar(k.bestTrade)}`;
    document.getElementById('active-eff-worst').textContent = fmtDollar(k.worstTrade);
    document.getElementById('active-eff-longs').textContent = `${k.longs.length} trades | ${k.longs.filter(t => t.isWin).length}W | ${fmtDollar(k.longs.reduce((s, t) => s + t.dollarPL, 0))}`;
    document.getElementById('active-eff-shorts').textContent = `${k.shorts.length} trades | ${k.shorts.filter(t => t.isWin).length}W | ${fmtDollar(k.shorts.reduce((s, t) => s + t.dollarPL, 0))}`;
    document.getElementById('active-eff-days').textContent = k.tradingDays.length;
    document.getElementById('active-trade-count').textContent = `${trades.length} trades`;

    // Charts
    renderEquityCurve('chart-equity-active', k.equityCurve, k.drawdownCurve, '#d4af37');
    renderDailyPL('chart-daily-active', k.dailyPL, k.tradingDays);
    renderPLDistribution('chart-pldist-active', k.plDistribution, '#d4af37');
    renderWeeklyTrend('chart-weekly-trend-active', allK.weeklyPL, 'active');

    // Monthly Summary
    renderMonthlySummary('monthly-summary-active', allTrades, ECFS_RISK, ECFS_PPT);

    // Trade Log
    renderTradeLog('active-trades-body', trades, ECFS_RISK);

    // Inception Summary
    renderInceptionSummary('active', allK);

    // Food Chain
    renderFoodChain('active', k, allK, allTrades);
}

// ===== RENDER DISCORD =====
function renderDiscord(k, trades, allK, allTrades) {
    setColor('discord-hero-pnl', fmtDollar(k.netPL), k.netPL);
    document.getElementById('discord-hero-pnl-sub').textContent = `${k.totalTrades} trade${k.totalTrades !== 1 ? 's' : ''}`;
    setColor('discord-hero-return', fmtPct(k.returnPct), k.returnPct);
    setColor('discord-hero-ev', `${fmtPct(k.evPlannedR)}R`, k.evPlannedR);
    document.getElementById('discord-hero-ev-sub').textContent = `${fmtDollar(k.evPerTrade)}/trade`;
    document.getElementById('discord-hero-wr').textContent = `${k.winRate.toFixed(1)}%`;
    document.getElementById('discord-hero-wr-sub').textContent = `${k.winCount}W / ${k.lossCount}L`;
    document.getElementById('discord-hero-pf').textContent = k.profitFactor === Infinity ? '∞' : k.profitFactor.toFixed(2);
    document.getElementById('discord-hero-pf-sub').textContent = `${fmtDollar(k.grossWins)} / ${fmtDollar(k.grossLosses)}`;
    setColor('discord-hero-dd', `-${fmtDollar(k.maxDD)}`, k.maxDD > 0 ? -1 : 0);
    document.getElementById('discord-hero-dd-sub').textContent = `-${k.maxDDPct.toFixed(2)}%`;

    // Edge
    document.getElementById('discord-ev-hero-big').textContent = `${k.evPlannedR >= 0 ? '+' : ''}${k.evPlannedR.toFixed(1)}%R`;
    document.getElementById('discord-ev-hero-sub').textContent = `${fmtDollar(k.evPerTrade)} per trade (planned $500 risk)`;
    document.getElementById('discord-ev-actual-risk').innerHTML = `<strong>Risk budget:</strong> $500/trade`;

    setColor('discord-edge-avgwin', fmtDollar(k.avgWinDollar), 1);
    document.getElementById('discord-edge-avgwin-pts').textContent = `+${k.avgWinPts.toFixed(2)} pts`;
    setColor('discord-edge-avgloss', fmtDollar(k.avgLossDollar), -1);
    document.getElementById('discord-edge-avgloss-pts').textContent = `${k.avgLossPts.toFixed(2)} pts`;
    document.getElementById('discord-edge-wr').textContent = `${k.winRate.toFixed(1)}% (${k.winCount}W / ${k.lossCount}L)`;

    const wlr = k.wlRatio;
    document.getElementById('discord-edge-explanation').textContent = buildEdgeExplanation(k);

    document.getElementById('discord-detail-grosswins').textContent = fmtDollar(k.grossWins);
    document.getElementById('discord-detail-grosslosses').textContent = `-${fmtDollar(k.grossLosses)}`;
    document.getElementById('discord-detail-wlratio').textContent = wlr === Infinity ? '∞' : wlr.toFixed(2);
    document.getElementById('discord-detail-netpts').textContent = `${k.netPoints >= 0 ? '+' : ''}${k.netPoints.toFixed(2)}`;

    // Charts
    renderEquityCurve('chart-equity-discord', k.equityCurve, k.drawdownCurve, '#60a5fa');
    renderDailyPL('chart-daily-discord', k.dailyPL, k.tradingDays);
    renderPLDistribution('chart-pldist-discord', k.plDistribution, '#60a5fa');
    renderWeeklyTrend('chart-weekly-trend-discord', allK.weeklyPL, 'discord');

    // Monthly Summary
    renderMonthlySummary('monthly-summary-discord', allTrades, DISCORD_RISK, DISCORD_PPT);

    // Trade Log
    renderDiscordTradeLog('discord-trades-body', trades);
    document.getElementById('discord-trade-count').textContent = `${trades.length} trades`;

    // Inception Summary
    renderInceptionSummary('discord', allK);

    // Food Chain (simplified for Discord)
    renderFoodChain('discord', k, allK, allTrades);
}

// ===== EDGE ON THE FOOD CHAIN (Dynamic) =====
function renderFoodChain(method, k, allK, allTrades) {
    const prefix = method === 'active' ? 'fc' : 'dfc';
    const containerId = method === 'active' ? 'foodchain-active' : 'foodchain-discord';
    const container = document.getElementById(containerId);
    if (!container || !k || k.totalTrades < 1) {
        if (container) container.classList.add('hidden');
        return;
    }

    // Show the section
    container.classList.remove('hidden');

    // Constants
    const riskBudget = method === 'active' ? ECFS_RISK : DISCORD_RISK;
    const ppt = method === 'active' ? ECFS_PPT : DISCORD_PPT;
    const instrument = method === 'active' ? 'MES' : 'ES';
    const accentColor = method === 'active' ? '#d4af37' : '#60a5fa';

    // Current period label
    const period = state[method].currentPeriod;
    const periodLabel = period === 'weekly' ? 'This Week' : period === 'monthly' ? 'This Month' : 'All-Time';

    // --- Core metrics ---
    const edgeR = k.evPlannedR;           // EV as % of planned risk
    const edgePct = edgeR;                 // same thing (e.g., +25 means +25%R)
    const winRate = k.winRate;
    const avgWin = k.avgWinDollar;
    const avgLoss = Math.abs(k.avgLossDollar);
    const rr = avgLoss > 0 ? avgWin / avgLoss : 0;  // reward:risk ratio

    // Trades per month estimate
    const tradingDays = k.tradingDays.length || 1;
    const tradesPerDay = k.totalTrades / tradingDays;
    const tradesPerMonth = tradesPerDay * 21; // ~21 trading days per month
    const tradesPerYear = tradesPerMonth * 12;

    // Annual R (EV in R per trade × trades per year)
    const evR = edgeR / 100; // convert % to decimal R
    const annualR = evR * tradesPerYear;

    // --- Period Label ---
    const el = (id) => document.getElementById(id);
    const setEl = (id, val) => { const e = el(id); if (e) e.textContent = val; };
    const setHTML = (id, val) => { const e = el(id); if (e) e.innerHTML = val; };

    setEl(`${prefix}-period-label`, `(${periodLabel})`);

    // --- Your Strategy Row ---
    const edgeSign = edgeR >= 0 ? '+' : '';

    // Build sorted food chain table (ECFS has table, Discord has stat boxes)
    renderFoodChainTable(prefix, method, edgeR, tradesPerMonth, annualR, periodLabel, accentColor);

    // Also set standalone stat elements (used by Discord simplified layout)
    setEl(`${prefix}-edge-per-trade`, `${edgeSign}${edgeR.toFixed(1)}%R`);
    setEl(`${prefix}-trades-month`, `≈${Math.round(tradesPerMonth)}`);
    setEl(`${prefix}-annual-r`, `≈${annualR.toFixed(0)} R`);

    // Summary callout: explicit math so the user knows exactly how Annual R was derived
    const strategyLabel = method === 'active' ? 'ECFS Active (MES)' : 'Discord Selective (ES)';
    const riskLabel = method === 'active' ? '$100' : '$500';
    setHTML(`${prefix}-summary-text`,
        `<strong style="color:${accentColor}">${strategyLabel}</strong> · ${periodLabel}: ` +
        `<strong>${edgeSign}${edgeR.toFixed(1)}%R</strong> edge/trade × ` +
        `<strong>${Math.round(tradesPerMonth)}</strong> trades/mo × 12 = ` +
        `<strong style="color:${accentColor}">≈${annualR.toFixed(0)} R/year</strong> ` +
        `(${annualR.toFixed(0)}R × ${riskLabel} = $${Math.abs(annualR * riskBudget).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')})`
    );

    // --- Edge Derivation ---
    setEl(`${prefix}-win-rate`, `${winRate.toFixed(1)}%`);
    setEl(`${prefix}-risk-reward`, rr > 0 ? `1:${rr.toFixed(2)}` : '—');
    setEl(`${prefix}-ev-result`, `${edgeSign}${edgeR.toFixed(1)}%R`);

    // Formula breakdown
    const winRateDec = winRate / 100;
    const lossRateDec = 1 - winRateDec;
    const avgWinR = riskBudget > 0 ? avgWin / riskBudget : 0;
    const avgLossR = riskBudget > 0 ? avgLoss / riskBudget : 0;

    setEl(`${prefix}-formula-line1`, `EV = (${(winRateDec * 100).toFixed(0)}% × ${avgWinR.toFixed(2)}R) − (${(lossRateDec * 100).toFixed(0)}% × ${avgLossR.toFixed(2)}R)`);
    setEl(`${prefix}-formula-line2`, `EV = ${(winRateDec * avgWinR).toFixed(3)}R − ${(lossRateDec * avgLossR).toFixed(3)}R`);
    setEl(`${prefix}-formula-result`, `EV = ${edgeSign}${(edgeR / 100).toFixed(3)}R per trade (${edgeSign}${edgeR.toFixed(1)}%R)`);

    // --- Returns Scaling Bars ---
    const accountSize = STARTING_BALANCE;
    const barsContainer = el(`${prefix}-returns-bars`);
    if (barsContainer) {
        // Different risk levels (% of account)
        const riskLevels = [
            { pct: 0.25, label: '0.25%' },
            { pct: 0.50, label: '0.50%' },
            { pct: 1.00, label: '1.00%' },
            { pct: 2.00, label: '2.00%' }
        ];

        const maxReturn = Math.max(...riskLevels.map(r => Math.abs(evR * (accountSize * r.pct / 100) / riskBudget * tradesPerYear * riskBudget)));
        let barsHTML = '';

        riskLevels.forEach((r, i) => {
            const riskDollars = accountSize * r.pct / 100;
            const scaleFactor = riskDollars / riskBudget;
            const annualReturn = evR * tradesPerYear * riskDollars;
            const barWidth = maxReturn > 0 ? Math.min(100, Math.abs(annualReturn) / maxReturn * 100) : 0;
            const isNeg = annualReturn < 0;
            const isCurrent = Math.abs(r.pct - (riskBudget / accountSize * 100)) < 0.01;

            const barGradient = isNeg
                ? 'linear-gradient(to right, #dc2626, #f87171)'
                : method === 'active'
                    ? 'linear-gradient(to right, #d4af37, #f4c430)'
                    : 'linear-gradient(to right, #3b82f6, #93c5fd)';

            const labelColor = isCurrent ? accentColor : '#9ca3af';
            const highlightClass = isCurrent ? 'foodchain-highlight-row' : '';

            barsHTML += `
                <div class="flex items-center gap-3 ${highlightClass}">
                    <div class="w-14 text-right">
                        <span class="text-[10px] font-bold" style="color: ${labelColor}">${r.pct}% risk</span>
                    </div>
                    <div class="flex-1 relative">
                        <div class="h-5 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.05);">
                            <div class="h-full rounded-full foodchain-bar" 
                                 style="width: 0%; background: ${barGradient};" data-target-width="${barWidth}%"></div>
                        </div>
                    </div>
                    <div class="w-24 text-right">
                        <span class="text-xs font-bold" style="color: ${isNeg ? '#f87171' : '#ffffff'}">${isNeg ? '-' : ''}$${Math.abs(annualReturn).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/yr</span>
                    </div>
                </div>`;
        });

        barsContainer.innerHTML = barsHTML;

        // Animate bars after DOM update
        requestAnimationFrame(() => {
            barsContainer.querySelectorAll('.foodchain-bar').forEach(bar => {
                const target = bar.getAttribute('data-target-width');
                setTimeout(() => { bar.style.width = target; }, 100);
            });
        });
    }

    // Math formula subtitle
    setEl(`${prefix}-math-formula`, `Return = ${edgeSign}${edgeR.toFixed(1)}%R × Risk$/Trade × ${Math.round(tradesPerYear)} trades/yr`);

    // --- What R Means ---
    setEl(`${prefix}-annual-r-label`, `${annualR.toFixed(0)} R`);
    setEl(`${prefix}-r-example1`, `For ${(riskBudget / accountSize * 100).toFixed(1)}% risk on $${(accountSize / 1000).toFixed(0)}K account, R = $${riskBudget}`);
    setEl(`${prefix}-r-example2`, `${annualR.toFixed(0)} R × $${riskBudget} = $${Math.abs(annualR * riskBudget).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/year at ${(riskBudget / accountSize * 100).toFixed(1)}% risk`);

    // Key insight
    const edgeVsCasino = 5.26 > 0 ? (edgeR / 5.26).toFixed(1) : '—';
    const edgeVsHFT = 0.017 > 0 ? (edgeR / 0.017).toFixed(0) : '—';

    if (edgeR > 0) {
        setEl(`${prefix}-key-insight`, `Your ${edgeSign}${edgeR.toFixed(1)}%R edge is ${edgeVsCasino}× a casino's edge — returns grow proportionally with risk taken.`);
    } else if (edgeR < 0) {
        setEl(`${prefix}-key-insight`, `Edge is currently negative. More trades or better risk management needed to establish a positive expectancy.`);
    } else {
        setEl(`${prefix}-key-insight`, `Edge is currently breakeven. Continue trading to accumulate more data.`);
    }

    // --- Why The Numbers Matter ---
    if (edgeR > 0) {
        setEl(`${prefix}-why-magnitude`, `Your ${edgeSign}${edgeR.toFixed(1)}%R edge is ${edgeVsCasino}× a casino's edge and ${edgeVsHFT}× what HFT firms scalp per trade.`);
    } else {
        setEl(`${prefix}-why-magnitude`, `Edge is ${edgeSign}${edgeR.toFixed(1)}%R — below positive territory. Focus on risk:reward and consistency.`);
    }
    setEl(`${prefix}-why-frequency`, `E[Profit] ≈ ${(evR).toFixed(3)}R × (${Math.round(tradesPerMonth)} trades × 12) ≈ ${annualR.toFixed(0)} R`);

    // --- Render the visual position indicator (ECharts gauge/bar) ---
    renderFoodChainChart(`${prefix}-position-chart`, k, method);
}

// Build the food chain comparison table, sorted by Annual R descending
function renderFoodChainTable(prefix, method, edgeR, tradesPerMonth, annualR, periodLabel, accentColor) {
    const tbody = document.getElementById(`${prefix}-table-body`);
    if (!tbody) return;

    const edgeSign = edgeR >= 0 ? '+' : '';
    const strategyName = method === 'active' ? 'ECFS Active' : 'Discord Selective';
    const icon = method === 'active' ? 'fa-bolt' : 'fa-comments';

    // Benchmark data with sortable Annual R values
    const benchmarks = [
        { name: 'Casino – American Roulette', edge: '+5.26%', trades: '≥2,400', annualR: 1500, annualRLabel: '≈1,500 R', isYou: false },
        { name: 'High-Frequency Market-Making', edge: '+0.017%', trades: '≈100,000+', annualR: 26, annualRLabel: '≈26 R', isYou: false },
        { name: 'Stat-Arb Pairs / Baskets', edge: '+0.5–2%', trades: '200–500', annualR: 42, annualRLabel: '≈42 R', isYou: false },
        { name: 'Trend-Following CTAs', edge: '+0.5–1%', trades: '10–30', annualR: 56, annualRLabel: '≈56 R', isYou: false },
        { name: 'Retail Day-Trader (median)', edge: 'negative', trades: '500+', annualR: -30, annualRLabel: '−30 R', isYou: false },
        {
            name: strategyName,
            edge: `${edgeSign}${edgeR.toFixed(1)}%R`,
            trades: `≈${Math.round(tradesPerMonth)}`,
            annualR: annualR,
            annualRLabel: `≈${annualR.toFixed(0)} R`,
            isYou: true,
            periodLabel: periodLabel
        }
    ];

    // Sort by Annual R descending (highest at top)
    benchmarks.sort((a, b) => b.annualR - a.annualR);

    let html = '';
    benchmarks.forEach((b, i) => {
        if (b.isYou) {
            // Your strategy row — highlighted
            html += `<tr style="border: 2px solid ${accentColor}99; background: ${accentColor}14;">
                <td style="color: ${accentColor}" class="font-bold px-3 py-2.5 border-b border-gray-700/20"><i class="fas ${icon} mr-1"></i>${b.name} <span class="text-[10px] font-normal" style="color: #9ca3af">(${b.periodLabel})</span></td>
                <td style="color: ${accentColor}" class="font-bold text-right px-3 py-2.5 border-b border-gray-700/20">${b.edge}</td>
                <td style="color: ${accentColor}" class="font-bold text-right px-3 py-2.5 border-b border-gray-700/20">${b.trades}</td>
                <td style="color: ${accentColor}" class="font-bold text-right px-3 py-2.5 border-b border-gray-700/20">${b.annualRLabel}</td>
            </tr>`;
        } else {
            const edgeColor = b.annualR >= 0 ? '#4ade80' : '#f87171';
            const annualColor = b.annualR >= 0 ? '#d1d5db' : '#f87171';
            html += `<tr class="hover:bg-white/5">
                <td class="px-3 py-2 border-b border-gray-700/20" style="color: #d1d5db">${b.name}</td>
                <td class="text-right px-3 py-2 border-b border-gray-700/20" style="color: ${edgeColor}">${b.edge}</td>
                <td class="text-right px-3 py-2 border-b border-gray-700/20" style="color: #9ca3af">${b.trades}</td>
                <td class="text-right px-3 py-2 border-b border-gray-700/20" style="color: ${annualColor}">${b.annualRLabel}</td>
            </tr>`;
        }
    });

    tbody.innerHTML = html;
}

// ECharts gauge showing where the edge sits
function renderFoodChainChart(containerId, k, method) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Dispose existing
    if (chartInstances[containerId]) {
        chartInstances[containerId].dispose();
        delete chartInstances[containerId];
    }

    const chart = echarts.init(container);
    chartInstances[containerId] = chart;

    const edgeR = k.evPlannedR;
    const accentColor = method === 'active' ? '#d4af37' : '#60a5fa';

    // Benchmark data for the horizontal bar chart
    const benchmarks = [
        { name: 'Retail Day-Trader', edge: -2.5, color: '#ef4444' },
        { name: 'HFT Market-Making', edge: 0.017, color: '#6b7280' },
        { name: 'Stat-Arb', edge: 1.25, color: '#6b7280' },
        { name: 'Trend-Following CTAs', edge: 0.75, color: '#6b7280' },
        { name: 'Casino Roulette', edge: 5.26, color: '#9ca3af' },
        { name: method === 'active' ? 'ECFS Active' : 'Discord Selective', edge: edgeR, color: accentColor }
    ];

    // Sort by edge
    benchmarks.sort((a, b) => a.edge - b.edge);

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: params => {
                const d = params[0];
                return `<strong>${d.name}</strong><br/>Edge: ${d.value >= 0 ? '+' : ''}${d.value.toFixed(2)}%R`;
            },
            backgroundColor: '#1a2744',
            borderColor: 'rgba(212,175,55,0.3)',
            textStyle: { color: '#e5e7eb', fontSize: 11 }
        },
        grid: { left: '2%', right: '12%', top: '8%', bottom: '5%', containLabel: true },
        xAxis: {
            type: 'value',
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
            axisLabel: { color: '#9ca3af', fontSize: 10, formatter: v => `${v >= 0 ? '+' : ''}${v}%` },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }
        },
        yAxis: {
            type: 'category',
            data: benchmarks.map(b => b.name),
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: '#d1d5db',
                fontSize: 10,
                formatter: name => {
                    const isYou = name.includes('ECFS') || name.includes('Discord');
                    return isYou ? `{highlight|${name}}` : name;
                },
                rich: {
                    highlight: { color: accentColor, fontWeight: 'bold', fontSize: 11 }
                }
            }
        },
        series: [{
            type: 'bar',
            data: benchmarks.map(b => ({
                value: b.edge,
                itemStyle: {
                    color: b.color,
                    borderRadius: b.edge >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4],
                    ...(b.name.includes('ECFS') || b.name.includes('Discord') ? {
                        shadowColor: accentColor + '60',
                        shadowBlur: 12
                    } : {})
                }
            })),
            barWidth: '55%',
            label: {
                show: true,
                position: 'right',
                color: '#d1d5db',
                fontSize: 10,
                formatter: p => `${p.value >= 0 ? '+' : ''}${p.value.toFixed(p.value === Math.round(p.value) ? 0 : 2)}%`
            }
        }]
    };

    chart.setOption(option);
    window.addEventListener('resize', () => chart.resize());
}

// ===== INCEPTION-TO-DATE SUMMARY =====
function renderInceptionSummary(method, allK) {
    const container = document.getElementById(`inception-${method}`);
    if (!container || !allK) return;

    const weeks = Object.keys(allK.weeklyPL).sort();
    const bestWeek = weeks.reduce((best, wk) => allK.weeklyPL[wk].pl > (allK.weeklyPL[best]?.pl || -Infinity) ? wk : best, weeks[0]);
    const worstWeek = weeks.reduce((worst, wk) => allK.weeklyPL[wk].pl < (allK.weeklyPL[worst]?.pl || Infinity) ? wk : worst, weeks[0]);

    container.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-green-900/10 border border-green-500/20 rounded-lg p-3 text-center">
                <p class="text-[10px] text-green-400 font-bold">TOTAL P&L</p>
                <p class="text-lg font-bold ${allK.netPL >= 0 ? 'text-green-400' : 'text-red-400'}">${allK.netPL >= 0 ? '+' : ''}${fmtDollar(allK.netPL)}</p>
                <p class="text-[10px] text-gray-500">${fmtPct(allK.returnPct)} return</p>
            </div>
            <div class="bg-blue-900/10 border border-blue-500/20 rounded-lg p-3 text-center">
                <p class="text-[10px] text-blue-400 font-bold">TOTAL TRADES</p>
                <p class="text-lg font-bold text-white">${allK.totalTrades}</p>
                <p class="text-[10px] text-gray-500">${weeks.length} weeks</p>
            </div>
            <div class="bg-green-900/10 border border-green-500/20 rounded-lg p-3 text-center">
                <p class="text-[10px] text-green-400 font-bold">BEST WEEK</p>
                <p class="text-lg font-bold text-green-400">+${fmtDollar(allK.weeklyPL[bestWeek]?.pl || 0)}</p>
                <p class="text-[10px] text-gray-500">${getWeekRange(bestWeek)}</p>
            </div>
            <div class="bg-red-900/10 border border-red-500/20 rounded-lg p-3 text-center">
                <p class="text-[10px] text-red-400 font-bold">WORST WEEK</p>
                <p class="text-lg font-bold text-red-400">${fmtDollar(allK.weeklyPL[worstWeek]?.pl || 0)}</p>
                <p class="text-[10px] text-gray-500">${getWeekRange(worstWeek)}</p>
            </div>
        </div>
    `;
}

// ===== COMPARE TAB =====
// ===== COMPARE PERIOD CONTROLS =====
let comparePeriod = 'weekly';

function setComparePeriod(period) {
    comparePeriod = period;
    // Update buttons
    document.querySelectorAll('#panel-compare .period-btn').forEach(b => {
        b.classList.remove('active-period');
        b.classList.add('bg-[#0d1d35]', 'text-gray-400', 'border', 'border-gray-700');
    });
    const btn = document.getElementById(`period-compare-${period}`);
    if (btn) {
        btn.classList.add('active-period');
        btn.classList.remove('bg-[#0d1d35]', 'text-gray-400', 'border', 'border-gray-700');
    }
    renderCompare();
}

function getCompareKPIs(method) {
    const allTrades = state[method].allTrades;
    if (!allTrades || allTrades.length === 0) return null;

    const selectedWeek = state[method].selectedWeek;
    let trades;

    if (comparePeriod === 'weekly') {
        trades = filterByWeek(allTrades, selectedWeek);
    } else if (comparePeriod === 'monthly') {
        trades = filterByMonth(allTrades, selectedWeek);
    } else {
        trades = allTrades;
    }

    if (!trades || trades.length === 0) trades = allTrades;

    const risk = method === 'active' ? ECFS_RISK : DISCORD_RISK;
    const ppt = method === 'active' ? ECFS_PPT : DISCORD_PPT;
    return calculateKPIs(trades, risk, ppt);
}

function renderCompare() {
    const ak = getCompareKPIs('active');
    const dk = getCompareKPIs('discord');

    // Period label
    const periodLabels = { weekly: 'This Week', monthly: 'This Month', alltime: 'All-Time' };
    const labelEl = document.getElementById('compare-period-label');
    if (labelEl) labelEl.textContent = periodLabels[comparePeriod] || 'All-Time';

    // Side-by-side R-normalized stats (no raw dollars — apples-to-apples)
    ['active', 'discord'].forEach(method => {
        const k = method === 'active' ? ak : dk;
        const container = document.getElementById(`compare-${method}-stats`);
        if (!k) { container.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Upload data first</p>'; return; }

        const color = method === 'active' ? '#d4af37' : '#60a5fa';
        const riskBudget = method === 'active' ? ECFS_RISK : DISCORD_RISK;

        // All values in R-multiples
        const netR = riskBudget > 0 ? (k.netPL / riskBudget) : 0;
        const avgWinR = riskBudget > 0 ? (k.avgWinDollar / riskBudget) : 0;
        const avgLossR = riskBudget > 0 ? (Math.abs(k.avgLossDollar) / riskBudget) : 0;
        const maxDDR = riskBudget > 0 ? (k.maxDD / riskBudget) : 0;
        const bestR = riskBudget > 0 ? (k.bestTrade / riskBudget) : 0;
        const worstR = riskBudget > 0 ? (Math.abs(k.worstTrade) / riskBudget) : 0;
        const grossWinsR = riskBudget > 0 ? (k.grossWins / riskBudget) : 0;
        const grossLossesR = riskBudget > 0 ? (k.grossLosses / riskBudget) : 0;

        const fmtR = (v, sign = true) => {
            const s = sign && v > 0 ? '+' : v < 0 ? '' : '';
            return `${s}${v.toFixed(2)}R`;
        };

        container.innerHTML = `
            <div class="space-y-2.5">
                <div class="flex justify-between items-center"><span class="text-gray-400 text-sm">Net P&L</span><span class="text-lg font-bold" style="color: ${netR >= 0 ? '#4ade80' : '#f87171'}">${fmtR(netR)}</span></div>
                <div class="flex justify-between items-center"><span class="text-gray-400 text-sm">EV / Trade</span><span class="text-sm font-semibold" style="color:${color}">${k.evPlannedR >= 0 ? '+' : ''}${k.evPlannedR.toFixed(1)}%R</span></div>
                <div class="flex justify-between items-center"><span class="text-gray-400 text-sm">Win Rate</span><span class="text-sm font-semibold text-white">${k.winRate.toFixed(1)}% <span class="text-xs text-gray-500">(${k.winCount}W / ${k.lossCount}L)</span></span></div>
                <div class="flex justify-between items-center"><span class="text-gray-400 text-sm">Profit Factor</span><span class="text-sm font-semibold text-white">${k.profitFactor === Infinity ? '∞' : k.profitFactor.toFixed(2)}</span></div>
                <div class="flex justify-between items-center"><span class="text-gray-400 text-sm">Avg Win</span><span class="text-sm font-semibold" style="color:#4ade80">${fmtR(avgWinR)}</span></div>
                <div class="flex justify-between items-center"><span class="text-gray-400 text-sm">Avg Loss</span><span class="text-sm font-semibold" style="color:#f87171">${fmtR(-avgLossR)}</span></div>
                <div class="flex justify-between items-center"><span class="text-gray-400 text-sm">Max Drawdown</span><span class="text-sm font-semibold" style="color:#f87171">-${maxDDR.toFixed(1)}R</span></div>
                <div class="flex justify-between items-center"><span class="text-gray-400 text-sm">Best Trade</span><span class="text-sm font-semibold" style="color:#4ade80">+${bestR.toFixed(2)}R</span></div>
                <div class="flex justify-between items-center"><span class="text-gray-400 text-sm">Worst Trade</span><span class="text-sm font-semibold" style="color:#f87171">-${worstR.toFixed(2)}R</span></div>
                <div class="flex justify-between items-center"><span class="text-gray-400 text-sm">Total Trades</span><span class="text-sm font-semibold text-white">${k.totalTrades}</span></div>
                <div class="flex justify-between items-center"><span class="text-gray-400 text-sm">Winning Days</span><span class="text-sm font-semibold text-white">${k.profitableDays}/${k.tradingDays.length}</span></div>
                <div class="mt-3 pt-3 border-t border-gray-700/30 flex justify-between items-center"><span class="text-gray-500 text-[10px]">1R = $${riskBudget}</span><span class="text-gray-500 text-[10px]">${fmtR(netR)} = ${k.netPL >= 0 ? '+' : ''}$${Math.abs(k.netPL).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span></div>
            </div>
        `;
    });

    // R-Normalized Head-to-Head Table
    renderCompareRTable(ak, dk);

    // Radar Chart (R-normalized)
    renderRadarChart(ak, dk);

    // Insights
    renderCompareInsights(ak, dk);
}

function renderCompareRTable(ak, dk) {
    const container = document.getElementById('compare-r-table');
    if (!container) return;
    if (!ak && !dk) { container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Upload data for both methods</p>'; return; }

    // Helper to format R values
    const fR = (v) => v === null || v === undefined ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
    const fPct = (v) => v === null || v === undefined ? '—' : `${v.toFixed(1)}%`;
    const fPF = (v) => !v ? '—' : v === Infinity ? '∞' : v.toFixed(2);

    // Build comparison rows
    const rows = [
        {
            metric: 'EV per Trade',
            ecfs: ak ? `${ak.evPlannedR >= 0 ? '+' : ''}${ak.evPlannedR.toFixed(1)}%R` : '—',
            discord: dk ? `${dk.evPlannedR >= 0 ? '+' : ''}${dk.evPlannedR.toFixed(1)}%R` : '—',
            winner: ak && dk ? (ak.evPlannedR > dk.evPlannedR ? 'ecfs' : dk.evPlannedR > ak.evPlannedR ? 'discord' : 'tie') : null,
            note: 'Core edge — higher = better'
        },
        {
            metric: 'Win Rate',
            ecfs: ak ? `${ak.winRate.toFixed(1)}%` : '—',
            discord: dk ? `${dk.winRate.toFixed(1)}%` : '—',
            winner: ak && dk ? (ak.winRate > dk.winRate ? 'ecfs' : dk.winRate > ak.winRate ? 'discord' : 'tie') : null,
            note: ''
        },
        {
            metric: 'Avg Win (R)',
            ecfs: ak ? `${(ak.avgWinDollar / ECFS_RISK).toFixed(2)}R` : '—',
            discord: dk ? `${(dk.avgWinDollar / DISCORD_RISK).toFixed(2)}R` : '—',
            winner: ak && dk ? ((ak.avgWinDollar / ECFS_RISK) > (dk.avgWinDollar / DISCORD_RISK) ? 'ecfs' : 'discord') : null,
            note: ''
        },
        {
            metric: 'Avg Loss (R)',
            ecfs: ak ? `${(Math.abs(ak.avgLossDollar) / ECFS_RISK).toFixed(2)}R` : '—',
            discord: dk ? `${(Math.abs(dk.avgLossDollar) / DISCORD_RISK).toFixed(2)}R` : '—',
            winner: ak && dk ? ((Math.abs(ak.avgLossDollar) / ECFS_RISK) < (Math.abs(dk.avgLossDollar) / DISCORD_RISK) ? 'ecfs' : 'discord') : null,
            note: 'Lower = better risk control'
        },
        {
            metric: 'Profit Factor',
            ecfs: ak ? fPF(ak.profitFactor) : '—',
            discord: dk ? fPF(dk.profitFactor) : '—',
            winner: ak && dk ? (ak.profitFactor > dk.profitFactor ? 'ecfs' : dk.profitFactor > ak.profitFactor ? 'discord' : 'tie') : null,
            note: ''
        },
        {
            metric: 'W/L Ratio',
            ecfs: ak ? (ak.wlRatio === Infinity ? '∞' : ak.wlRatio.toFixed(2)) : '—',
            discord: dk ? (dk.wlRatio === Infinity ? '∞' : dk.wlRatio.toFixed(2)) : '—',
            winner: ak && dk ? (ak.wlRatio > dk.wlRatio ? 'ecfs' : dk.wlRatio > ak.wlRatio ? 'discord' : 'tie') : null,
            note: ''
        },
        {
            metric: 'Max DD (R)',
            ecfs: ak ? `${(ak.maxDD / ECFS_RISK).toFixed(1)}R` : '—',
            discord: dk ? `${(dk.maxDD / DISCORD_RISK).toFixed(1)}R` : '—',
            winner: ak && dk ? ((ak.maxDD / ECFS_RISK) < (dk.maxDD / DISCORD_RISK) ? 'ecfs' : 'discord') : null,
            note: 'Lower = less drawdown risk'
        },
        {
            metric: 'Recovery Factor',
            ecfs: ak ? (ak.recoveryFactor === Infinity ? '∞' : ak.recoveryFactor.toFixed(2)) : '—',
            discord: dk ? (dk.recoveryFactor === Infinity ? '∞' : dk.recoveryFactor.toFixed(2)) : '—',
            winner: ak && dk ? (ak.recoveryFactor > dk.recoveryFactor ? 'ecfs' : dk.recoveryFactor > ak.recoveryFactor ? 'discord' : 'tie') : null,
            note: ''
        },
        {
            metric: 'Total Trades',
            ecfs: ak ? ak.totalTrades : '—',
            discord: dk ? dk.totalTrades : '—',
            winner: null,
            note: 'More trades = more data confidence'
        }
    ];

    const winBadge = (method, winner) => {
        if (!winner || winner === 'tie') return '';
        if (winner === method) return ' <i class="fas fa-trophy text-[10px]" style="color: #d4af37"></i>';
        return '';
    };

    let html = `<table class="w-full text-xs">
        <thead>
            <tr>
                <th class="text-left text-gray-400 font-bold px-3 py-2 border-b-2 border-[#d4af37]/20" style="background: rgba(212,175,55,0.05)">Metric</th>
                <th class="text-right text-[#d4af37] font-bold px-3 py-2 border-b-2 border-[#d4af37]/20" style="background: rgba(212,175,55,0.05)"><i class="fas fa-bolt mr-1"></i>ECFS Active</th>
                <th class="text-right text-blue-400 font-bold px-3 py-2 border-b-2 border-[#d4af37]/20" style="background: rgba(212,175,55,0.05)"><i class="fas fa-comments mr-1"></i>Discord</th>
            </tr>
        </thead><tbody>`;

    rows.forEach(r => {
        const ecfsStyle = r.winner === 'ecfs' ? 'color:#d4af37;font-weight:700' : 'color:#e5e7eb';
        const discordStyle = r.winner === 'discord' ? 'color:#60a5fa;font-weight:700' : 'color:#e5e7eb';
        html += `<tr class="hover:bg-white/5 border-b border-gray-700/20">
            <td class="text-gray-300 px-3 py-2">${r.metric} ${r.note ? `<span class="text-[9px] text-gray-600 block">${r.note}</span>` : ''}</td>
            <td class="text-right px-3 py-2" style="${ecfsStyle}">${r.ecfs}${winBadge('ecfs', r.winner)}</td>
            <td class="text-right px-3 py-2" style="${discordStyle}">${r.discord}${winBadge('discord', r.winner)}</td>
        </tr>`;
    });

    html += '</tbody></table>';

    // R definition reminder
    html += `<div class="mt-3 flex items-center gap-3 text-[10px] text-gray-500 justify-center">
        <span><strong style="color:#d4af37">ECFS:</strong> 1R = $${ECFS_RISK}</span>
        <span>|</span>
        <span><strong style="color:#60a5fa">Discord:</strong> 1R = $${DISCORD_RISK}</span>
        <span>|</span>
        <span><i class="fas fa-trophy text-[#d4af37]"></i> = winner for that metric</span>
    </div>`;

    container.innerHTML = html;
}

function renderCompareInsights(ak, dk) {
    const container = document.getElementById('compare-insights');
    if (!container) return;

    if (!ak || !dk) {
        container.innerHTML = `<h3 class="text-lg font-bold text-white mb-4 flex items-center"><i class="fas fa-lightbulb text-[#d4af37] mr-2"></i>Key Insights</h3>
            <p class="text-gray-400 text-sm">Upload data for both execution methods to see comparative insights.</p>`;
        return;
    }

    const insights = [];

    // 1. Risk context — the most important distinction
    insights.push({
        icon: 'fa-shield-alt',
        color: '#d4af37',
        title: 'Different Risk, Same Edge Framework',
        text: `ECFS risks $${ECFS_RISK}/trade (0.5% of $20K) while Discord risks $${DISCORD_RISK}/trade (2.5%). Dollar amounts differ, but R-normalized metrics tell the real story.`
    });

    // 2. EV comparison in R
    if (ak.evPlannedR !== dk.evPlannedR) {
        const better = ak.evPlannedR > dk.evPlannedR ? 'ECFS Active' : 'Discord Selective';
        const bEV = Math.max(ak.evPlannedR, dk.evPlannedR);
        const wEV = Math.min(ak.evPlannedR, dk.evPlannedR);
        insights.push({
            icon: 'fa-crosshairs',
            color: ak.evPlannedR > dk.evPlannedR ? '#d4af37' : '#60a5fa',
            title: `${better} Has Higher Edge per Trade`,
            text: `${bEV >= 0 ? '+' : ''}${bEV.toFixed(1)}%R vs ${wEV >= 0 ? '+' : ''}${wEV.toFixed(1)}%R. In R-normalized terms, each ${better.split(' ')[0]} trade captures more of the risk budget.`
        });
    }

    // 3. Win rate
    if (Math.abs(ak.winRate - dk.winRate) >= 1) {
        const better = ak.winRate > dk.winRate ? 'ECFS' : 'Discord';
        insights.push({
            icon: 'fa-trophy',
            color: '#4ade80',
            title: `${better} Has Higher Win Rate`,
            text: `${Math.max(ak.winRate, dk.winRate).toFixed(0)}% vs ${Math.min(ak.winRate, dk.winRate).toFixed(0)}%. However, win rate alone doesn't determine edge — R:R matters equally.`
        });
    }

    // 4. Drawdown comparison in R
    const akDDR = ak.maxDD / ECFS_RISK;
    const dkDDR = dk.maxDD / DISCORD_RISK;
    if (Math.abs(akDDR - dkDDR) > 0.5) {
        const betterDD = akDDR < dkDDR ? 'ECFS' : 'Discord';
        insights.push({
            icon: 'fa-arrow-trend-down',
            color: '#f87171',
            title: `${betterDD} Has Lower Drawdown (in R)`,
            text: `${Math.min(akDDR, dkDDR).toFixed(1)}R vs ${Math.max(akDDR, dkDDR).toFixed(1)}R max drawdown. Smaller R-drawdown = more resilient equity curve.`
        });
    }

    // 5. Data confidence
    const moreData = ak.totalTrades > dk.totalTrades ? 'ECFS' : 'Discord';
    if (ak.totalTrades !== dk.totalTrades) {
        insights.push({
            icon: 'fa-database',
            color: '#a78bfa',
            title: 'Data Confidence',
            text: `${moreData} has ${Math.max(ak.totalTrades, dk.totalTrades)} trades vs ${Math.min(ak.totalTrades, dk.totalTrades)}. More trades = higher statistical confidence in the edge. Aim for 100+ trades per method.`
        });
    }

    container.innerHTML = `<h3 class="text-lg font-bold text-white mb-4 flex items-center"><i class="fas fa-lightbulb text-[#d4af37] mr-2"></i>Key Insights <span class="text-gray-500 text-xs font-normal ml-2">(${comparePeriod === 'weekly' ? 'This Week' : comparePeriod === 'monthly' ? 'This Month' : 'All-Time'})</span></h3>
        <div class="grid md:grid-cols-2 gap-4">${insights.map(i => `
            <div class="flex items-start gap-3 bg-[#0a1628]/40 border border-gray-700/30 rounded-lg p-4">
                <i class="fas ${i.icon} text-lg flex-shrink-0 mt-1" style="color:${i.color}"></i>
                <div><p class="text-white font-semibold text-sm mb-1">${i.title}</p><p class="text-gray-400 text-xs">${i.text}</p></div>
            </div>
        `).join('')}</div>`;
}

// ===== CHART RENDERERS =====
function renderEquityCurve(containerId, equityCurve, drawdownCurve, color) {
    const container = document.getElementById(containerId);
    if (!container || equityCurve.length === 0) return;

    if (chartInstances[containerId]) chartInstances[containerId].dispose();
    const chart = echarts.init(container, 'dark');
    chartInstances[containerId] = chart;

    const labels = equityCurve.map((_, i) => `T${i + 1}`);
    const balanceData = equityCurve.map(p => p.balance);
    const ddData = drawdownCurve.map(p => p.dd);

    // Calculate proper Y-axis ranges
    const minBalance = Math.min(...balanceData);
    const maxBalance = Math.max(...balanceData);
    const balanceRange = maxBalance - minBalance;
    const yMin = Math.max(0, minBalance - balanceRange * 0.1);
    const yMax = maxBalance + balanceRange * 0.1;

    // Drawdown axis: max is 0 (no drawdown), min proportional to max DD
    const minDD = Math.min(...ddData, 0);
    // Scale DD axis so bars take up at most 40% of chart height
    const ddAxisMin = minDD * 2.5;

    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#0d1d35',
            borderColor: color,
            textStyle: { color: '#fff', fontSize: 11 },
            formatter: params => {
                const eq = params.find(p => p.seriesName === 'Balance');
                const dd = params.find(p => p.seriesName === 'Drawdown');
                let html = `<strong>${eq ? eq.name : ''}</strong>`;
                if (eq) html += `<br/>Balance: <span style="color:${color};font-weight:bold">$${eq.value.toLocaleString()}</span>`;
                if (dd && dd.value < 0) html += `<br/>Drawdown: <span style="color:#ef4444;font-weight:bold">$${dd.value.toFixed(2)}</span>`;
                return html;
            }
        },
        legend: { show: false },
        grid: { left: 55, right: 15, top: 15, bottom: 25 },
        xAxis: { type: 'category', data: labels, axisLabel: { show: false }, axisLine: { lineStyle: { color: '#333' } } },
        yAxis: [
            {
                type: 'value',
                min: yMin,
                max: yMax,
                axisLabel: { color: '#888', fontSize: 10, formatter: val => `$${val.toLocaleString()}` },
                splitLine: { lineStyle: { color: '#1a2a40' } },
                axisLine: { show: false }
            },
            {
                type: 'value',
                min: ddAxisMin,
                max: 0,
                axisLabel: { show: false },
                splitLine: { show: false },
                axisLine: { show: false }
            }
        ],
        series: [
            {
                name: 'Balance', type: 'line', data: balanceData,
                lineStyle: { color, width: 2 }, itemStyle: { color },
                areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '40' }, { offset: 1, color: color + '05' }] } },
                symbol: 'none', smooth: true
            },
            {
                name: 'Drawdown', type: 'bar', yAxisIndex: 1, data: ddData,
                itemStyle: { color: '#ef444440' }, barWidth: '60%'
            }
        ]
    });

    window.addEventListener('resize', () => chart.resize());
}

function renderDailyPL(containerId, dailyPL, tradingDays) {
    const container = document.getElementById(containerId);
    if (!container || tradingDays.length === 0) return;

    if (chartInstances[containerId]) chartInstances[containerId].dispose();
    const chart = echarts.init(container, 'dark');
    chartInstances[containerId] = chart;

    const values = tradingDays.map(d => dailyPL[d].pl);
    const labels = tradingDays.map(d => {
        const parts = d.split('/');
        return `${parts[0]}/${parts[1]}`;
    });

    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#0d1d35',
            borderColor: '#d4af37',
            textStyle: { color: '#fff', fontSize: 11 },
            formatter: params => `${params[0].axisValue}<br/>P&L: <strong style="color:${params[0].value >= 0 ? '#4ade80' : '#f87171'}">$${params[0].value.toFixed(2)}</strong>`
        },
        grid: { left: 50, right: 15, top: 15, bottom: 30 },
        xAxis: { type: 'category', data: labels, axisLabel: { color: '#888', fontSize: 10, rotate: 30 }, axisLine: { lineStyle: { color: '#333' } } },
        yAxis: { type: 'value', axisLabel: { color: '#888', fontSize: 10, formatter: '${value}' }, splitLine: { lineStyle: { color: '#1a2a40' } }, axisLine: { show: false } },
        series: [{
            type: 'bar', data: values.map(v => ({
                value: v,
                itemStyle: { color: v >= 0 ? '#4ade80' : '#f87171', borderRadius: v >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4] }
            })),
            barWidth: '50%'
        }]
    });

    window.addEventListener('resize', () => chart.resize());
}

// ===== P&L DISTRIBUTION HISTOGRAM =====
function renderPLDistribution(containerId, plData, color) {
    const container = document.getElementById(containerId);
    if (!container || !plData || plData.length === 0) return;

    if (chartInstances[containerId]) chartInstances[containerId].dispose();
    const chart = echarts.init(container, 'dark');
    chartInstances[containerId] = chart;

    // Create histogram buckets
    const min = Math.min(...plData);
    const max = Math.max(...plData);
    const range = max - min;
    const bucketSize = Math.max(Math.ceil(range / 12), 10);
    const bucketStart = Math.floor(min / bucketSize) * bucketSize;

    const buckets = {};
    for (let b = bucketStart; b <= max + bucketSize; b += bucketSize) {
        buckets[b] = 0;
    }
    plData.forEach(v => {
        const bucket = Math.floor(v / bucketSize) * bucketSize;
        if (buckets[bucket] !== undefined) buckets[bucket]++;
        else buckets[bucket] = 1;
    });

    const labels = Object.keys(buckets).map(k => `$${parseInt(k)}`);
    const values = Object.values(buckets);
    const keys = Object.keys(buckets).map(k => parseInt(k));

    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#0d1d35',
            borderColor: color,
            textStyle: { color: '#fff', fontSize: 11 },
            formatter: params => {
                const idx = params[0].dataIndex;
                const lo = keys[idx];
                const hi = lo + bucketSize;
                return `$${lo} to $${hi}<br/><strong>${params[0].value}</strong> trades`;
            }
        },
        grid: { left: 40, right: 15, top: 15, bottom: 35 },
        xAxis: { type: 'category', data: labels, axisLabel: { color: '#888', fontSize: 9, rotate: 45 }, axisLine: { lineStyle: { color: '#333' } } },
        yAxis: { type: 'value', axisLabel: { color: '#888', fontSize: 10 }, splitLine: { lineStyle: { color: '#1a2a40' } }, axisLine: { show: false } },
        series: [{
            type: 'bar', data: values.map((v, i) => ({
                value: v,
                itemStyle: { color: keys[i] >= 0 ? '#4ade80' : '#f87171', borderRadius: [3, 3, 0, 0] }
            })),
            barWidth: '70%'
        }]
    });

    window.addEventListener('resize', () => chart.resize());
}

// ===== WEEKLY TREND CHART =====
function renderWeeklyTrend(containerId, weeklyPL, method) {
    const container = document.getElementById(containerId);
    if (!container || !weeklyPL) return;

    if (chartInstances[containerId]) chartInstances[containerId].dispose();
    const chart = echarts.init(container, 'dark');
    chartInstances[containerId] = chart;

    const weeks = Object.keys(weeklyPL).sort((a, b) => parseWeekKey(a) - parseWeekKey(b));
    const color = method === 'active' ? '#d4af37' : '#60a5fa';

    let cumPL = 0;
    const cumData = weeks.map(wk => {
        cumPL += weeklyPL[wk].pl;
        return cumPL;
    });

    const labels = weeks.map(wk => {
        const parts = wk.split('/');
        return `${parts[0]}/${parts[1]}`;
    });

    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#0d1d35',
            borderColor: color,
            textStyle: { color: '#fff', fontSize: 11 },
            formatter: params => {
                let result = `<strong>Week of ${getWeekRange(weeks[params[0].dataIndex])}</strong><br/>`;
                params.forEach(p => {
                    if (p.seriesName === 'Weekly P&L') {
                        result += `Weekly: <span style="color:${p.value >= 0 ? '#4ade80' : '#f87171'};font-weight:bold">$${p.value.toFixed(2)}</span><br/>`;
                    } else {
                        result += `Cumulative: <span style="color:${color};font-weight:bold">$${p.value.toFixed(2)}</span>`;
                    }
                });
                return result;
            }
        },
        legend: {
            data: ['Weekly P&L', 'Cumulative'],
            textStyle: { color: '#888', fontSize: 10 },
            top: 0, right: 0
        },
        grid: { left: 55, right: 55, top: 30, bottom: 30 },
        xAxis: { type: 'category', data: labels, axisLabel: { color: '#888', fontSize: 10 }, axisLine: { lineStyle: { color: '#333' } } },
        yAxis: [
            { type: 'value', name: 'Weekly', nameTextStyle: { color: '#666', fontSize: 9 }, axisLabel: { color: '#888', fontSize: 10, formatter: '${value}' }, splitLine: { lineStyle: { color: '#1a2a40' } }, axisLine: { show: false } },
            { type: 'value', name: 'Cumul.', nameTextStyle: { color: '#666', fontSize: 9 }, axisLabel: { color: '#888', fontSize: 10, formatter: '${value}' }, splitLine: { show: false }, axisLine: { show: false } }
        ],
        series: [
            {
                name: 'Weekly P&L', type: 'bar', data: weeks.map(wk => ({
                    value: weeklyPL[wk].pl,
                    itemStyle: { color: weeklyPL[wk].pl >= 0 ? '#4ade80' : '#f87171', borderRadius: weeklyPL[wk].pl >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3] }
                })),
                barWidth: '40%'
            },
            {
                name: 'Cumulative', type: 'line', yAxisIndex: 1, data: cumData,
                lineStyle: { color, width: 2 }, itemStyle: { color },
                areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '30' }, { offset: 1, color: color + '05' }] } },
                smooth: true, symbol: 'circle', symbolSize: 6
            }
        ]
    });

    window.addEventListener('resize', () => chart.resize());
}

// ===== RADAR CHART (Compare) =====
function renderRadarChart(ak, dk) {
    const container = document.getElementById('chart-radar-compare');
    if (!container || (!ak && !dk)) return;

    if (chartInstances['chart-radar-compare']) chartInstances['chart-radar-compare'].dispose();
    const chart = echarts.init(container, 'dark');
    chartInstances['chart-radar-compare'] = chart;

    // R-normalize the metrics for fair comparison
    const akWinR = ak ? ak.avgWinDollar / ECFS_RISK : 0;
    const dkWinR = dk ? dk.avgWinDollar / DISCORD_RISK : 0;
    const akLossR = ak ? Math.abs(ak.avgLossDollar) / ECFS_RISK : 0;
    const dkLossR = dk ? Math.abs(dk.avgLossDollar) / DISCORD_RISK : 0;

    // Normalize to 0-100 scale for comparison
    const maxWR = 100;
    const maxPF = Math.max(ak ? ak.profitFactor : 0, dk ? dk.profitFactor : 0, 2);
    const maxEV = Math.max(ak ? Math.abs(ak.evPlannedR) : 0, dk ? Math.abs(dk.evPlannedR) : 0, 10);
    const maxRF = Math.max(ak ? ak.recoveryFactor : 0, dk ? dk.recoveryFactor : 0, 3);
    const maxWinR = Math.max(akWinR, dkWinR, 1);
    const maxWDays = 100;

    const indicators = [
        { name: 'Win Rate', max: maxWR },
        { name: 'Profit Factor', max: maxPF * 1.2 },
        { name: 'EV (%R)', max: maxEV * 1.2 },
        { name: 'Recovery', max: maxRF * 1.2 },
        { name: 'Avg Win (R)', max: maxWinR * 1.2 },
        { name: 'Win Days %', max: maxWDays }
    ];

    const series = [];
    if (ak) {
        series.push({
            name: 'ECFS Active',
            type: 'radar',
            data: [{
                value: [
                    ak.winRate,
                    ak.profitFactor === Infinity ? maxPF : ak.profitFactor,
                    Math.max(0, ak.evPlannedR),
                    ak.recoveryFactor === Infinity ? maxRF : ak.recoveryFactor,
                    akWinR,
                    ak.tradingDays.length > 0 ? ak.profitableDays / ak.tradingDays.length * 100 : 0
                ],
                name: 'ECFS Active',
                lineStyle: { color: '#d4af37', width: 2 },
                areaStyle: { color: 'rgba(212, 175, 55, 0.15)' },
                itemStyle: { color: '#d4af37' }
            }]
        });
    }
    if (dk) {
        series.push({
            name: 'Discord Selective',
            type: 'radar',
            data: [{
                value: [
                    dk.winRate,
                    dk.profitFactor === Infinity ? maxPF : dk.profitFactor,
                    Math.max(0, dk.evPlannedR),
                    dk.recoveryFactor === Infinity ? maxRF : dk.recoveryFactor,
                    dkWinR,
                    dk.tradingDays.length > 0 ? dk.profitableDays / dk.tradingDays.length * 100 : 0
                ],
                name: 'Discord Selective',
                lineStyle: { color: '#60a5fa', width: 2 },
                areaStyle: { color: 'rgba(96, 165, 250, 0.15)' },
                itemStyle: { color: '#60a5fa' }
            }]
        });
    }

    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item' },
        legend: {
            data: ['ECFS Active', 'Discord Selective'].filter((_, i) => (i === 0 && ak) || (i === 1 && dk)),
            textStyle: { color: '#888', fontSize: 10 },
            bottom: 0
        },
        radar: {
            indicator: indicators,
            shape: 'polygon',
            radius: '65%',
            axisName: { color: '#888', fontSize: 10 },
            splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
            splitLine: { lineStyle: { color: '#1a2a40' } },
            axisLine: { lineStyle: { color: '#1a2a40' } }
        },
        series
    });

    window.addEventListener('resize', () => chart.resize());
}

// ===== MONTHLY PERFORMANCE SUMMARY TABLE =====
function renderMonthlySummary(containerId, allTrades, riskBudget, ppt) {
    const container = document.getElementById(containerId);
    if (!container || !allTrades || allTrades.length === 0) return;

    // Group trades by month
    const monthlyData = {};
    allTrades.forEach(t => {
        const mk = getMonthKey(t.date);
        if (!monthlyData[mk]) monthlyData[mk] = [];
        monthlyData[mk].push(t);
    });

    const months = Object.keys(monthlyData).sort();
    let cumPL = 0;

    let html = `<table class="w-full text-xs">
        <thead>
            <tr>
                <th class="text-left text-gray-400 font-bold px-2 py-2 border-b border-gray-700/30">Month</th>
                <th class="text-right text-gray-400 font-bold px-2 py-2 border-b border-gray-700/30">Trades</th>
                <th class="text-right text-gray-400 font-bold px-2 py-2 border-b border-gray-700/30">W/L</th>
                <th class="text-right text-gray-400 font-bold px-2 py-2 border-b border-gray-700/30">Win%</th>
                <th class="text-right text-gray-400 font-bold px-2 py-2 border-b border-gray-700/30">P&L</th>
                <th class="text-right text-gray-400 font-bold px-2 py-2 border-b border-gray-700/30">Return</th>
                <th class="text-right text-gray-400 font-bold px-2 py-2 border-b border-gray-700/30">EV(%R)</th>
                <th class="text-right text-gray-400 font-bold px-2 py-2 border-b border-gray-700/30">PF</th>
                <th class="text-right text-gray-400 font-bold px-2 py-2 border-b border-gray-700/30">Cumulative</th>
            </tr>
        </thead><tbody>`;

    for (const mk of months) {
        const mTrades = monthlyData[mk];
        const mKPIs = calculateKPIs(mTrades, riskBudget, ppt);
        cumPL += mKPIs.netPL;

        const parts = mk.split('/');
        const monthName = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        const plColor = mKPIs.netPL >= 0 ? 'text-green-400' : 'text-red-400';
        const cumColor = cumPL >= 0 ? 'text-green-400' : 'text-red-400';

        html += `<tr class="hover:bg-[#d4af37]/5 transition-colors">
            <td class="text-white font-semibold px-2 py-2.5 border-b border-gray-700/20">${monthName}</td>
            <td class="text-gray-300 text-right px-2 py-2.5 border-b border-gray-700/20">${mKPIs.totalTrades}</td>
            <td class="text-gray-300 text-right px-2 py-2.5 border-b border-gray-700/20"><span class="text-green-400">${mKPIs.winCount}</span>/<span class="text-red-400">${mKPIs.lossCount}</span></td>
            <td class="text-gray-300 text-right px-2 py-2.5 border-b border-gray-700/20">${mKPIs.winRate.toFixed(0)}%</td>
            <td class="${plColor} font-semibold text-right px-2 py-2.5 border-b border-gray-700/20">${mKPIs.netPL >= 0 ? '+' : ''}$${mKPIs.netPL.toFixed(2)}</td>
            <td class="${plColor} text-right px-2 py-2.5 border-b border-gray-700/20">${fmtPct(mKPIs.returnPct)}</td>
            <td class="text-right px-2 py-2.5 border-b border-gray-700/20" style="color:${mKPIs.evPlannedR >= 0 ? '#4ade80' : '#f87171'}">${mKPIs.evPlannedR >= 0 ? '+' : ''}${mKPIs.evPlannedR.toFixed(1)}%</td>
            <td class="text-gray-300 text-right px-2 py-2.5 border-b border-gray-700/20">${mKPIs.profitFactor === Infinity ? '∞' : mKPIs.profitFactor.toFixed(2)}</td>
            <td class="${cumColor} font-semibold text-right px-2 py-2.5 border-b border-gray-700/20">${cumPL >= 0 ? '+' : ''}$${cumPL.toFixed(2)}</td>
        </tr>`;
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ===== RISK DISTRIBUTION =====
function renderRiskDistribution(containerId, riskDist) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const maxPct = Math.max(...riskDist.map(r => r.pct), 1);
    container.innerHTML = riskDist.map(r => `
        <div class="flex items-center gap-2 text-xs">
            <span class="text-gray-400 w-20 text-right flex-shrink-0">${r.label}</span>
            <div class="flex-1 risk-bar-bg"><div class="risk-bar bg-[#d4af37]/60" style="width: ${(r.pct / maxPct * 100).toFixed(0)}%"></div></div>
            <span class="text-gray-300 w-12 text-right">${r.count} <span class="text-gray-500">(${r.pct.toFixed(0)}%)</span></span>
        </div>
    `).join('');
}

// ===== TRADE LOG =====
function renderTradeLog(tbodyId, trades, risk) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = trades.map((t, i) => {
        const dirColor = t.direction === 'Short' ? 'text-red-400' : 'text-blue-400';
        const plColor = t.dollarPL > 0 ? 'text-green-400' : t.dollarPL < 0 ? 'text-red-400' : 'text-gray-400';
        const badge = t.isWin ? '<span class="bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded text-[10px] font-bold">W</span>' : '<span class="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold">L</span>';
        const rPct = (t.dollarPL / risk * 100).toFixed(1);
        const rr = t.rewardRisk !== null && t.rewardRisk !== undefined ? t.rewardRisk.toFixed(2) : '—';
        return `<tr class="hover:bg-[#d4af37]/5 transition-colors">
            <td class="text-gray-500 text-[11px]">${i + 1}</td>
            <td class="text-gray-300 text-[11px]">${t.entryTime || ''}</td>
            <td class="${dirColor} text-[11px] font-semibold">${t.direction === 'Short' ? 'S' : 'L'}</td>
            <td class="text-gray-300 text-[11px]">${t.contracts}</td>
            <td class="text-gray-300 text-[11px]">${t.entryPrice.toFixed(2)}</td>
            <td class="text-gray-400 text-[11px]">${t.stopPrice ? t.stopPrice.toFixed(2) : '—'}</td>
            <td class="text-gray-300 text-[11px]">${t.exitPrice.toFixed(2)}</td>
            <td class="text-gray-400 text-[11px]">${t.riskDollars > 0 ? '$' + t.riskDollars.toFixed(0) : '—'}</td>
            <td class="${plColor} text-[11px]">${t.pointsPL >= 0 ? '+' : ''}${t.pointsPL.toFixed(2)}</td>
            <td class="${plColor} text-[11px] font-semibold">${t.dollarPL >= 0 ? '+' : ''}$${t.dollarPL.toFixed(2)}</td>
            <td class="${plColor} text-[11px]">${rPct}%</td>
            <td class="text-gray-400 text-[11px]">${rr}</td>
            <td>${badge}</td>
        </tr>`;
    }).join('');
}

function renderDiscordTradeLog(tbodyId, trades) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = trades.map(t => {
        const dirColor = t.direction.toLowerCase().includes('sell') ? 'text-red-400' : 'text-blue-400';
        const plColor = t.dollarPL > 0 ? 'text-green-400' : t.dollarPL < 0 ? 'text-red-400' : 'text-gray-400';
        const badge = t.isWin ? '<span class="bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded text-[10px] font-bold">W</span>' : '<span class="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold">L</span>';
        return `<tr class="hover:bg-blue-500/5 transition-colors">
            <td class="text-gray-300 text-[11px]">${t.datetime}</td>
            <td class="text-blue-400 text-[11px] font-semibold">${t.tradeNum}</td>
            <td class="${dirColor} text-[11px]">${t.direction}</td>
            <td class="text-gray-300 text-[11px]">${t.entryPrice}</td>
            <td class="text-gray-300 text-[11px]">${t.stopPrice || '—'}</td>
            <td class="text-gray-300 text-[11px]">${t.trailingProfit}</td>
            <td class="${plColor} text-[11px]">${t.pointsPL}</td>
            <td class="text-gray-400 text-[11px]">${t.riskPoints}</td>
            <td class="${plColor} text-[11px] font-semibold">${t.dollarPL >= 0 ? '+' : ''}$${t.dollarPL.toFixed(2)}</td>
            <td>${badge}</td>
        </tr>`;
    }).join('');
}

// ===== EDGE EXPLANATION BUILDER =====
function buildEdgeExplanation(k) {
    // Handle edge cases: no wins, no losses, very small sample
    if (k.winCount === 0) {
        return `No winning trades yet in this period. ${k.totalTrades} trade${k.totalTrades !== 1 ? 's' : ''} taken, all resulting in losses. EV is ${k.evPlannedR.toFixed(1)}%R — more data needed to assess the edge.`;
    }
    if (k.lossCount === 0) {
        return `Perfect win rate so far — ${k.winCount} trade${k.winCount !== 1 ? 's' : ''}, all winners. EV is +${k.evPlannedR.toFixed(1)}%R per trade. Note: a longer track record will provide a more reliable edge estimate.`;
    }
    if (k.totalTrades < 3) {
        return `Only ${k.totalTrades} trade${k.totalTrades !== 1 ? 's' : ''} — too small a sample for reliable statistics. Current EV: ${k.evPlannedR >= 0 ? '+' : ''}${k.evPlannedR.toFixed(1)}%R per trade.`;
    }

    const winBigger = k.wlRatio > 1;
    const sub50 = k.winRate < 50;

    if (k.evPlannedR < 0) {
        // Negative EV
        if (sub50 && !winBigger) {
            return `Win rate is ${k.winRate.toFixed(0)}% with a ${k.wlRatio.toFixed(2)}x win/loss ratio — resulting in a negative EV of ${k.evPlannedR.toFixed(1)}%R per trade. Risk management is key to recovery.`;
        }
        return `Current EV is ${k.evPlannedR.toFixed(1)}%R per trade. While the edge is negative over this period, disciplined execution and risk management can stabilize results.`;
    }

    // Positive EV
    if (winBigger && sub50) {
        return `Wins are ${((k.wlRatio - 1) * 100).toFixed(0)}% bigger than losses — so even with a sub-50% win rate, the math is positive. Every trade has a statistical edge worth +${k.evPlannedR.toFixed(1)}% of risk.`;
    } else if (winBigger) {
        return `With a ${k.winRate.toFixed(0)}% win rate and wins that are ${((k.wlRatio - 1) * 100).toFixed(0)}% larger than losses, every trade carries a +${k.evPlannedR.toFixed(1)}%R expected value.`;
    } else {
        return `A ${k.winRate.toFixed(0)}% win rate generates a positive edge of +${k.evPlannedR.toFixed(1)}%R per trade. Disciplined risk management keeps losses controlled.`;
    }
}

// ===== FORMATTING HELPERS =====
function fmtDollar(v) { return `$${Math.abs(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`; }
function fmtPct(v) { return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`; }

function setColor(elId, text, value) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = text;
    if (value > 0) el.className = el.className.replace(/text-(green|red|white|gray)-\d+/g, '') + ' text-green-400';
    else if (value < 0) el.className = el.className.replace(/text-(green|red|white|gray)-\d+/g, '') + ' text-red-400';
    else el.className = el.className.replace(/text-(green|red|white|gray)-\d+/g, '') + ' text-gray-400';
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function () {
    switchExecution('active');

    let ecfsLoaded = false;

    // Try loading from localStorage first (faster), then DB, then sample CSV
    const savedECFS = localStorage.getItem('ecfs-trades');
    const savedECFSName = localStorage.getItem('ecfs-filename');
    if (savedECFS) {
        try {
            state.active.allTrades = JSON.parse(savedECFS);
            const weeks = getWeeksList(state.active.allTrades);
            state.active.selectedWeek = weeks[0];
            populateWeekSelector('active', weeks);
            refreshDashboard('active');
            ecfsLoaded = true;
            if (savedECFSName) {
                showUploadSuccess('active', `${savedECFSName} — ${state.active.allTrades.length} trades (cached)`);
            }
            showExportButton('active');
        } catch (e) { console.error('Error loading ECFS data:', e); }
    }
    
    if (!ecfsLoaded) {
        // Try loading from DB
        try {
            const dbTrades = await DB.loadTrades('ecfs_trades');
            if (dbTrades.length > 0) {
                state.active.allTrades = dbTrades.map(dbRowToECFSTrade);
                const weeks = getWeeksList(state.active.allTrades);
                state.active.selectedWeek = weeks[0];
                populateWeekSelector('active', weeks);
                refreshDashboard('active');
                ecfsLoaded = true;
                showUploadSuccess('active', `${state.active.allTrades.length} trades loaded from database`);
                showExportButton('active');
            }
        } catch (e) { console.error('Error loading ECFS from DB:', e); }
    }

    if (!ecfsLoaded) {
        // Auto-load sample data so cold visitors see a fully populated dashboard
        try {
            const resp = await fetch('orders_sample.csv');
            if (resp.ok) {
                const csvText = await resp.text();
                const trades = parseTradovateCSV(csvText);

                if (trades.length > 0) {
                    state.active.allTrades = trades;
                    state.active.isSampleData = true;
                    const weeks = getWeeksList(trades);
                    state.active.selectedWeek = weeks[0];
                    populateWeekSelector('active', weeks);
                    refreshDashboard('active');
                    ecfsLoaded = true;
                    showSampleDataBanner('active', trades.length);

                }
            }
        } catch (e) { console.error('Error loading sample CSV:', e); }
    }

    // Load Discord data
    let discordLoaded = false;
    const savedDiscord = localStorage.getItem('discord-trades');
    const savedDiscordName = localStorage.getItem('discord-filename');
    if (savedDiscord) {
        try {
            state.discord.allTrades = JSON.parse(savedDiscord);
            const weeks = getWeeksList(state.discord.allTrades);
            state.discord.selectedWeek = weeks[0];
            populateWeekSelector('discord', weeks);
            refreshDashboard('discord');
            discordLoaded = true;
            if (savedDiscordName) {
                showUploadSuccess('discord', `${savedDiscordName} — ${state.discord.allTrades.length} trades (cached)`);
            }
            showExportButton('discord');
        } catch (e) { console.error('Error loading Discord data:', e); }
    }
    
    if (!discordLoaded) {
        try {
            const dbTrades = await DB.loadTrades('discord_trades');
            if (dbTrades.length > 0) {
                state.discord.allTrades = dbTrades.map(dbRowToDiscordTrade);
                const weeks = getWeeksList(state.discord.allTrades);
                state.discord.selectedWeek = weeks[0];
                populateWeekSelector('discord', weeks);
                refreshDashboard('discord');
                discordLoaded = true;
                showUploadSuccess('discord', `${state.discord.allTrades.length} trades loaded from database`);
                showExportButton('discord');
            }
        } catch (e) { console.error('Error loading Discord from DB:', e); }
    }

    if (!discordLoaded) {
        // Auto-load Discord trades from JSON file so all visitors see historical data
        try {
            const resp = await fetch('discord_trades.json');
            if (resp.ok) {
                const trades = await resp.json();
                if (trades.length > 0) {
                    state.discord.allTrades = trades;
                    state.discord.isSampleData = true;
                    const weeks = getWeeksList(trades);
                    state.discord.selectedWeek = weeks[0];
                    populateWeekSelector('discord', weeks);
                    refreshDashboard('discord');
                    discordLoaded = true;
                    showSampleDataBanner('discord', trades.length);
                }
            }
        } catch (e) { console.error('Error loading Discord JSON:', e); }
    }

    // Load weekly snapshots for historical charts
    try {
        state.active.snapshots = await DB.loadWeeklySnapshots('active');
        state.discord.snapshots = await DB.loadWeeklySnapshots('discord');
    } catch (e) { console.error('Error loading snapshots:', e); }
});

// ===== SAMPLE DATA BANNER =====
function showSampleDataBanner(method, tradeCount) {
    const container = document.getElementById(`upload-status-${method}`);
    if (!container) return;
    container.classList.remove('hidden');
    container.innerHTML = `
        <div class="bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-lg px-4 py-3">
            <div class="flex items-start gap-3">
                <div class="flex-shrink-0 mt-0.5">
                    <div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <i class="fas fa-chart-line text-green-400 text-sm"></i>
                    </div>
                </div>
                <div class="flex-1">
                    <p class="text-green-400 font-semibold text-sm">Live Results Loaded — ${tradeCount} trades</p>
                    <p class="text-gray-400 text-xs mt-0.5">Showing real Tradovate fills through the most recent upload. New results are added every Monday morning.</p>
                </div>
            </div>
        </div>`;
}

// ===== EXPORT FUNCTIONS FOR GITHUB DEPLOYMENT =====

// Show export button when data is available
function showExportButton(method) {
    const btn = document.getElementById(`export-btn-${method}`);
    if (btn) btn.classList.remove('hidden');
}

// Export ECFS Active data as the raw CSV stored during upload
// (The full Tradovate CSV is what GitHub Pages serves — cumulative history)
function exportECFSData() {
    const trades = state.active.allTrades;
    if (!trades || trades.length === 0) {
        alert('No ECFS Active data to export. Upload a CSV first.');
        return;
    }

    // If we have the original raw CSV in localStorage, export that directly
    const rawCSV = localStorage.getItem('ecfs-raw-csv');
    if (rawCSV) {
        downloadFile(rawCSV, 'orders_sample.csv', 'text/csv');
        showExportToast('ECFS CSV exported — replace orders_sample.csv in your GitHub repo');
        return;
    }

    // Otherwise, reconstruct a simplified JSON export
    const json = JSON.stringify(trades, null, 2);
    downloadFile(json, 'ecfs_trades.json', 'application/json');
    showExportToast('ECFS JSON exported — for best results, use the raw Tradovate CSV');
}

// Export Discord Selective data as JSON (the canonical format for GitHub)
function exportDiscordData() {
    const trades = state.discord.allTrades;
    if (!trades || trades.length === 0) {
        alert('No Discord Selective data to export. Upload an Excel file first.');
        return;
    }

    // Clean export: only the fields needed for the parser
    const cleanTrades = trades.map(t => ({
        datetime: t.datetime,
        tradeNum: t.tradeNum,
        direction: t.direction,
        entryPrice: t.entryPrice,
        stopPrice: t.stopPrice,
        trailingProfit: t.trailingProfit || '—',
        pointsPL: t.pointsPL,
        riskPoints: t.riskPoints,
        dollarPL: t.dollarPL,
        riskDollars: t.riskDollars,
        isWin: t.isWin,
        outcome: t.outcome,
        date: t.date
    }));

    const json = JSON.stringify(cleanTrades, null, 2);
    downloadFile(json, 'discord_trades.json', 'application/json');
    showExportToast(`Discord JSON exported — ${cleanTrades.length} trades → replace discord_trades.json in GitHub repo`);
}

// Helper: trigger browser download
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Helper: brief toast notification for export
function showExportToast(msg) {
    const toast = document.getElementById('share-toast');
    if (toast) {
        toast.querySelector('span').textContent = msg;
        toast.classList.remove('hidden');
        toast.classList.add('animate-fade-in');
        setTimeout(() => {
            toast.classList.add('hidden');
            toast.classList.remove('animate-fade-in');
        }, 4000);
    }
}
