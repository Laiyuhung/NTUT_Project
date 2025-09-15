"use client";
import { useEffect, useState } from "react";
type CrawlerRow = {
  time: string;
  temp: string;
  weather: string;
  wind: string;
  windSpeed: string;
  visibility: string;
  humidity: string;
  pressure: string;
  rain: string;
  sunlight: string;
};

type CrawlerResponse = {
  success: boolean;
  data?: CrawlerRow[];
  error?: string;
};

type Station = {
  date: string;
  time: string;
  name: string;
  weather: string;
  temperature: string;
  humidity: string;
  rain: string;
  wind_ms: string;
  pressure: string;
  sunshine: string;
  latitude?: number | null;
  longitude?: number | null;
};

type CwaWeatherResponse = {
  stations: Station[];
  success: boolean;
  raw?: string;
  error?: string;
};

export default function CwaPage() {
  const [data, setData] = useState<CwaWeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 新增爬蟲 API 狀態
  const [crawler, setCrawler] = useState<CrawlerResponse | null>(null);
  const [crawlerLoading, setCrawlerLoading] = useState(true);
  const [crawlerError, setCrawlerError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cwa-weather")
      .then((res) => res.json())
      .then((json: CwaWeatherResponse) => {
        setData(json);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.toString());
        setLoading(false);
      });
    // 取得爬蟲 API
    fetch("/api/cwa-crawler")
      .then((res) => res.json())
      .then((json: CrawlerResponse) => {
        setCrawler(json);
        setCrawlerLoading(false);
      })
      .catch((e) => {
        setCrawlerError(e.toString());
        setCrawlerLoading(false);
      });
  }, []);


  // 先顯示爬蟲區塊
  const renderCrawler = () => {
    if (crawlerLoading) return <div>中央氣象局 24hr 觀測（爬蟲）：載入中...</div>;
    if (crawlerError) return <div>中央氣象局 24hr 觀測（爬蟲）錯誤: {crawlerError}</div>;
    if (!crawler?.success || !crawler.data) return <div>中央氣象局 24hr 觀測（爬蟲）API 回傳失敗</div>;
    return (
      <div style={{ overflowX: "auto", marginBottom: 32 }}>
        <h2 style={{ margin: "16px 0 8px 0" }}>中央氣象局 24hr 單一測站數據</h2>
        <table style={{ borderCollapse: "collapse", minWidth: 900, border: "1px solid #ccc" }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>時間</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>溫度(°C)</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>天氣</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>風向</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>風速(m/s)</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>能見度(km)</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>濕度(%)</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>氣壓(hPa)</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>雨量(mm)</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>日照(h)</th>
            </tr>
          </thead>
          <tbody>
            {crawler.data.map((row, idx) => (
              <tr key={row.time + idx}>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>{row.time}</td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>{row.temp}</td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>{row.weather}</td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>{row.wind}</td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>{row.windSpeed}</td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>{row.visibility}</td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>{row.humidity}</td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>{row.pressure}</td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>{row.rain}</td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>{row.sunlight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) return <div>載入中...</div>;
  if (error) return <div>錯誤: {error}</div>;
  if (!data?.success) return <div>API 回傳失敗</div>;

  return (
    <div style={{ padding: 24 }}>
      {renderCrawler()}
      <h1>中央氣象署觀測站資料</h1>
      {Array.isArray(data.stations) && data.stations.length > 0 ? (
        <div style={{ overflowX: "auto", marginBottom: 32 }}>
          <table
            style={{
              borderCollapse: "collapse",
              minWidth: 900,
              border: "1px solid #ccc",
            }}
          >
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>日期</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>時間</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>站名</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>天氣</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>溫度(°C)</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>濕度(%)</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>雨量(mm)</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>風速(m/s)</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>氣壓(hPa)</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>日照(h)</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>緯度</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>經度</th>
              </tr>
            </thead>
            <tbody>
              {data.stations.map((s) => (
                <tr key={`${s.name}-${s.time}`}>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.date}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.time}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.name}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.weather}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.temperature}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.humidity}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.rain}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.wind_ms}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.pressure}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.sunshine}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>
                    {s.latitude !== undefined && s.latitude !== null ? s.latitude : ""}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>
                    {s.longitude !== undefined && s.longitude !== null ? s.longitude : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>無觀測站資料</div>
      )}

      {data.raw && (
        <>
          <h2 style={{ marginTop: 32 }}>中央氣象署 JS 原始內容</h2>
          <pre
            style={{
              background: "#f5f5f5",
              padding: 12,
              borderRadius: 6,
              overflowX: "auto",
              maxHeight: 600,
            }}
          >
            {data.raw}
          </pre>
        </>
      )}
    </div>
  );
}
