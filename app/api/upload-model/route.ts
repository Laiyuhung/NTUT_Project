import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// 配置路由處理大檔案上傳
export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60, // 增加超時時間到60秒
};

export async function POST(request: NextRequest) {
  try {
    // 增加請求體大小限制
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 200 * 1024 * 1024) { // 200MB 限制
      return NextResponse.json(
        { error: '文件太大，超過200MB限制' },
        { status: 413 }
      );
    }
    
    const formData = await request.formData();
    const modelFile = formData.get('model') as File;
    
    if (!modelFile) {
      return NextResponse.json(
        { error: '未提供模型檔案' },
        { status: 400 }
      );
    }
    
    // 驗證文件是否為 .pt 模型
    if (!modelFile.name.endsWith('.pt')) {
      return NextResponse.json(
        { error: '只支援 .pt 模型檔案' },
        { status: 400 }
      );
    }

    // 檔案名稱 - 存放在與 CSV 和照片相同層級的 models 文件夾
    const fileName = `models/${uuidv4()}-${modelFile.name}`;
    
    // 上傳模型到 Storage - 使用分塊上傳以支持大文件
    const arrayBuffer = await modelFile.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(fileName, fileBuffer, {
        contentType: 'application/octet-stream',
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      console.error('上傳錯誤詳情:', uploadError);
      throw uploadError;
    }
    
    // 獲取文件公開訪問 URL
    const { data: urlData } = await supabase.storage
      .from('uploads')
      .getPublicUrl(fileName);
      
    // 將模型資訊存儲到資料庫
    const { data, error } = await supabase
      .from('models')
      .insert({
        id: uuidv4(),
        name: modelFile.name,
        file_path: fileName,
        file_url: urlData.publicUrl,
        file_size: modelFile.size,
        is_active: false,  // 默認非活躍
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ 
      success: true, 
      model: data 
    });
    
  } catch (error) {
    console.error('上傳模型失敗:', error);
    return NextResponse.json(
      { success: false, error: '上傳模型失敗', details: error },
      { status: 500 }
    );
  }
}
