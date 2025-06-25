import { NextRequest, NextResponse } from 'next/server'

// 模擬照片資料 - 實際應用中這應該從資料庫獲取
const mockPhotos = [
  {
    id: '1',
    filename: 'weather_photo_001.jpg',
    taken_at: '2025-06-20T10:30:00',
    latitude: 25.0478,
    longitude: 121.5319,
    nearest_station: '台北',
    uploaded_at: '2025-06-20T11:00:00',
    file_size: 2048576, // 2MB
    file_url: '/uploads/photos/weather_photo_001.jpg'
  },
  {
    id: '2',
    filename: 'weather_photo_002.jpg',
    taken_at: '2025-06-21T14:15:00',
    latitude: 25.0375,
    longitude: 121.5637,
    nearest_station: '信義',
    uploaded_at: '2025-06-21T14:30:00',
    file_size: 1834567,
    file_url: '/uploads/photos/weather_photo_002.jpg'
  },
  {
    id: '3',
    filename: 'weather_photo_003.jpg',
    taken_at: '2025-06-22T09:45:00',
    latitude: 25.0855,
    longitude: 121.5606,
    nearest_station: '松山',
    uploaded_at: '2025-06-22T10:00:00',
    file_size: 2156789,
    file_url: '/uploads/photos/weather_photo_003.jpg'
  }
]

export async function GET(request: NextRequest) {
  try {
    // 在實際應用中，這裡應該從資料庫查詢照片資料
    // 可以根據查詢參數進行篩選
    const searchParams = request.nextUrl.searchParams
    const station = searchParams.get('station')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let filteredPhotos = mockPhotos

    if (station) {
      filteredPhotos = filteredPhotos.filter(photo => photo.nearest_station === station)
    }

    if (startDate) {
      filteredPhotos = filteredPhotos.filter(photo => photo.taken_at >= startDate)
    }

    if (endDate) {
      filteredPhotos = filteredPhotos.filter(photo => photo.taken_at <= endDate)
    }

    return NextResponse.json(filteredPhotos)
  } catch (error) {
    console.error('獲取照片清單失敗：', error)
    return NextResponse.json({ error: '獲取照片清單失敗' }, { status: 500 })
  }
}
