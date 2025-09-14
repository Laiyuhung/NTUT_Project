
import { NextResponse } from 'next/server';

// 工具：修正中央氣象署 JS 物件字串為合法 JSON
function fixCwaJson(str: string): string {
  // 1. 讓 key 變成雙引號
  let fixed = str.replace(/(\w+):/g, '"$1":');
  // 2. 單引號值變雙引號
  fixed = fixed.replace(/'([^']*)'/g, '"$1"');
  // 3. 移除多餘逗號（物件結尾）
  fixed = fixed.replace(/,\s*}/g, '}');
  // 4. 移除多餘逗號（陣列結尾）
  fixed = fixed.replace(/,\s*]/g, ']');
  return fixed;
}

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
    // 讓 key 變成雙引號，並修正多餘逗號等問題
    const objStr = fixCwaJson(match[1]);
    let obj;
    try {
      obj = JSON.parse(objStr);
    } catch (e) {
      return NextResponse.json({ success: false, error: 'JSON 解析失敗: ' + String(e), raw: objStr }, { status: 500 });
    }
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
