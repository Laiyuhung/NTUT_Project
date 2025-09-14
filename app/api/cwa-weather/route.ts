import { NextResponse } from 'next/server';

// 取得中央氣象署 JS 與 HTML，解析氣象資料
export async function GET() {
  try {

    // 1. 取得 JS 檔案
    const jsRes = await fetch('https://www.cwa.gov.tw/Data/js/Observe/County/63.js');
    // https://www.cwa.gov.tw/Data/js/Observe/County/63.js?_=1757855572427
    // https://www.cwa.gov.tw/Data/js/Observe/County/63.js?_=1757855686745
    const jsText = await jsRes.text();

    // 2. 解析 JS 內容（格式: var ST = {...};）
    // 直接抓 ST 物件
    const stMatch = jsText.match(/var\s+ST\s*=\s*(\{[\s\S]*?\});/);
    let stData = null;
    if (stMatch) {
      // 先將單引號換成雙引號
      let jsonStr = stMatch[1].replace(/'/g, '"');
      // 再將未加引號的 key 補上雙引號
      jsonStr = jsonStr.replace(/(\w+)\s*:/g, '"$1":');
      stData = JSON.parse(jsonStr);
    }

    // 3. 取得 HTML 頁面
    const htmlRes = await fetch('https://www.cwa.gov.tw/V8/C/W/OBS_County.html?ID=63');
    const htmlText = await htmlRes.text();

    // 4. 解析 HTML 內容（簡單抓 table 內容）
    const tableMatch = htmlText.match(/<table[\s\S]*?<\/table>/);
  const tableHtml = tableMatch ? tableMatch[0] : null;

    return NextResponse.json({
      stData,
      tableHtml,
      success: true,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
