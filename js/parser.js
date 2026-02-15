// =====================================================
// TRADOVATE CSV PARSER & EXCEL PARSER + DB PERSISTENCE
// Ekantik Capital Performance Dashboard v2.0
// =====================================================

const ECFS_RISK = 100;       // $100 per trade (0.5% of $20k)
const ECFS_PPT = 5;          // $5 per point (MES)
const DISCORD_RISK = 500;    // $500 per trade
const DISCORD_PPT = 50;      // $50 per point (ES)
const STARTING_BALANCE = 20000;

// ===== DATABASE API =====
const DB = {
    async loadTrades(tableName) {
        try {
            const allTrades = [];
            let page = 1;
            let hasMore = true;
            while (hasMore) {
                const res = await fetch(`tables/${tableName}?page=${page}&limit=100&sort=entry_time`);
                if (!res.ok) return [];
                const json = await res.json();
                allTrades.push(...json.data);
                hasMore = json.data.length === 100;
                page++;
            }
            return allTrades;
        } catch (e) { console.error(`DB load ${tableName}:`, e); return []; }
    },

    async saveTrades(tableName, trades, batchId) {
        const rows = trades.map(t => {
            if (tableName === 'ecfs_trades') {
                return {
                    week_key: getWeekKey(t.date),
                    entry_time: t.entryTime || '',
                    exit_time: t.exitTime || '',
                    direction: t.direction,
                    entry_price: t.entryPrice,
                    exit_price: t.exitPrice,
                    stop_price: t.stopPrice || 0,
                    contracts: t.contracts,
                    points_pl: t.pointsPL,
                    dollar_pl: t.dollarPL,
                    risk_points: t.riskPoints || 0,
                    risk_dollars: t.riskDollars || 0,
                    reward_risk: t.rewardRisk || 0,
                    is_win: t.isWin,
                    trade_date: t.date,
                    upload_batch: batchId
                };
            } else {
                return {
                    week_key: getWeekKey(t.date),
                    datetime: t.datetime || '',
                    trade_num: t.tradeNum || '',
                    direction: t.direction || '',
                    entry_price: t.entryPrice || 0,
                    stop_price: t.stopPrice || 0,
                    trailing_profit: t.trailingProfit || '',
                    points_pl: t.pointsPL || 0,
                    risk_points: t.riskPoints || 0,
                    dollar_pl: t.dollarPL || 0,
                    risk_dollars: t.riskDollars || 0,
                    is_win: t.isWin,
                    outcome: t.outcome || '',
                    trade_date: t.date,
                    upload_batch: batchId
                };
            }
        });

        // Save in batches of 20
        for (let i = 0; i < rows.length; i += 20) {
            const batch = rows.slice(i, i + 20);
            try {
                for (const row of batch) {
                    await fetch(`tables/${tableName}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(row)
                    });
                }
            } catch (e) { console.error(`DB save batch ${tableName}:`, e); }
        }
    },

    async saveWeeklySnapshot(snapshot) {
        try {
            // Check if snapshot exists for this method+week
            const res = await fetch(`tables/weekly_snapshots?search=${snapshot.week_key}&limit=100`);
            const json = await res.json();
            const existing = json.data.find(s => s.method === snapshot.method && s.week_key === snapshot.week_key);
            if (existing) {
                await fetch(`tables/weekly_snapshots/${existing.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(snapshot)
                });
            } else {
                await fetch(`tables/weekly_snapshots`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(snapshot)
                });
            }
        } catch (e) { console.error('DB save snapshot:', e); }
    },

    async loadWeeklySnapshots(method) {
        try {
            const allSnapshots = [];
            let page = 1;
            let hasMore = true;
            while (hasMore) {
                const res = await fetch(`tables/weekly_snapshots?page=${page}&limit=100`);
                if (!res.ok) return [];
                const json = await res.json();
                allSnapshots.push(...json.data);
                hasMore = json.data.length === 100;
                page++;
            }
            return allSnapshots.filter(s => s.method === method).sort((a, b) => {
                const da = parseWeekKey(a.week_key);
                const db = parseWeekKey(b.week_key);
                return da - db;
            });
        } catch (e) { console.error('DB load snapshots:', e); return []; }
    },

    async deleteTradesByBatch(tableName, batchId) {
        try {
            const res = await fetch(`tables/${tableName}?search=${batchId}&limit=100`);
            const json = await res.json();
            for (const row of json.data) {
                if (row.upload_batch === batchId) {
                    await fetch(`tables/${tableName}/${row.id}`, { method: 'DELETE' });
                }
            }
        } catch (e) { console.error('DB delete:', e); }
    }
};

