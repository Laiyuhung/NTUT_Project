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
        // 先請求攝像頭權限，這樣才能取得有意義的設備標籤
        await navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            // 取得權限後立即停止，因為只是為了取得設備清單
            stream.getTracks().forEach(track => track.stop())
          })
        
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        console.log('找到攝像頭:', videoDevices.length, '個')
        videoDevices.forEach((device, index) => {
          console.log(`攝像頭 ${index + 1}:`, device.label || `未知設備 ${device.deviceId.slice(0, 8)}`)
        })
        
        setDevices(videoDevices)
        if (videoDevices.length > 0) {
          setSelectedDevice(videoDevices[0].deviceId)
        }
      } catch (error) {
        console.error('取得攝像頭清單失敗:', error)
        // 即使失敗也嘗試取得基本設備清單
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoDevices = devices.filter(device => device.kind === 'videoinput')
          console.log('無權限狀態下找到攝像頭:', videoDevices.length, '個')
          setDevices(videoDevices)
          if (videoDevices.length > 0) {
            setSelectedDevice(videoDevices[0].deviceId)
          }
        } catch (err) {
          console.error('完全無法取得設備清單:', err)
          alert('❌ 無法存取攝像頭，請檢查瀏覽器權限')
        }
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

  // 重新整理攝像頭清單
  const refreshDevices = async () => {
    try {
      // 先請求權限
      await navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop())
        })
      
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      console.log('重新整理後找到攝像頭:', videoDevices.length, '個')
      
      setDevices(videoDevices)
      
      if (videoDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(videoDevices[0].deviceId)
      }
      
      alert(`✅ 找到 ${videoDevices.length} 個攝像頭`)
    } catch (error) {
      console.error('重新整理攝像頭清單失敗:', error)
      alert('❌ 無法重新整理攝像頭清單，請檢查瀏覽器權限')
    }
  }

  // 啟動攝像頭
  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      const constraints = {
        video: { 
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          width: { ideal: 1280, min: 320 },
          height: { ideal: 720, min: 240 }
        }
      }

      console.log('啟動攝像頭，設備ID:', selectedDevice)
      console.log('約束條件:', constraints)
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('取得串流成功，軌道數量:', newStream.getVideoTracks().length)
      
      setStream(newStream)
      
      if (videoRef.current) {
        // 清除之前的srcObject
        videoRef.current.srcObject = null
        
        // 等待一個微任務週期
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // 設定新的srcObject
        videoRef.current.srcObject = newStream
        
        // 強制設定video元素屬性
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        videoRef.current.controls = false
        videoRef.current.autoplay = true
        
        // 監聽所有相關事件
        videoRef.current.onloadstart = () => console.log('Video loadstart')
        videoRef.current.onloadeddata = () => console.log('Video loadeddata')
        videoRef.current.oncanplay = () => console.log('Video canplay')
        videoRef.current.onplay = () => console.log('Video play')
        videoRef.current.onerror = (e) => console.error('Video error:', e)
        
        // 等待metadata載入後播放
        videoRef.current.onloadedmetadata = async () => {
          try {
            console.log('Video metadata loaded, 嘗試播放...')
            console.log('Video 尺寸:', videoRef.current!.videoWidth, 'x', videoRef.current!.videoHeight)
            await videoRef.current!.play()
            console.log('攝像頭播放成功')
          } catch (playError) {
            console.error('metadata播放失敗:', playError)
          }
        }
        
        // 強制重新載入
        try {
          videoRef.current.load()
        } catch (loadError) {
          console.warn('load()失敗:', loadError)
        }
        
        // 延遲播放嘗試
        setTimeout(async () => {
          try {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              await videoRef.current.play()
              console.log('延遲播放成功')
            }
          } catch (playError) {
            console.warn('延遲播放失敗:', playError)
          }
        }, 500)
      }
    } catch (error) {
      console.error('啟動攝像頭失敗:', error)
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      alert(`❌ 無法啟動攝像頭：${errorMessage}\n\n請檢查：\n1. 瀏覽器權限設定\n2. 攝像頭是否被其他應用程式佔用\n3. 嘗試選擇其他攝像頭`)
    }
  }

  // 強制刷新影片顯示
  const forceRefreshVideo = async () => {
    if (!stream || !videoRef.current) {
      alert('❌ 請先啟動攝像頭')
      return
    }

    try {
      console.log('強制刷新影片顯示...')
      const video = videoRef.current
      
      // 暫停並清除
      video.pause()
      video.srcObject = null
      
      // 等待一下
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 重新設定
      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      video.autoplay = true
      
      // 強制載入並播放
      video.load()
      
      setTimeout(async () => {
        try {
          await video.play()
          console.log('強制刷新成功')
        } catch (error) {
          console.error('強制刷新播放失敗:', error)
        }
      }, 300)
      
    } catch (error) {
      console.error('強制刷新失敗:', error)
    }
  }

  // 測試拍攝功能
  const testCapture = async () => {
    if (!stream || !videoRef.current) {
      alert('❌ 請先啟動攝像頭')
      return
    }

    try {
      console.log('測試拍攝開始...')
      console.log('Video element:', videoRef.current)
      console.log('Video ready state:', videoRef.current.readyState)
      console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight)
      console.log('Stream tracks:', stream.getVideoTracks())
      
      const blob = await capturePhoto()
      if (blob) {
        console.log('拍攝成功，blob size:', blob.size)
        // 建立預覽URL
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `test_capture_${Date.now()}.jpg`
        link.click()
        URL.revokeObjectURL(url)
        alert('✅ 測試拍攝成功！照片已下載')
      } else {
        console.error('拍攝失敗，blob為null')
        alert('❌ 測試拍攝失敗 - 無法取得影像')
      }
    } catch (error) {
      console.error('測試拍攝失敗:', error)
      alert('❌ 測試拍攝時發生錯誤: ' + error)
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
    
    console.log('確認設定 - 當前stream狀態:', stream)
    console.log('確認設定 - stream tracks:', stream.getVideoTracks())
    
    alert('✅ 設定確認完成，您現在可以使用拍攝功能')
  }

  // 拍攝照片
  const capturePhoto = async (): Promise<Blob | null> => {
    // 優先使用錄製階段的video，如果不存在則使用主video
    const activeVideo = videoRef.current
    
    if (!activeVideo || !canvasRef.current) {
      console.error('Video element 或 canvas element 不存在')
      return null
    }

    const canvas = canvasRef.current
    const video = activeVideo
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      console.error('無法取得canvas context')
      return null
    }

    // 檢查video是否有有效尺寸
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('Video 尺寸無效:', video.videoWidth, 'x', video.videoHeight)
      return null
    }

    // 設定畫布大小
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    console.log('拍攝照片，video尺寸:', video.videoWidth, 'x', video.videoHeight)
    
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
    if (!stream) {
      alert('❌ 請先啟動攝像頭')
      return
    }
    if (!form.nearest_station) {
      alert('❌ 請先確認測站資料')
      return
    }

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

  // 自動設定攝像頭給錄製階段的video元素
  useEffect(() => {
    if (stream && videoRef.current) {
      console.log('自動設定錄製階段video stream')
      console.log('當前stream狀態:', stream)
      console.log('stream tracks:', stream.getVideoTracks())
      
      const setupRecordingVideo = async () => {
        // 等待 DOM 更新
        await new Promise(resolve => requestAnimationFrame(resolve))
        
        const videoElement = videoRef.current
        if (!videoElement) {
          console.error('videoRef不存在')
          return
        }
        
        console.log('開始設定錄製階段video元素')
        
        try {
          // 直接設定stream
          videoElement.srcObject = stream
          videoElement.muted = true
          videoElement.playsInline = true
          videoElement.autoplay = true
          
          console.log('錄製階段stream設定完成，準備播放')
          
          // 立即嘗試播放
          const attemptPlay = async () => {
            try {
              await videoElement.play()
              console.log('錄製階段video播放成功')
              console.log('Video尺寸:', videoElement.videoWidth, 'x', videoElement.videoHeight)
              return true
            } catch (error) {
              console.error('錄製階段video播放失敗:', error)
              return false
            }
          }
          
          // 設定事件監聽器
          videoElement.onloadedmetadata = () => {
            console.log('錄製階段metadata loaded')
            attemptPlay()
          }
          
          videoElement.oncanplay = () => {
            console.log('錄製階段can play')
            if (videoElement.paused) {
              attemptPlay()
            }
          }
          
          videoElement.onerror = (e) => {
            console.error('錄製階段video error:', e)
          }
          
          // 強制載入
          videoElement.load()
          
          // 多次嘗試播放，確保成功
          const playAttempts = async () => {
            for (let i = 0; i < 3; i++) {
              console.log(`錄製階段播放嘗試 ${i + 1}/3`)
              const success = await attemptPlay()
              if (success) {
                console.log('錄製階段播放成功')
                return
              }
              await new Promise(resolve => setTimeout(resolve, 500))
            }
            console.warn('錄製階段所有自動播放嘗試都失敗，需要手動啟動')
          }
          
          playAttempts()
          
        } catch (error) {
          console.error('錄製階段設定video失敗:', error)
        }
      }
      
      setupRecordingVideo()
    }
  }, [stream])

  return (
    <main className="min-h-screen bg-gray-100 p-3 sm:p-6">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center">定時拍攝系統</h1>
        
        {/* 主要內容區域 - 合併設定與拍攝功能 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 攝像頭預覽與即時畫面 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 攝像頭設定 */}
            <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-bold">攝像頭設定</h2>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-medium">選擇攝像頭</label>
                  <button
                    onClick={refreshDevices}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    title="重新整理攝像頭清單"
                  >
                    🔄 重新整理
                  </button>
                </div>
                
                {devices.length === 0 ? (
                  <div className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-500">
                    沒有找到攝像頭，請點擊重新整理
                  </div>
                ) : (
                  <select
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    {devices.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `攝像頭 ${index + 1} (${device.deviceId.slice(0, 8)}...)`}
                      </option>
                    ))}
                  </select>
                )}
                
                <div className="text-xs text-gray-500 mt-1">
                  找到 {devices.length} 個攝像頭
                  {devices.length > 1 && '，可以選擇不同的攝像頭'}
                </div>
              </div>

              <button
                onClick={startCamera}
                disabled={devices.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded"
              >
                {devices.length === 0 ? '沒有可用攝像頭' : '啟動攝像頭'}
              </button>

              {/* 測試拍攝按鈕 */}
              {stream && (
                <div className="flex space-x-2">
                  <button
                    onClick={testCapture}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm"
                  >
                    📸 測試拍攝 (下載照片)
                  </button>
                  <button
                    onClick={forceRefreshVideo}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 rounded text-sm"
                  >
                    🔄 刷新影片顯示
                  </button>
                </div>
              )}
            </div>

            {/* 攝像頭預覽/即時畫面 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">攝像頭畫面</h2>
                <div className="flex items-center space-x-2">
                  {stream && (
                    <>
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-600">連線中</span>
                    </>
                  )}
                  {isRecording && (
                    <>
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-red-600">錄製中</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
                {/* 統一的攝像頭畫面 - 同時用於預覽和錄製 */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ display: stream ? 'block' : 'none' }}
                  onCanPlay={() => {
                    console.log('Video can play')
                    console.log('Video readyState:', videoRef.current?.readyState)
                    console.log('Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight)
                  }}
                  onPlay={() => console.log('Video is playing')}
                  onError={(e) => console.error('Video error:', e)}
                  onLoadedData={() => console.log('Video loaded data')}
                  onWaiting={() => console.log('Video waiting')}
                  onLoadedMetadata={() => {
                    console.log('Video onLoadedMetadata 觸發')
                    const video = videoRef.current
                    if (video) {
                      console.log('影片尺寸:', video.videoWidth, 'x', video.videoHeight)
                      video.play().catch(error => console.error('metadata播放失敗:', error))
                    }
                  }}
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* 無畫面時的提示 */}
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center text-gray-500">
                      <div className="text-4xl mb-2">📷</div>
                      <div className="text-sm">點擊「啟動攝像頭」開始預覽</div>
                    </div>
                  </div>
                )}
                
                {/* 有串流但無畫面時的提示 */}
                {stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90 text-white"
                       style={{ 
                         display: (videoRef.current?.videoWidth && videoRef.current?.videoWidth > 0) ? 'none' : 'flex' 
                       }}>
                    <div className="text-center">
                      <div className="text-6xl mb-4">📷</div>
                      <div className="text-xl mb-4">攝像頭未啟動</div>
                      <div className="text-sm text-gray-300 mb-6">點擊下方按鈕手動啟動攝像頭</div>
                      <button
                        onClick={async () => {
                          console.log('手動啟動攝像頭')
                          const video = videoRef.current
                          if (video && stream) {
                            try {
                              console.log('重新設定攝像頭...')
                              
                              // 直接設定stream
                              video.srcObject = stream
                              video.muted = true
                              video.playsInline = true
                              video.autoplay = true
                              
                              // 強制載入並播放
                              video.load()
                              
                              await video.play()
                              console.log('攝像頭重新啟動成功')
                              
                              // 強制重新渲染以隱藏提示
                              video.dispatchEvent(new Event('loadeddata'))
                            } catch (error) {
                              console.error('攝像頭重新啟動失敗:', error)
                              alert('❌ 攝像頭啟動失敗，請檢查設備')
                            }
                          } else {
                            alert('❌ 沒有可用的攝像頭串流，請重新啟動攝像頭')
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
                      >
                        🚀 啟動攝像頭
                      </button>
                    </div>
                  </div>
                )}
                
                {/* 攝像頭資訊疊加 */}
                {stream && (
                  <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                    {devices.find(d => d.deviceId === selectedDevice)?.label || '攝像頭'}
                  </div>
                )}
                
                {/* 拍攝狀態疊加 */}
                {isRecording && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>錄製中</span>
                  </div>
                )}
                
                {/* 串流狀態指示 */}
                {stream && (
                  <div className="absolute bottom-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>直播中</span>
                  </div>
                )}
                
                {/* 除錯信息 */}
                {stream && (
                  <div className="absolute bottom-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
                    串流: {stream.getVideoTracks().length > 0 ? '✓' : '✗'}
                  </div>
                )}
                
                {/* 手動播放按鈕 - 當自動播放失敗時顯示 */}
                {stream && (
                  <button
                    onClick={() => {
                      console.log('手動播放按鈕被點擊')
                      const video = videoRef.current
                      video?.play().then(() => {
                        console.log('手動播放成功')
                      }).catch(error => {
                        console.error('手動播放失敗:', error)
                      })
                    }}
                    className="absolute inset-0 w-full h-full flex items-center justify-center bg-black bg-opacity-30 text-white opacity-0 hover:opacity-100 transition-opacity"
                    title="點擊播放影片"
                  >
                    <div className="text-4xl">▶️</div>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 控制面板 */}
          <div className="space-y-6">
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
                確認設定完成
              </button>
            </div>
        
            {/* 拍攝控制 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold mb-4">拍攝控制</h3>
              
              {/* 手動啟動攝像頭按鈕 */}
              <button
                onClick={async () => {
                  console.log('手動啟動拍攝階段攝像頭')
                  const video = videoRef.current
                  if (video && stream) {
                    try {
                      console.log('設定拍攝階段攝像頭...')
                      
                      // 直接設定stream
                      video.srcObject = stream
                      video.muted = true
                      video.playsInline = true
                      video.autoplay = true
                      
                      // 強制載入並播放
                      video.load()
                      
                      await video.play()
                      console.log('拍攝階段攝像頭啟動成功')
                      alert('✅ 攝像頭已啟動')
                    } catch (error) {
                      console.error('拍攝階段攝像頭啟動失敗:', error)
                      alert('❌ 攝像頭啟動失敗，請重試')
                    }
                  } else {
                    alert('❌ 沒有可用的攝像頭串流，請先啟動攝像頭')
                  }
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded text-sm mb-3"
              >
                📹 手動啟動攝像頭
              </button>
              
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
              
              {/* 攝像頭重連按鈕 */}
              <button
                onClick={async () => {
                  console.log('重新連接攝像頭')
                  const video = videoRef.current
                  if (video && stream) {
                    try {
                      // 直接重新設定stream，不清除不延遲
                      video.srcObject = stream
                      video.muted = true
                      video.playsInline = true
                      video.autoplay = true
                      
                      // 強制載入
                      video.load()
                      
                      // 立即嘗試播放
                      try {
                        await video.play()
                        console.log('重新連接成功')
                        alert('✅ 攝像頭重新連接成功')
                      } catch (error) {
                        console.warn('立即播放失敗，設定metadata監聽器:', error)
                        
                        // 設定metadata事件監聽器作為備用
                        video.onloadedmetadata = () => {
                          video.play().then(() => {
                            console.log('重新連接成功')
                            alert('✅ 攝像頭重新連接成功')
                          }).catch(error => {
                            console.error('重新連接播放失敗:', error)
                            alert('❌ 攝像頭重新連接失敗')
                          })
                        }
                      }
                      
                    } catch (error) {
                      console.error('重新連接失敗:', error)
                      alert('❌ 攝像頭重新連接失敗')
                    }
                  } else {
                    alert('❌ 沒有可用的攝像頭串流')
                  }
                }}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 rounded text-sm mt-2"
              >
                📹 重新連接攝像頭
              </button>
              
              {/* 測試拍攝按鈕 */}
              <button
                onClick={async () => {
                  console.log('測試拍攝')
                  setUploading(true)
                  try {
                    const blob = await capturePhoto()
                    if (blob) {
                      console.log('測試拍攝成功，照片大小:', blob.size)
                      alert('✅ 測試拍攝成功！照片大小: ' + (blob.size / 1024).toFixed(1) + ' KB')
                    } else {
                      alert('❌ 測試拍攝失敗，請檢查攝像頭')
                    }
                  } catch (error) {
                    console.error('測試拍攝錯誤:', error)
                    alert('❌ 測試拍攝失敗')
                  } finally {
                    setUploading(false)
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm mt-2"
              >
                📸 測試拍攝
              </button>
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
            {form.nearest_station && (
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
            )}
          </div>
        </div>

        {/* 最近測站列表 */}
        {nearestFiveStations.length > 0 && (
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
