import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { modelId } = await request.json();
    
    if (!modelId) {
      return NextResponse.json(
        { error: '未提供模型 ID' },
        { status: 400 }
      );
    }
    
    // 先重設所有模型為非活躍狀態
    const { error: resetError } = await supabase
      .from('models')
      .update({ is_active: false })
      .neq('id', '');
      
    if (resetError) {
      throw resetError;
    }
    
    // 將指定的模型設為活躍
    const { data, error } = await supabase
      .from('models')
      .update({ is_active: true })
      .eq('id', modelId)
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
    console.error('設置活躍模型失敗:', error);
    return NextResponse.json(
      { success: false, error: '設置活躍模型失敗', details: error },
      { status: 500 }
    );
  }
}
