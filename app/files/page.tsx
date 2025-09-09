'use client'

import { useEffect, useState } from 'react'

// 型別定義
type PhotoRecord = {
  id: string
  filename: string
  taken_at: string
  latitude: number
  longitude: number
  nearest_station: string
  uploaded_at: string
  file_size: number
  file_url: string
  preview_url?: string
  file_type?: string
}

type CsvRecord = {
  id: string
  filename: string
  station_name: string
  upload_date: string
  uploaded_at: string
  record_count: number
  file_size: number
  file_url: string
}

type Station = {
  station_name: string
  latitude: number
  longitude: number
}

// type BucketFileInfo = {
//   name: string
//   size: number
//   created_at: string
//   updated_at: string
//   public_url: string
//   raw_metadata?: Record<string, unknown>
//   raw_file?: Record<string, unknown>
// }

// type BucketDebugInfo = {
//   bucket: string
//   folder?: string
//   file_count: number
//   files: BucketFileInfo[]
//   raw_response?: Record<string, unknown>
// } | null

export default function FilesViewPage() {  const [activeTab, setActiveTab] = useState<'photos' | 'csv'>('photos')
  const [photos, setPhotos] = useState<PhotoRecord[]>([])
  const [csvFiles, setCsvFiles] = useState<CsvRecord[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // const [debugInfo, setDebugInfo] = useState<BucketDebugInfo>(null)
  
  // 照片篩選
  const [photoFilters, setPhotoFilters] = useState({
    station: '',
    startDate: '',
    endDate: '',
  })
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])
    // CSV篩選
  const [csvFilters, setCsvFilters] = useState({
    station: '',
    startDate: '',
    endDate: '',
  })
  const [selectedCsvs, setSelectedCsvs] = useState<string[]>([])
  const [downloading, setDownloading] = useState(false)
  const [csvDownloading, setCsvDownloading] = useState(false)
   const [csvDownloadProgress, setCsvDownloadProgress] = useState<number | null>(null)
  // 調試：檢查 bucket 檔案
  /* const checkBucketFiles = async () => {
    try {
      const response = await fetch('/api/bucket-files')
      const data = await response.json()
      setDebugInfo(data)
      console.log('Bucket 檔案:', data)
    } catch (error) {
      console.error('檢查 bucket 失敗：', error)
      setError('檢查 bucket 失敗')
    }
  } */

  // 測試下載功能
  /* const testDownload = async () => {
    try {
      console.log('開始測試下載...')
      const response = await fetch('/api/test-download')
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'test.txt'
        a.click()
        window.URL.revokeObjectURL(url)
        console.log('✅ 測試下載成功')
      } else {
        console.error('❌ 測試下載失敗')
      }
    } catch (error) {
      console.error('測試下載錯誤:', error)
    }
  } */

  // 測試 POST API
  /* const testPostAPI = async () => {
    try {
      console.log('開始測試 POST API...')
      const response = await fetch('/api/test-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data', photoIds: ['1', '2'] })
      })
      
      const result = await response.json()
      console.log('POST API 測試結果:', result)
      alert(`POST API 測試結果: ${JSON.stringify(result)}`)
    } catch (error) {
      console.error('POST API 測試錯誤:', error)
      alert(`POST API 測試失敗: ${error}`)
    }
  } */
  // 載入測站清單
  useEffect(() => {
    fetch('/api/station-list')
      .then(res => res.json())
      .then(data => setStations(Array.isArray(data) ? data : []))
      .catch(err => console.error('載入測站清單失敗：', err))
  }, [])  // 載入照片清單
  useEffect(() => {
    if (activeTab === 'photos') {
      setLoading(true)
      setError(null)
      console.log('開始載入照片清單...')
      
      // 這裡需要您實作 API endpoint
      fetch('/api/photos')
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`)
          }
          return res.json()
        })
        .then(data => {
          if (data.error) {
            throw new Error(data.error + (data.details ? `: ${data.details}` : ''))
          }
          console.log('照片清單載入成功:', {
            count: data.length,
            sample: data[0],
            urls: data.slice(0, 3).map((p: PhotoRecord) => ({ 
              filename: p.filename, 
              file_url: p.file_url,
              preview_url: p.preview_url 
            }))
          })
          
          setPhotos(Array.isArray(data) ? data : [])
        })
        .catch(err => {
          console.error('載入照片清單失敗：', err)
          setError(`載入照片清單失敗：${err.message}`)
        })
        .finally(() => setLoading(false))
    }
  }, [activeTab])
  // 載入CSV清單
  useEffect(() => {
    if (activeTab === 'csv') {
      setLoading(true)
      // 這裡需要您實作 API endpoint
      fetch('/api/csv-files')
        .then(res => res.json())
        .then(data => setCsvFiles(Array.isArray(data) ? data : []))
        .catch(err => console.error('載入CSV清單失敗：', err))
        .finally(() => setLoading(false))
    }
  }, [activeTab])

  // 篩選照片
  // 先依日期由近到遠排序，再篩選
  const filteredPhotos = photos
    .slice()
    .sort((a, b) => b.taken_at.localeCompare(a.taken_at))
    .filter(photo => {
      if (photoFilters.station && photo.nearest_station !== photoFilters.station) return false
      if (photoFilters.startDate && photo.taken_at < photoFilters.startDate) return false
      if (photoFilters.endDate && photo.taken_at > photoFilters.endDate) return false
      return true
    })

  // 篩選CSV
  // 先依日期由近到遠排序，再篩選
  const filteredCsvs = csvFiles
    .slice()
    .sort((a, b) => b.upload_date.localeCompare(a.upload_date))
    .filter(csv => {
      if (csvFilters.station && csv.station_name !== csvFilters.station) return false
      if (csvFilters.startDate && csv.upload_date < csvFilters.startDate) return false
      if (csvFilters.endDate && csv.upload_date > csvFilters.endDate) return false
      return true
    })

  // 處理照片選擇
  const handlePhotoSelect = (photoId: string) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    )
  }

  // 處理刪除照片
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('確定要刪除這張照片嗎？此操作無法復原。')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // 刪除成功，更新本地數據
      setPhotos(prevPhotos => prevPhotos.filter(photo => photo.id !== photoId))
      setSelectedPhotos(prev => prev.filter(id => id !== photoId))
      alert('照片已成功刪除')
    } catch (error) {
      console.error('刪除照片失敗：', error)
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      alert(`刪除照片失敗：${errorMessage}`)
      setError(`刪除照片失敗：${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // 處理批次刪除照片
  const handleBatchDeletePhotos = async () => {
    if (selectedPhotos.length === 0) {
      alert('請選擇要刪除的照片')
      return
    }

    if (!confirm(`確定要刪除選中的 ${selectedPhotos.length} 張照片嗎？此操作無法復原。`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: selectedPhotos })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // 刪除成功，更新本地數據
      setPhotos(prevPhotos => prevPhotos.filter(photo => !selectedPhotos.includes(photo.id)))
      setSelectedPhotos([])
      alert(`已成功刪除 ${selectedPhotos.length} 張照片`)
    } catch (error) {
      console.error('批次刪除照片失敗：', error)
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      alert(`批次刪除照片失敗：${errorMessage}`)
      setError(`批次刪除照片失敗：${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // 處理CSV選擇
  const handleCsvSelect = (csvId: string) => {
    setSelectedCsvs(prev => 
      prev.includes(csvId) 
        ? prev.filter(id => id !== csvId)
        : [...prev, csvId]
    )
  }  // 批次下載照片
  const handlePhotoBatchDownload = async () => {
    if (selectedPhotos.length === 0) {
      alert('請選擇要下載的照片')
      return
    }

    if (downloading) {
      alert('下載正在進行中，請稍候...')
      return
    }

    setDownloading(true)

    try {
      console.log('=== 前端開始批次下載 ===')
      console.log('選中的照片 ID:', selectedPhotos)
      
      const response = await fetch('/api/download/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: selectedPhotos })
      })

      console.log('API 回應狀態:', response.status)
      console.log('API 回應標頭:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API 錯誤回應:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // 檢查回應的內容類型
      const contentType = response.headers.get('content-type')
      console.log('回應內容類型:', contentType)

      if (contentType?.includes('application/zip') || contentType?.includes('image/')) {
        // 下載檔案
        const blob = await response.blob()
        console.log('下載的檔案大小:', blob.size, 'bytes')
        
        if (blob.size === 0) {
          throw new Error('下載的檔案是空的')
        }

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        // 從回應標頭獲取檔名，或使用預設檔名
        const contentDisposition = response.headers.get('content-disposition')
        let filename = `photos_batch_${new Date().toISOString().slice(0, 10)}.zip`
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/)
          if (filenameMatch) {
            filename = filenameMatch[1]
          }
        }
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
          console.log('✅ 下載完成:', filename)
        alert(`成功下載 ${selectedPhotos.length} 張照片！\n\nZIP 檔案包含：\n- ${selectedPhotos.length} 張照片\n- 照片基本資料 CSV 檔案 (photos_metadata.csv)`)
      } else if (contentType?.includes('application/json')) {
        // 可能是 JSON 錯誤回應
        const errorData = await response.json()
        console.error('JSON 錯誤回應:', errorData)
        throw new Error(errorData.error || '下載失敗')
      } else {
        console.error('未知的內容類型:', contentType)
        throw new Error(`不支援的回應類型: ${contentType}`)
      }    } catch (error) {
      console.error('❌ 下載錯誤：', error)
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      alert(`下載失敗：${errorMessage}`)
    } finally {
      setDownloading(false)
    }
  }
  // 合併下載CSV
  const handleCsvMergeDownload = async () => {
    if (selectedCsvs.length === 0) {
      alert('請選擇要合併的CSV檔案')
      return
    }

    if (csvDownloading) {
      alert('下載正在進行中，請稍候...')
      return
    }

    setCsvDownloading(true)
    setCsvDownloadProgress(0)

    try {
      const response = await fetch('/api/download/csv-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          csvIds: selectedCsvs,
          filters: csvFilters
        })
      })

      if (response.ok) {
        // 取得總長度
        const contentLength = response.headers.get('content-length')
        const total = contentLength ? parseInt(contentLength, 10) : null
        const reader = response.body?.getReader()
        let received = 0
        const chunks = []

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) {
              chunks.push(value)
              received += value.length
              if (total) {
                setCsvDownloadProgress(Math.round((received / total) * 100))
              }
            }
          }
          // 合併 chunks
          const blob = new Blob(chunks, { type: 'text/csv' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `merged_data_${new Date().toISOString().slice(0, 10)}.csv`
          a.click()
          window.URL.revokeObjectURL(url)
          alert(`成功合併下載 ${selectedCsvs.length} 個 CSV 檔案！`)
        } else {
          // fallback: 沒有 reader 支援
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `merged_data_${new Date().toISOString().slice(0, 10)}.csv`
          a.click()
          window.URL.revokeObjectURL(url)
          alert(`成功合併下載 ${selectedCsvs.length} 個 CSV 檔案！`)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
        alert(`合併下載失敗：${errorData.error || 'HTTP ' + response.status}`)
      }
    } catch (error) {
      console.error('合併下載錯誤：', error)
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      alert(`合併下載失敗：${errorMessage}`)
    } finally {
      setCsvDownloading(false)
      setCsvDownloadProgress(null)
    }
  }
  // 格式化檔案大小
  /* const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  } */  // 格式化日期 - 直接解析時間，不轉換時區
  // 例如: "2025-06-26T18:07:00+00:00" -> "06/26 18:07"
  const formatDate = (dateString: string): string => {
    if (!dateString) return '未知時間'
    try {
      console.log('=== 日期轉換過程 ===')
      console.log('輸入字串:', dateString)
      
      // 直接從字串中提取日期和時間部分
      const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
      if (match) {
        const [, , month, day, hour, minute] = match
        const result = `${month}/${day} ${hour}:${minute}`
        console.log('直接解析結果:', result)
        console.log('========================')
        return result
      } else {
        // 如果正則匹配失敗，回退到原来的方法
        const date = new Date(dateString)
        console.log('Date 物件:', date)
        console.log('UTC 時間:', date.toISOString())
        
        const formatted = date.toLocaleString('zh-TW', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
        
        console.log('格式化結果:', formatted)
        console.log('========================')
        return formatted
      }
    } catch (error) {
      console.error('日期格式化錯誤:', error)
      return '時間格式錯誤'
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6">檔案檢視與下載</h1>

        {/* 頁籤切換 */}
        <div className="flex border-b mb-6 bg-white rounded-t-lg">
          <button 
            onClick={() => setActiveTab('photos')} 
            className={`flex-1 py-3 px-4 font-medium ${
              activeTab === 'photos' 
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📸 照片管理
          </button>
          <button 
            onClick={() => setActiveTab('csv')} 
            className={`flex-1 py-3 px-4 font-medium ${
              activeTab === 'csv' 
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 CSV資料管理
          </button>
        </div>        {/* 照片管理 */}
        {activeTab === 'photos' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* 錯誤顯示 */}
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                <strong>錯誤：</strong> {error}
              </div>
            )}            {/* 調試區域 */}
            {/* <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="font-semibold mb-2">調試工具</h3>              <div className="flex gap-2 mb-2">
                <button
                  onClick={checkBucketFiles}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                >
                  檢查 Bucket 檔案
                </button>
                <button
                  onClick={testDownload}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  測試下載
                </button>
                <button
                  onClick={testPostAPI}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  測試 POST API
                </button>
              </div>
              {/* 顯示第一張照片的詳細資訊 */}
              {/* {photos.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded">
                  <h4 className="font-medium mb-2">第一張照片資訊：</h4>
                  <div className="text-sm space-y-1">
                    <div><strong>檔名：</strong> {photos[0].filename}</div>
                    <div><strong>File URL：</strong> <a href={photos[0].file_url} target="_blank" className="text-blue-600 break-all">{photos[0].file_url}</a></div>
                    <div><strong>Preview URL：</strong> <a href={photos[0].preview_url} target="_blank" className="text-blue-600 break-all">{photos[0].preview_url}</a></div>
                    <div><strong>檔案類型：</strong> {photos[0].file_type}</div>
                  </div>
                  <div className="mt-2">
                    <img 
                      src={photos[0].preview_url || photos[0].file_url} 
                      alt="測試預覽" 
                      className="w-20 h-20 object-cover border rounded"
                      onLoad={() => console.log('✅ 調試區域圖片載入成功')}
                      onError={(e) => {
                        console.error('❌ 調試區域圖片載入失敗:', e)
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const span = document.createElement('span')
                        span.textContent = '❌ 載入失敗'
                        span.className = 'text-red-500 text-sm'
                        target.parentNode?.appendChild(span)
                      }}
                    />
                  </div>
                </div>
              )} */}
              {/* {debugInfo && (
                <div className="text-xs bg-gray-100 p-2 rounded mt-2">
                  <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
              )} */}
            {/* </div> */}
            {/* 篩選器 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">篩選條件</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">測站</label>
                  <select
                    value={photoFilters.station}
                    onChange={(e) => setPhotoFilters(f => ({ ...f, station: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">全部測站</option>
                    {stations.map(s => (
                      <option key={s.station_name} value={s.station_name}>
                        {s.station_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">開始日期</label>
                  <input
                    type="date"
                    value={photoFilters.startDate}
                    onChange={(e) => setPhotoFilters(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">結束日期</label>
                  <input
                    type="date"
                    value={photoFilters.endDate}
                    onChange={(e) => setPhotoFilters(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* 批次操作 */}
            <div className="flex flex-wrap gap-4 mb-6">
              <button
                onClick={() => setSelectedPhotos(filteredPhotos.map(p => p.id))}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                全選
              </button>
              <button
                onClick={() => setSelectedPhotos([])}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                取消全選
              </button>
              
              <button
                onClick={handlePhotoBatchDownload}
                disabled={selectedPhotos.length === 0 || downloading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                {downloading ? '下載中...' : '批次下載選中照片'}
                {downloading && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </button>
              
              <button
                onClick={handleBatchDeletePhotos}
                disabled={selectedPhotos.length === 0 || loading}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                {loading ? '刪除中...' : '批次刪除選中照片'}
                {loading && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </button>
            </div>

            {/* 照片清單 */}
            {loading ? (
              <div className="text-center py-8">載入中...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left">選擇</th>
                      <th className="p-3 text-left">預覽</th>
                      <th className="p-3 text-left">檔名</th>
                      <th className="p-3 text-left">測站</th>
                      <th className="p-3 text-left">拍攝時間</th>
                      <th className="p-3 text-left">位置</th>
                      <th className="p-3 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPhotos.map(photo => (
                      <tr key={photo.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedPhotos.includes(photo.id)}
                            onChange={() => handlePhotoSelect(photo.id)}
                            className="w-4 h-4"
                          />
                        </td>                        <td className="p-3">
                          <div className="relative w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                            <img 
                              src={photo.preview_url || photo.file_url} 
                              alt={photo.filename}
                              className="w-16 h-16 object-cover rounded"
                              onError={(e) => {
                                console.error('圖片載入失敗:', {
                                  filename: photo.filename,
                                  preview_url: photo.preview_url,
                                  file_url: photo.file_url,
                                  error: e
                                })
                                // 如果圖片載入失敗，顯示預設圖示
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent && !parent.querySelector('.error-placeholder')) {
                                  const placeholder = document.createElement('div')
                                  placeholder.className = 'error-placeholder text-gray-500 text-xs text-center w-16 h-16 flex flex-col items-center justify-center'
                                  placeholder.innerHTML = '<div>📷</div><div class="text-xs">無法預覽</div>'
                                  parent.appendChild(placeholder)
                                }
                              }}
                              onLoad={() => {
                                console.log('表格圖片載入成功:', photo.filename)
                              }}
                              loading="lazy" 
                            />
                          </div>
                        </td>
                        <td className="p-3 text-sm">{photo.filename}</td>
                        <td className="p-3 text-sm">{photo.nearest_station}</td>
                        <td className="p-3 text-sm">{formatDate(photo.taken_at)}</td>
                        <td className="p-3 text-sm">
                          {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}
                        </td>
                        <td className="p-3">
                          <a 
                            href={photo.file_url}
                            download={photo.filename}
                            className="text-blue-600 hover:text-blue-800 text-sm mr-4"
                          >
                            下載
                          </a>
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            刪除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPhotos.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    沒有找到符合條件的照片
                  </div>
                )}
              </div>
            )}

            {/* 統計資訊 */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-2">統計資訊</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">總照片數：</span>
                  <span className="font-medium">{photos.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">篩選結果：</span>
                  <span className="font-medium">{filteredPhotos.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">已選擇：</span>
                  <span className="font-medium">{selectedPhotos.length}</span>
                </div>                <div>
                  <span className="text-gray-600">已載入：</span>
                  <span className="font-medium">完成</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CSV管理 */}
        {activeTab === 'csv' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* 篩選器 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">篩選條件</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">測站</label>
                  <select
                    value={csvFilters.station}
                    onChange={(e) => setCsvFilters(f => ({ ...f, station: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">全部測站</option>
                    {stations.map(s => (
                      <option key={s.station_name} value={s.station_name}>
                        {s.station_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">開始日期</label>
                  <input
                    type="date"
                    value={csvFilters.startDate}
                    onChange={(e) => setCsvFilters(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">結束日期</label>
                  <input
                    type="date"
                    value={csvFilters.endDate}
                    onChange={(e) => setCsvFilters(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* 批次操作 */}
            <div className="flex flex-wrap gap-4 mb-6">
              <button
                onClick={() => setSelectedCsvs(filteredCsvs.map(c => c.id))}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                全選
              </button>
              <button
                onClick={() => setSelectedCsvs([])}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                取消全選
              </button>              <button
                onClick={handleCsvMergeDownload}
                disabled={selectedCsvs.length === 0 || csvDownloading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                {csvDownloading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    下載中...
                  </>
                ) : (
                  `合併下載 (${selectedCsvs.length})`
                )}
              </button>
                {/* 下載進度條 */}
                {csvDownloading && csvDownloadProgress !== null && (
                  <div className="w-full mt-2">
                    <div className="h-2 bg-gray-200 rounded">
                      <div
                        className="h-2 bg-green-500 rounded"
                        style={{ width: `${csvDownloadProgress}%`, transition: 'width 0.2s' }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 text-right">{csvDownloadProgress}%</div>
                  </div>
                )}
            </div>

            {/* CSV清單 */}
            {loading ? (
              <div className="text-center py-8">載入中...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left">選擇</th>
                      <th className="p-3 text-left">檔名</th>
                      <th className="p-3 text-left">測站</th>
                      <th className="p-3 text-left">資料日期</th>
                      <th className="p-3 text-left">上傳時間</th>
                      {/* <th className="p-3 text-left">記錄數</th>
                      <th className="p-3 text-left">檔案大小</th> */}
                      {/* <th className="p-3 text-left">操作</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCsvs.map(csv => (
                      <tr key={csv.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedCsvs.includes(csv.id)}
                            onChange={() => handleCsvSelect(csv.id)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="p-3 text-sm">{csv.filename}</td>
                        <td className="p-3 text-sm">{csv.station_name}</td>
                        <td className="p-3 text-sm">{csv.upload_date}</td>
                        <td className="p-3 text-sm">{formatDate(csv.uploaded_at)}</td>
                        {/* <td className="p-3 text-sm">{csv.record_count.toLocaleString()}</td>
                        <td className="p-3 text-sm">{formatFileSize(csv.file_size)}</td> */}
                        {/* <td className="p-3">
                          <a 
                            href={csv.file_url}
                            download={csv.filename}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            下載
                          </a>
                        </td> */}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCsvs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    沒有找到符合條件的CSV檔案
                  </div>
                )}
              </div>
            )}

            {/* 統計資訊 */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold mb-2">統計資訊</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">總檔案數：</span>
                  <span className="font-medium">{csvFiles.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">篩選結果：</span>
                  <span className="font-medium">{filteredCsvs.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">已選擇：</span>
                  <span className="font-medium">{selectedCsvs.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">總記錄數：</span>
                  <span className="font-medium">
                    {csvFiles.reduce((sum, c) => sum + c.record_count, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
