import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// 工具：修正中央氣象署 JS 物件字串為合法 JSON
function fixCwaJson(str: string): string {
  // 1. key 變雙引號
  let fixed = str.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');

  // 2. 單引號值變雙引號（保留內部的 \'）
  fixed = fixed.replace(/'([^']*?)'/g, (_, val) => {
    return `"${val.replace(/\\'/g, "'")}"`;
  });

  // 3. 移除多餘逗號
  fixed = fixed.replace(/,\s*([}\]])/g, "$1");

  // 4. 特殊容錯修正
  fixed = fixed.replace(/Da"an/g, "Da'an");
  fixed = fixed.replace(/'}}/g, '"}}');

  return fixed;
}

export async function GET() {
  try {
    const jsRes = await fetch(
      "https://www.cwa.gov.tw/Data/js/Observe/County/65.js"
    );
    const jsText = await jsRes.text();

    const match = jsText.match(/'65'\s*:\s*({[\s\S]*})\s*}\s*;\s*var/);
    if (!match) {
      return NextResponse.json(
        { success: false, error: "找不到 ST['65'] 物件" },
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

    type StationRaw = {
      Date?: string;
      Time?: string;
      StationName?: { C?: string; E?: string };
      Weather?: { C?: string; E?: string };
      Temperature?: { C?: { C?: string } };
      Humidity?: { C?: string };
      Rain?: { C?: string };
      Wind?: { MS?: { C?: string }; BF?: { C?: string } };
      Pressure?: { C?: string };
      Sunshine?: { C?: string };
    };

    // 先取得所有站名
    const stationList = (Object.values(obj) as StationRaw[]).map((s) => s.StationName?.C ?? "");
    // 查詢 supabase 取得所有經緯度
  const latlngMap: Record<string, { latitude: number|null, longitude: number|null }> = {};
    if (stationList.length > 0) {
      const { data, error } = await supabase
        .from('station_code_for_web')
        .select('station_name, latitude, longitude')
        .in('station_name', stationList);
      if (!error && data) {
        data.forEach(row => {
          latlngMap[row.station_name] = {
            latitude: row.latitude,
            longitude: row.longitude,
          };
        });
      }
    }

    const stations = (Object.values(obj) as StationRaw[]).map((s) => {
      const name = s.StationName?.C ?? "";
      const latlng = latlngMap[name] || { latitude: null, longitude: null };
      return {
        date: s.Date ?? "",
        time: s.Time ?? "",
        name,
        weather: s.Weather?.C ?? "",
        temperature: s.Temperature?.C?.C ?? "",
        humidity: s.Humidity?.C ?? "",
        rain: s.Rain?.C ?? "",
        wind_ms: s.Wind?.MS?.C ?? "",
        pressure: s.Pressure?.C ?? "",
        sunshine: s.Sunshine?.C ?? "",
        latitude: latlng.latitude,
        longitude: latlng.longitude,
      };
    });

    return NextResponse.json({
      success: true,
      stations,
      raw: jsText,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
