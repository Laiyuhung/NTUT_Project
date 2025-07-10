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
  const [captureInterval, setCaptureInterval] = useState(60) // 默認間隔 60 秒
  const [isCapturing, setIsCapturing] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [captureHistory, setCaptureHistory] = useState<{time: string, url: string}[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
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
  const captureImage = async () => {
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
      
      // 創建唯一文件名和日期時間
      const timestamp = new Date()
      const fileName = `timelapse_${timestamp.toISOString().replace(/[:.]/g, '-')}.jpg`
      
      // 創建 FormData 對象用於上傳
      const formData = new FormData()
      formData.append('file', new File([blob], fileName, { type: 'image/jpeg' }))
      formData.append('taken_at', timestamp.toISOString())
      
      // 獲取地理位置（如果可用）
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation?.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          })
        })
        
        formData.append('latitude', position.coords.latitude.toString())
        formData.append('longitude', position.coords.longitude.toString())
        formData.append('nearest_station', '定時拍攝') // 設置固定值或根據需求調整
      } catch (geoError) {
        console.warn('無法獲取地理位置:', geoError)
        formData.append('latitude', '0')
        formData.append('longitude', '0')
        formData.append('nearest_station', '定時拍攝')
      }
      
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
    setCountdown(captureInterval)
    
    // 立即拍一張
    captureImage()
    
    // 設置倒計時
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          captureImage()
          return captureInterval
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
      
      {/* 攝影機控制區 */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">攝影機控制</h2>
        
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
      </div>
      
      {/* 視頻預覽 */}
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
              <span className="font-mono">{countdown}秒</span>
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
      
      {/* 定時拍攝控制 */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">定時拍攝設定</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            拍攝間隔 (秒)
          </label>
          <input
            type="number"
            min="5"
            max="3600"
            value={captureInterval}
            onChange={(e) => setCaptureInterval(Math.max(5, parseInt(e.target.value) || 5))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isCapturing}
          />
        </div>
        
        <div className="flex space-x-4">
          <button 
            className={`px-4 py-2 rounded-md font-medium ${
              !cameraActive || isCapturing
                ? 'bg-gray-200 text-gray-700 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            onClick={startTimelapseCapture}
            disabled={!cameraActive || isCapturing}
          >
            開始定時拍攝
          </button>
          
          <button 
            className={`px-4 py-2 rounded-md font-medium ${
              !isCapturing
                ? 'bg-gray-200 text-gray-700 cursor-not-allowed' 
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            }`}
            onClick={stopTimelapseCapture}
            disabled={!isCapturing}
          >
            停止定時拍攝
          </button>
          
          <button 
            className={`px-4 py-2 rounded-md font-medium ${
              !cameraActive
                ? 'bg-gray-200 text-gray-700 cursor-not-allowed' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
            onClick={captureImage}
            disabled={!cameraActive || isCapturing}
          >
            立即拍照
          </button>
        </div>
      </div>
      
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
