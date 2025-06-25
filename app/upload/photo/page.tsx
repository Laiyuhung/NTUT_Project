'use client'

import { useEffect, useState } from 'react'

// 測站型別
type Station = {
  station_name: string
  latitude: number
  longitude: number
}

export default function PhotoUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    taken_at: '',
    latitude: '',
    longitude: '',
    nearest_station: '',
  })
  const [nearestStationDistance, setNearestStationDistance] = useState<number | null>(null)
  const [nearestFiveStations, setNearestFiveStations] = useState<{station: Station, distance: number}[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [locating, setLocating] = useState(false)
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto')

  useEffect(() => {
    const utc = new Date()
    utc.setHours(utc.getHours() + 8) // 加上台灣時區偏移
    const taipeiTime = utc.toISOString().slice(0, 16)
    setForm(f => ({ ...f, taken_at: taipeiTime }))
  }, [])

  useEffect(() => {
    fetch('/api/station-list')
      .then(res => res.json())
      .then(data => setStations(data))
      .catch(err => console.error('載入測站清單失敗：', err))
  }, [])

  const handleUpload = async () => {
    if (!file) return alert('請選擇圖片')

    const formData = new FormData()
    Object.entries(form).forEach(([key, val]) => formData.append(key, val))
    formData.append('file', file)

    const res = await fetch('/api/upload-photo', {
      method: 'POST',
      body: formData,
    })

    const result = await res.json()
    if (res.ok) alert('✅ 上傳成功！')
    else alert(`❌ 錯誤：${result.error}`)
  }

  const handleGetLocation = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords

        if (!isInTaipeiRegion(latitude, longitude)) {
          alert('📍 定位點不在雙北地區，請手動選擇測站')
          setActiveTab('manual')
          setLocating(false)
          return
        }

        const nearest = findNearestStation(latitude, longitude)

        setForm(f => ({
          ...f,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          nearest_station: nearest,
        }))
        setLocating(false)
      },      (err) => {
        alert(`❌ 取得定位失敗：${err.message}`)
        setActiveTab('manual')
        setLocating(false)
      }
    )
  }

  const findNearestStation = (lat: number, lng: number): string => {
    if (stations.length === 0) return ''
    
    // 計算所有測站的距離
    const stationsWithDistance = stations.map(station => ({
      station,
      distance: calculateDistance(lat, lng, station.latitude, station.longitude)
    }))
    
    // 依距離排序
    stationsWithDistance.sort((a, b) => a.distance - b.distance)
    
    // 設定最近的測站
    const nearest = stationsWithDistance[0]
    setNearestStationDistance(nearest.distance)
    
    // 設定最近的5個測站
    setNearestFiveStations(stationsWithDistance.slice(0, 5))
    
    return nearest.station.station_name
  }

  // 計算兩點間距離（公里）
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // 地球半徑（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const isInTaipeiRegion = (lat: number, lng: number): boolean => {
    return lat >= 24.8 && lat <= 25.3 && lng >= 121.3 && lng <= 122.0
  }
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl flex gap-6">
        {/* 左側主要表單 */}
        <div className="flex-1 max-w-2xl bg-white rounded-xl shadow-md p-6 space-y-4">
          <h2 className="text-2xl font-bold text-center">照片上傳</h2>

          <div className="flex border-b mb-4">
            <button onClick={() => setActiveTab('auto')} className={`flex-1 py-2 font-medium ${activeTab === 'auto' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>自動取得</button>
            <button onClick={() => setActiveTab('manual')} className={`flex-1 py-2 font-medium ${activeTab === 'manual' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>手動登錄</button>
          </div>

          {activeTab === 'auto' && (
            <>
              <button
                onClick={handleGetLocation}
                disabled={locating}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded"
              >
                {locating ? '取得定位中...' : '📍 自動取得定位與測站'}
              </button>
              <div className="overflow-x-auto">
                <div className="min-w-[600px] flex space-x-2">
                  <div className="flex-1 min-w-[180px]">
                    <label className="block font-medium mb-1">緯度</label>
                    <input
                      value={form.latitude}
                      onChange={(e) => setForm(f => ({ ...f, latitude: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="block font-medium mb-1">經度</label>
                    <input
                      value={form.longitude}
                      onChange={(e) => setForm(f => ({ ...f, longitude: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="block font-medium mb-1">鄰近測站</label>
                    <div className="px-3 py-2 border rounded bg-gray-100 text-gray-800">
                      {form.nearest_station ? (
                        <div>
                          <div className="font-medium">{form.nearest_station}</div>
                          {nearestStationDistance && (
                            <div className="text-sm text-gray-600">
                              距離: {nearestStationDistance.toFixed(2)} 公里
                            </div>
                          )}
                        </div>
                      ) : (
                        '（尚未定位）'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'manual' && (
            <div>
              <label className="block font-medium mb-1">選擇測站</label>
              <select
                value={form.nearest_station}
                onChange={(e) => setForm(f => ({ ...f, nearest_station: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">請選擇測站</option>
                {stations.map(s => (
                  <option key={s.station_name} value={s.station_name}>{s.station_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-medium mb-1">拍攝時間</label>
            <input
              type="datetime-local"
              value={form.taken_at}
              onChange={(e) => setForm(f => ({ ...f, taken_at: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">選擇照片</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <button
            onClick={handleUpload}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded"
          >
            上傳
          </button>
        </div>

        {/* 右側最近5個測站 */}
        <div className="w-80 bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold mb-4 text-center">最近測站</h3>
          {nearestFiveStations.length > 0 ? (
            <div className="space-y-3">
              {nearestFiveStations.map((item, index) => (
                <div
                  key={item.station.station_name}
                  className={`p-3 rounded-lg border ${
                    index === 0 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-medium ${index === 0 ? 'text-blue-800' : 'text-gray-800'}`}>
                        {index === 0 && '🏆 '}{item.station.station_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        距離: {item.distance.toFixed(2)} 公里
                      </div>
                      <div className="text-xs text-gray-500">
                        ({item.station.latitude.toFixed(4)}, {item.station.longitude.toFixed(4)})
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${
                      index === 0 ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      #{index + 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">📍</div>
              <div>尚未定位</div>
              <div className="text-sm">請先使用自動取得定位功能</div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
