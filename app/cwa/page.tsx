"use client";
import { useEffect, useState } from "react";

type Station = {
  date: string;
  time: string;
  name: string;
  weather: string;
  temperature: string;
  humidity: string;
  rain: string;
  wind: string;
  pressure: string;
  sunshine: string;
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
  }, []);

  if (loading) return <div>載入中...</div>;
  if (error) return <div>錯誤: {error}</div>;
  if (!data?.success) return <div>API 回傳失敗</div>;

  return (
    <div style={{ padding: 24 }}>
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
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.wind}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.pressure}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.sunshine}</td>
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
