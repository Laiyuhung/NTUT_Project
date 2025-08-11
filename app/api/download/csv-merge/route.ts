import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { csvIds, filters } = await request.json()

    if (!csvIds || !Array.isArray(csvIds) || csvIds.length === 0) {
      return NextResponse.json({ error: '請提供有效的CSV檔案ID陣列' }, { status: 400 })
    }

    // 從 Supabase 查詢 CSV 檔案資訊
    let query = supabase
      .from('station_csv_uploads')
      .select('*')
      .in('id', csvIds)

    // 進一步根據篩選條件過濾
    if (filters) {
      if (filters.station) {
        query = query.eq('station_name', filters.station)
      }
      if (filters.startDate) {
        query = query.gte('upload_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('upload_date', filters.endDate)
      }
    }

    const { data: csvFiles, error } = await query

    if (error) {
      console.error('查詢CSV檔案失敗：', error)
      return NextResponse.json({ error: '查詢CSV檔案失敗' }, { status: 500 })
    }

    if (!csvFiles || csvFiles.length === 0) {
      return NextResponse.json({ error: '沒有符合條件的資料' }, { status: 400 })
    }

    // 第一步：收集所有CSV檔案的內容和標頭
    const allCsvData: Array<{
      headers: string[],
      rows: string[][],
      uploadDate: string,
      stationName: string
    }> = []

    for (const csvFile of csvFiles) {
      try {
        // 從 Supabase Storage 下載 CSV 檔案
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('uploads') // 所有檔案都在 uploads bucket
          .download(csvFile.file_url)

        if (downloadError) {
          console.error(`下載檔案 ${csvFile.file_url} 失敗：`, downloadError)
          continue
        }

        // 將 Blob 轉換為文字
        const csvContent = await fileData.text()
        const lines = csvContent.split('\n').filter(line => line.trim() !== '')

        if (lines.length < 2) continue // 至少需要兩列（忽略第一列，第二列是標頭）

        // 解析標頭和資料行（忽略第一列，使用第二列作為標頭）
        const headers = lines[1].split(',').map(h => h.trim())
        const rows = lines.slice(2).map(line => line.split(',').map(cell => cell.trim()))

        allCsvData.push({
          headers,
          rows,
          uploadDate: csvFile.upload_date,
          stationName: csvFile.station_name
        })
      } catch (fileError) {
        console.error(`處理檔案 ${csvFile.file_url} 時發生錯誤：`, fileError)
        continue
      }
    }

    if (allCsvData.length === 0) {
      return NextResponse.json({ error: '無法讀取任何CSV資料' }, { status: 500 })
    }

    // 第二步：找出最完整的標頭（欄位數量最多的）
    let masterHeaders: string[] = []
    let maxColumnCount = 0

    for (const csvData of allCsvData) {
      if (csvData.headers.length > maxColumnCount) {
        maxColumnCount = csvData.headers.length
        masterHeaders = csvData.headers
      }
    }

    // 加上固定的欄位
    const finalHeaders = [...masterHeaders, '上傳日期', '測站名稱']

    // 第三步：對齊所有資料到統一格式
    const mergedData: string[] = []
    
    // 加入標頭
    mergedData.push(finalHeaders.join(','))

    // 處理每個CSV的資料
    for (const csvData of allCsvData) {
      for (const row of csvData.rows) {
        const alignedRow: string[] = []
        
        // 對照主標頭，填入對應資料或NA
        for (const masterHeader of masterHeaders) {
          const headerIndex = csvData.headers.indexOf(masterHeader)
          if (headerIndex !== -1 && headerIndex < row.length) {
            alignedRow.push(row[headerIndex] || 'NA')
          } else {
            alignedRow.push('NA')
          }
        }
        
        // 加上上傳日期和測站名稱
        alignedRow.push(csvData.uploadDate)
        alignedRow.push(csvData.stationName)
        
        mergedData.push(alignedRow.join(','))
      }
    }

    if (mergedData.length === 0) {
      return NextResponse.json({ error: '無法讀取任何CSV資料' }, { status: 500 })
    }

    // 建立合併後的CSV內容
    const csvContent = mergedData.join('\n')    // 返回合併後的CSV檔案
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) // YYYYMMDDTHHMMSS
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="merged_data_${timestamp}.csv"`
      }
    })

  } catch (error) {
    console.error('合併下載CSV失敗：', error)
    return NextResponse.json({ error: '合併下載失敗' }, { status: 500 })
  }
}
