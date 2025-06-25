import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  console.log('📥 [upload-csv] 接收到請求')

  const formData = await req.formData()
  const file = formData.get('file') as File
  const station_name = formData.get('station_name') as string
  const upload_date = formData.get('upload_date') as string

  console.log('📄 formData:', {
    file: file?.name,
    station_name,
    upload_date,
  })

  if (!file || !station_name || !upload_date) {
    console.error('❌ 缺少必要欄位')
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // 🔍 查詢 station_code
  const { data: mapData, error: mapError } = await supabase
    .from('station_code_map')
    .select('station_code')
    .eq('station_name', station_name)
    .maybeSingle()

  console.log('🗺️ station_code 查詢結果:', { mapData, mapError })

  if (mapError || !mapData) {
    return NextResponse.json({ error: `查無站名：${station_name}` }, { status: 400 })
  }

  const station_code = mapData.station_code
  const filePath = `csv/${station_code}_${upload_date}_${uuidv4()}.csv`

  console.log('📁 準備上傳路徑:', filePath)
  // 上傳 CSV
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('csv')
    .upload(filePath, file, { upsert: false })

  if (uploadError) {
    console.error('❌ 上傳錯誤:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  console.log('✅ 檔案上傳成功:', uploadData?.path)

  // 寫入 DB
  const { error: insertError } = await supabase.from('station_csv_uploads').insert({
    station_name,
    upload_date,
    file_url: uploadData?.path,
  })

  if (insertError) {
    console.error('❌ 寫入資料表錯誤:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  console.log('✅ 資料表寫入成功')

  return NextResponse.json({ success: true, filePath })
}
