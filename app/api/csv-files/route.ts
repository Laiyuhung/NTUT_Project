import { NextRequest, NextResponse } from 'next/server'

// 模擬CSV檔案資料 - 實際應用中這應該從資料庫獲取
const mockCsvFiles = [
  {
    id: '1',
    filename: 'taipei_weather_20250620.csv',
    station_name: '台北',
    upload_date: '2025-06-20',
    uploaded_at: '2025-06-20T12:00:00',
    record_count: 1440, // 一天每分鐘一筆記錄
    file_size: 245760, // 240KB
    file_url: '/uploads/csv/taipei_weather_20250620.csv'
  },
  {
    id: '2',
    filename: 'xinyi_weather_20250621.csv',
    station_name: '信義',
    upload_date: '2025-06-21',
    uploaded_at: '2025-06-21T15:30:00',
    record_count: 1440,
    file_size: 251904, // 246KB
    file_url: '/uploads/csv/xinyi_weather_20250621.csv'
  },
  {
    id: '3',
    filename: 'songshan_weather_20250622.csv',
    station_name: '松山',
    upload_date: '2025-06-22',
    uploaded_at: '2025-06-22T11:15:00',
    record_count: 1440,
    file_size: 248832, // 243KB
    file_url: '/uploads/csv/songshan_weather_20250622.csv'
  },
  {
    id: '4',
    filename: 'taipei_weather_20250623.csv',
    station_name: '台北',
    upload_date: '2025-06-23',
    uploaded_at: '2025-06-23T09:45:00',
    record_count: 1440,
    file_size: 247808, // 242KB
    file_url: '/uploads/csv/taipei_weather_20250623.csv'
  }
]

export async function GET(request: NextRequest) {
  try {
    // 在實際應用中，這裡應該從資料庫查詢CSV檔案資料
    const searchParams = request.nextUrl.searchParams
    const station = searchParams.get('station')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let filteredCsvs = mockCsvFiles

    if (station) {
      filteredCsvs = filteredCsvs.filter(csv => csv.station_name === station)
    }

    if (startDate) {
      filteredCsvs = filteredCsvs.filter(csv => csv.upload_date >= startDate)
    }

    if (endDate) {
      filteredCsvs = filteredCsvs.filter(csv => csv.upload_date <= endDate)
    }

    return NextResponse.json(filteredCsvs)
  } catch (error) {
    console.error('獲取CSV檔案清單失敗：', error)
    return NextResponse.json({ error: '獲取CSV檔案清單失敗' }, { status: 500 })
  }
}
