import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
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

    // 檔案名稱
    const fileName = `models/${uuidv4()}-${modelFile.name}`;
    
    // 上傳模型到 Storage
    const { error: uploadError } = await supabase.storage
      .from('yolo-models')
      .upload(fileName, modelFile);
      
    if (uploadError) {
      throw uploadError;
    }
    
    // 獲取文件公開訪問 URL
    const { data: urlData } = await supabase.storage
      .from('yolo-models')
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
