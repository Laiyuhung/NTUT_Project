import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'

// 定義 Supabase 照片資料結構
interface PhotoRecord {
  id: number;
  file_url?: string;
  taken_at: string;
  station_id: string;
  [key: string]: any; // 其他屬性
}

export async function GET() {
  try {
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('*')
      .order('taken_at', { ascending: false })
    
    if (photosError) {
      console.error('獲取照片錯誤:', photosError)
      return NextResponse.json({ error: '獲取照片資料失敗' }, { status: 500 })
    }

    // 定義照片數據類型
    type PhotoData = {
      photo_id: string;
      photo_url: string;
      timestamp: string;
      station_id: string;
      station_name: string;
      latitude: number;
      longitude: number;
      temperature?: number;
      humidity?: number;
      rainfall?: number;
      wind_speed?: number;
      cloud_type?: string;
      confidence?: number;
      cloud_type_distribution?: Record<string, number>;
    };
    
    // 增強照片數據，加入氣象資料和雲型辨識結果
    const enhancedData = await Promise.all(photos.map(async (photo: PhotoRecord) => {
      // 基本照片資料
      const photoData: PhotoData = {
        photo_id: photo.id.toString(),
        photo_url: photo.file_url || '',
        timestamp: photo.taken_at,
        station_id: photo.nearest_station || '未知測站',
        station_name: photo.nearest_station || '未知測站',
        latitude: parseFloat(photo.latitude) || 0,
        longitude: parseFloat(photo.longitude) || 0,
      }

      // 確保檔案 URL 是完整路徑
      if (photoData.photo_url && !photoData.photo_url.startsWith('http')) {
        const bucket = 'uploads'
        // 清理路徑：移除開頭的 / 如果存在
        let cleanPath = photoData.photo_url.startsWith('/') ? photoData.photo_url.substring(1) : photoData.photo_url
        // 如果路徑不包含 photos/，則添加它
        if (!cleanPath.startsWith('photos/')) {
          cleanPath = `photos/${cleanPath}`
        }
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(cleanPath)
        photoData.photo_url = urlData.publicUrl
      }

      // 獲取氣象資料 (如果有測站ID)
      if (photo.nearest_station) {
        const takenAt = new Date(photo.taken_at)
        
        // 查找最近 10 分鐘內的氣象數據
        const startTime = new Date(takenAt)
        startTime.setMinutes(takenAt.getMinutes() - 10)
        
        const endTime = new Date(takenAt)
        endTime.setMinutes(takenAt.getMinutes() + 10)
        
        const { data: weatherData, error: weatherError } = await supabase
          .from('weather_data')
          .select('*')
          .eq('station_id', photo.nearest_station)
          .gte('timestamp', startTime.toISOString())
          .lte('timestamp', endTime.toISOString())
          .order('abs(extract(epoch from timestamp) - extract(epoch from timestamp \'' + takenAt.toISOString() + '\'))', { ascending: true })
          .limit(1)
        
        if (!weatherError && weatherData && weatherData.length > 0) {
          Object.assign(photoData, {
            temperature: parseFloat(weatherData[0].temperature) || undefined,
            humidity: parseFloat(weatherData[0].humidity) || undefined,
            rainfall: parseFloat(weatherData[0].rainfall) || undefined,
            wind_speed: parseFloat(weatherData[0].wind_speed) || undefined
          })
        }
      }

      // 獲取雲型辨識結果 (如果有)
      const { data: cloudData, error: cloudError } = await supabase
        .from('cloud_classification')
        .select('*')
        .eq('photo_id', photo.id)
        .limit(1)
      
      if (!cloudError && cloudData && cloudData.length > 0) {
        Object.assign(photoData, {
          cloud_type: cloudData[0].cloud_type,
          confidence: parseFloat(cloudData[0].confidence) || undefined
        })

        // 如果有雲型分布數據，解析它
        if (cloudData[0].cloud_distribution) {
          try {
            const distribution = JSON.parse(cloudData[0].cloud_distribution)
            photoData.cloud_type_distribution = distribution
          } catch (e) {
            console.warn('解析雲型分布數據失敗:', e)
          }
        }
      }

      return photoData
    }))

    return NextResponse.json(enhancedData)
  } catch (error) {
    console.error('獲取照片與氣象資料失敗:', error)
    return NextResponse.json({ error: '獲取照片與氣象資料失敗' }, { status: 500 })
  }
}