function parseWeekKey(wk) {
    const parts = wk.split('/');
    return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
}

// Convert DB row back to trade object
function dbRowToECFSTrade(row) {
    return {
        entryTime: row.entry_time,
        exitTime: row.exit_time,
        direction: row.direction,
        entryPrice: row.entry_price,
        exitPrice: row.exit_price,
        stopPrice: row.stop_price,
        contracts: row.contracts,
        pointsPL: row.points_pl,
        dollarPL: row.dollar_pl,
        riskPoints: row.risk_points,
        riskDollars: row.risk_dollars,
        rewardRisk: row.reward_risk || null,
        isWin: row.is_win,
        date: row.trade_date,
        uploadBatch: row.upload_batch
    };
}

function dbRowToDiscordTrade(row) {
    return {
        datetime: row.datetime,
        tradeNum: row.trade_num,
        direction: row.direction,
        entryPrice: row.entry_price,
        stopPrice: row.stop_price,
        trailingProfit: row.trailing_profit,
        pointsPL: row.points_pl,
        riskPoints: row.risk_points,
        dollarPL: row.dollar_pl,
        riskDollars: row.risk_dollars,
        isWin: row.is_win,
        outcome: row.outcome,
        date: row.trade_date,
        uploadBatch: row.upload_batch
    };
}

// ===== CSV LINE PARSER (handles quoted fields) =====
function parseCSVLine(line) {
    const result = []; let current = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') inQuotes = !inQuotes;
        else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else current += c;
    }
    result.push(current.trim());
    return result;
}

// ===== TRADOVATE CSV PARSER =====
function parseTradovateCSV(csvText) {
    const lines = csvText.trim().split('\n');
    
    const allOrders = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (!row || row.length < 22) continue;
        
        const status = (row[11] || '').trim();
        const direction = (row[3] || '').trim();
        const avgPrice = parseFloat(row[7]) || 0;
        const filledQty = parseInt(row[8]) || 0;
        const fillTime = (row[9] || '').trim();
        const timestamp = (row[17] || '').trim();
        const qty = parseInt(row[19]) || 0;
        const text = (row[20] || '').trim();
        const type = (row[21] || '').trim();
        const stopPrice = parseFloat(row[23]) || 0;
        
        allOrders.push({
            line: i + 1, direction, avgPrice, filledQty, fillTime, status,
            timestamp, qty, text, type, stopPrice,
            date: (fillTime || timestamp).split(' ')[0]
        });
    }
    
    const filledOrders = allOrders.filter(o => o.status === 'Filled' && o.avgPrice > 0 && o.filledQty > 0);
    const stopOrders = allOrders.filter(o => o.type === 'Stop');
    
    let position = 0, entryOrders = [];
    const roundTrips = [];
    
    for (const order of filledOrders) {
        const qty = order.direction === 'Buy' ? order.filledQty : -order.filledQty;
        const prev = position;
        position += qty;
        
        if (prev === 0) {
            entryOrders = [order];
        } else if (Math.sign(prev) === Math.sign(position) && position !== 0) {
            entryOrders.push(order);
        } else if (position === 0) {
            roundTrips.push(buildRoundTrip(entryOrders, order, Math.abs(prev), stopOrders, allOrders));
            entryOrders = [];
        } else {
            roundTrips.push(buildRoundTrip(entryOrders, order, Math.abs(prev), stopOrders, allOrders));
            entryOrders = [{ ...order, filledQty: Math.abs(position) }];
        }
    }
    
    return roundTrips;
}

