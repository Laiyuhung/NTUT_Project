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
  raw: string;
  success: boolean;
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
        <div style={{ overflowX: 'auto', marginBottom: 32 }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                <th>日期</th>
                <th>時間</th>
                <th>站名</th>
                <th>天氣</th>
                <th>溫度(°C)</th>
                <th>濕度(%)</th>
                <th>雨量(mm)</th>
                <th>風速(m/s)</th>
                <th>氣壓(hPa)</th>
                <th>日照(h)</th>
              </tr>
            </thead>
            <tbody>
              {data.stations.map((s, i) => (
                <tr key={i}>
                  <td>{s.date}</td>
                  <td>{s.time}</td>
                  <td>{s.name}</td>
                  <td>{s.weather}</td>
                  <td>{s.temperature}</td>
                  <td>{s.humidity}</td>
                  <td>{s.rain}</td>
                  <td>{s.wind}</td>
                  <td>{s.pressure}</td>
                  <td>{s.sunshine}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>無觀測站資料</div>
      )}
      <h2 style={{ marginTop: 32 }}>中央氣象署 JS 原始內容</h2>
      <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, overflowX: 'auto', maxHeight: 600 }}>
        {data.raw}
      </pre>
    </div>
  );
}
