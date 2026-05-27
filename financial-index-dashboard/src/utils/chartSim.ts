import { IndexAsset } from '../types';

export type TimeframeId = 'all' | '10y' | '5y' | '1y' | '6m' | '3m' | '1m' | '1w' | '1d';

export interface TimeframeOption {
  id: TimeframeId;
  label: string;
}

export const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { id: 'all', label: 'All' },
  { id: '10y', label: '10 Anni' },
  { id: '5y', label: '5 Anni' },
  { id: '1y', label: 'Annuale' },
  { id: '6m', label: 'Semestrale' },
  { id: '3m', label: 'Trimestrale' },
  { id: '1m', label: 'Mensile' },
  { id: '1w', label: 'Settimanale' },
  { id: '1d', label: 'Giornaliero' },
];

export interface SimulatedPoint {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: string;
}

// Deterministic pseudo-random number generator to avoid visual flicker during re-renders
function createPRNG(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function generateSimulatedData(
  asset: IndexAsset,
  timeframe: TimeframeId,
  pointsCount: number = 32
): SimulatedPoint[] {
  const rand = createPRNG(asset.id + '_' + timeframe);
  const data: SimulatedPoint[] = [];

  const currentPrice = asset.value;
  let basePrice = currentPrice;
  let overallTrend = 0.001; // default slight positive drift

  // Define scale and drift parameters per timeframe to simulate true asset behaviors
  switch (timeframe) {
    case 'all':
      // Started 10-15 years ago, typically much lower
      basePrice = asset.category === 'crypto' ? currentPrice * 0.01 : currentPrice * 0.35;
      overallTrend = 0.05; // strong growth upward
      break;
    case '10y':
      basePrice = asset.category === 'crypto' ? currentPrice * 0.05 : currentPrice * 0.45;
      overallTrend = 0.04;
      break;
    case '5y':
      basePrice = currentPrice * 0.6;
      overallTrend = 0.03;
      break;
    case '1y':
      basePrice = currentPrice * 0.9;
      overallTrend = 0.015;
      break;
    case '6m':
      basePrice = currentPrice * 0.94;
      overallTrend = 0.008;
      break;
    case '3m':
      basePrice = currentPrice * 0.97;
      overallTrend = 0.004;
      break;
    case '1m':
      basePrice = currentPrice * 0.99;
      overallTrend = 0.001;
      break;
    case '1w':
      basePrice = currentPrice * 0.995;
      overallTrend = 0.0002;
      break;
    case '1d':
      basePrice = currentPrice * (1 - (asset.change / 100)); // Start from yesterday's close exactly
      overallTrend = (asset.change / 100) / pointsCount;
      break;
  }

  // Generate continuous trending price closes
  let price = basePrice;
  const volFactor = asset.id === 'vix' || asset.id === 'cboevix' 
    ? 0.07 
    : asset.category === 'crypto' 
      ? 0.045 
      : 0.015;

  const points: number[] = [];
  for (let i = 0; i < pointsCount; i++) {
    const randomWalk = (rand() - 0.48) * volFactor; // random noise
    const trendEffect = overallTrend * (1 + rand() * 0.5); // long term upward/downward drift
    
    // Smooth transition
    price = price * (1 + randomWalk + trendEffect);
    
    // Prevent collapsing to zero
    if (price <= 0) price = 0.01;
    points.push(price);
  }

  // Normalize final point to exactly match current asset value (ensures state cohesion)
  const finalValue = points[points.length - 1];
  const scalingRatio = currentPrice / finalValue;
  const calibratedPoints = points.map(p => p * scalingRatio);

  // Convert closing prices to complete candlesticks (Open, High, Low, Close)
  let prevClose = calibratedPoints[0] * (1 - (rand() - 0.5) * volFactor * 0.5);

  for (let i = 0; i < pointsCount; i++) {
    const close = parseFloat(calibratedPoints[i].toFixed(2));
    const open = parseFloat(prevClose.toFixed(2));
    
    // High and low logic
    const bodyMax = Math.max(open, close);
    const bodyMin = Math.min(open, close);
    
    // Wicks
    const wickHighRange = bodyMax * (rand() * volFactor * 0.4);
    const wickLowRange = bodyMin * (rand() * volFactor * 0.4);
    
    const high = parseFloat((bodyMax + wickHighRange).toFixed(2));
    const low = parseFloat(Math.max(0.01, bodyMin - wickLowRange).toFixed(2));

    // Formulate a clean timestamp label for tooltip trackers
    let timestamp = `Punto ${i + 1}`;
    switch (timeframe) {
      case '1d':
        const hr = Math.floor(9 + (i * 8) / pointsCount);
        const min = Math.floor((i * 60) % 60);
        timestamp = `${hr.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        break;
      case '1w':
        const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        timestamp = days[i % 7];
        break;
      case '1m':
        timestamp = `Giorno ${i + 1}`;
        break;
      case '3m':
      case '6m':
        timestamp = `Settimana ${Math.floor(i / 2.5) + 1}`;
        break;
      case '1y':
        const mesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        timestamp = mesi[Math.floor((i / pointsCount) * 12) % 12];
        break;
      case '5y':
      case '10y':
      case 'all':
        const startingYear = new Date().getFullYear() - (timeframe === '5y' ? 5 : timeframe === '10y' ? 10 : 15);
        const year = startingYear + Math.floor((i / pointsCount) * (new Date().getFullYear() - startingYear));
        const staticMonths = ['Gen', 'Mag', 'Set'];
        timestamp = `${staticMonths[i % 3]} ${year}`;
        break;
    }

    data.push({
      open,
      high,
      low,
      close,
      timestamp,
    });

    prevClose = close;
  }

  return data;
}
