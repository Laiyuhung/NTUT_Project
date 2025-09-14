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
      // 用 Function 解析 ST 物件，避免 globalThis 污染
      const getST = new Function('js', `let ST = undefined; ${jsText}; return ST;`);
      const ST = getST(jsText);
      if (ST && ST['63']) {
        stations = Object.values(ST['63']);
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
