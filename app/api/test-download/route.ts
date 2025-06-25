import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('測試 API 被調用')
    
    // 創建一個簡單的測試文件
    const testContent = 'This is a test file for download functionality'
    const buffer = Buffer.from(testContent, 'utf8')
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="test.txt"'
      }
    })
  } catch (error) {
    console.error('測試 API 錯誤:', error)
    return NextResponse.json({ error: '測試失敗' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST 測試 API 被調用')
    const body = await request.json()
    console.log('接收到的 body:', body)
    
    return NextResponse.json({ 
      success: true, 
      message: '測試成功',
      receivedData: body 
    })
  } catch (error) {
    console.error('POST 測試 API 錯誤:', error)
    return NextResponse.json({ error: '測試失敗' }, { status: 500 })
  }
}
