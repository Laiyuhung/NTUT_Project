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

  return (
    <main style={{ padding: '1rem' }}>
      <h2>照片上傳</h2>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <input placeholder="拍攝時間 (ISO)" value={form.taken_at} onChange={e => setForm(f => ({ ...f, taken_at: e.target.value }))} />
      <input placeholder="緯度" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} />
      <input placeholder="經度" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} />
      <input placeholder="鄰近測站" value={form.nearest_station} onChange={e => setForm(f => ({ ...f, nearest_station: e.target.value }))} />
      <button onClick={handleUpload}>上傳</button>
    </main>
  )
}
