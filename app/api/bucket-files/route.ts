import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

export async function GET() {
  try {
    console.log('開始列出 uploads bucket 中 photos 資料夾的檔案...')
    
    // 列出 uploads bucket 中 photos 資料夾的所有檔案
    const { data: files, error } = await supabase.storage
      .from('uploads')
      .list('photos', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    console.log('Supabase Storage 回應:', { files, error })

    if (error) {
      console.error('列出 bucket 檔案失敗：', error)
      return NextResponse.json({ 
        error: '列出檔案失敗', 
        details: error.message 
      }, { status: 500 })
    }

    // 為每個檔案生成公開 URL
    const filesWithUrls = files?.map(file => {
      console.log('處理檔案:', file)
      
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(`photos/${file.name}`)
      
      return {
        name: file.name,
        size: file.metadata?.size || 0, // 使用 metadata.size
        created_at: file.created_at || '',
        updated_at: file.updated_at || '',
        public_url: urlData.publicUrl,
        // 加入原始檔案資訊以便調試
        raw_metadata: file.metadata,
        raw_file: file
      }
    }) || []

    console.log('處理後的檔案清單:', filesWithUrls)

    return NextResponse.json({
      bucket: 'uploads',
      folder: 'photos',
      file_count: filesWithUrls.length,
      files: filesWithUrls,
      // 加入原始回應以便調試
      raw_response: { files, error }
    })
  } catch (error) {
    console.error('獲取 bucket 檔案清單失敗：', error)
    return NextResponse.json({ 
      error: '獲取檔案清單失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
