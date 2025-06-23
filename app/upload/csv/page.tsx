'use client'

import { useState } from 'react'

export default function CsvUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    station_name: '',
    upload_date: '',
  })

  const handleUpload = async () => {
    if (!file) return alert('請選擇 CSV 檔案')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('station_name', form.station_name)
    formData.append('upload_date', form.upload_date)

    const res = await fetch('/api/upload-csv', {
      method: 'POST',
      body: formData,
    })

    const result = await res.json()
    if (res.ok) alert('✅ 上傳成功！')
    else alert(`❌ 錯誤：${result.error}`)
  }

  return (
    <main style={{ padding: '1rem' }}>
      <h2>CSV 上傳</h2>
      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <input placeholder="測站名稱" value={form.station_name} onChange={(e) => setForm(f => ({ ...f, station_name: e.target.value }))} />
      <input type="date" placeholder="上傳日期" value={form.upload_date} onChange={(e) => setForm(f => ({ ...f, upload_date: e.target.value }))} />
      <button onClick={handleUpload}>上傳</button>
    </main>
  )
}
