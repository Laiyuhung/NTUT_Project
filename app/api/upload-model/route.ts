import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// 設定最大文件大小 (200MB)
export const maxDuration = 300; // 5分鐘超時
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 不限制檔案大小
    const formData = await request.formData();
    const modelFile = formData.get('model') as File;
    const originalFileName = formData.get('originalFileName') as string || '';
    
    if (!modelFile) {
      return NextResponse.json(
        { error: '未提供模型檔案' },
        { status: 400 }
      );
    }
    
    // 確認文件類型
    let modelFileName;
    if (modelFile.name.endsWith('.zip')) {
      // 如果是壓縮文件，我們直接上傳壓縮文件
      // 在這個簡化的版本中，我們接受壓縮文件並相信客戶端已經提供了原始文件名
      modelFileName = originalFileName || 'unknown-model.pt';
    } else if (modelFile.name.endsWith('.pt')) {
      // 如果是pt文件，直接使用
      modelFileName = modelFile.name;
    } else {
      return NextResponse.json(
        { error: '只支援 .pt 模型文件或包含 .pt 文件的壓縮包' },
        { status: 400 }
      );
    }
    
    // 獲取文件內容
    const fileArrayBuffer = await modelFile.arrayBuffer();
    const fileBuffer = new Uint8Array(fileArrayBuffer);
    
    // 檔案名稱 - 存放在與 CSV 和照片相同層級的 models 文件夾
    const fileName = `models/${uuidv4()}-${modelFileName}`;
    
    // 上傳模型到 Storage

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
        name: modelFileName,
        file_path: fileName,
        file_url: urlData.publicUrl,
        file_size: fileBuffer.length,
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
