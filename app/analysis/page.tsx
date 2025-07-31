'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// 定義照片與氣象數據結合的類型
type WeatherPhotoData = {
  photo_id: string;
  photo_url: string;
  timestamp: string;
  station_id: string;
  station_name: string;
  latitude: number;
  longitude: number;
  temperature?: number;
  humidity?: number;
  rainfall?: number;
  wind_speed?: number;
  cloud_type?: string;
  confidence?: number;
  cloud_type_distribution?: Record<string, number>;
};

// 定義雲型
const cloudTypes = [
  { id: 'Cu', name: '積雲', description: '低空雲，像棉花糖一樣蓬鬆' },
  { id: 'Ci', name: '卷雲', description: '高空雲，像羽毛一樣輕薄' },
  { id: 'St', name: '層雲', description: '低空雲，灰色均勻的雲層' },
  { id: 'As', name: '高層雲', description: '中高空雲，灰白色雲蓋' },
  { id: 'Ns', name: '雨層雲', description: '低空雲，灰色雲層伴隨持續降雨' },
  { id: 'Sc', name: '層積雲', description: '低空雲，灰白色或灰色的雲塊' },
  { id: 'Cb', name: '積雨雲', description: '垂直發展雲，常伴隨雷暴' },
  { id: 'Ac', name: '高積雲', description: '中空雲，白色或灰色雲團' },
];

