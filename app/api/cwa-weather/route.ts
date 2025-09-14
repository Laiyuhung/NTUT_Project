// 觀測站型別定義
type Station = {
  StationID: string;
  StationName: { C: string; E: string };
  Date: string;
  Time: string;
  Weather: { C: string; E: string } | string;
  Temperature: { C: { C: string; E: string }; F: { C: string; E: string } } | string;
  Humidity: { C: string; E: string } | string;
  Rain: { C: string; E: string } | string;
  WindDir: { C: string; E: string } | string;
};
import { NextResponse } from 'next/server';

// 取得中央氣象署 JS 與 HTML，解析氣象資料
export async function GET() {
  try {

    // 1. 取得 JS 檔案
    const jsRes = await fetch('https://www.cwa.gov.tw/Data/js/Observe/County/63.js');
    const jsText = await jsRes.text();

    // 解析 ST 物件
    const stMatch = jsText.match(/var\s+ST\s*=\s*(\{[\s\S]*?\});/);
    let stations: Station[] = [];
    if (stMatch) {
      let jsonStr = stMatch[1].replace(/'/g, '"');
      jsonStr = jsonStr.replace(/(\w+)\s*:/g, '"$1":');
      const stData = JSON.parse(jsonStr);
      const county = stData['63'];
      if (county) {
        stations = Object.values(county) as Station[];
      }
    }

    return Response.json({
      stations,
      success: true,
    });
  } catch (e) {
  return Response.json({ success: false, error: String(e) }, { status: 500 });
  }
}
