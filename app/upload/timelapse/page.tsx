'use client'

import { useEffect, useState, useRef } from 'react'

// 測站型別
type Station = {
  station_name: string
  latitude: number
  longitude: number
}

export default function TimelapseUploadPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isSetup, setIsSetup] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [interval, setIntervalState] = useState<NodeJS.Timeout | null>(null)
  const [recordCount, setRecordCount] = useState(0)
  const [nextCaptureTime, setNextCaptureTime] = useState<Date | null>(null)
  
  // 測站相關狀態
  const [form, setForm] = useState({
    latitude: '',
    longitude: '',
    nearest_station: '', 
  })
  const [nearestStationDistance, setNearestStationDistance] = useState<number | null>(null)
  const [nearestFiveStations, setNearestFiveStations] = useState<{station: Station, distance: number}[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [locating, setLocating] = useState(false)
  const [uploading, setUploading] = useState(false)

  // 計算兩點間距離（公里）
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // 地球半徑（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }
  
  const isInTaipeiRegion = (lat: number, lng: number): boolean => {
    return lat >= 24.8 && lat <= 25.3 && lng >= 121.3 && lng <= 122.0
  }

  const findNearestStation = (lat: number, lng: number): string => {
    if (stations.length === 0) {
      console.log('測站清單尚未載入完成')
      return ''
    }
    
    // 計算所有測站的距離
    const stationsWithDistance = stations.map(station => ({
      station,
      distance: calculateDistance(lat, lng, station.latitude, station.longitude)
    }))
    
    // 依距離排序
    stationsWithDistance.sort((a, b) => a.distance - b.distance)
    
    // 設定最近的測站
    const nearest = stationsWithDistance[0]
    setNearestStationDistance(nearest.distance)
    
    // 設定最近的5個測站
    setNearestFiveStations(stationsWithDistance.slice(0, 5))
    
    return nearest.station.station_name
  }

  // 載入測站清單
  useEffect(() => {
    fetch('/api/station-list')
      .then(res => res.json())
      .then(data => {
        setStations(data)
      })
      .catch(err => console.error('載入測站清單失敗：', err))
  }, [])

  // 取得攝像頭清單
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        setDevices(videoDevices)
        if (videoDevices.length > 0) {
          setSelectedDevice(videoDevices[0].deviceId)
        }
      } catch (error) {
        console.error('取得攝像頭清單失敗:', error)
      }
    }
    getDevices()
  }, [])

  // 取得定位
  const handleGetLocation = () => {
    if (stations.length === 0) {
      alert('⏳ 測站資料載入中，請稍候再試')
      return
    }
    
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords

        if (!isInTaipeiRegion(latitude, longitude)) {
          alert('📍 定位點不在雙北地區，請手動選擇測站')
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
        setLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  // 啟動攝像頭
  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      
      setStream(newStream)
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
      }
    } catch (error) {
      console.error('啟動攝像頭失敗:', error)
      alert('❌ 無法啟動攝像頭，請檢查權限設定')
    }
  }

  // 確認設定
  const confirmSetup = () => {
    if (!form.nearest_station) {
      alert('❌ 請先確認測站資料')
      return
    }
    if (!stream) {
      alert('❌ 請先啟動攝像頭')
      return
    }
    setIsSetup(true)
  }

  // 拍攝照片
  const capturePhoto = async (): Promise<Blob | null> => {
    if (!videoRef.current || !canvasRef.current) return null

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return null

    // 設定畫布大小
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // 繪製當前影像
    ctx.drawImage(video, 0, 0)
    
    // 轉換為 Blob
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8)
    })
  }

  // 上傳照片
  const uploadPhoto = async (blob: Blob, captureTime: Date) => {
    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('latitude', form.latitude)
      formData.append('longitude', form.longitude)
      formData.append('nearest_station', form.nearest_station)
      
      // 格式化時間為 datetime-local 格式
      const taipeiTime = new Date(captureTime.getTime() + (8 * 60 * 60 * 1000))
      const timeString = taipeiTime.toISOString().slice(0, 16)
      formData.append('taken_at', timeString)
      
      // 建立檔案名稱
      const fileName = `timelapse_${captureTime.getTime()}.jpg`
      const file = new File([blob], fileName, { type: 'image/jpeg' })
      formData.append('file', file)

      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()
      if (res.ok) {
        console.log(`✅ 第 ${recordCount + 1} 張照片上傳成功`)
        setRecordCount(prev => prev + 1)
      } else {
        console.error(`❌ 第 ${recordCount + 1} 張照片上傳失敗：${result.error}`)
      }
    } catch (error) {
      console.error('上傳照片失敗:', error)
    } finally {
      setUploading(false)
    }
  }

  // 開始定時拍攝
  const startRecording = () => {
    if (!isSetup) return

    setIsRecording(true)
    setRecordCount(0)
    
    // 計算下次拍攝時間（下個15分鐘的整數倍）
    const now = new Date()
    const nextTime = new Date(now)
    const minutes = now.getMinutes()
    const nextMinutes = Math.ceil(minutes / 15) * 15
    nextTime.setMinutes(nextMinutes, 0, 0)
    if (nextMinutes >= 60) {
      nextTime.setHours(nextTime.getHours() + 1)
      nextTime.setMinutes(0, 0, 0)
    }
    setNextCaptureTime(nextTime)

    // 立即拍攝第一張
    setTimeout(async () => {
      const blob = await capturePhoto()
      if (blob) {
        await uploadPhoto(blob, new Date())
      }
    }, 1000)

    // 設定15分鐘間隔
    const timer = setInterval(async () => {
      const captureTime = new Date()
      const blob = await capturePhoto()
      if (blob) {
        await uploadPhoto(blob, captureTime)
      }
      
      // 更新下次拍攝時間
      const next = new Date(captureTime.getTime() + 15 * 60 * 1000)
      setNextCaptureTime(next)
    }, 15 * 60 * 1000) // 15分鐘

    setIntervalState(timer)
  }

  // 停止拍攝
  const stopRecording = () => {
    setIsRecording(false)
    if (interval) {
      clearInterval(interval)
      setIntervalState(null)
    }
    setNextCaptureTime(null)
  }

  // 清理資源
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [stream, interval])

  return (
    <main className="min-h-screen bg-gray-100 p-3 sm:p-6">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center">定時拍攝系統</h1>
        
        {!isSetup ? (
          // 設定階段
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 攝像頭設定 */}
            <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-bold">攝像頭設定</h2>
              
              <div>
                <label className="block font-medium mb-2">選擇攝像頭</label>
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  {devices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `攝像頭 ${device.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={startCamera}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded"
              >
                啟動攝像頭
              </button>

              {/* 攝像頭預覽 */}
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg border"
                  style={{ maxHeight: '300px' }}
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>

            {/* 位置設定 */}
            <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-bold">位置設定</h2>
              
              <button
                onClick={handleGetLocation}
                disabled={locating || stations.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded"
              >
                {locating ? '取得定位中...' : stations.length === 0 ? '載入測站中...' : '取得定位與測站'}
              </button>

              <div className="space-y-3">
                <div>
                  <label className="block font-medium mb-1">緯度</label>
                  <input
                    value={form.latitude}
                    readOnly
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    placeholder="自動取得"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">經度</label>
                  <input
                    value={form.longitude}
                    readOnly
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    placeholder="自動取得"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">鄰近測站</label>
                  <div className="px-3 py-2 border rounded bg-gray-100 text-gray-800 min-h-[42px] flex items-center">
                    {form.nearest_station ? (
                      <div>
                        <div className="font-medium">{form.nearest_station}</div>
                        {nearestStationDistance && (
                          <div className="text-sm text-gray-600">
                            距離: {nearestStationDistance.toFixed(2)} 公里
                          </div>
                        )}
                      </div>
                    ) : (
                      '（尚未定位）'
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={confirmSetup}
                disabled={!form.nearest_station || !stream}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded"
              >
                確認設定，準備開始
              </button>
            </div>
          </div>
        ) : (
          // 拍攝階段
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 攝像頭畫面 */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">即時畫面</h2>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg border"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* 控制面板 */}
            <div className="space-y-6">
              {/* 拍攝控制 */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold mb-4">拍攝控制</h3>
                
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded"
                  >
                    🔴 開始定時拍攝
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded"
                  >
                    ⏹️ 停止拍攝
                  </button>
                )}

                <div className="mt-4 text-sm text-gray-600">
                  拍攝間隔：每 15 分鐘
                </div>
              </div>

              {/* 拍攝狀態 */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold mb-4">拍攝狀態</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>已拍攝：</span>
                    <span className="font-medium">{recordCount} 張</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>狀態：</span>
                    <span className={`font-medium ${isRecording ? 'text-red-600' : 'text-gray-600'}`}>
                      {isRecording ? '🔴 拍攝中' : '⏹️ 已停止'}
                    </span>
                  </div>

                  {uploading && (
                    <div className="flex justify-between">
                      <span>上傳：</span>
                      <span className="font-medium text-blue-600">⬆️ 上傳中</span>
                    </div>
                  )}

                  {nextCaptureTime && (
                    <div className="pt-2 border-t">
                      <div className="text-sm text-gray-600">下次拍攝時間：</div>
                      <div className="font-medium">
                        {nextCaptureTime.toLocaleString('zh-TW')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 測站資訊 */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold mb-4">測站資訊</h3>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">測站：</span>
                    <div className="font-medium">{form.nearest_station}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">位置：</span>
                    <div className="text-sm">
                      {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}
                    </div>
                  </div>
                  {nearestStationDistance && (
                    <div>
                      <span className="text-sm text-gray-600">距離：</span>
                      <div className="text-sm">{nearestStationDistance.toFixed(2)} 公里</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 最近測站列表（僅在設定階段顯示） */}
        {!isSetup && nearestFiveStations.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold mb-4">最近測站</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {nearestFiveStations.map((item, index) => (
                <div
                  key={item.station.station_name}
                  className={`p-3 rounded-lg border ${
                    index === 0 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className={`font-medium text-sm ${index === 0 ? 'text-blue-800' : 'text-gray-800'}`}>
                    {index === 0 && '🏆 '}{item.station.station_name}
                  </div>
                  <div className="text-xs text-gray-600">
                    距離: {item.distance.toFixed(2)} 公里
                  </div>
                  <div className="text-xs text-gray-500">
                    ({item.station.latitude.toFixed(4)}, {item.station.longitude.toFixed(4)})
                  </div>
                  <div className={`text-sm font-bold mt-1 ${
                    index === 0 ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    #{index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
