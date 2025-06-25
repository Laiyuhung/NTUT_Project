'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

export default function FilesViewPage() {
  const [activeTab, setActiveTab] = useState<'photos' | 'csv'>('photos')
  const [photos, setPhotos] = useState<PhotoRecord[]>([])
  const [csvFiles, setCsvFiles] = useState<CsvRecord[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  
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

  // 載入測站清單
  useEffect(() => {
    fetch('/api/station-list')
      .then(res => res.json())
      .then(data => setStations(data))
      .catch(err => console.error('載入測站清單失敗：', err))
  }, [])

  // 載入照片清單
  useEffect(() => {
    if (activeTab === 'photos') {
      setLoading(true)
      // 這裡需要您實作 API endpoint
      fetch('/api/photos')
        .then(res => res.json())
        .then(data => setPhotos(data))
        .catch(err => console.error('載入照片清單失敗：', err))
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
        .then(data => setCsvFiles(data))
        .catch(err => console.error('載入CSV清單失敗：', err))
        .finally(() => setLoading(false))
    }
  }, [activeTab])

  // 篩選照片
  const filteredPhotos = photos.filter(photo => {
    if (photoFilters.station && photo.nearest_station !== photoFilters.station) return false
    if (photoFilters.startDate && photo.taken_at < photoFilters.startDate) return false
    if (photoFilters.endDate && photo.taken_at > photoFilters.endDate) return false
    return true
  })

  // 篩選CSV
  const filteredCsvs = csvFiles.filter(csv => {
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

  // 處理CSV選擇
  const handleCsvSelect = (csvId: string) => {
    setSelectedCsvs(prev => 
      prev.includes(csvId) 
        ? prev.filter(id => id !== csvId)
        : [...prev, csvId]
    )
  }

  // 批次下載照片
  const handlePhotoBatchDownload = async () => {
    if (selectedPhotos.length === 0) {
      alert('請選擇要下載的照片')
      return
    }

    try {
      const response = await fetch('/api/download/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: selectedPhotos })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `photos_batch_${new Date().toISOString().slice(0, 10)}.zip`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        alert('下載失敗')
      }
    } catch (error) {
      console.error('下載錯誤：', error)
      alert('下載失敗')
    }
  }

  // 合併下載CSV
  const handleCsvMergeDownload = async () => {
    if (selectedCsvs.length === 0) {
      alert('請選擇要合併的CSV檔案')
      return
    }

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
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `merged_data_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        alert('合併下載失敗')
      }
    } catch (error) {
      console.error('合併下載錯誤：', error)
      alert('合併下載失敗')
    }
  }

  // 格式化檔案大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 格式化日期
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('zh-TW')
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
        </div>

        {/* 照片管理 */}
        {activeTab === 'photos' && (
          <div className="bg-white rounded-lg shadow-md p-6">
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
                disabled={selectedPhotos.length === 0}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                批次下載 ({selectedPhotos.length})
              </button>
            </div>

            {/* 照片清單 */}
            {loading ? (
              <div className="text-center py-8">載入中...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left">選擇</th>
                      <th className="p-3 text-left">預覽</th>
                      <th className="p-3 text-left">檔名</th>
                      <th className="p-3 text-left">測站</th>
                      <th className="p-3 text-left">拍攝時間</th>
                      <th className="p-3 text-left">位置</th>
                      <th className="p-3 text-left">檔案大小</th>
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
                        </td>
                        <td className="p-3">
                          <img 
                            src={photo.file_url} 
                            alt={photo.filename}
                            className="w-16 h-16 object-cover rounded"
                          />
                        </td>
                        <td className="p-3 text-sm">{photo.filename}</td>
                        <td className="p-3 text-sm">{photo.nearest_station}</td>
                        <td className="p-3 text-sm">{formatDate(photo.taken_at)}</td>
                        <td className="p-3 text-sm">
                          {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}
                        </td>
                        <td className="p-3 text-sm">{formatFileSize(photo.file_size)}</td>
                        <td className="p-3">
                          <a 
                            href={photo.file_url}
                            download={photo.filename}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            下載
                          </a>
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
                </div>
                <div>
                  <span className="text-gray-600">總大小：</span>
                  <span className="font-medium">
                    {formatFileSize(photos.reduce((sum, p) => sum + p.file_size, 0))}
                  </span>
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
              </button>
              <button
                onClick={handleCsvMergeDownload}
                disabled={selectedCsvs.length === 0}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                合併下載 ({selectedCsvs.length})
              </button>
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
                      <th className="p-3 text-left">記錄數</th>
                      <th className="p-3 text-left">檔案大小</th>
                      <th className="p-3 text-left">操作</th>
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
                        <td className="p-3 text-sm">{csv.record_count.toLocaleString()}</td>
                        <td className="p-3 text-sm">{formatFileSize(csv.file_size)}</td>
                        <td className="p-3">
                          <a 
                            href={csv.file_url}
                            download={csv.filename}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            下載
                          </a>
                        </td>
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
