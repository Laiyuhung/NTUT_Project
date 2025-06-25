import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import JSZip from 'jszip'

// 定義照片類型
type PhotoRecord = {
  id: string
  filename: string
  taken_at: string
  latitude: number
  longitude: number
  nearest_station: string
  uploaded_at?: string
  created_at?: string
  file_size: number
  file_url: string
  file_type?: string
}

export async function POST(request: NextRequest) {
  console.log('=== 批次下載 API 開始 ===')
  try {
    const { photoIds } = await request.json()
    console.log('接收到的 photoIds:', photoIds)

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      console.log('❌ 無效的照片ID陣列')
      return NextResponse.json({ error: '請提供有效的照片ID陣列' }, { status: 400 })
    }

    console.log('開始批次下載照片，ID 清單:', photoIds)

    // 從 Supabase 查詢照片資訊
    const { data: photos, error } = await supabase
      .from('photos')
      .select('*')
      .in('id', photoIds)

    if (error) {
      console.error('查詢照片失敗：', error)
      return NextResponse.json({ error: '查詢照片失敗' }, { status: 500 })
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: '找不到指定的照片' }, { status: 404 })
    }

    console.log('找到照片數量:', photos.length)

    // 如果只有一張照片，直接返回該照片
    if (photos.length === 1) {
      const photo = photos[0]
      console.log('單張照片下載:', photo.filename, photo.file_url)

      // 確保 file_url 格式正確
      let filePath = photo.file_url
      if (filePath.startsWith('/')) filePath = filePath.substring(1)
      if (!filePath.startsWith('photos/')) filePath = `photos/${filePath}`

      // 從 Supabase Storage 獲取檔案
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('uploads')
        .download(filePath)

      if (downloadError) {
        console.error('下載照片失敗：', downloadError, 'filePath:', filePath)
        return NextResponse.json({ error: `下載照片失敗: ${downloadError.message}` }, { status: 500 })
      }

      // 轉換為 ArrayBuffer 然後再轉為 Buffer
      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Disposition': `attachment; filename="${photo.filename}"`
        }
      })
    }    // 多張照片的情況，創建 ZIP 檔案
    const zip = new JSZip()
    let successCount = 0
    let errorCount = 0
    const processedPhotos: Array<{ 
      photo: PhotoRecord, 
      actualFilename: string 
    }> = []

    console.log('開始創建 ZIP 檔案...')

    // 並行下載所有照片並加入 ZIP
    const downloadPromises = photos.map(async (photo, index) => {
      try {
        console.log(`📸 下載照片 ${index + 1}/${photos.length}:`, photo.filename, 'file_url:', photo.file_url)

        // 確保 file_url 格式正確
        let filePath = photo.file_url
        if (filePath.startsWith('/')) filePath = filePath.substring(1)
        if (!filePath.startsWith('photos/')) filePath = `photos/${filePath}`

        console.log(`🔗 處理後的檔案路徑: ${filePath}`)

        const { data: fileData, error: downloadError } = await supabase.storage
          .from('uploads')
          .download(filePath)

        if (downloadError) {
          console.error(`❌ 下載照片 ${photo.filename} 失敗:`, downloadError)
          errorCount++
          return
        }

        console.log(`✅ 從 Storage 下載成功:`, photo.filename, 'size:', fileData.size)

        const arrayBuffer = await fileData.arrayBuffer()
        console.log(`📦 ArrayBuffer 大小:`, arrayBuffer.byteLength)

        // 確保檔名是唯一的，如果有重複則加上編號
        let filename = photo.filename || `photo_${photo.id}.jpg`
        
        // 檢查檔名是否包含非 ASCII 字符，如果有則進行處理
        const hasNonAscii = /[^\x00-\x7F]/.test(filename)
        if (hasNonAscii) {
          console.log('⚠️ 檔名包含非 ASCII 字符:', filename)
          // 保持原檔名，JSZip 應該能處理 UTF-8 檔名
        }
        
        if (zip.file(filename)) {
          const ext = filename.split('.').pop()
          const name = filename.replace(`.${ext}`, '')
          filename = `${name}_${photo.id}.${ext}`
        }

        zip.file(filename, arrayBuffer)
        
        // 記錄處理過的照片和實際使用的檔名
        processedPhotos.push({
          photo,
          actualFilename: filename
        })
        
        successCount++
        console.log(`✅ 成功加入 ZIP: ${filename}`)

      } catch (error) {
        console.error(`❌ 處理照片 ${photo.filename} 時發生錯誤:`, error)
        errorCount++
      }
    })

    // 等待所有下載完成
    await Promise.all(downloadPromises)

    console.log(`ZIP 創建完成，成功: ${successCount}, 失敗: ${errorCount}`)

    if (successCount === 0) {
      return NextResponse.json({ error: '所有照片下載都失敗了' }, { status: 500 })
    }    // 生成 ZIP 檔案
    console.log('🔄 開始生成 ZIP 檔案...')
    
    // 創建照片基本資料的 CSV，使用實際檔名
    const csvHeaders = 'ID,ZIP內檔名,原始檔名,拍攝時間,緯度,經度,最近測站,上傳時間,檔案類型\n'
    const csvRows = processedPhotos.map(({ photo, actualFilename }) => {
      // 處理可能包含逗號的欄位，用雙引號包圍
      const escapeCSV = (value: string | number | null | undefined) => {
        if (value === null || value === undefined) return ''
        const str = String(value)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }
      
      return [
        escapeCSV(photo.id),
        escapeCSV(actualFilename),
        escapeCSV(photo.filename),
        escapeCSV(photo.taken_at),
        escapeCSV(photo.latitude),
        escapeCSV(photo.longitude),
        escapeCSV(photo.nearest_station),
        escapeCSV(photo.uploaded_at || photo.created_at),
        escapeCSV(photo.file_type || 'image/jpeg')
      ].join(',')
    }).join('\n')
      const csvContent = csvHeaders + csvRows
    console.log('📊 CSV 資料準備完成，包含', processedPhotos.length, '筆照片資料')
    
    // 將 CSV 加入 ZIP
    zip.file('photos_metadata.csv', csvContent, { binary: false })
    
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    console.log('✅ ZIP 檔案生成完成，大小:', zipBuffer.length, 'bytes')

    // 使用時間戳作為檔名避免重複
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
    const filename = `photos_${timestamp}_${successCount}photos.zip`
    
    // 使用 ASCII 安全的檔案名，避免中文字符編碼問題
    const safeFilename = encodeURIComponent(filename)

    console.log('📦 準備回傳 ZIP 檔案:', filename)

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${safeFilename}`
      }
    })
  } catch (error) {
    console.error('❌ 批次下載照片失敗：', error)
    console.error('錯誤堆疊:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: '批次下載失敗', 
      details: error instanceof Error ? error.message : '未知錯誤',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
