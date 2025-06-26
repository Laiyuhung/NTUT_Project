'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface StationData {
  station_name: string
  latitude: number
  longitude: number
}

interface CsvData {
  id: string
  station_name: string
  upload_date: string
  filename: string
}

interface PhotoData {
  id: string
  nearest_station: string
  taken_at: string
  filename: string
}

export default function DashboardPage() {
  const [stations, setStations] = useState<StationData[]>([])
  const [csvData, setCsvData] = useState<CsvData[]>([])
  const [photoData, setPhotoData] = useState<PhotoData[]>([])
  const [loading, setLoading] = useState(true)
  
  // 篩選狀態
  const [selectedStation, setSelectedStation] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [dateRange, setDateRange] = useState<number>(7) // 預設7天

  useEffect(() => {
    // 設定預設日期範圍
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - dateRange + 1)
    
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(start.toISOString().split('T')[0])
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [selectedStation, startDate, endDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 獲取測站列表
      const stationsRes = await fetch('/api/station-list')
      const stationsData = await stationsRes.json()
      setStations(stationsData)

      // 構建查詢參數
      const csvParams = new URLSearchParams()
      if (selectedStation) csvParams.append('station', selectedStation)
      if (startDate) csvParams.append('startDate', startDate)
      if (endDate) csvParams.append('endDate', endDate)

      const photoParams = new URLSearchParams()
      if (selectedStation) photoParams.append('station', selectedStation)
      if (startDate) photoParams.append('startDate', startDate)
      if (endDate) photoParams.append('endDate', endDate)

      // 獲取CSV資料
      const csvRes = await fetch(`/api/csv-files?${csvParams.toString()}`)
      const csvData = await csvRes.json()
      setCsvData(csvData)

      // 獲取照片資料
      const photosRes = await fetch(`/api/photos?${photoParams.toString()}`)
      const photosData = await photosRes.json()
      setPhotoData(photosData)

    } catch (error) {
      console.error('獲取資料失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 獲取指定日期範圍的所有日期
  const getDateRange = () => {
    if (!startDate || !endDate) return []
    
    const dates = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0])
    }
    
    return dates
  }

  // 檢查特定日期和測站是否有CSV資料
  const hasCsvData = (stationName: string, date: string) => {
    return csvData.some(csv => 
      csv.station_name === stationName && 
      csv.upload_date === date
    )
  }

  // 檢查特定日期和測站是否有照片資料
  const hasPhotoData = (stationName: string, date: string) => {
    return photoData.some(photo => 
      photo.nearest_station === stationName && 
      photo.taken_at?.startsWith(date)
    )
  }

  // 重置篩選條件
  const resetFilters = () => {
    setSelectedStation('')
    setDateRange(7)
  }

  const dateRangeList = getDateRange()
  const filteredStations = selectedStation 
    ? stations.filter(s => s.station_name === selectedStation)
    : stations

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 導航欄 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">
              📊 詳細狀況儀表板
            </h1>
            <Link 
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              返回首頁
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 篩選控制區 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">篩選條件</h2>
          
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            {/* 測站選擇 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                選擇測站
              </label>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">所有測站</option>
                {stations.map(station => (
                  <option key={station.station_name} value={station.station_name}>
                    {station.station_name}
                  </option>
                ))}
              </select>
            </div>

            {/* 快速日期選擇 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                日期範圍
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>最近7天</option>
                <option value={14}>最近14天</option>
                <option value={30}>最近30天</option>
              </select>
            </div>

            {/* 開始日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                開始日期
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 結束日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                結束日期
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200"
            >
              重置篩選
            </button>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              重新載入
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* CSV資料狀況 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center justify-between">
                📊 CSV資料登錄狀況
                <span className="text-sm font-normal text-gray-600">
                  {startDate} ~ {endDate}
                </span>
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">測站名稱</th>
                      {dateRangeList.map(date => (
                        <th key={date} className="text-center py-3 px-2 font-semibold text-gray-700 min-w-[80px]">
                          <div className="text-xs">{date.split('-').slice(1).join('/')}</div>
                        </th>
                      ))}
                      <th className="text-center py-3 px-2 font-semibold text-gray-700">統計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStations.map(station => {
                      const uploadedDays = dateRangeList.filter(date => 
                        hasCsvData(station.station_name, date)
                      ).length
                      const totalDays = dateRangeList.length
                      const percentage = totalDays > 0 ? Math.round((uploadedDays / totalDays) * 100) : 0

                      return (
                        <tr key={station.station_name} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium text-gray-800">
                            {station.station_name}
                          </td>
                          {dateRangeList.map(date => (
                            <td key={`${station.station_name}-${date}`} className="text-center py-3 px-2">
                              <div className={`w-6 h-6 rounded-full mx-auto ${
                                hasCsvData(station.station_name, date) 
                                  ? 'bg-green-500' 
                                  : 'bg-red-300'
                              }`} title={
                                hasCsvData(station.station_name, date) 
                                  ? '已上傳資料' 
                                  : '未上傳資料'
                              }>
                              </div>
                            </td>
                          ))}
                          <td className="text-center py-3 px-2">
                            <div className="text-sm">
                              <div className="font-medium">{uploadedDays}/{totalDays}</div>
                              <div className="text-gray-500">({percentage}%)</div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 照片資料狀況 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center justify-between">
                📸 照片上傳狀況
                <span className="text-sm font-normal text-gray-600">
                  {startDate} ~ {endDate}
                </span>
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">測站名稱</th>
                      {dateRangeList.map(date => (
                        <th key={date} className="text-center py-3 px-2 font-semibold text-gray-700 min-w-[80px]">
                          <div className="text-xs">{date.split('-').slice(1).join('/')}</div>
                        </th>
                      ))}
                      <th className="text-center py-3 px-2 font-semibold text-gray-700">統計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStations.map(station => {
                      const photoDays = dateRangeList.filter(date => 
                        hasPhotoData(station.station_name, date)
                      ).length
                      const totalPhotos = photoData.filter(photo => 
                        photo.nearest_station === station.station_name
                      ).length

                      return (
                        <tr key={station.station_name} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium text-gray-800">
                            {station.station_name}
                          </td>
                          {dateRangeList.map(date => (
                            <td key={`${station.station_name}-${date}`} className="text-center py-3 px-2">
                              <div className={`w-6 h-6 rounded-full mx-auto ${
                                hasPhotoData(station.station_name, date) 
                                  ? 'bg-blue-500' 
                                  : 'bg-gray-300'
                              }`} title={
                                hasPhotoData(station.station_name, date) 
                                  ? '有照片資料' 
                                  : '無照片資料'
                              }>
                              </div>
                            </td>
                          ))}
                          <td className="text-center py-3 px-2">
                            <div className="text-sm">
                              <div className="font-medium">{photoDays}天</div>
                              <div className="text-gray-500">{totalPhotos}張</div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 統計摘要 */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h4 className="text-lg font-bold text-gray-800 mb-2">CSV資料統計</h4>
                <div className="text-3xl font-bold text-blue-600 mb-2">{csvData.length}</div>
                <p className="text-gray-600">筆CSV記錄</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <h4 className="text-lg font-bold text-gray-800 mb-2">照片統計</h4>
                <div className="text-3xl font-bold text-green-600 mb-2">{photoData.length}</div>
                <p className="text-gray-600">張照片</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <h4 className="text-lg font-bold text-gray-800 mb-2">測站統計</h4>
                <div className="text-3xl font-bold text-purple-600 mb-2">{filteredStations.length}</div>
                <p className="text-gray-600">個測站</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