export default function AnalysisPage() {
  const [data, setData] = useState<WeatherPhotoData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<WeatherPhotoData | null>(null);
  const [filteredData, setFilteredData] = useState<WeatherPhotoData[]>([]);
  const [filters, setFilters] = useState({
    station: '',
    cloudType: '',
    dateRange: { start: '', end: '' }
  });
  const [stations, setStations] = useState<{id: string, name: string}[]>([]);

  // 獲取照片與氣象數據
  const fetchPhotoData = async () => {
    try {
      setLoading(true);
      
      // 獲取照片資料
      const photoResponse = await fetch('/api/photos');
      if (!photoResponse.ok) throw new Error('無法獲取照片資料');
      
      const photoData = await photoResponse.json();
      
      // 模擬雲型識別結果 (實際情況下應該從另一個 API 獲取)
      const enhancedData: WeatherPhotoData[] = photoData.map((photo: Partial<WeatherPhotoData>) => {
        // 隨機產生一個雲型和信心分數
        const cloudTypeIndex = Math.floor(Math.random() * cloudTypes.length);
        const cloudType = cloudTypes[cloudTypeIndex].id;
        const confidence = (0.7 + Math.random() * 0.3).toFixed(2);
        
        // 模擬雲型分佈
        const distribution: Record<string, number> = {};
        let remainingProb = 1.0;
        
        cloudTypes.forEach((type, idx) => {
          if (idx === cloudTypeIndex) {
            distribution[type.id] = parseFloat(confidence);
            remainingProb -= parseFloat(confidence);
          } else {
            const randomProb = Math.random() * remainingProb * 0.5;
            distribution[type.id] = parseFloat(randomProb.toFixed(2));
            remainingProb -= randomProb;
          }
        });
        
        return {
          ...photo,
          cloud_type: cloudType,
          confidence: parseFloat(confidence),
          cloud_type_distribution: distribution
        };
      });
      
      setData(enhancedData);
      setFilteredData(enhancedData);
      
      // 提取唯一測站列表
      const uniqueStations = Array.from(new Set(
        enhancedData.map(item => item.station_id)
      )).map(stationId => {
        const station = enhancedData.find(item => item.station_id === stationId);
        return {
          id: stationId as string,
          name: station?.station_name || stationId as string
        };
      });
      
      setStations(uniqueStations);
      
    } catch (err) {
      console.error('獲取資料失敗:', err);
      setError(`獲取資料失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  };

  // 處理過濾器變更
  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // 處理日期範圍變更
  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [type]: value
      }
    }));
  };

  // 應用過濾器
  const applyFilters = () => {
    let filtered = [...data];
    
    // 按測站過濾
    if (filters.station) {
      filtered = filtered.filter(item => item.station_id === filters.station);
    }
    
    // 按雲型過濾
    if (filters.cloudType) {
      filtered = filtered.filter(item => item.cloud_type === filters.cloudType);
    }
    
    // 按日期範圍過濾
    if (filters.dateRange.start) {
      filtered = filtered.filter(item => 
        new Date(item.timestamp) >= new Date(filters.dateRange.start)
      );
    }
    
    if (filters.dateRange.end) {
      filtered = filtered.filter(item => 
        new Date(item.timestamp) <= new Date(filters.dateRange.end)
      );
    }
    
    setFilteredData(filtered);
  };

  // 重設過濾器
  const resetFilters = () => {
    setFilters({
      station: '',
      cloudType: '',
      dateRange: { start: '', end: '' }
    });
    setFilteredData(data);
  };

  // 選擇照片進行詳細查看
  const selectPhoto = (photo: WeatherPhotoData) => {
    setSelectedPhoto(photo);
  };
  
  // 獲取測站數據的進度指標
  const getWeatherParameter = (param: string, value?: number) => {
    if (value === undefined) return { width: '0%', color: 'bg-gray-300', text: '無數據' };
    
    let width = '0%';
    let color = 'bg-gray-300';
    let text = `${value}`;
    
    switch(param) {
      case 'temperature':
        width = `${Math.min(100, Math.max(0, (value + 10) / 40 * 100))}%`;
        if (value < 15) color = 'bg-blue-500';
        else if (value < 25) color = 'bg-green-500';
        else color = 'bg-red-500';
        text = `${value}°C`;
        break;
      case 'humidity':
        width = `${value}%`;
        if (value < 30) color = 'bg-yellow-500';
        else if (value < 70) color = 'bg-green-500';
        else color = 'bg-blue-500';
        text = `${value}%`;
        break;
      case 'rainfall':
        width = `${Math.min(100, value * 10)}%`;
        if (value === 0) color = 'bg-gray-300';
        else if (value < 1) color = 'bg-blue-300';
        else if (value < 10) color = 'bg-blue-500';
        else color = 'bg-blue-700';
        text = `${value} mm`;
        break;
      case 'wind_speed':
        width = `${Math.min(100, value * 10)}%`;
        if (value < 2) color = 'bg-gray-300';
        else if (value < 5) color = 'bg-green-500';
        else if (value < 10) color = 'bg-yellow-500';
        else color = 'bg-red-500';
        text = `${value} m/s`;
        break;
    }
    
    return { width, color, text };
  };
  
  // 在組件載入時獲取數據
  useEffect(() => {
    fetchPhotoData();
  }, []);
  
  // 當過濾器改變時應用過濾
  useEffect(() => {
    applyFilters();
  }, [filters]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">雲型辨識與氣象數據分析</h1>
      
      {/* 錯誤提示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* 資料加載中提示 */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>載入資料中...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：過濾面板 */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">過濾條件</h2>
              
              <div className="space-y-4">
                {/* 測站選擇 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    測站
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={filters.station}
                    onChange={(e) => handleFilterChange('station', e.target.value)}
                  >
                    <option value="">所有測站</option>
                    {stations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* 雲型選擇 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    雲型
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={filters.cloudType}
                    onChange={(e) => handleFilterChange('cloudType', e.target.value)}
                  >
                    <option value="">所有雲型</option>
                    {cloudTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} ({type.id})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* 日期範圍 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    日期範圍
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input 
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={filters.dateRange.start}
                        onChange={(e) => handleDateRangeChange('start', e.target.value)}
                      />
                    </div>
                    <div>
                      <input 
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={filters.dateRange.end}
                        onChange={(e) => handleDateRangeChange('end', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                {/* 按鈕組 */}
                <div className="flex space-x-3 pt-2">
                  <button 
                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={applyFilters}
                  >
                    套用過濾
                  </button>
                  
                  <button 
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    onClick={resetFilters}
                  >
                    重設
                  </button>
                </div>
              </div>
              
              {/* 資料統計信息 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium mb-2">數據統計</h3>
                <div className="text-sm space-y-1">
                  <p>資料總數: <span className="font-medium">{data.length}</span> 筆</p>
                  <p>符合條件: <span className="font-medium">{filteredData.length}</span> 筆</p>
                  <p>測站數量: <span className="font-medium">{stations.length}</span> 個</p>
                </div>
              </div>
              
              {/* 說明文件連結 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium mb-2">說明文件</h3>
                <ul className="text-sm space-y-2">
                  <li>
                    <Link href="#" className="text-blue-600 hover:text-blue-800">
                      雲型辨識指南
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-blue-600 hover:text-blue-800">
                      氣象數據解讀
                    </Link>
                  </li>
                  <li>
                    <a 
                      href="https://codis.cwa.gov.tw/StationData" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      中央氣象署測站資料
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* 中間：照片列表 */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-lg rounded-lg p-6 h-full overflow-auto" style={{ maxHeight: '80vh' }}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">照片列表</h2>
                <span className="text-sm text-gray-500">
                  {filteredData.length} 筆資料
                </span>
              </div>
              
              {filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>無符合條件的資料</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredData.map((item) => (
                    <div 
                      key={item.photo_id} 
                      className={`relative border rounded-lg overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-105 ${selectedPhoto?.photo_id === item.photo_id ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => selectPhoto(item)}
                    >
                      <div className="relative w-full pb-[75%]"> {/* 4:3 aspect ratio */}
                        <div className="absolute inset-0">
                          {/* 照片 */}
                          <img 
                            src={item.photo_url} 
                            alt={`Cloud photo ${item.timestamp}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // 處理圖片載入失敗，顯示預設圖片
                              (e.target as HTMLImageElement).src = '/file.svg';
                              (e.target as HTMLImageElement).className = 'w-full h-full object-contain p-4 opacity-50';
                            }}
                          />
                          
                          {/* 雲型標籤 */}
                          <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs py-1 px-2 rounded">
                            {item.cloud_type}
                          </div>
                          
                          {/* 降雨標籤 */}
                          {item.rainfall && item.rainfall > 0 && (
                            <div className="absolute top-2 left-2 bg-blue-600 bg-opacity-70 text-white text-xs py-1 px-2 rounded flex items-center space-x-1">
                              <span>☔</span>
                              <span>{item.rainfall} mm</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 底部資訊 */}
                      <div className="p-2 bg-white">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium truncate">
                            {item.station_name || item.station_id}
                          </span>
                          <span className="text-gray-500">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* 右側：詳細資訊 */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">詳細資訊</h2>
              
              {selectedPhoto ? (
                <div>
                  {/* 照片與基本信息 */}
                  <div className="mb-6">
                    <div className="relative w-full pb-[75%] mb-4"> {/* 4:3 aspect ratio */}
                      <img 
                        src={selectedPhoto.photo_url} 
                        alt={`Cloud photo ${selectedPhoto.timestamp}`}
                        className="absolute inset-0 w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/file.svg';
                          (e.target as HTMLImageElement).className = 'absolute inset-0 w-full h-full object-contain p-4 opacity-50';
                        }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                      <div>
                        <span className="text-gray-500">時間:</span>
                        <div className="font-medium">
                          {new Date(selectedPhoto.timestamp).toLocaleString('zh-TW', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">測站:</span>
                        <div className="font-medium">
                          {selectedPhoto.station_name || selectedPhoto.station_id}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">座標:</span>
                        <div className="font-medium">
                          {selectedPhoto.latitude.toFixed(4)}, {selectedPhoto.longitude.toFixed(4)}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">辨識雲型:</span>
                        <div className="font-medium">
                          {selectedPhoto.cloud_type} 
                          <span className="text-xs text-gray-500 ml-1">
                            ({(selectedPhoto.confidence && (selectedPhoto.confidence * 100).toFixed(0) || 0)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 氣象數據 */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">氣象數據</h3>
                    
                    <div className="space-y-3">
                      {/* 溫度 */}
                      <div>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>溫度</span>
                          <span>{getWeatherParameter('temperature', selectedPhoto.temperature).text}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${getWeatherParameter('temperature', selectedPhoto.temperature).color}`}
                            style={{ width: getWeatherParameter('temperature', selectedPhoto.temperature).width }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* 濕度 */}
                      <div>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>濕度</span>
                          <span>{getWeatherParameter('humidity', selectedPhoto.humidity).text}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${getWeatherParameter('humidity', selectedPhoto.humidity).color}`}
                            style={{ width: getWeatherParameter('humidity', selectedPhoto.humidity).width }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* 雨量 */}
                      <div>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>雨量</span>
                          <span>{getWeatherParameter('rainfall', selectedPhoto.rainfall).text}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${getWeatherParameter('rainfall', selectedPhoto.rainfall).color}`}
                            style={{ width: getWeatherParameter('rainfall', selectedPhoto.rainfall).width }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* 風速 */}
                      <div>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>風速</span>
                          <span>{getWeatherParameter('wind_speed', selectedPhoto.wind_speed).text}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${getWeatherParameter('wind_speed', selectedPhoto.wind_speed).color}`}
                            style={{ width: getWeatherParameter('wind_speed', selectedPhoto.wind_speed).width }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 雲型分布 */}
                  <div>
                    <h3 className="text-lg font-medium mb-3">雲型分布</h3>
                    
                    <div className="space-y-2">
                      {selectedPhoto.cloud_type_distribution && 
                        Object.entries(selectedPhoto.cloud_type_distribution)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, probability]) => (
                          <div key={type}>
                            <div className="flex justify-between mb-1 text-sm">
                              <span>
                                {cloudTypes.find(t => t.id === type)?.name || type}
                              </span>
                              <span>{(probability * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div 
                                className={`h-2.5 rounded-full ${type === selectedPhoto.cloud_type ? 'bg-blue-600' : 'bg-blue-300'}`}
                                style={{ width: `${probability * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                    
                    {/* 雲型說明 */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">雲型說明: </span>
                        {cloudTypes.find(t => t.id === selectedPhoto.cloud_type)?.description || '未找到雲型說明'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>請從左側選擇照片查看詳細資訊</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
