// app/api/upload-csv/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const station_name = formData.get('station_name') as string
  const upload_date = formData.get('upload_date') as string // yyyy-mm-dd

  if (!file || !station_name || !upload_date) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const filePath = `csv/${station_name}_${upload_date}_${uuidv4()}.csv`

  // 1. 上傳 CSV
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(filePath, file, {
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // 2. 寫入 station_csv_uploads 表
  const { error: insertError } = await supabase.from('station_csv_uploads').insert({
    station_name,
    upload_date,
    file_url: uploadData?.path,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, filePath })
}
