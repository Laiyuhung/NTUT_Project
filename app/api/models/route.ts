import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// 獲取已上傳的模型列表
export async function GET() {
  try {
    // 從模型資料表中獲取模型列表
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .order('uploaded_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    console.error('獲取模型列表失敗:', error);
    return NextResponse.json(
      { error: '獲取模型列表失敗', details: error }, 
      { status: 500 }
    );
  }
}
