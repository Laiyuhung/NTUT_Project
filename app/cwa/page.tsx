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
  // hooks 必須全部在組件頂部宣告
  const [stationOptions, setStationOptions] = useState<StationOption[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [stationLoading, setStationLoading] = useState(true);
  const [stationError, setStationError] = useState<string | null>(null);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [data, setData] = useState<CwaWeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [crawler, setCrawler] = useState<CrawlerResponse | null>(null);
  const [crawlerLoading, setCrawlerLoading] = useState(true);
  const [crawlerError, setCrawlerError] = useState<string | null>(null);
  // 雲型辨識 hooks（已於組件頂部宣告，這裡移除重複宣告）

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
  }, [currentLat, currentLng, stationOptions, selectedStation]);

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
        <h2 style={{ margin: "16px 0 8px 0" }}>近 1 小時 天氣概況</h2>
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


  // render early return
  if (loading) {
    return <div>載入中...</div>;
  }
  if (error) {
    return <div>錯誤: {error}</div>;
  }
  if (!data?.success) {
    return <div>API 回傳失敗</div>;
  }


  // 雲型辨識 hooks
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [cloudResult, setCloudResult] = useState<string | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // 上傳表單送出
  const handleCloudSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloudResult(null);
    setCloudError(null);
    if (!modelFile || photoFiles.length === 0) {
      setCloudError('請選擇模型檔與至少一張照片');
      return;
    }
    setCloudLoading(true);
    const formData = new FormData();
    formData.append('model', modelFile);
    photoFiles.forEach(f => formData.append('photos', f));
    try {
      const res = await fetch('/api/upload-cloud-identification', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '辨識失敗');
      setCloudResult(json.result || '無辨識結果');
    } catch (err) {
      if (err instanceof Error) {
        setCloudError(err.message || '辨識失敗');
      } else {
        setCloudError('辨識失敗');
      }
    } finally {
      setCloudLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {renderCrawler()}

      <hr style={{ margin: '32px 0' }} />
      <h2>雲型辨識（上傳模型與照片）</h2>
      <form onSubmit={handleCloudSubmit} style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <label>選擇模型檔 (.pt)：
            <input type="file" accept=".pt" onChange={e => setModelFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>選擇照片（可多選）：
            <input type="file" accept="image/*" multiple onChange={e => setPhotoFiles(e.target.files ? Array.from(e.target.files) : [])} />
          </label>
        </div>
        <button type="submit" disabled={cloudLoading} style={{ padding: '6px 18px' }}>
          {cloudLoading ? '辨識中...' : '開始辨識'}
        </button>
      </form>
      {cloudError && <div style={{ color: 'red', marginBottom: 12 }}>錯誤：{cloudError}</div>}
      {cloudResult && (
        <div>
          <h4>辨識結果（CSV 內容）</h4>
          <pre style={{ background: '#f8f8f8', padding: 12, borderRadius: 4, maxWidth: 900, overflowX: 'auto' }}>{cloudResult}</pre>
        </div>
      )}
    </div>
  );
}
