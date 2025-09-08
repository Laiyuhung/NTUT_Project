'use client'

import { useState } from 'react'

export default function CsvUploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)
  const [progress, setProgress] = useState(0) // 百分比
  type UploadResult = { file: string; success?: boolean; error?: string; filePath?: string }
  const [results, setResults] = useState<UploadResult[]>([])

  // 解析檔名: 466920-2025-09-05.csv 或 466920-2025-09-05 (1).csv
  function parseFileName(name: string): { station_code: string; upload_date: string } | null {
    // 支援 466920-2025-09-05.csv 或 466920-2025-09-05 (1).csv
    const match = name.match(/^(\d+)-(\d{4}-\d{2}-\d{2})(?: \(\d+\))?\.csv$/)
    if (!match) return null
    return { station_code: match[1], upload_date: match[2] }
  }

  const handleUpload = async () => {
    if (!files.length) return alert('請選擇 CSV 檔案')
    if (uploading) return
    setUploading(true)
    setResults([])
    setUploadedCount(0)
    setProgress(0)
    const total = files.length
    const tempResults: UploadResult[] = []
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData()
      formData.append('file', files[i])
      try {
        const res = await fetch('/api/upload-csv', {
          method: 'POST',
          body: formData,
        })
        const result = await res.json()
        if (res.ok) {
          tempResults.push(...(result.results || [{ file: files[i].name, success: true }]))
        } else {
          tempResults.push({ file: files[i].name, success: false, error: result.error })
        }
      } catch {
        tempResults.push({ file: files[i].name, success: false, error: '上傳失敗' })
      }
      setUploadedCount(i + 1)
      setProgress(Math.round(((i + 1) / total) * 100))
      setResults([...tempResults])
    }
    setUploading(false)
    alert('✅ 上傳完成！')
    setFiles([])
  }

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">CSV 多檔案上傳</h2>
        <div>
          <label className="block font-medium mb-1">選擇檔案（檔名格式: 466920-2025-09-05.csv）</label>
          <input
            type="file"
            accept=".csv"
            multiple
            onChange={e => setFiles(e.target.files ? Array.from(e.target.files) : [])}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        {files.length > 0 && (
          <div className="text-sm text-gray-700">
            <div className="font-semibold mb-1">檔案預覽：</div>
            <ul className="list-disc pl-5">
              {files.map(f => {
                const parsed = parseFileName(f.name)
                return (
                  <li key={f.name} className={parsed ? '' : 'text-red-500'}>
                    {f.name} {parsed ? `→ 測站碼: ${parsed.station_code}, 日期: ${parsed.upload_date}` : '（檔名格式錯誤）'}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        <button
          onClick={handleUpload}
          disabled={uploading || !files.length}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 rounded"
        >
          {uploading ? '上傳中...' : '上傳'}
        </button>
        {uploading && files.length > 0 && (
          <div className="w-full text-center mt-2">
            <span className="font-medium">{uploadedCount}/{files.length} 已上傳</span>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-sm text-gray-600">{progress}%</span>
          </div>
        )}
        {results.length > 0 && (
          <div className="mt-4">
            <div className="font-semibold mb-1">上傳結果：</div>
            <ul className="list-disc pl-5">
              {results.map((r, i) => (
                <li key={i} className={r.success ? 'text-green-600' : 'text-red-500'}>
                  {r.file}: {r.success ? '成功' : r.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
