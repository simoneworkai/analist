import { TimeframeId, SimulatedPoint } from './chartSim';

export interface RawHistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Map of imported JSON content so we don't fetch or import multiple times unnecessarily (caching)
const loadedHistoryCache: Record<string, RawHistoryPoint[]> = {};

/**
 * Dynamically loads the historical data JSON for an asset.
 * Works perfectly on Vite dev and production environments using ES module dynamic import.
 */
export async function loadHistoricalData(assetId: string): Promise<RawHistoryPoint[]> {
  if (loadedHistoryCache[assetId]) {
    return loadedHistoryCache[assetId];
  }

  try {
    // Dynamic import inside src/data/history/ using relative pathways resolves perfectly in Vite.
    const module = await import(`../data/history/${assetId}.json`);
    const data = module.default as RawHistoryPoint[];
    loadedHistoryCache[assetId] = data;
    return data;
  } catch (err) {
    console.warn(`[WARN] Failed to retrieve real local history for asset '${assetId}', falling back to model simulation.`, err);
    return [];
  }
}

/**
 * Format date string (YYYY-MM-DD) into locale Italian short strings depending on timeframe
 */
function formatHistoryTimestamp(dateStr: string, timeframe: TimeframeId): string {
  try {
    const d = new Date(dateStr);
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    
    if (timeframe === '1w') {
      return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
    } else if (timeframe === '1m' || timeframe === '3m' || timeframe === '6m') {
      return `${d.getDate()} ${months[d.getMonth()]}`;
    } else {
      // 1y, 5y, 10y, all
      return `${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch {
    return dateStr;
  }
}

/**
 * Filters a raw historical dataset for a specific timeframe and downsamples it to a target count (pointsCount)
 */
export function processHistoryForTimeframe(
  history: RawHistoryPoint[],
  timeframe: TimeframeId,
  pointsCount: number = 32
): SimulatedPoint[] {
  if (!history || history.length === 0) return [];

  // 1. Determine how many trading days to grab based on timeframe
  let daysToTake = history.length;
  switch (timeframe) {
    case '1w':
      daysToTake = 5; // average trading week holds 5 sessions
      break;
    case '1m':
      daysToTake = 22; // average trading month has 22 sessions
      break;
    case '3m':
      daysToTake = 66;
      break;
    case '6m':
      daysToTake = 132;
      break;
    case '1y':
      daysToTake = 252; // trading year has 252 sessions
      break;
    case '5y':
    case '10y':
    case 'all':
    default:
      daysToTake = history.length; // use full 2 years dataset as representative historical curve
      break;
  }

  // 2. Slicing the latest N points chronologically (oldest first, newest last)
  const sliced = history.slice(-daysToTake);
  if (sliced.length === 0) return [];

  // 3. Downsampling / Sampling down to exactly pointsCount
  const sampled: SimulatedPoint[] = [];
  const step = Math.max(1, (sliced.length - 1) / (pointsCount - 1));

  for (let i = 0; i < pointsCount; i++) {
    const dataIdx = Math.min(sliced.length - 1, Math.round(i * step));
    const point = sliced[dataIdx];
    
    sampled.push({
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      timestamp: formatHistoryTimestamp(point.date, timeframe)
    });
  }

  return sampled;
}
