// app/api/upload-photo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

// 配置路由處理大檔案上傳
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb', // 增加到100MB的限制
    },
  },
};

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const taken_at = formData.get('taken_at') as string
  const latitude = formData.get('latitude') as string
  const longitude = formData.get('longitude') as string
  const nearest_station = formData.get('nearest_station') as string

  if (!file) return NextResponse.json({ error: '缺少檔案' }, { status: 400 })

  const filePath = `photos/${uuidv4()}-${file.name}`  // 1. 上傳檔案
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // 2. 寫入資料表
  const { error: insertError } = await supabase.from('photos').insert({
    file_url: uploadData?.path,
    file_type: file.type,
    taken_at,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    nearest_station,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, filePath })
}
