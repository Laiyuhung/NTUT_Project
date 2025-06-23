import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const station_name = formData.get('station_name') as string
  const upload_date = formData.get('upload_date') as string

  if (!file || !station_name || !upload_date) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // ✅ 查出 station_code 對應的英文編號
  const { data: mapData, error: mapError } = await supabase
    .from('station_code_map')
    .select('station_code')
    .eq('station_name', station_name)
    .maybeSingle()

  if (mapError || !mapData) {
    return NextResponse.json({ error: `查無站名：${station_name}` }, { status: 400 })
  }

  const station_code = mapData.station_code
  const filePath = `csv/${station_code}_${upload_date}_${uuidv4()}.csv` // ✅ 改成用代號

  // 上傳檔案
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(filePath, file, { upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // 寫入資料表：仍使用原始中文名稱
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
