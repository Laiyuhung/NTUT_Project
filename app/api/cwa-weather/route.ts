import { NextResponse } from 'next/server';

// 取得中央氣象署 JS 與 HTML，解析氣象資料
export async function GET() {
  try {

    // 1. 取得 JS 檔案
    const jsRes = await fetch('https://www.cwa.gov.tw/Data/js/Observe/County/63.js');
    const jsText = await jsRes.text();

    // 解析 ST 物件
    const stMatch = jsText.match(/var\s+ST\s*=\s*(\{[\s\S]*?\});/);
  let stations: any[] = [];
    if (stMatch) {
      let jsonStr = stMatch[1].replace(/'/g, '"');
      jsonStr = jsonStr.replace(/(\w+)\s*:/g, '"$1":');
      const stData = JSON.parse(jsonStr);
      const county = stData['63'];
      if (county) {
        stations = Object.values(county);
      }
    }

    return NextResponse.json({
      stations,
      success: true,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
