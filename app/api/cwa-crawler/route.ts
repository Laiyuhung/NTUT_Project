type CrawlerRow = {
  time: string;
  temp: string;
  weather: string;
  windDir: string;
  windSpeed: string;
  windGust: string;
  visibility: string;
  humidity: string;
  pressure: string;
  rain: string;
  sunlight: string;
};
// 直接解析傳入的 HTML 字串，回傳結構化天氣資料
export async function POST(req: Request) {
  try {
    const { raw } = await req.json();
    if (!raw) {
      return NextResponse.json({ success: false, error: "No raw HTML provided" });
    }
    // 包一層 table/tbody 方便 cheerio 處理
    const $ = cheerio.load(`<table><tbody>${raw}</tbody></table>`);
    const data: CrawlerRow[] = [];
    $("tr").each((_, tr) => {
      const tds = $(tr).find("td");
      const th = $(tr).find("th").first();
      if (tds.length < 10) return;
      data.push({
        time: th.text().replace(/\s+/g, " ").trim(),
        temp: $(tds[0]).find(".tem-C").text().trim(),
        weather: $(tds[1]).find("img").attr("alt") || "",
        windDir: $(tds[2]).find(".wind").text().trim(),
        windSpeed: $(tds[3]).find(".wind_2").text().trim(),
        windGust: $(tds[4]).find(".wind_2").text().trim(),
        visibility: $(tds[5]).text().trim(),
        humidity: $(tds[6]).text().trim(),
        pressure: $(tds[7]).text().trim(),
        rain: $(tds[8]).text().trim(),
        sunlight: $(tds[9]).text().trim(),
      });
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message });
  }
}
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { Element } from 'domhandler';


function getCwaUrl() {
  const base = 'https://www.cwa.gov.tw/V8/C/W/Observe/MOD/24hr/46692.html';
  const t = Date.now();
  return `${base}?T=${t}`;
}

export async function GET() {
  try {
    const res = await fetch(getCwaUrl(), {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.cwa.gov.tw/V8/C/W/Observe/MOD/24hr/46692.html',
        'Origin': 'https://www.cwa.gov.tw',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9',
      },
      cache: 'no-store',
      credentials: 'include',
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const rows = $('tr[data-cstname]');
  const data = rows.map((_: number, row: Element) => {
      const $row = $(row);
      const time = $row.find('th[scope="row"]').text().replace(/\s+/g, ' ').trim();
      const temp = $row.find('td[headers="temp"] .tem-C').text().trim();
      const weather = $row.find('td[headers="weather"] img').attr('title') || '';
      const wind = $row.find('td[headers="w-1"] .wind').text().trim();
      const windSpeed = $row.find('td[headers="w-2"] .wind_2').text().trim();
      const visibility = $row.find('td[headers="visible-1"]').text().trim();
      const humidity = $row.find('td[headers="hum"]').text().trim();
      const pressure = $row.find('td[headers="pre"]').text().trim();
      const rain = $row.find('td[headers="rain"]').text().trim();
      const sunlight = $row.find('td[headers="sunlight"]').text().trim();
      return {
        time,
        temp,
        weather,
        wind,
        windSpeed,
        visibility,
        humidity,
        pressure,
        rain,
        sunlight,
      };
    }).get();
  return NextResponse.json({ success: true, data, raw: html });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
