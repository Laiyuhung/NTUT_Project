"use client";
import { useEffect, useState } from "react";
type StationOption = {
  station_name: string;
  StationID: string;
  latitude?: number | null;
  longitude?: number | null;
};
type CrawlerRow = {
  date: string;
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
  // 站名選單 hooks
  const [stationOptions, setStationOptions] = useState<StationOption[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [stationLoading, setStationLoading] = useState(true);
  const [stationError, setStationError] = useState<string | null>(null);
  // 目前經緯度
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

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

    // 取得站名選單
    fetch("/api/models/list-stations")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setStationOptions(json.data);
        } else {
          setStationError("無法取得站名清單");
        }
        setStationLoading(false);
      })
      .catch((e) => {
        setStationError(e.toString());
        setStationLoading(false);
      });

    // 取得目前經緯度
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLat(pos.coords.latitude);
          setCurrentLng(pos.coords.longitude);
        },
        (err) => {
          setGeoError("無法取得定位: " + err.message);
        }
      );
    } else {
      setGeoError("瀏覽器不支援定位功能");
    }
  }, []);

  // 當經緯度與站名選單都取得後，自動選最近測站
  useEffect(() => {
    if (
      currentLat !== null &&
      currentLng !== null &&
      stationOptions.length > 0 &&
      !selectedStation // 只在未手動選擇時自動選
    ) {
      // 計算最近測站
      let minDist = Infinity;
      let nearestStation = "";
      for (const s of stationOptions) {
        if (typeof s.latitude === "number" && typeof s.longitude === "number") {
          const d = Math.sqrt(
            Math.pow(currentLat - s.latitude, 2) + Math.pow(currentLng - s.longitude, 2)
          );
          if (d < minDist) {
            minDist = d;
            nearestStation = s.station_name;
          }
        }
      }
      if (nearestStation) setSelectedStation(nearestStation);
    }
  }, [currentLat, currentLng, stationOptions]);

  // 監聽站名選擇，重新抓取爬蟲資料
  useEffect(() => {
    if (!selectedStation) {
      setCrawler(null);
      setCrawlerLoading(false);
      return;
    }
    setCrawlerLoading(true);
    setCrawlerError(null);
    fetch(`/api/cwa-crawler?station_name=${encodeURIComponent(selectedStation)}`)
      .then((res) => res.json())
      .then((json: CrawlerResponse) => {
        setCrawler(json);
        setCrawlerLoading(false);
      })
      .catch((e) => {
        setCrawlerError(e.toString());
        setCrawlerLoading(false);
      });
  }, [selectedStation]);


  // 先顯示爬蟲區塊，含站名選單
  const renderCrawler = () => {
    return (
      <div style={{ overflowX: "auto", marginBottom: 32 }}>
        <h2 style={{ margin: "16px 0 8px 0" }}>中央氣象局 24hr 單一測站數據</h2>
        {/* 站名下拉選單 */}
        {stationLoading ? (
          <div>載入站名選單中...</div>
        ) : stationError ? (
          <div>站名選單錯誤: {stationError}</div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <label>
              選擇測站：
              <select
                value={selectedStation}
                onChange={e => setSelectedStation(e.target.value)}
                style={{ marginLeft: 8, padding: 4 }}
              >
                <option value="" disabled>
                  請選擇
                </option>
                {stationOptions.map(opt => (
                  <option key={opt.station_name} value={opt.station_name}>
                    {opt.station_name}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ marginTop: 8, color: '#555' }}>
              {geoError
                ? geoError
                : currentLat !== null && currentLng !== null
                ? `目前經緯度：${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`
                : '定位中...'}
            </div>
          </div>
        )}
        {/* 資料表格 */}
        {!selectedStation ? (
          <div>請先選擇測站</div>
        ) : crawlerLoading ? (
          <div>單一測站數據 載入中...</div>
        ) : crawlerError ? (
          <div>單一測站數據 錯誤: {crawlerError}</div>
        ) : !crawler?.success || !crawler.data ? (
          <div>單一測站數據 API 回傳失敗</div>
        ) : (
          <table style={{ borderCollapse: "collapse", minWidth: 900, border: "1px solid #ccc" }}>
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>日期</th>
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
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{row.date}</td>
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
        )}
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
          <table border={1}>
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>站名</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>時間</th>
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
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.name}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.date} {s.time}</td>
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

      {/* 若要 debug raw 內容，請用 JSON.stringify 包裝，避免直接渲染物件 */}
      {data.raw && (
        <details>
          <summary>原始 JS 內容</summary>
          <pre>{JSON.stringify(data.raw, null, 2)}</pre>
        </details>
      )}

      {/* {data.raw && (
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
      )} */}
    </div>
  );
}
