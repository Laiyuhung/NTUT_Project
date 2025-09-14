import { NextResponse } from "next/server";

// 工具：修正中央氣象署 JS 物件字串為合法 JSON
function fixCwaJson(str: string): string {
  // 1. key 變雙引號（僅處理物件 key，不處理值）
  let fixed = str.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');

  // 2. 單引號值變雙引號（保留內部的 \'）
  fixed = fixed.replace(/'([^']*?)'/g, (_, val) => {
    return `"${val.replace(/\\'/g, "'")}"`;
  });

  // 3. 移除多餘逗號（物件或陣列結尾）
  fixed = fixed.replace(/,\s*([}\]])/g, "$1");

  return fixed;
}

export async function GET() {
  try {
    const jsRes = await fetch(
      "https://www.cwa.gov.tw/Data/js/Observe/County/63.js"
    );
    const jsText = await jsRes.text();

    // 抓取 ST['63'] 區塊（完整物件）
    const match = jsText.match(/'63'\s*:\s*({[\s\S]*})\s*}\s*;\s*var/);
    if (!match) {
      return NextResponse.json(
        { success: false, error: "找不到 ST['63'] 物件" },
        { status: 500 }
      );
    }

    const objStr = fixCwaJson(match[1]);

    let obj;
    try {
      obj = JSON.parse(objStr);
    } catch (e) {
      return NextResponse.json(
        { success: false, error: "JSON 解析失敗: " + String(e), raw: objStr },
        { status: 500 }
      );
    }

    // 型別定義
    type StationRaw = {
      Date?: string;
      Time?: string;
      StationName?: { C?: string; E?: string };
      Weather?: { C?: string; E?: string };
      Temperature?: { C?: { C?: string } };
      Humidity?: { C?: string };
      Rain?: { C?: string };
      Wind?: { MS?: { C?: string } };
      Pressure?: { C?: string };
      Sunshine?: { C?: string };
    };

    // 整理成乾淨陣列
    const stations = (Object.values(obj) as StationRaw[]).map((s) => ({
      date: s.Date ?? "",
      time: s.Time ?? "",
      name: s.StationName?.C ?? "",
      weather: s.Weather?.C ?? "",
      temperature: s.Temperature?.C?.C ?? "",
      humidity: s.Humidity?.C ?? "",
      rain: s.Rain?.C ?? "",
      wind: s.Wind?.MS?.C ?? "",
      pressure: s.Pressure?.C ?? "",
      sunshine: s.Sunshine?.C ?? "",
    }));

    return NextResponse.json({
      success: true,
      stations,
      raw: jsText, // 備查原始內容
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
