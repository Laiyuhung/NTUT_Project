import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

export async function GET() {
  try {
    console.log('🔍 開始測試 Storage 讀取權限...')
    
    // 測試 1: 嘗試直接讀取已知存在的檔案
    console.log('📁 測試 1: 嘗試讀取 photos 資料夾...')
    const { data: photosFiles, error: photosError } = await supabase.storage
      .from('uploads')
      .list('photos', {
        limit: 100,
        offset: 0
      })

    console.log('📸 photos 資料夾結果:', { 
      count: photosFiles?.length || 0, 
      files: photosFiles, 
      error: photosError 
    })

    // 測試 2: 嘗試讀取 csv 資料夾
    console.log('📊 測試 2: 嘗試讀取 csv 資料夾...')
    const { data: csvFiles, error: csvError } = await supabase.storage
      .from('uploads')
      .list('csv', {
        limit: 100,
        offset: 0
      })

    console.log('📋 csv 資料夾結果:', { 
      count: csvFiles?.length || 0, 
      files: csvFiles, 
      error: csvError 
    })

    // 如果 photos 有檔案，生成 URL 並測試是否可以存取
    const filesWithUrls = photosFiles?.map(file => {
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(`photos/${file.name}`)
      
      console.log(`🔗 為檔案 ${file.name} 生成 URL:`, urlData.publicUrl)
      
      return {
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at || '',
        updated_at: file.updated_at || '',
        public_url: urlData.publicUrl
      }
    }) || []

    const result = {
      success: true,
      message: '權限測試完成',
      results: {
        photos_folder: {
          success: !photosError && Array.isArray(photosFiles),
          count: photosFiles?.length || 0,
          error: photosError?.message || null
        },
        csv_folder: {
          success: !csvError && Array.isArray(csvFiles),
          count: csvFiles?.length || 0,
          error: csvError?.message || null
        }
      },
      photo_files: filesWithUrls,
      total_photos: filesWithUrls.length,
      next_steps: filesWithUrls.length > 0 
        ? '✅ 成功！現在可以測試照片頁面了' 
        : '⚠️ 沒有找到照片檔案，請確認是否有上傳照片'
    }

    console.log('🎉 最終結果:', result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('獲取 bucket 檔案清單失敗：', error)
    return NextResponse.json({ 
      error: '獲取檔案清單失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
