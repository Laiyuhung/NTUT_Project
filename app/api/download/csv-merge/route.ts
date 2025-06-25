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
      .from('csv_uploads')
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

    // 合併CSV資料
    const mergedData: string[] = []
    let headerAdded = false

    for (const csvFile of csvFiles) {
      try {        // 從 Supabase Storage 下載 CSV 檔案
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('csv') // CSV 檔案存儲在 csv bucket
          .download(csvFile.file_path || csvFile.filename)

        if (downloadError) {
          console.error(`下載檔案 ${csvFile.filename} 失敗：`, downloadError)
          continue
        }

        // 將 Blob 轉換為文字
        const csvContent = await fileData.text()
        const lines = csvContent.split('\n').filter(line => line.trim() !== '')

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          
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
      } catch (fileError) {
        console.error(`處理檔案 ${csvFile.filename} 時發生錯誤：`, fileError)
        continue
      }
    }

    if (mergedData.length === 0) {
      return NextResponse.json({ error: '無法讀取任何CSV資料' }, { status: 500 })
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
