import { NextResponse } from 'next/server';

// 取得中央氣象署 JS 與 HTML，解析氣象資料
export async function GET() {
  try {
    // 1. 取得 JS 檔案
    const jsRes = await fetch('https://www.cwa.gov.tw/Data/js/Observe/County/63.js');
    const jsText = await jsRes.text();

    // 2. 解析 JS 內容（格式: var County = {...};）
    const match = jsText.match(/var\s+County\s*=\s*(\{[\s\S]*?\});/);
    let countyData = null;
    if (match) {
      countyData = JSON.parse(match[1].replace(/(\w+):/g, '"$1":'));
    }

    // 3. 取得 HTML 頁面
    const htmlRes = await fetch('https://www.cwa.gov.tw/V8/C/W/OBS_County.html?ID=63');
    const htmlText = await htmlRes.text();

    // 4. 解析 HTML 內容（簡單抓 table 內容）
    const tableMatch = htmlText.match(/<table[\s\S]*?<\/table>/);
  const tableHtml = tableMatch ? tableMatch[0] : null;

    return NextResponse.json({
      countyData,
      tableHtml,
      success: true,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
