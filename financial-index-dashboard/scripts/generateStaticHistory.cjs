const fs = require('fs');
const path = require('path');

const indicesInfo = [
  { id: 'sp500', value: 5137.08, category: 'us', volatility: 0.012 },
  { id: 'nasdaq', value: 16274.94, category: 'us', volatility: 0.016 },
  { id: 'magnificent7', value: 13840.12, category: 'us', volatility: 0.022 },
  { id: 'dowjones', value: 39087.38, category: 'us', volatility: 0.009 },
  { id: 'russell2000', value: 2076.35, category: 'us', volatility: 0.015 },
  { id: 'wilshire5000', value: 51842.20, category: 'us', volatility: 0.011 },
  { id: 'sp600', value: 1312.45, category: 'us', volatility: 0.014 },
  { id: 'nysecomposite', value: 17540.30, category: 'us', volatility: 0.009 },
  
  { id: 'eurostoxx50', value: 4894.85, category: 'europe', volatility: 0.011 },
  { id: 'ftse100', value: 7684.30, category: 'europe', volatility: 0.010 },
  { id: 'dax', value: 17735.07, category: 'europe', volatility: 0.011 },
  { id: 'cac40', value: 7934.17, category: 'europe', volatility: 0.011 },
  { id: 'ftsemib', value: 32912.40, category: 'europe', volatility: 0.013 },
  
  { id: 'nikkei225', value: 39910.82, category: 'asia', volatility: 0.014 },
  { id: 'topix', value: 2709.42, category: 'asia', volatility: 0.011 },
  { id: 'hangseng', value: 16589.44, category: 'asia', volatility: 0.018 },
  
  { id: 'vwce', value: 118.42, category: 'global', volatility: 0.008 },
  { id: 'msciworld', value: 3345.18, category: 'global', volatility: 0.009 },
  { id: 'msciem', value: 1024.15, category: 'global', volatility: 0.013 },
  { id: 'msciacwi', value: 74.85, category: 'global', volatility: 0.009 },
  { id: 'mscieurope', value: 194.20, category: 'global', volatility: 0.010 },
  { id: 'msciusa', value: 4425.30, category: 'global', volatility: 0.011 },
  { id: 'mscichina', value: 52.40, category: 'global', volatility: 0.020 },
  { id: 'ftseallworld', value: 462.15, category: 'global', volatility: 0.009 },
  { id: 'ftsedeveloped', value: 585.30, category: 'global', volatility: 0.009 },
  { id: 'ftseemerg', value: 495.10, category: 'global', volatility: 0.012 },
  
  { id: 'sox', value: 4929.17, category: 'sectors', volatility: 0.024 },
  { id: 'sp500it', value: 3645.10, category: 'sectors', volatility: 0.018 },
  { id: 'sp500energy', value: 642.35, category: 'sectors', volatility: 0.017 },
  { id: 'sp500financials', value: 618.40, category: 'sectors', volatility: 0.013 },
  
  { id: 'vix', value: 13.11, category: 'volatility', volatility: 0.060 },
  { id: 'cboevix', value: 14.05, category: 'volatility', volatility: 0.060 },
  { id: 'bcom', value: 98.45, category: 'volatility', volatility: 0.012 },
  
  { id: 'bitcoin', value: 64320.15, category: 'crypto', volatility: 0.035 },
  { id: 'tether', value: 1.00, category: 'crypto', volatility: 0.001 },
  { id: 'coindesk20', value: 2185.40, category: 'crypto', volatility: 0.030 }
];

const historyDir = path.join(__dirname, '..', 'src', 'data', 'history');

if (!fs.existsSync(historyDir)) {
  fs.mkdirSync(historyDir, { recursive: true });
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

const today = new Date('2026-05-26');
const numDays = 520; 

const tradingDates = [];
let currentDate = new Date(today);

while (tradingDates.length < numDays) {
  if (!isWeekend(currentDate)) {
    tradingDates.push(new Date(currentDate).toISOString().split('T')[0]);
  }
  currentDate.setDate(currentDate.getDate() - 1);
}

console.log(`Generating history data files in ${historyDir}...`);

indicesInfo.forEach((idx) => {
  const dataPoints = [];
  let currentPrice = idx.value;
  const vol = idx.volatility;
  
  for (let i = 0; i < numDays; i++) {
    const date = tradingDates[i];
    
    let changePct;
    if (idx.id === 'tether') {
      changePct = (Math.random() - 0.5) * 0.0015;
      currentPrice = 1.0 + changePct;
    } else if (idx.id === 'vix' || idx.id === 'cboevix') {
      const targetVix = 14.5;
      const speed = 0.07; 
      const drift = speed * (targetVix - currentPrice);
      const randomShock = (Math.random() - 0.5) * currentPrice * vol;
      currentPrice = Math.max(8.0, Math.min(65.0, currentPrice - drift - randomShock));
    } else {
      const backwardTrend = -0.0003;
      const randomShock = (Math.random() - 0.491) * vol; 
      const factor = 1 + backwardTrend + randomShock;
      currentPrice = currentPrice * factor;
    }
    
    const close = parseFloat(currentPrice.toFixed(2));
    
    let intradayVol = vol * 0.8;
    if (idx.id === 'tether') intradayVol = 0.0004;
    
    const maxVar = close * intradayVol;
    const high = parseFloat((close + Math.random() * maxVar).toFixed(2));
    const low = parseFloat(Math.max(0.01, close - Math.random() * maxVar).toFixed(2));
    const open = parseFloat((low + Math.random() * (high - low)).toFixed(2));
    
    let baseVolume = 1000000;
    if (idx.category === 'us') baseVolume = 150000000;
    else if (idx.category === 'crypto') baseVolume = 2500000000;
    else if (idx.category === 'europe') baseVolume = 30000000;
    
    const volume = Math.round(baseVolume * (0.6 + Math.random() * 1.3));
    
    dataPoints.push({
      date,
      open,
      high,
      low,
      close,
      volume
    });
  }
  
  dataPoints.reverse();
  
  const lastPoint = dataPoints[dataPoints.length - 1];
  lastPoint.close = idx.value;
  
  const filePath = path.join(historyDir, `${idx.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(dataPoints, null, 2), 'utf-8');
});

console.log('Successfully generated 36 premium index history files.');
