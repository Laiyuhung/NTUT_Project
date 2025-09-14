import { NextResponse } from 'next/server';

// 取得中央氣象署 JS 與 HTML，解析氣象資料
export async function GET() {
  try {

    // 1. 取得 JS 檔案
    const jsRes = await fetch('https://www.cwa.gov.tw/Data/js/Observe/County/63.js');
    const jsText = await jsRes.text();

    // 解析 ST 資料
    let stations: unknown[] = [];
    try {
      // 用正則抽出 ST['63'] 物件字串
      const match = jsText.match(/'63'\s*:\s*({[\s\S]*?})\s*[,}]/);
      if (match) {
        // 讓 key 變成雙引號，方便 JSON.parse
        const objStr = match[1]
          .replace(/(\w+):/g, '"$1":')
          .replace(/'([^']*)'/g, '"$1"');
        const obj = JSON.parse(objStr);
        stations = Object.values(obj).map((s) => {
          const rec = s as Record<string, unknown>;
          return {
            date: typeof rec.Date === 'string' ? rec.Date : '',
            time: typeof rec.Time === 'string' ? rec.Time : '',
            name: typeof rec.StationName === 'object' && rec.StationName && 'C' in rec.StationName ? (rec.StationName as { C?: string }).C ?? '' : '',
            weather: typeof rec.Weather === 'object' && rec.Weather && 'C' in rec.Weather ? (rec.Weather as { C?: string }).C ?? '' : '',
            temperature: typeof rec.Temperature === 'object' && rec.Temperature && 'C' in rec.Temperature && typeof (rec.Temperature as any).C === 'object' && (rec.Temperature as any).C && 'C' in (rec.Temperature as any).C ? (rec.Temperature as { C?: { C?: string } }).C?.C ?? '' : '',
            humidity: typeof rec.Humidity === 'object' && rec.Humidity && 'C' in rec.Humidity ? (rec.Humidity as { C?: string }).C ?? '' : '',
            rain: typeof rec.Rain === 'object' && rec.Rain && 'C' in rec.Rain ? (rec.Rain as { C?: string }).C ?? '' : '',
            wind: typeof rec.Wind === 'object' && rec.Wind && 'MS' in rec.Wind && typeof (rec.Wind as any).MS === 'object' && (rec.Wind as any).MS && 'C' in (rec.Wind as any).MS ? (rec.Wind as { MS?: { C?: string } }).MS?.C ?? '' : '',
            pressure: typeof rec.Pressure === 'object' && rec.Pressure && 'C' in rec.Pressure ? (rec.Pressure as { C?: string }).C ?? '' : '',
            sunshine: typeof rec.Sunshine === 'object' && rec.Sunshine && 'C' in rec.Sunshine ? (rec.Sunshine as { C?: string }).C ?? '' : ''
          };
        });
      }
    } catch {
      // 解析失敗 stations 保持空陣列
    }
    return NextResponse.json({
      jsText,
      stations,
      success: true,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
