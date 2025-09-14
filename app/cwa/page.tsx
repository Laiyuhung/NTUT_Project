"use client";
import { useEffect, useState } from "react";

type CwaWeatherResponse = {
  jsText: string;
  stations?: unknown[];
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
                {data.stations && Object.keys(data.stations[0] ?? {}).map((key) => (
                  <th key={key} style={{ border: '1px solid #ccc', padding: 4, background: '#f0f0f0' }}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.stations && data.stations.map((row, i) => {
                const r = row as Record<string, unknown>;
                return (
                  <tr key={i}>
                    {Object.keys(data.stations?.[0] ?? {}).map((key) => (
                      <td key={key} style={{ border: '1px solid #ccc', padding: 4, fontSize: 13 }}>
                        {typeof r[key] === 'object' && r[key] !== null
                          ? JSON.stringify(r[key])
                          : String(r[key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div>無觀測站資料</div>
      )}
      <h2 style={{ marginTop: 32 }}>中央氣象署 JS 原始內容</h2>
      <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, overflowX: 'auto', maxHeight: 600 }}>
        {data.jsText}
      </pre>
    </div>
  );
}
