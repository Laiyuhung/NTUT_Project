import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  try {
    // 列出 models 目录中的所有文件
    const { data: modelsFiles, error: modelsError } = await supabase.storage
      .from('uploads')
      .list('models', {
        limit: 100,
        offset: 0
      })

    if (modelsError) {
      console.error('無法列出模型檔案:', modelsError)
      return NextResponse.json({ error: '無法列出模型檔案' }, { status: 500 })
    }
    
    // 為每個檔案生成公開訪問URL
    const filesWithUrls = await Promise.all(modelsFiles.map(async (file) => {
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(`models/${file.name}`)
      
      return {
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at || '',
        updated_at: file.updated_at || '',
        url: urlData.publicUrl,
      }
    }))
    
    return NextResponse.json({
      success: true,
      files: filesWithUrls
    })
    
  } catch (error) {
    console.error('列出模型目錄時發生錯誤:', error)
    return NextResponse.json(
      { error: '列出模型目錄時發生錯誤' },
      { status: 500 }
    )
  }
}