function buildRoundTrip(entryOrders, exitOrder, contracts, stopOrders, allOrders) {
    let tc = 0, wp = 0;
    for (const e of entryOrders) { wp += e.avgPrice * e.filledQty; tc += e.filledQty; }
    wp /= tc;
    
    const entryDir = entryOrders[0].direction;
    const pp = entryDir === 'Sell' ? wp - exitOrder.avgPrice : exitOrder.avgPrice - wp;
    const dp = pp * ECFS_PPT * contracts;
    
    const stopDir = entryDir === 'Sell' ? 'Buy' : 'Sell';
    let stopPrice = 0;
    
    for (const eo of entryOrders) {
        const nearbyStops = stopOrders.filter(s =>
            s.direction === stopDir &&
            s.line > eo.line - 1 &&
            s.line <= eo.line + 4
        );
        if (nearbyStops.length > 0 && !stopPrice) {
            stopPrice = nearbyStops[0].stopPrice || 0;
        }
    }
    
    if (!stopPrice && exitOrder.type === 'Stop') {
        stopPrice = exitOrder.avgPrice;
    }
    
    if (!stopPrice) {
        const entryLine = entryOrders[0].line;
        const nearby = stopOrders.filter(s =>
            s.direction === stopDir &&
            s.line > entryLine - 2 &&
            s.line < entryLine + 8
        );
        if (nearby.length > 0) stopPrice = nearby[0].stopPrice || 0;
    }
    
    const riskPoints = stopPrice > 0 ? Math.abs(wp - stopPrice) : 0;
    const riskDollars = riskPoints * ECFS_PPT * contracts;
    const rewardRisk = riskPoints > 0 ? pp / riskPoints : null;
    
    return {
        entryTime: entryOrders[0].fillTime,
        exitTime: exitOrder.fillTime,
        direction: entryDir === 'Sell' ? 'Short' : 'Long',
        entryPrice: wp,
        exitPrice: exitOrder.avgPrice,
        stopPrice,
        contracts,
        pointsPL: pp,
        dollarPL: dp,
        riskPoints,
        riskDollars,
        rewardRisk,
        isWin: dp > 0,
        date: normalizeDate(entryOrders[0].fillTime.split(' ')[0])
    };
}

// ===== EXCEL PARSER (Discord Selective) =====
function parseDiscordExcel(data) {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    const trades = [];
    for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length < 10) continue;
        
        const netDollar = parseFloat(row[8]) || 0;
        const netPoints = parseFloat(row[6]) || 0;
        const riskPoints = parseFloat(row[7]) || 0;
        const outcome = String(row[9] || '').toLowerCase();
        
        trades.push({
            datetime: formatExcelDate(row[0]),
            tradeNum: row[1] || '',
            direction: row[2] || '',
            entryPrice: parseFloat(row[3]) || 0,
            stopPrice: parseFloat(row[4]) || 0,
            trailingProfit: row[5] || '—',
            pointsPL: netPoints,
            riskPoints,
            dollarPL: netDollar,
            riskDollars: riskPoints * DISCORD_PPT,
            isWin: outcome.includes('win'),
            outcome: outcome.includes('win') ? 'Win' : 'Loss',
            date: extractDate(formatExcelDate(row[0]))
        });
    }
    return trades;
}

function formatExcelDate(value) {
    if (!value) return '';
    if (typeof value === 'number') {
        const d = XLSX.SSF.parse_date_code(value);
        return `${d.m}/${d.d}/${d.y} ${String(d.H || 0).padStart(2, '0')}:${String(d.M || 0).padStart(2, '0')}`;
    }
    return String(value);
}

// Normalize any date string to MM/DD/YYYY format
function normalizeDate(dateStr) {
    if (!dateStr) return '';
    const s = dateStr.trim();
    
    // Already MM/DD/YYYY or M/D/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
        const parts = s.split('/');
        const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        return `${parseInt(parts[0])}/${parseInt(parts[1])}/${y}`;
    }
    
    // YYYY-MM-DD (ISO format)
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
        const parts = s.split(/[-T ]/);
        return `${parseInt(parts[1])}/${parseInt(parts[2])}/${parts[0]}`;
    }
    
    // MM-DD-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(s)) {
        const parts = s.split('-');
        const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        return `${parseInt(parts[0])}/${parseInt(parts[1])}/${y}`;
    }
    
    // Try native Date parsing as fallback
    try {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        }
    } catch (e) {}
    
    return s;
}

