import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

export async function GET() {
  try {
    // 列出 uploads bucket 中 photos 資料夾的所有檔案
    const { data: files, error } = await supabase.storage
      .from('uploads')
      .list('photos', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      console.error('列出 bucket 檔案失敗：', error)
      return NextResponse.json({ 
        error: '列出檔案失敗', 
        details: error.message 
      }, { status: 500 })
    }

    // 為每個檔案生成公開 URL
    const filesWithUrls = files?.map(file => {
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(`photos/${file.name}`)
      
      return {
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at,
        updated_at: file.updated_at,
        public_url: urlData.publicUrl
      }
    }) || []

    return NextResponse.json({
      bucket: 'uploads',
      folder: 'photos',
      file_count: filesWithUrls.length,
      files: filesWithUrls
    })
  } catch (error) {
    console.error('獲取 bucket 檔案清單失敗：', error)
    return NextResponse.json({ 
      error: '獲取檔案清單失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
