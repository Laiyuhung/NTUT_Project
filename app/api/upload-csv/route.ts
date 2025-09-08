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


// 取得所有 station_code_map
type StationCodeMapRow = { station_code: string; station_name: string }
async function getStationCodeMap() {
  const { data, error } = await supabase
    .from('station_code_map')
    .select('station_code, station_name')
  if (error) throw new Error('查詢 station_code_map 失敗')
  const codeToName = new Map<string, string>();
  (data as StationCodeMapRow[] | null)?.forEach((row: StationCodeMapRow) => {
    codeToName.set(row.station_code, row.station_name)
  })
  return { codeToName }
}

export async function POST(req: NextRequest) {
  console.log('📥 [upload-csv] 多檔案上傳請求')
  const formData = await req.formData()
  const files = formData.getAll('file') as File[]
  if (!files.length) {
    return NextResponse.json({ error: '缺少檔案' }, { status: 400 })
  }

  // 取得 code->name map
  let codeToName: Map<string, string>
  try {
    ({ codeToName } = await getStationCodeMap())
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : '未知錯誤'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }

  const results = []
  for (const file of files) {
    // 解析檔名: C0AC80-2025-07-02.csv、466920-2025-09-05.csv 或 466920-2025-09-05 (1).csv
    const match = file.name.match(/^([A-Za-z0-9]+)-(\d{4}-\d{2}-\d{2})(?: \(\d+\))?\.csv$/)
    // const match = file.name.match(/^(\d+)-(\d{4}-\d{2}-\d{2})\.csv$/)
    if (!match) {
      results.push({ file: file.name, error: '檔名格式錯誤' })
      continue
    }
  const [, station_code, upload_date] = match
    const station_name = codeToName.get(station_code)
    if (!station_name) {
      results.push({ file: file.name, error: `查無測站碼: ${station_code}` })
      continue
    }
    const filePath = `csv/${station_code}_${upload_date}_${uuidv4()}.csv`
    // 上傳
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, { upsert: false })
    if (uploadError) {
      results.push({ file: file.name, error: uploadError.message })
      continue
    }
    // 刪除舊資料（同 station_name 與 upload_date）
    const { error: deleteError } = await supabase
      .from('station_csv_uploads')
      .delete()
      .eq('station_name', station_name)
      .eq('upload_date', upload_date)
    if (deleteError) {
      results.push({ file: file.name, error: '刪除舊資料失敗: ' + deleteError.message })
      continue
    }
    // 寫入 DB
    const { error: insertError } = await supabase.from('station_csv_uploads').insert({
      station_name,
      upload_date,
      file_url: uploadData?.path,
    })
    if (insertError) {
      results.push({ file: file.name, error: insertError.message })
      continue
    }
    results.push({ file: file.name, success: true, filePath })
  }
  return NextResponse.json({ results })
}