function extractDate(datetime) {
    if (!datetime) return '';
    // Remove time portion — handle various separators
    const dateOnly = datetime.split(/[ T]/)[0];
    return normalizeDate(dateOnly);
}

// ===== KPI CALCULATOR =====
function calculateKPIs(trades, riskBudget, pointMultiplier) {
    if (!trades || trades.length === 0) return null;
    
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.isWin);
    const losses = trades.filter(t => !t.isWin);
    const winCount = wins.length;
    const lossCount = losses.length;
    
    const netPL = trades.reduce((s, t) => s + t.dollarPL, 0);
    const netPoints = trades.reduce((s, t) => s + t.pointsPL, 0);
    const grossWins = wins.reduce((s, t) => s + t.dollarPL, 0);
    const grossLosses = Math.abs(losses.reduce((s, t) => s + t.dollarPL, 0));
    
    const winRate = (winCount / totalTrades * 100);
    const profitFactor = grossLosses > 0 ? grossWins / grossLosses : Infinity;
    const returnPct = (netPL / STARTING_BALANCE * 100);
    
    // EV
    const evPerTrade = netPL / totalTrades;
    const evPlannedR = (evPerTrade / riskBudget * 100);
    
    // Avg win/loss
    const avgWinDollar = winCount > 0 ? grossWins / winCount : 0;
    const avgLossDollar = lossCount > 0 ? -grossLosses / lossCount : 0;
    const avgWinPts = winCount > 0 ? wins.reduce((s, t) => s + t.pointsPL, 0) / winCount : 0;
    const avgLossPts = lossCount > 0 ? losses.reduce((s, t) => s + t.pointsPL, 0) / lossCount : 0;
    const wlRatio = Math.abs(avgLossDollar) > 0 ? avgWinDollar / Math.abs(avgLossDollar) : Infinity;
    const expectancyR = (winRate / 100 * wlRatio) - (lossCount / totalTrades);
    
    // Risk metrics (from actual stops)
    const tradesWithRisk = trades.filter(t => t.riskDollars > 0);
    const avgRiskDollars = tradesWithRisk.length > 0 ? tradesWithRisk.reduce((s, t) => s + t.riskDollars, 0) / tradesWithRisk.length : riskBudget;
    const maxRiskDollars = tradesWithRisk.length > 0 ? Math.max(...tradesWithRisk.map(t => t.riskDollars)) : 0;
    const evActualR = avgRiskDollars > 0 ? (evPerTrade / avgRiskDollars * 100) : 0;
    const riskAdherence = tradesWithRisk.length > 0 ? tradesWithRisk.filter(t => t.riskDollars <= riskBudget * 1.2).length / tradesWithRisk.length * 100 : 0;
    
    // Avg R:R for winners and losers
    const winsWithRR = wins.filter(t => t.rewardRisk !== null && t.rewardRisk !== undefined);
    const lossesWithRR = losses.filter(t => t.rewardRisk !== null && t.rewardRisk !== undefined);
    const avgRRWins = winsWithRR.length > 0 ? winsWithRR.reduce((s, t) => s + t.rewardRisk, 0) / winsWithRR.length : 0;
    const avgRRLosses = lossesWithRR.length > 0 ? lossesWithRR.reduce((s, t) => s + t.rewardRisk, 0) / lossesWithRR.length : 0;
    
    // Avg loss cut level
    const lossesWithRisk = losses.filter(t => t.riskDollars > 0);
    const avgLossCut = lossesWithRisk.length > 0 ? lossesWithRisk.reduce((s, t) => s + (Math.abs(t.dollarPL) / t.riskDollars), 0) / lossesWithRisk.length : 0;
    
    // Drawdown
    let cumPL = 0, peak = 0, maxDD = 0, currentDD = 0;
    const equityCurve = [];
    const drawdownCurve = [];
    
    trades.forEach(t => {
        cumPL += t.dollarPL;
        if (cumPL > peak) peak = cumPL;
        const dd = peak - cumPL;
        if (dd > maxDD) maxDD = dd;
        equityCurve.push({ time: t.exitTime || t.datetime, cumPL, balance: STARTING_BALANCE + cumPL });
        drawdownCurve.push({ time: t.exitTime || t.datetime, dd: -(peak - cumPL) });
    });
    currentDD = peak - cumPL;
    
    const maxDDPct = peak > 0 ? (maxDD / (STARTING_BALANCE + peak) * 100) : (maxDD / STARTING_BALANCE * 100);
    const recoveryFactor = maxDD > 0 ? netPL / maxDD : Infinity;
    
    // Streaks
    let maxCW = 0, maxCL = 0, cw = 0, cl = 0, streak = 0;
    trades.forEach(t => {
        if (t.isWin) { cw++; cl = 0; if (cw > maxCW) maxCW = cw; }
        else { cl++; cw = 0; if (cl > maxCL) maxCL = cl; }
    });
    for (let i = trades.length - 1; i >= 0; i--) {
        if (i === trades.length - 1) streak = trades[i].isWin ? 1 : -1;
        else if (trades[i].isWin && streak > 0) streak++;
        else if (!trades[i].isWin && streak < 0) streak--;
        else break;
    }
    
    // Daily P&L
    const dailyPL = {};
    trades.forEach(t => {
        const d = t.date;
        if (!dailyPL[d]) dailyPL[d] = { pl: 0, trades: 0, wins: 0 };
        dailyPL[d].pl += t.dollarPL;
        dailyPL[d].trades++;
        if (t.isWin) dailyPL[d].wins++;
    });
    const tradingDays = Object.keys(dailyPL).sort();
    const profitableDays = tradingDays.filter(d => dailyPL[d].pl > 0).length;
    
    // Weekly P&L
    const weeklyPL = {};
    trades.forEach(t => {
        const wk = getWeekKey(t.date);
        if (!weeklyPL[wk]) weeklyPL[wk] = { pl: 0, trades: [], startDate: t.date, wins: 0, losses: 0 };
        weeklyPL[wk].pl += t.dollarPL;
        weeklyPL[wk].trades.push(t);
        if (t.isWin) weeklyPL[wk].wins++;
        else weeklyPL[wk].losses++;
    });
    
    // Long/Short
    const longs = trades.filter(t => t.direction === 'Long' || (t.direction && t.direction.toLowerCase().includes('buy')));
    const shorts = trades.filter(t => t.direction === 'Short' || (t.direction && t.direction.toLowerCase().includes('sell')));
    
    // Risk distribution
    const riskBrackets = [0, 25, 50, 75, 100, 125, 150, 200, 300, Infinity];
    const riskDist = [];
    for (let i = 0; i < riskBrackets.length - 1; i++) {
        const count = tradesWithRisk.filter(t => t.riskDollars >= riskBrackets[i] && t.riskDollars < riskBrackets[i + 1]).length;
        if (count > 0) {
            riskDist.push({
                label: riskBrackets[i + 1] === Infinity ? `$${riskBrackets[i]}+` : `$${riskBrackets[i]}–$${riskBrackets[i + 1]}`,
                count,
                pct: (count / tradesWithRisk.length * 100)
            });
        }
    }

    // Win/Loss $ distribution for histogram
    const plDistribution = trades.map(t => t.dollarPL);
    
    return {
        totalTrades, winCount, lossCount, winRate, netPL, netPoints, grossWins, grossLosses,
        profitFactor, returnPct,
        evPerTrade, evPlannedR, evActualR, avgRiskDollars, maxRiskDollars, riskAdherence,
        avgWinDollar, avgLossDollar, avgWinPts, avgLossPts, wlRatio, expectancyR,
        avgRRWins, avgRRLosses, avgLossCut,
        maxDD, maxDDPct, currentDD, recoveryFactor,
        maxCW, maxCL, streak,
        equityCurve, drawdownCurve, dailyPL, weeklyPL, tradingDays, profitableDays,
        longs, shorts, riskDist, plDistribution,
        bestTrade: Math.max(...trades.map(t => t.dollarPL)),
        worstTrade: Math.min(...trades.map(t => t.dollarPL)),
        profitPerDay: netPL / tradingDays.length,
        tradesPerDay: totalTrades / tradingDays.length
    };
}

