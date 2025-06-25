import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { csvIds, filters } = await request.json()

    if (!csvIds || !Array.isArray(csvIds) || csvIds.length === 0) {
      return NextResponse.json({ error: '請提供有效的CSV檔案ID陣列' }, { status: 400 })
    }

    // 在實際應用中，這裡應該從資料庫獲取CSV檔案資訊
    // 並根據篩選條件合併資料
    
    // 模擬CSV資料
    const mockCsvData = [
      {
        id: '1',
        filename: 'taipei_weather_20250620.csv',
        station_name: '台北',
        upload_date: '2025-06-20',
        data: [
          'timestamp,temperature,humidity,pressure,station',
          '2025-06-20 00:00:00,25.5,70,1013.2,台北',
          '2025-06-20 01:00:00,25.2,72,1013.5,台北',
          '2025-06-20 02:00:00,24.8,75,1013.8,台北'
        ]
      },
      {
        id: '2',
        filename: 'xinyi_weather_20250621.csv',
        station_name: '信義',
        upload_date: '2025-06-21',
        data: [
          'timestamp,temperature,humidity,pressure,station',
          '2025-06-21 00:00:00,26.1,68,1012.8,信義',
          '2025-06-21 01:00:00,25.8,70,1013.1,信義',
          '2025-06-21 02:00:00,25.5,72,1013.4,信義'
        ]
      },
      {
        id: '3',
        filename: 'songshan_weather_20250622.csv',
        station_name: '松山',
        upload_date: '2025-06-22',
        data: [
          'timestamp,temperature,humidity,pressure,station',
          '2025-06-22 00:00:00,25.8,71,1013.0,松山',
          '2025-06-22 01:00:00,25.5,73,1013.3,松山',
          '2025-06-22 02:00:00,25.2,75,1013.6,松山'
        ]
      }
    ]

    // 根據選擇的ID篩選資料
    const selectedCsvs = mockCsvData.filter(csv => csvIds.includes(csv.id))

    // 進一步根據篩選條件過濾
    let filteredCsvs = selectedCsvs
    if (filters) {
      if (filters.station) {
        filteredCsvs = filteredCsvs.filter(csv => csv.station_name === filters.station)
      }
      if (filters.startDate) {
        filteredCsvs = filteredCsvs.filter(csv => csv.upload_date >= filters.startDate)
      }
      if (filters.endDate) {
        filteredCsvs = filteredCsvs.filter(csv => csv.upload_date <= filters.endDate)
      }
    }

    if (filteredCsvs.length === 0) {
      return NextResponse.json({ error: '沒有符合條件的資料' }, { status: 400 })
    }

    // 合併CSV資料
    const mergedData: string[] = []
    let headerAdded = false

    for (const csv of filteredCsvs) {
      for (let i = 0; i < csv.data.length; i++) {
        const line = csv.data[i]
        
        // 只加入一次標頭
        if (i === 0) {
          if (!headerAdded) {
            mergedData.push(line)
            headerAdded = true
          }
          continue
        }
        
        // 加入資料行
        mergedData.push(line)
      }
    }

    // 建立合併後的CSV內容
    const csvContent = mergedData.join('\n')

    // 返回合併後的CSV檔案
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="merged_data_${new Date().toISOString().slice(0, 10)}.csv"`
      }
    })

  } catch (error) {
    console.error('合併下載CSV失敗：', error)
    return NextResponse.json({ error: '合併下載失敗' }, { status: 500 })
  }
}
