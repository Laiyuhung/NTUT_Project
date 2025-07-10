'use client'

import { useEffect, useRef, useState } from 'react'
// import { supabase } from '@/lib/supabaseClient'

export default function TimelapsePage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [captureInterval, setCaptureInterval] = useState(15) // 默認間隔 15 分鐘
  const [isCapturing, setIsCapturing] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [captureHistory, setCaptureHistory] = useState<{time: string, url: string}[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // 步驟管理
  const [currentStep, setCurrentStep] = useState(1) // 1: 啟動攝影機, 2: 選擇測站, 3: 開始拍攝
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null)
  const [stations, setStations] = useState<{id: string, name: string, distance?: number}[]>([])
  const [selectedStation, setSelectedStation] = useState<string>('定時拍攝')
  const [isLoadingStations, setIsLoadingStations] = useState(false)
  
  // 定義測站類型
  type Station = {
    id: string;
    name: string;
    latitude?: number;
    longitude?: number;
    distance?: number;
  }

  // 啟動攝影機
  const startCamera = async (deviceId?: string) => {
    try {
      setCameraError(null)
      
      if (videoRef.current && navigator.mediaDevices) {
        // 如果已經有流在運行，先停止
        if (videoRef.current.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
          tracks.forEach(track => track.stop())
        }

        // 獲取攝影機流
        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true
        }
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (error) {
      console.error('攝影機啟動失敗:', error)
      setCameraError(`攝影機啟動失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
      setCameraActive(false)
    }
  }

  // 停止攝影機
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
      setCameraActive(false)
    }
  }

  // 獲取可用的攝影機設備
  const getVideoDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setDevices(videoDevices)
      
      // 如果有攝影機設備，默認選擇第一個
      if (videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId)
      }
    } catch (error) {
      console.error('獲取攝影機設備失敗:', error)
      setCameraError('無法獲取攝影機設備列表')
    }
  }

  // 切換攝影機
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value
    setSelectedDevice(deviceId)
    if (cameraActive) {
      startCamera(deviceId)
    }
  }

  // 拍照
  const captureImage = async (isPreview = false) => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    
    // 設置畫布大小與視頻一致
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // 繪製當前影像到畫布
    const context = canvas.getContext('2d')
    if (!context) return
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    try {
      // 將畫布轉為 blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('轉換圖片格式失敗'))
          }
        }, 'image/jpeg', 0.95)
      })
      
      // 如果只是預覽，則不上傳
      if (isPreview) {
        const previewUrl = URL.createObjectURL(blob)
        setPreviewImage(previewUrl)
        return previewUrl
      }
      
      // 創建唯一文件名和日期時間
      const timestamp = new Date()
      const fileName = `timelapse_${timestamp.toISOString().replace(/[:.]/g, '-')}.jpg`
      
      // 創建 FormData 對象用於上傳
      const formData = new FormData()
      formData.append('file', new File([blob], fileName, { type: 'image/jpeg' }))
      formData.append('taken_at', timestamp.toISOString())
      
      // 添加位置和測站信息
      if (location) {
        formData.append('latitude', location.latitude.toString())
        formData.append('longitude', location.longitude.toString())
      } else {
        formData.append('latitude', '0')
        formData.append('longitude', '0')
      }
      
      // 使用選擇的測站
      formData.append('nearest_station', selectedStation)
      
      // 顯示上傳進度
      setIsUploading(true)
      setUploadProgress(0)
      
      // 使用現有的 API 端點上傳照片
      const response = await fetch('/api/upload-photo', {
        method: 'POST',
        body: formData,
      })
      
      setIsUploading(false)
      setUploadProgress(100)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '上傳失敗')
      }
      
      const result = await response.json()
      
      // 創建預覽 URL
      const previewUrl = URL.createObjectURL(blob)
      
      // 添加到歷史記錄
      setCaptureHistory(prev => [
        { time: new Date().toLocaleTimeString(), url: previewUrl },
        ...prev.slice(0, 9) // 只保留最近的 10 張照片
      ])
      
      console.log('照片已上傳:', result)
      return previewUrl
    } catch (error) {
      console.error('照片上傳失敗:', error)
      setCameraError(`照片上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
      setIsUploading(false)
      return null
    }
  }

  // 開始定時拍攝
  const startTimelapseCapture = () => {
    if (!cameraActive) return
    
    setIsCapturing(true)
    const intervalInSeconds = captureInterval * 60 // 將分鐘轉換為秒
    setCountdown(intervalInSeconds)
    
    // 立即拍一張
    captureImage(false)
    
    // 設置倒計時
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          captureImage(false)
          return intervalInSeconds
        }
        return prev - 1
      })
    }, 1000)
  }

  // 停止定時拍攝
  const stopTimelapseCapture = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsCapturing(false)
  }

  // 獲取測站列表
  const fetchStations = async () => {
    try {
      setIsLoadingStations(true)
      const response = await fetch('/api/station-list')
      
      if (!response.ok) {
        throw new Error('無法獲取測站列表')
      }
      
      const data = await response.json()
      
      // 如果有位置信息，計算距離並排序
      if (location) {
        const stationsWithDistance = data.stations.map((station: Station) => {
          // 計算與當前位置的距離
          const distance = calculateDistance(
            location.latitude, 
            location.longitude, 
            station.latitude || 0, 
            station.longitude || 0
          )
          
          return {
            ...station,
            distance
          }
        }).sort((a: Station, b: Station) => (a.distance || Infinity) - (b.distance || Infinity))
        
        setStations(stationsWithDistance)
        
        // 自動選擇最近的測站
        if (stationsWithDistance.length > 0) {
          setSelectedStation(stationsWithDistance[0].id || stationsWithDistance[0].name)
        }
      } else {
        setStations(data.stations as Station[])
      }
    } catch (error) {
      console.error('獲取測站列表失敗:', error)
      setCameraError(`獲取測站列表失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    } finally {
      setIsLoadingStations(false)
    }
  }
  
  // 計算兩點之間的距離 (使用 Haversine 公式)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // 地球半徑，單位公里
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c
    return distance // 返回公里數
  }

  // 獲取位置信息
  const getCurrentLocation = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation?.getCurrentPosition(resolve, reject, { 
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        })
      })
      
      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }
      
      setLocation(newLocation)
      return newLocation
    } catch (error) {
      console.error('無法獲取位置信息:', error)
      return null
    }
  }

  // 處理步驟切換
  const goToNextStep = async () => {
    if (currentStep === 1) {
      // 從步驟1（啟動攝影機）到步驟2（選擇測站）
      const locationData = await getCurrentLocation()
      if (locationData) {
        await fetchStations()
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      // 從步驟2（選擇測站）到步驟3（確認預覽）
      await captureImage(true) // 生成預覽圖
      setCurrentStep(3)
    }
  }
  
  // 開始拍攝流程
  const startCapture = () => {
    setPreviewImage(null) // 清除預覽
    startTimelapseCapture()
  }
  
  // 組件載入時獲取攝影機設備
  useEffect(() => {
    getVideoDevices()
    
    // 組件卸載時清理
    return () => {
      stopCamera()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">定時拍攝系統</h1>
      
      {/* 步驟指示器 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <span className="text-sm">啟動攝影機</span>
          </div>
          
          <div className={`flex-1 h-1 mx-2 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <span className="text-sm">選擇測站</span>
          </div>
          
          <div className={`flex-1 h-1 mx-2 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
              currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              3
            </div>
            <span className="text-sm">確認並開始</span>
          </div>
        </div>
      </div>
      
      {/* 步驟 1: 啟動攝影機 */}
      {currentStep === 1 && (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">步驟 1: 啟動攝影機</h2>
          
          {/* 攝影機選擇 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              選擇攝影機
            </label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={selectedDevice}
              onChange={handleDeviceChange}
              disabled={devices.length === 0}
            >
              {devices.length === 0 ? (
                <option value="">未發現攝影機</option>
              ) : (
                devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `攝影機 ${device.deviceId.substring(0, 5)}...`}
                  </option>
                ))
              )}
            </select>
          </div>
          
          {/* 攝影機啟動/停止按鈕 */}
          <div className="flex space-x-4 mb-4">
            <button 
              className={`px-4 py-2 rounded-md font-medium ${
                cameraActive 
                  ? 'bg-gray-200 text-gray-700 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              onClick={() => startCamera(selectedDevice)}
              disabled={cameraActive || devices.length === 0}
            >
              啟動攝影機
            </button>
            
            <button 
              className={`px-4 py-2 rounded-md font-medium ${
                !cameraActive 
                  ? 'bg-gray-200 text-gray-700 cursor-not-allowed' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
              onClick={stopCamera}
              disabled={!cameraActive}
            >
              停止攝影機
            </button>
          </div>
          
          {/* 錯誤提示 */}
          {cameraError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>{cameraError}</p>
            </div>
          )}
          
          {/* 下一步按鈕 */}
          <div className="mt-4 flex justify-end">
            <button 
              className={`px-6 py-2 rounded-md font-medium ${
                !cameraActive 
                  ? 'bg-gray-200 text-gray-700 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              onClick={goToNextStep}
              disabled={!cameraActive}
            >
              下一步
            </button>
          </div>
        </div>
      )}
      
      {/* 步驟 2: 選擇測站 */}
      {currentStep === 2 && (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">步驟 2: 選擇測站</h2>
          
          {/* 測站選擇 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              選擇最近的測站
            </label>
            
            {isLoadingStations ? (
              <div className="py-2 text-gray-600">載入測站中...</div>
            ) : (
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
              >
                <option value="定時拍攝">定時拍攝 (預設)</option>
                {stations.map((station) => (
                  <option key={station.id || station.name} value={station.id || station.name}>
                    {station.name} {station.distance !== undefined ? `(${station.distance.toFixed(2)} 公里)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          {/* 地理位置狀態 */}
          <div className="mb-4 p-3 bg-blue-50 rounded">
            {location ? (
              <p className="text-blue-700">
                已獲取您的位置: 緯度 {location.latitude.toFixed(6)}, 經度 {location.longitude.toFixed(6)}
              </p>
            ) : (
              <p className="text-yellow-700">
                未能獲取位置，將使用預設值
              </p>
            )}
          </div>
          
          {/* 按鈕區 */}
          <div className="mt-4 flex justify-between">
            <button 
              className="px-6 py-2 rounded-md font-medium border border-gray-300 hover:bg-gray-50"
              onClick={() => setCurrentStep(1)}
            >
              上一步
            </button>
            
            <button 
              className="px-6 py-2 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700"
              onClick={goToNextStep}
            >
              下一步
            </button>
          </div>
        </div>
      )}
      
      {/* 步驟 3: 確認並開始 */}
      {currentStep === 3 && (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">步驟 3: 確認並開始定時拍攝</h2>
          
          {/* 預覽圖 */}
          {previewImage && (
            <div className="mb-4">
              <p className="text-gray-700 mb-2">預覽照片</p>
              <div className="border rounded overflow-hidden">
                <img 
                  src={previewImage} 
                  alt="預覽照片" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}
          
          {/* 定時拍攝設定 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              拍攝間隔 (分鐘)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={captureInterval}
              onChange={(e) => setCaptureInterval(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isCapturing}
            />
          </div>
          
          {/* 設定摘要 */}
          <div className="p-4 bg-gray-50 rounded-lg mb-6">
            <h3 className="font-semibold mb-2">拍攝設定</h3>
            <ul className="space-y-1">
              <li>測站: <span className="font-medium">{selectedStation}</span></li>
              <li>拍攝間隔: <span className="font-medium">{captureInterval} 分鐘</span></li>
              {location && (
                <li>地理位置: <span className="font-medium">已記錄</span></li>
              )}
            </ul>
          </div>
          
          {/* 按鈕區 */}
          <div className="mt-4 flex justify-between">
            <button 
              className="px-6 py-2 rounded-md font-medium border border-gray-300 hover:bg-gray-50"
              onClick={() => setCurrentStep(2)}
              disabled={isCapturing}
            >
              上一步
            </button>
            
            <div className="space-x-4">
              <button 
                className="px-6 py-2 rounded-md font-medium bg-purple-600 text-white hover:bg-purple-700"
                onClick={() => captureImage(true)}
                disabled={isCapturing}
              >
                重新拍攝預覽
              </button>
              
              <button 
                className={`px-6 py-2 rounded-md font-medium ${
                  isCapturing 
                    ? 'bg-gray-200 text-gray-700 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                onClick={startCapture}
                disabled={isCapturing}
              >
                開始定時拍攝
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 攝影機預覽 (所有步驟都顯示) */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">攝影機預覽</h2>
        
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video 
            ref={videoRef}
            autoPlay 
            playsInline
            className={`w-full h-auto ${cameraActive ? 'block' : 'hidden'}`}
          />
          
          {!cameraActive && (
            <div className="flex items-center justify-center h-64 bg-gray-800 text-white">
              <p>攝影機未啟動</p>
            </div>
          )}
          
          {/* 隱藏的畫布用於截圖 */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* 倒計時顯示 */}
          {isCapturing && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full">
              <span className="font-mono">{Math.floor(countdown / 60)}分{countdown % 60}秒</span>
            </div>
          )}
          
          {/* 上傳進度顯示 */}
          {isUploading && (
            <div className="absolute bottom-0 left-0 right-0 bg-blue-600 h-1" style={{ width: `${uploadProgress}%` }}></div>
          )}
        </div>
        
        {/* 上傳狀態顯示 */}
        {isUploading && (
          <div className="mt-2 text-center text-blue-600 font-medium">
            正在上傳照片...
          </div>
        )}
      </div>
      
      {/* 已開始拍攝的控制項 */}
      {isCapturing && (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">定時拍攝進行中</h2>
          
          <p className="mb-4">
            已設置為每 <span className="font-bold">{captureInterval}</span> 分鐘自動拍攝一張照片
          </p>
          
          <button 
            className="px-6 py-2 rounded-md font-medium bg-red-600 text-white hover:bg-red-700"
            onClick={stopTimelapseCapture}
          >
            停止定時拍攝
          </button>
        </div>
      )}
      
      {/* 拍攝歷史 */}
      {captureHistory.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">最近拍攝 ({captureHistory.length})</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {captureHistory.map((item, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <img 
                  src={item.url} 
                  alt={`拍攝於 ${item.time}`} 
                  className="w-full h-48 object-cover"
                />
                <div className="p-2 bg-gray-50">
                  <p className="text-sm text-gray-700">拍攝於: {item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
