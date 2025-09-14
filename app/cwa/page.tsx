"use client";
import { useEffect, useState } from "react";

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

type CwaWeatherResponse = {
  stations: Station[];
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
      <h1>雙北市各觀測站即時天氣</h1>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>站名</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>時間</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>天氣</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>溫度(°C)</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>濕度(%)</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>雨量(mm)</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>風向</th>
            </tr>
          </thead>
          <tbody>
            {data.stations.map((s, i) => (
              <tr key={i}>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>{typeof s.StationName === 'object' ? s.StationName.C : ''}</td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>{s.Date} {s.Time}</td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>{typeof s.Weather === 'object' ? s.Weather.C : ''}</td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>{typeof s.Temperature === 'object' ? s.Temperature.C.C : ''}</td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>{typeof s.Humidity === 'object' ? s.Humidity.C : ''}</td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>{typeof s.Rain === 'object' ? s.Rain.C : ''}</td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>{typeof s.WindDir === 'object' ? s.WindDir.C : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
