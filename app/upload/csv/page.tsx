'use client'

import { useEffect, useState } from 'react'

export default function CsvUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [stations, setStations] = useState<string[]>([])
  const [form, setForm] = useState({
    station_name: '',
    upload_date: '',
  })

  // 🟦 取得站名列表
  useEffect(() => {
    fetch('/api/station-list')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStations(data.map((s) => s.station_name))
        }
      })
  }, [])
  const handleUpload = async () => {
    if (!file) return alert('請選擇 CSV 檔案')
    if (uploading) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('station_name', form.station_name)
      formData.append('upload_date', form.upload_date)

      const res = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()
      if (res.ok) {
        alert('✅ 上傳成功！')
        // 清除表格數據
        setFile(null)
        setForm({
          station_name: '',
          upload_date: '',
        })
      } else {
        alert(`❌ 錯誤：${result.error}`)
      }
    } catch (error) {
      alert('❌ 上傳失敗，請稍後再試')
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">CSV 上傳</h2>

        <div>
          <label className="block font-medium mb-1">選擇檔案</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">測站名稱</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={form.station_name}
            onChange={(e) => setForm(f => ({ ...f, station_name: e.target.value }))}
          >
            <option value="">請選擇測站</option>
            {stations.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">上傳日期</label>
          <input
            type="date"
            value={form.upload_date}
            onChange={(e) => setForm(f => ({ ...f, upload_date: e.target.value }))}
            className="w-full border rounded px-3 py-2"
          />
        </div>        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 rounded"
        >
          {uploading ? '上傳中...' : '上傳'}
        </button>
      </div>
    </main>
  )
}
