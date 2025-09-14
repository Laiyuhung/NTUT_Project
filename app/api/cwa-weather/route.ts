import { NextResponse } from 'next/server';

// 取得中央氣象署 JS，解析並整理回傳格式
export async function GET() {
  try {
    const jsRes = await fetch('https://www.cwa.gov.tw/Data/js/Observe/County/63.js');
    const jsText = await jsRes.text();
    // 用正則抽出 ST['63'] 物件字串
    const match = jsText.match(/'63'\s*:\s*({[\s\S]*?})\s*[,}]/);
    if (!match) {
      return NextResponse.json({ success: false, error: "找不到 ST['63'] 物件" }, { status: 500 });
    }
    // 讓 key 變成雙引號，方便 JSON.parse
    const objStr = match[1]
      .replace(/(\w+):/g, '"$1":')
      .replace(/'([^']*)'/g, '"$1"');
    const obj = JSON.parse(objStr);
    // 定義型別，避免使用 any
    type StationRaw = {
      Date?: string;
      Time?: string;
      StationName?: { C?: string };
      Weather?: { C?: string };
      Temperature?: { C?: { C?: string } };
      Humidity?: { C?: string };
      Rain?: { C?: string };
      Wind?: { MS?: { C?: string } };
      Pressure?: { C?: string };
      Sunshine?: { C?: string };
    };
    const stations = (Object.values(obj) as StationRaw[]).map((s) => ({
      date: s.Date ?? '',
      time: s.Time ?? '',
      name: s.StationName?.C ?? '',
      weather: s.Weather?.C ?? '',
      temperature: s.Temperature?.C?.C ?? '',
      humidity: s.Humidity?.C ?? '',
      rain: s.Rain?.C ?? '',
      wind: s.Wind?.MS?.C ?? '',
      pressure: s.Pressure?.C ?? '',
      sunshine: s.Sunshine?.C ?? ''
    }));
    return NextResponse.json({
      stations,
      raw: jsText, // 備查原始內容
      success: true,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
