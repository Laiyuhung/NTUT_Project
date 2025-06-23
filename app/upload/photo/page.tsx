'use client'

import { useState } from 'react'

export default function PhotoUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    taken_at: '',
    latitude: '',
    longitude: '',
    nearest_station: '',
  })
  const [locating, setLocating] = useState(false)

  const handleUpload = async () => {
    if (!file) return alert('請選擇圖片')

    const formData = new FormData()
    formData.append('file', file)
    Object.entries(form).forEach(([key, val]) => formData.append(key, val))

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
        setForm(f => ({ ...f, latitude: latitude.toString(), longitude: longitude.toString() }))
        setLocating(false)
      },
      (err) => {
        alert(`❌ 取得定位失敗：${err.message}`)
        setLocating(false)
      }
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">照片上傳</h2>

        <div>
          <label className="block font-medium mb-1">選擇照片</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">拍攝時間（ISO 格式）</label>
          <input
            type="datetime-local"
            value={form.taken_at}
            onChange={(e) => setForm(f => ({ ...f, taken_at: e.target.value }))}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="flex space-x-2">
          <div className="flex-1">
            <label className="block font-medium mb-1">緯度</label>
            <input
              value={form.latitude}
              onChange={(e) => setForm(f => ({ ...f, latitude: e.target.value }))}
              className="w-full border rounded px-3 py-2"
              placeholder="ex: 25.034"
            />
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1">經度</label>
            <input
              value={form.longitude}
              onChange={(e) => setForm(f => ({ ...f, longitude: e.target.value }))}
              className="w-full border rounded px-3 py-2"
              placeholder="ex: 121.562"
            />
          </div>
        </div>

        <button
          onClick={handleGetLocation}
          disabled={locating}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded"
        >
          {locating ? '取得定位中...' : '📍 取得目前位置'}
        </button>

        <div>
          <label className="block font-medium mb-1">鄰近測站</label>
          <input
            placeholder="如：臺北"
            value={form.nearest_station}
            onChange={(e) => setForm(f => ({ ...f, nearest_station: e.target.value }))}
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
