'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'

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
  const [tab, setTab] = useState<'auto' | 'manual'>('auto')

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
          alert('📍 定位點不在雙北地區，自動模式已停用')
          setTab('manual')
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
      },
      (err) => {
        alert(`❌ 取得定位失敗：${err.message}`)
        setTab('manual')
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
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">照片上傳</h2>

        <div className="flex space-x-2">
          <button
            onClick={() => setTab('auto')}
            className={clsx(
              'flex-1 py-2 rounded text-white font-semibold',
              tab === 'auto' ? 'bg-blue-600' : 'bg-gray-400'
            )}
          >
            自動偵測
          </button>
          <button
            onClick={() => setTab('manual')}
            className={clsx(
              'flex-1 py-2 rounded text-white font-semibold',
              tab === 'manual' ? 'bg-blue-600' : 'bg-gray-400'
            )}
          >
            手動選擇
          </button>
        </div>

        {tab === 'auto' && (
          <>
            <button
              onClick={handleGetLocation}
              disabled={locating}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded"
            >
              {locating ? '定位中...' : '📍 自動取得定位與測站'}
            </button>
          </>
        )}

        {tab === 'manual' && (
          <>
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
          </>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full border rounded px-3 py-2"
        />

        <input
          type="datetime-local"
          value={form.taken_at}
          onChange={(e) => setForm(f => ({ ...f, taken_at: e.target.value }))}
          className="w-full border rounded px-3 py-2"
        />

        <div className="flex space-x-2">
          <input
            placeholder="緯度"
            value={form.latitude}
            onChange={(e) => setForm(f => ({ ...f, latitude: e.target.value }))}
            className="flex-1 border rounded px-3 py-2"
          />
          <input
            placeholder="經度"
            value={form.longitude}
            onChange={(e) => setForm(f => ({ ...f, longitude: e.target.value }))}
            className="flex-1 border rounded px-3 py-2"
          />
        </div>

        <button
          onClick={handleUpload}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded"
        >
          上傳
        </button>
      </div>
    </main>
  )
}