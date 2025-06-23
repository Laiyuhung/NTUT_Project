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
  const [stations, setStations] = useState<Station[]>([])
  const [locating, setLocating] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto')

  useEffect(() => {
    const now = new Date()
    const local = now.toISOString().slice(0, 16)
    setForm(f => ({ ...f, taken_at: local }))
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
          setManualMode(true)
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
        setManualMode(false)
        setLocating(false)
      },
      (err) => {
        alert(`❌ 取得定位失敗：${err.message}`)
        setManualMode(true)
        setActiveTab('manual')
        setLocating(false)
      }
    )
  }

  const findNearestStation = (lat: number, lng: number): string => {
    if (stations.length === 0) return ''
    let nearest = stations[0]
    let minDist = Number.MAX_VALUE
    for (const station of stations) {
      const d = Math.hypot(lat - station.latitude, lng - station.longitude)
      if (d < minDist) {
        minDist = d
        nearest = station
      }
    }
    return nearest.station_name
  }

  const isInTaipeiRegion = (lat: number, lng: number): boolean => {
    return lat >= 24.8 && lat <= 25.3 && lng >= 121.3 && lng <= 122.0
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-md p-6 space-y-4">
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
                    {form.nearest_station || '（尚未定位）'}
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
    </main>
  )
}