import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 前端傳來: { files: [csvText1, csvText2, ...] }
    const { files } = await request.json()
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: '請提供要合併的CSV檔案內容' }, { status: 400 })
    }

    // 解析所有檔案內容，合併標頭與資料
    // 取所有檔案欄位名稱聯集
    const headerSet = new Set<string>()
    const allRows: { row: string[], headers: string[] }[] = []
    for (let i = 0; i < files.length; i++) {
      const csv = files[i]
      const lines = csv.split('\n').filter((line: string) => line.trim() !== '')
      if (lines.length < 2) continue
      const headers = lines[0].split(',').map((h: string) => h.trim())
      headers.forEach((h: string) => headerSet.add(h))
      const rows = lines.slice(1).map((line: string) => line.split(',').map((cell: string) => cell.trim()))
      for (const row of rows) {
        allRows.push({ row, headers })
      }
    }
    const masterHeaders = Array.from(headerSet)
    if (masterHeaders.length === 0 || allRows.length === 0) {
      return NextResponse.json({ error: '無法解析任何CSV內容' }, { status: 400 })
    }
    // 對齊所有資料到主標頭
    const merged: string[] = [masterHeaders.join(',')]
    for (const { row, headers } of allRows) {
      const aligned: string[] = []
      for (const h of masterHeaders) {
        const idx = headers.indexOf(h)
        aligned.push(idx !== -1 && idx < row.length ? row[idx] : 'NA')
      }
      merged.push(aligned.join(','))
    }
    const csvContent = merged.join('\n')
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="merged_final_${timestamp}.csv"`
      }
    })
  } catch (error) {
    console.error('合併CSV檔案失敗:', error)
    return NextResponse.json({ error: '合併CSV檔案失敗' }, { status: 500 })
  }
}
