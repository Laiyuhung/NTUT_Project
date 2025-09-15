import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';



function getCwaUrl() {
  const base = 'https://www.cwa.gov.tw/V8/C/W/Observe/MOD/24hr/46692.html';
  const t = Date.now();
  return `${base}?T=${t}`;
}

// 強化 header 並加入重試與隨機延遲
function getRandomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Linux; Android 13; SM-S9180) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      // 隨機延遲 300~1200ms
      await sleep(300 + Math.random() * 900);
      const res = await fetch(url, options);
      if (res.status === 200) return res;
      // 若被擋，嘗試下一次
    } catch {
      // 忽略錯誤，重試
    }
  }
  throw new Error('Request blocked or failed after retries');
}

export async function GET() {
  try {
    const userAgent = getRandomUserAgent();
    const res = await fetchWithRetry(getCwaUrl(), {
      headers: {
        'User-Agent': userAgent,
        'Referer': 'https://www.cwa.gov.tw/V8/C/W/Observe/MOD/24hr/46692.html',
        'Origin': 'https://www.cwa.gov.tw',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        // 可視情況加上 Cookie
        //'Cookie': 'your_cookie_here',
      },
      cache: 'no-store',
      credentials: 'omit', // server 端 fetch 不支援 include
    });
    const html = await res.text();
      // 解析 HTML 並結構化資料
      // 若 raw 只有 <tr>，需包成 <table> 才能正確解析
      const $ = cheerio.load(`<table>${html}</table>`);
      const data: Array<{
        date: string;
        time: string;
        temp: string;
        weather: string;
        wind: string;
        windSpeed: string;
        windSpeedAlt: string;
        visibility: string;
        humidity: string;
        pressure: string;
        rain: string;
        sunlight: string;
      }> = [];
      // 針對所有 <tr> 逐筆解析
      $('tr').each((_, row) => {
        const $row = $(row);
        // 解析日期與時間
        let date = '';
        let time = '';
        const th = $row.find('th[scope="row"]');
        if (th.length) {
          const thHtml = th.html() || '';
          const parts = thHtml.split('<br');
          date = cheerio.load(parts[0]).text().trim();
          time = cheerio.load(parts[1] ? '<br' + parts[1] : '').text().trim();
          if (!time) {
            const txt = th.text().replace(/\s+/g, ' ').trim();
            const match = txt.match(/^(\d{2}\/\d{2})\s*(\d{2}:\d{2})?$/);
            if (match) {
              date = match[1];
              time = match[2] || '';
            }
          }
        }
        // 其他欄位
        const temp = $row.find('td[headers="temp"] .tem-C').text().trim();
        // weather 欄位正確抓 title
        let weather = '';
        const weatherImg = $row.find('td[headers="weather"] img');
        if (weatherImg.length) {
          weather = weatherImg.attr('title') || weatherImg.attr('alt') || '';
        }
        const wind = $row.find('td[headers="w-1"] .wind').text().trim();
        const windSpeed = $row.find('td[headers="w-2"] .wind_2').text().trim();
        const windSpeedAlt = $row.find('td[headers="w-3"] .wind_2').text().trim();
        const visibility = $row.find('td[headers="visible-1"]').text().trim();
        const humidity = $row.find('td[headers="hum"]').text().trim();
        const pressure = $row.find('td[headers="pre"]').text().trim();
        const rain = $row.find('td[headers="rain"]').text().trim();
        const sunlight = $row.find('td[headers="sunlight"]').text().trim();
        // 只要有時間欄位才推入
        if (date || time) {
          data.push({
            date,
            time,
            temp,
            weather,
            wind,
            windSpeed,
            windSpeedAlt,
            visibility,
            humidity,
            pressure,
            rain,
            sunlight,
          });
        }
      });
    return NextResponse.json({ success: true, data, raw: html });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
