import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import JSZip from 'jszip'

export async function POST(request: NextRequest) {
  try {
    const { photoIds } = await request.json()

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
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
    }

    // 多張照片的情況，創建 ZIP 檔案
    const zip = new JSZip()
    let successCount = 0
    let errorCount = 0

    console.log('開始創建 ZIP 檔案...')

    // 並行下載所有照片並加入 ZIP
    const downloadPromises = photos.map(async (photo, index) => {
      try {
        console.log(`下載照片 ${index + 1}/${photos.length}:`, photo.filename)

        // 確保 file_url 格式正確
        let filePath = photo.file_url
        if (filePath.startsWith('/')) filePath = filePath.substring(1)
        if (!filePath.startsWith('photos/')) filePath = `photos/${filePath}`

        const { data: fileData, error: downloadError } = await supabase.storage
          .from('uploads')
          .download(filePath)

        if (downloadError) {
          console.error(`下載照片 ${photo.filename} 失敗:`, downloadError)
          errorCount++
          return
        }

        const arrayBuffer = await fileData.arrayBuffer()
        
        // 確保檔名是唯一的，如果有重複則加上編號
        let filename = photo.filename || `photo_${photo.id}.jpg`
        if (zip.file(filename)) {
          const ext = filename.split('.').pop()
          const name = filename.replace(`.${ext}`, '')
          filename = `${name}_${photo.id}.${ext}`
        }

        zip.file(filename, arrayBuffer)
        successCount++
        console.log(`成功加入 ZIP: ${filename}`)

      } catch (error) {
        console.error(`處理照片 ${photo.filename} 時發生錯誤:`, error)
        errorCount++
      }
    })

    // 等待所有下載完成
    await Promise.all(downloadPromises)

    console.log(`ZIP 創建完成，成功: ${successCount}, 失敗: ${errorCount}`)

    if (successCount === 0) {
      return NextResponse.json({ error: '所有照片下載都失敗了' }, { status: 500 })
    }

    // 生成 ZIP 檔案
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    const today = new Date().toISOString().slice(0, 10)
    const filename = `photos_batch_${today}_${successCount}張.zip`

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('批次下載照片失敗：', error)
    return NextResponse.json({ error: '批次下載失敗' }, { status: 500 })
  }
}
