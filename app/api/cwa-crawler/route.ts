import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { Element } from 'domhandler';

const CWA_URL = 'https://www.cwa.gov.tw/V8/C/W/Observe/MOD/24hr/46692.html?T=37110391889';

export async function GET() {
  try {
    const res = await fetch(CWA_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      cache: 'no-store',
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
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
