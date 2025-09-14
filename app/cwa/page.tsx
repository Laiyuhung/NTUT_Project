"use client";
import { useEffect, useState } from "react";

type CwaWeatherResponse = {
  countyData: any;
  tableHtml: string | null;
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
      <h1>中央氣象署爬蟲狀態</h1>
      <h2>County Data</h2>
      <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, overflowX: 'auto' }}>
        {JSON.stringify(data.countyData, null, 2)}
      </pre>
      <h2>HTML Table</h2>
      <div dangerouslySetInnerHTML={{ __html: data.tableHtml || '' }} style={{ overflowX: 'auto', background: '#fff', border: '1px solid #eee', borderRadius: 6, padding: 12 }} />
    </div>
  );
}
