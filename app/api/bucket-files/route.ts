import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

export async function GET() {
  try {
    console.log('開始列出 uploads bucket 中的檔案...')
    
    // 首先嘗試列出根目錄
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from('uploads')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    console.log('根目錄回應:', { rootFiles, rootError })

    // 然後嘗試列出 photos 資料夾
    const { data: photosFiles, error: photosError } = await supabase.storage
      .from('uploads')
      .list('photos', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    console.log('photos 資料夾回應:', { photosFiles, photosError })

    // 測試不同的 bucket 名稱（以防名稱錯誤）
    const { data: publicFiles, error: publicError } = await supabase.storage
      .from('public')
      .list('photos', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    console.log('public bucket 回應:', { publicFiles, publicError })

    // 列出所有 bucket
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    console.log('所有 buckets:', { buckets, bucketsError })

    const files = photosFiles || []
    
    // 為每個檔案生成公開 URL
    const filesWithUrls = files?.map(file => {
      console.log('處理檔案:', file)
      
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(`photos/${file.name}`)
      
      return {
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at || '',
        updated_at: file.updated_at || '',
        public_url: urlData.publicUrl,
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
      debug_info: {
        root_files: rootFiles,
        root_error: rootError,
        photos_files: photosFiles,
        photos_error: photosError,
        public_files: publicFiles,
        public_error: publicError,
        all_buckets: buckets,
        buckets_error: bucketsError
      }
    })
  } catch (error) {
    console.error('獲取 bucket 檔案清單失敗：', error)
    return NextResponse.json({ 
      error: '獲取檔案清單失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
