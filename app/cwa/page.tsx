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
  // 雲型辨識 hooks
  const [modelList, setModelList] = useState<{ name: string; url?: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cloudResult, setCloudResult] = useState<{
    success: boolean;
    photo_name: string;
    model_used: string;
    prediction: {
      main_cloud: string;
      confidence: number;
      brightness: number;
      detection_count: number;
      status: string;
    };
    csv_content: string;
    timestamp: string;
  } | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // 處理照片選擇
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  // 取得模型清單
  useEffect(() => {
    fetch("/api/models/list-models-directory")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.files)) {
          setModelList(json.files);
        } else if (Array.isArray(json.models)) {
          setModelList(json.models.map((name: string) => ({ name })));
        }
      })
      .catch(() => setModelList([]));
  }, []);

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

  // 上傳表單送出
  const handleCloudSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloudResult(null);
    setCloudError(null);
    if (!selectedModel || !photoFile) {
      setCloudError('請選擇模型與一張照片');
      return;
    }
    setCloudLoading(true);
    const formData = new FormData();
    formData.append('modelName', selectedModel);
    formData.append('photo', photoFile);
    try {
      const res = await fetch('/api/analysis/cloud-identification', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '辨識失敗');
      setCloudResult(json);
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

  // 下載 CSV 結果
  const downloadCSV = () => {
    if (!cloudResult?.csv_content) return;
    
    const blob = new Blob([cloudResult.csv_content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cloud_identification_${cloudResult.timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: 24 }}>
      {renderCrawler()}

      <hr style={{ margin: '32px 0' }} />
      <h2>雲型辨識（選擇模型與上傳照片）</h2>
      
      {/* 雲型說明 */}
      <details style={{ marginBottom: 20, padding: 12, border: '1px solid #ddd', borderRadius: 4 }}>
        <summary style={{ fontWeight: 'bold', cursor: 'pointer' }}>📚 雲型分類說明（點擊展開/收起）</summary>
        <div style={{ marginTop: 12, fontSize: '0.9em' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div><strong>Ci (卷雲):</strong> 高層薄雲，纖維狀</div>
            <div><strong>Cc (卷積雲):</strong> 高層小塊狀白雲</div>
            <div><strong>Cs (卷層雲):</strong> 高層薄層狀雲</div>
            <div><strong>Ac (高積雲):</strong> 中層塊狀雲</div>
            <div><strong>As (高層雲):</strong> 中層灰色層雲</div>
            <div><strong>Ns (雨層雲):</strong> 低層厚暗雲，常伴雨</div>
            <div><strong>Cu (積雲):</strong> 低層塊狀白雲</div>
            <div><strong>Cb (積雨雲):</strong> 垂直發展雲，雷雨雲</div>
            <div><strong>Sc (層積雲):</strong> 低層片狀塊雲</div>
            <div><strong>St (層雲):</strong> 低層灰色均勻層雲</div>
          </div>
        </div>
      </details>
      <form onSubmit={handleCloudSubmit} style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <label>選擇模型：
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={{ marginLeft: 8, padding: 4 }}>
              <option value="" disabled>請選擇模型</option>
              {modelList.map(m => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>選擇照片（單張）：
            <input 
              type="file" 
              accept="image/*" 
              onChange={handlePhotoChange}
              style={{ marginLeft: 8 }}
            />
          </label>
          {photoPreview && (
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: '4px 0', fontWeight: 'bold' }}>照片預覽：</p>
              <img 
                src={photoPreview} 
                alt="預覽" 
                style={{ 
                  maxWidth: '300px', 
                  maxHeight: '200px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  objectFit: 'contain'
                }} 
              />
              <p style={{ margin: '4px 0', fontSize: '0.9em', color: '#666' }}>
                檔案名稱: {photoFile?.name}
              </p>
            </div>
          )}
        </div>
        <button type="submit" disabled={cloudLoading} style={{ padding: '6px 18px' }}>
          {cloudLoading ? '辨識中...' : '開始辨識'}
        </button>
      </form>
      {cloudError && <div style={{ color: 'red', marginBottom: 12 }}>錯誤：{cloudError}</div>}
      {cloudResult && (
        <div style={{ marginTop: 20 }}>
          <h3>雲型辨識結果</h3>
          <div style={{ background: '#f8f8f8', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', alignItems: 'center' }}>
              <strong>照片名稱:</strong>
              <span>{cloudResult.photo_name}</span>
              
              <strong>使用模型:</strong>
              <span>{cloudResult.model_used}</span>
              
              <strong>預測雲型:</strong>
              <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#0066cc' }}>
                {cloudResult.prediction?.main_cloud}
              </span>
              
              <strong>信心度:</strong>
              <span>{cloudResult.prediction?.confidence}</span>
              
              <strong>影像亮度:</strong>
              <span>{cloudResult.prediction?.brightness}</span>
              
              <strong>偵測數量:</strong>
              <span>{cloudResult.prediction?.detection_count}</span>
              
              <strong>辨識狀態:</strong>
              <span style={{ color: cloudResult.prediction?.status === '成功' ? 'green' : 'red' }}>
                {cloudResult.prediction?.status}
              </span>
            </div>
          </div>
          
          <h4>CSV 格式結果</h4>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: 8 }}>
            <button 
              onClick={downloadCSV}
              style={{ 
                padding: '6px 12px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              📥 下載 CSV 結果
            </button>
            <small style={{ color: '#666' }}>
              檔名: cloud_identification_{cloudResult.timestamp}.csv
            </small>
          </div>
          <pre style={{ 
            background: '#f0f0f0', 
            padding: 12, 
            borderRadius: 4, 
            maxWidth: '100%', 
            overflowX: 'auto',
            fontSize: '12px',
            border: '1px solid #ddd'
          }}>
            {cloudResult.csv_content}
          </pre>
        </div>
      )}
    </div>
  );
}