// ===== WEEKLY SNAPSHOT GENERATOR =====
function generateWeeklySnapshots(trades, method, riskBudget, ppt) {
    const weeklyPL = {};
    trades.forEach(t => {
        const wk = getWeekKey(t.date);
        if (!weeklyPL[wk]) weeklyPL[wk] = [];
        weeklyPL[wk].push(t);
    });

    const weeks = Object.keys(weeklyPL).sort((a, b) => parseWeekKey(a) - parseWeekKey(b));
    let cumPL = 0;
    const snapshots = [];

    for (const wk of weeks) {
        const wkTrades = weeklyPL[wk];
        const wkKPIs = calculateKPIs(wkTrades, riskBudget, ppt);
        cumPL += wkKPIs.netPL;

        snapshots.push({
            method,
            week_key: wk,
            net_pl: wkKPIs.netPL,
            net_points: wkKPIs.netPoints,
            return_pct: wkKPIs.returnPct,
            total_trades: wkKPIs.totalTrades,
            win_count: wkKPIs.winCount,
            loss_count: wkKPIs.lossCount,
            win_rate: wkKPIs.winRate,
            profit_factor: wkKPIs.profitFactor === Infinity ? 999 : wkKPIs.profitFactor,
            ev_planned_r: wkKPIs.evPlannedR,
            ev_actual_r: wkKPIs.evActualR,
            max_dd: wkKPIs.maxDD,
            cumulative_pl: cumPL,
            cumulative_balance: STARTING_BALANCE + cumPL,
            cumulative_return: (cumPL / STARTING_BALANCE * 100)
        });
    }

    return snapshots;
}

