import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabaseClient'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const photoId = params.id

    // 從 Supabase 查詢照片資訊
    const { data: photo, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .single()

    if (error || !photo) {
      return NextResponse.json({ error: '找不到指定的照片' }, { status: 404 })
    }

    // 從 Supabase Storage 獲取檔案
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('photos') // 假設 bucket 名稱為 photos
      .download(photo.file_path || photo.filename)

    if (downloadError) {
      console.error('下載照片失敗：', downloadError)
      return NextResponse.json({ error: '下載照片失敗' }, { status: 500 })
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

  } catch (error) {
    console.error('下載照片失敗：', error)
    return NextResponse.json({ error: '下載照片失敗' }, { status: 500 })
  }
}
