'use client'
import { useState, useEffect } from 'react'

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

export default function Dashboard() {
  const [stations, setStations] = useState<StationData[]>([])
  const [csvData, setCsvData] = useState<CsvData[]>([])
  const [photoData, setPhotoData] = useState<PhotoData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // 獲取測站列表
      const stationsRes = await fetch('/api/station-list')
      const stationsData = await stationsRes.json()
      setStations(stationsData)

      // 獲取CSV資料
      const csvRes = await fetch('/api/csv-files')
      const csvData = await csvRes.json()
      setCsvData(csvData)

      // 獲取照片資料
      const photosRes = await fetch('/api/photos')
      const photosData = await photosRes.json()
      setPhotoData(photosData)

    } catch (error) {
      console.error('獲取儀表板資料失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 獲取最近7天的日期
  const getLast7Days = () => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      days.push(date.toISOString().split('T')[0])
    }
    return days
  }

  // 檢查特定日期和測站是否有CSV資料
  const hasCsvData = (stationName: string, date: string) => {
    return csvData.some(csv => 
      csv.station_name === stationName && 
      csv.upload_date === date
    )
  }

  // 計算各測站的照片數量
  const getPhotoCountByStation = () => {
    const counts: { [key: string]: number } = {}
    photoData.forEach(photo => {
      const station = photo.nearest_station || '未知測站'
      counts[station] = (counts[station] || 0) + 1
    })
    return counts
  }

  // 計算最近7天的照片分布
  const getPhotoDistributionByDate = () => {
    const last7Days = getLast7Days()
    const distribution = last7Days.map(date => {
      const count = photoData.filter(photo => 
        photo.taken_at?.startsWith(date)
      ).length
      return { date, count }
    })
    return distribution
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const last7Days = getLast7Days()
  const photoCounts = getPhotoCountByStation()
  const photoDistribution = getPhotoDistributionByDate()
  const maxPhotoCount = Math.max(...Object.values(photoCounts), 1)
  const maxDailyCount = Math.max(...photoDistribution.map(d => d.count), 1)

  return (
    <div className="space-y-8">
      {/* CSV資料登錄狀況 */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          📊 CSV資料登錄狀況 (最近7天)
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-2 font-semibold text-gray-700">測站名稱</th>
                {last7Days.map(date => (
                  <th key={date} className="text-center py-3 px-2 font-semibold text-gray-700 min-w-[80px]">
                    {date.split('-').slice(1).join('/')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stations.map(station => (
                <tr key={station.station_name} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium text-gray-800">
                    {station.station_name}
                  </td>
                  {last7Days.map(date => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>已上傳</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-300"></div>
            <span>未上傳</span>
          </div>
        </div>
      </div>

      {/* 照片分布狀況 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 按測站分布 */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            📸 照片分布 - 按測站
          </h3>
          
          <div className="space-y-3">
            {Object.entries(photoCounts)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 10)
              .map(([station, count]) => (
              <div key={station} className="flex items-center">
                <div className="w-24 text-sm text-gray-600 truncate" title={station}>
                  {station}
                </div>
                <div className="flex-1 mx-3">
                  <div className="bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                      style={{ width: `${(count / maxPhotoCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-8 text-sm font-medium text-gray-800 text-right">
                  {count}
                </div>
              </div>
            ))}
          </div>
          
          {Object.keys(photoCounts).length === 0 && (
            <p className="text-gray-500 text-center py-4">尚無照片資料</p>
          )}
        </div>

        {/* 按日期分布 */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            📅 照片分布 - 最近7天
          </h3>
          
          <div className="space-y-3">
            {photoDistribution.map(({ date, count }) => (
              <div key={date} className="flex items-center">
                <div className="w-16 text-sm text-gray-600">
                  {date.split('-').slice(1).join('/')}
                </div>
                <div className="flex-1 mx-3">
                  <div className="bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-green-500 h-4 rounded-full transition-all duration-300"
                      style={{ width: `${maxDailyCount > 0 ? (count / maxDailyCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-8 text-sm font-medium text-gray-800 text-right">
                  {count}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            總計: {photoData.length} 張照片
          </div>
        </div>
      </div>
    </div>
  )
}
