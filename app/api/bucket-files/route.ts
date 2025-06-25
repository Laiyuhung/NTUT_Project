import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

export async function GET() {
  try {
    console.log('開始測試 Storage 讀取權限...')
    
    // 測試 1: 嘗試直接讀取已知存在的檔案
    // 從上傳程式碼看，檔案會存在 photos/ 資料夾中
    console.log('測試 1: 嘗試讀取 photos 資料夾...')
    const { data: photosFiles, error: photosError } = await supabase.storage
      .from('uploads')
      .list('photos', {
        limit: 100,
        offset: 0
      })

    console.log('photos 資料夾結果:', { photosFiles, photosError })

    // 測試 2: 嘗試讀取 csv 資料夾
    console.log('測試 2: 嘗試讀取 csv 資料夾...')
    const { data: csvFiles, error: csvError } = await supabase.storage
      .from('uploads')
      .list('csv', {
        limit: 100,
        offset: 0
      })

    console.log('csv 資料夾結果:', { csvFiles, csvError })

    // 測試 3: 嘗試讀取根目錄
    console.log('測試 3: 嘗試讀取根目錄...')
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from('uploads')
      .list('', {
        limit: 100,
        offset: 0
      })

    console.log('根目錄結果:', { rootFiles, rootError })

    // 測試 4: 列出所有 buckets（這個最常失敗）
    console.log('測試 4: 嘗試列出所有 buckets...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    console.log('buckets 結果:', { buckets, bucketsError })

    // 如果 photos 有檔案，生成 URL
    const filesWithUrls = photosFiles?.map(file => {
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(`photos/${file.name}`)
      
      return {
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at || '',
        updated_at: file.updated_at || '',
        public_url: urlData.publicUrl
      }
    }) || []

    return NextResponse.json({
      success: true,
      tests: {
        photos_folder: {
          files: photosFiles,
          error: photosError,
          count: photosFiles?.length || 0
        },
        csv_folder: {
          files: csvFiles,
          error: csvError,
          count: csvFiles?.length || 0
        },
        root_folder: {
          files: rootFiles,
          error: rootError,
          count: rootFiles?.length || 0
        },
        list_buckets: {
          buckets: buckets,
          error: bucketsError
        }
      },
      photo_files_with_urls: filesWithUrls,
      total_photos: filesWithUrls.length
    })
  } catch (error) {
    console.error('獲取 bucket 檔案清單失敗：', error)
    return NextResponse.json({ 
      error: '獲取檔案清單失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