// ===== WEEK HELPERS =====
function getWeekKey(dateStr) {
    const normalized = normalizeDate(dateStr);
    let d;
    if (normalized.includes('/')) {
        const parts = normalized.split('/');
        if (parts[2] && parts[2].length === 2) parts[2] = '20' + parts[2];
        d = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    } else {
        d = new Date(normalized);
    }
    if (isNaN(d.getTime())) return '';
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dow + 6) % 7));
    return `${(monday.getMonth() + 1).toString().padStart(2, '0')}/${monday.getDate().toString().padStart(2, '0')}/${monday.getFullYear()}`;
}

function getWeekRange(weekKey) {
    const parts = weekKey.split('/');
    const monday = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const opts = { month: 'short', day: 'numeric' };
    return `${monday.toLocaleDateString('en-US', opts)} – ${friday.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

function getWeeksList(trades) {
    const weeks = new Set();
    trades.forEach(t => {
        const wk = getWeekKey(t.date);
        if (wk) weeks.add(wk);
    });
    return [...weeks].sort().reverse();
}

function filterByWeek(trades, weekKey) {
    return trades.filter(t => getWeekKey(t.date) === weekKey);
}

function filterByMonth(trades, weekKey) {
    const parts = weekKey.split('/');
    const targetMonth = parseInt(parts[0]);
    const targetYear = parseInt(parts[2]);
    return trades.filter(t => {
        // Normalize the trade date first
        const normalized = normalizeDate(t.date);
        const dp = normalized.split('/');
        const m = parseInt(dp[0]);
        const y = dp[2] ? parseInt(dp[2].length === 2 ? '20' + dp[2] : dp[2]) : targetYear;
        return m === targetMonth && y === targetYear;
    });
}

function getMonthKey(dateStr) {
    const parts = dateStr.split('/');
    const m = parseInt(parts[0]);
    const y = parts[2] ? (parts[2].length === 2 ? '20' + parts[2] : parts[2]) : '2026';
    return `${String(m).padStart(2, '0')}/${y}`;
}

function getMonthsList(trades) {
    const months = new Set();
    trades.forEach(t => months.add(getMonthKey(t.date)));
    return [...months].sort().reverse();
}
