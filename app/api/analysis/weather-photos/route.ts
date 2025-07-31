import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'

// 定義雲型
const cloudTypes = [
  { id: 'Cu', name: '積雲', description: '低空雲，像棉花糖一樣蓬鬆' },
  { id: 'Ci', name: '卷雲', description: '高空雲，像羽毛一樣輕薄' },
  { id: 'St', name: '層雲', description: '低空雲，灰色均勻的雲層' },
  { id: 'As', name: '高層雲', description: '中高空雲，灰白色雲蓋' },
  { id: 'Ns', name: '雨層雲', description: '低空雲，灰色雲層伴隨持續降雨' },
  { id: 'Sc', name: '層積雲', description: '低空雲，灰白色或灰色的雲塊' },
  { id: 'Cb', name: '積雨雲', description: '垂直發展雲，常伴隨雷暴' },
  { id: 'Ac', name: '高積雲', description: '中空雲，白色或灰色雲團' },
  { id: 'Cc', name: '卷積雲', description: '高空雲，小而圓的白色雲團' },
  { id: 'Cs', name: '卷層雲', description: '高空雲，薄而透明的白色雲層' },
];

// 定義 Supabase 照片資料結構
interface PhotoRecord {
  id: number;
  file_url?: string;
  taken_at: string;
  station_id: string;
  nearest_station?: string;
  latitude?: string;
  longitude?: string;
  [key: string]: string | number | boolean | null | undefined; // 其他屬性
}

export async function GET() {
  try {
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('*')
      .order('taken_at', { ascending: false })
    
    if (photosError) {
      console.error('獲取照片錯誤:', photosError)
      return NextResponse.json({ error: '獲取照片資料失敗' }, { status: 500 })
    }

    // 定義照片數據類型
    type PhotoData = {
      photo_id: string;
      photo_url: string;
      timestamp: string;
      station_id: string;
      station_name: string;
      latitude: number;
      longitude: number;
      temperature?: number;
      humidity?: number;
      rainfall?: number;
      wind_speed?: number;
      cloud_type?: string;
      confidence?: number;
      cloud_type_distribution?: Record<string, number>;
    };
    
    // 增強照片數據，加入氣象資料和雲型辨識結果
    const enhancedData = await Promise.all(photos.map(async (photo: PhotoRecord) => {
      // 基本照片資料
      const photoData: PhotoData = {
        photo_id: photo.id.toString(),
        photo_url: photo.file_url || '',
        timestamp: photo.taken_at,
        station_id: photo.nearest_station || '未知測站',
        station_name: photo.nearest_station || '未知測站',
        latitude: photo.latitude ? parseFloat(photo.latitude) : 0,
        longitude: photo.longitude ? parseFloat(photo.longitude) : 0,
      }

      // 確保檔案 URL 是完整路徑
      if (photoData.photo_url && !photoData.photo_url.startsWith('http')) {
        const bucket = 'uploads'
        // 清理路徑：移除開頭的 / 如果存在
        let cleanPath = photoData.photo_url.startsWith('/') ? photoData.photo_url.substring(1) : photoData.photo_url
        // 如果路徑不包含 photos/，則添加它
        if (!cleanPath.startsWith('photos/')) {
          cleanPath = `photos/${cleanPath}`
        }
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(cleanPath)
        photoData.photo_url = urlData.publicUrl
      }

      // 獲取氣象資料 (如果有測站ID)
      if (photo.nearest_station) {
        const takenAt = new Date(photo.taken_at)
        
        // 查找最近 10 分鐘內的氣象數據
        const startTime = new Date(takenAt)
        startTime.setMinutes(takenAt.getMinutes() - 10)
        
        const endTime = new Date(takenAt)
        endTime.setMinutes(takenAt.getMinutes() + 10)
        
        const { data: weatherData, error: weatherError } = await supabase
          .from('weather_data')
          .select('*')
          .eq('station_id', photo.nearest_station)
          .gte('timestamp', startTime.toISOString())
          .lte('timestamp', endTime.toISOString())
          .order('abs(extract(epoch from timestamp) - extract(epoch from timestamp \'' + takenAt.toISOString() + '\'))', { ascending: true })
          .limit(1)
        
        if (!weatherError && weatherData && weatherData.length > 0) {
          Object.assign(photoData, {
            temperature: parseFloat(weatherData[0].temperature) || undefined,
            humidity: parseFloat(weatherData[0].humidity) || undefined,
            rainfall: parseFloat(weatherData[0].rainfall) || undefined,
            wind_speed: parseFloat(weatherData[0].wind_speed) || undefined
          })
        }
      }

      // 獲取雲型辨識結果 (如果有)
      const { data: cloudData, error: cloudError } = await supabase
        .from('cloud_classification')
        .select('*')
        .eq('photo_id', photo.id)
        .limit(1)
      
      if (!cloudError && cloudData && cloudData.length > 0) {
        Object.assign(photoData, {
          cloud_type: cloudData[0].cloud_type,
          confidence: parseFloat(cloudData[0].confidence) || undefined
        })

        // 如果有雲型分布數據，解析它
        if (cloudData[0].cloud_distribution) {
          try {
            const distribution = JSON.parse(cloudData[0].cloud_distribution)
            photoData.cloud_type_distribution = distribution
          } catch (e) {
            console.warn('解析雲型分布數據失敗:', e)
          }
        }
      }

      return photoData
    }))

    return NextResponse.json(enhancedData)
  } catch (error) {
    console.error('獲取照片與氣象資料失敗:', error)
    return NextResponse.json({ error: '獲取照片與氣象資料失敗' }, { status: 500 })
  }
}

// 雲型分類 ID 映射
const classIdMap: Record<string, number> = {};
cloudTypes.forEach((type, index) => {
  classIdMap[type.id] = index;
});

// 高層雲分類規則
function applyHighLevelCloudRules(topPreds: number[]): number[] {
  const Cc = classIdMap['Cc'] || 8;
  const Ci = classIdMap['Ci'] || 1;
  const Cs = classIdMap['Cs'] || 9;
  
  if (!topPreds.some(cid => [Cc, Ci, Cs].includes(cid))) {
    return topPreds;
  }
  
  if (topPreds.includes(Cs) && topPreds.includes(Ci)) {
    topPreds = [Cs, ...topPreds.filter(cid => cid !== Cs)];
  }
  
  if (topPreds.includes(Cc) && topPreds.includes(Ci) && !topPreds.includes(Cs)) {
    topPreds = [Cc, ...topPreds.filter(cid => cid !== Cc)];
  }
  
  return topPreds.slice(0, 3);
}

// 中層雲分類規則
function applyMiddleLevelCloudRules(topPreds: number[]): number[] {
  const Ac = classIdMap['Ac'] || 7;
  const As = classIdMap['As'] || 3;
  const Ns = classIdMap['Ns'] || 4;
  
  if (!topPreds.some(cid => [Ac, As, Ns].includes(cid))) {
    return topPreds;
  }
  
  if (topPreds.includes(Ns) && topPreds.includes(As)) {
    topPreds = [Ns, ...topPreds.filter(cid => cid !== Ns)];
  }
  
  if (topPreds.includes(Ac) && topPreds.includes(As)) {
    topPreds = [As, ...topPreds.filter(cid => cid !== As)];
  }
  
  return topPreds.slice(0, 3);
}

// 低層雲分類規則
function applyLowLevelCloudRules(topPreds: number[]): number[] {
  const Sc = classIdMap['Sc'] || 5;
  const St = classIdMap['St'] || 2;
  const Cu = classIdMap['Cu'] || 0;
  
  if (!topPreds.some(cid => [Sc, St, Cu].includes(cid))) {
    return topPreds;
  }
  
  if (topPreds.includes(Sc) && topPreds.includes(Cu)) {
    topPreds = [Sc, ...topPreds.filter(cid => cid !== Sc)];
  }
  
  if (topPreds.includes(St) && topPreds.includes(Sc)) {
    topPreds = [St, ...topPreds.filter(cid => cid !== St)];
  }
  
  return topPreds.slice(0, 3);
}

// 根據亮度調整預測
function adjustByBrightness(topPreds: number[], meanBrightness: number): number[] {
  const Ci = classIdMap['Ci'] || 1;
  const Cs = classIdMap['Cs'] || 9;
  const Ns = classIdMap['Ns'] || 4;
  const St = classIdMap['St'] || 2;

  if (meanBrightness > 200) {
    for (const pri of [Ci, Cs]) {
      if (topPreds.includes(pri)) {
        topPreds = [pri, ...topPreds.filter(cid => cid !== pri)];
        break;
      }
    }
  } else if (meanBrightness < 100) {
    for (const pri of [Ns, St]) {
      if (topPreds.includes(pri)) {
        topPreds = [pri, ...topPreds.filter(cid => cid !== pri)];
        break;
      }
    }
  }
  return topPreds.slice(0, 3);
}

// 處理照片上傳和雲型辨識
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const photoFile = formData.get('photo') as File;
    const photoIds = formData.get('photoIds') as string;
    const modelId = formData.get('modelId') as string;
    
    // 如果提供了模型ID，獲取該模型的資訊
    let modelUrl: string | null = null;
    if (modelId) {
      const { data: modelData, error: modelError } = await supabase
        .from('models')
        .select('file_url')
        .eq('id', modelId)
        .single();
        
      if (!modelError && modelData) {
        modelUrl = modelData.file_url;
      }
    }
    
    // 如果沒有指定模型ID，或者獲取模型資訊失敗，嘗試獲取活躍模型
    if (!modelUrl) {
      const { data: activeModelData, error: activeModelError } = await supabase
        .from('models')
        .select('file_url')
        .eq('is_active', true)
        .single();
        
      if (!activeModelError && activeModelData) {
        modelUrl = activeModelData.file_url;
      }
    }

    // 如果提供了照片ID列表，從數據庫獲取這些照片並分析
    if (photoIds) {
      const ids = JSON.parse(photoIds);
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: '無效的照片ID列表' }, { status: 400 });
      }

      try {
        // 從數據庫獲取照片信息
        const { data: photos, error } = await supabase
          .from('photos')
          .select('*')
          .in('id', ids);

        if (error || !photos || photos.length === 0) {
          return NextResponse.json({ error: '獲取照片數據失敗' }, { status: 500 });
        }

        // 分析所有照片並返回結果
        const results = await Promise.all(photos.map(async (photo) => {
          // 這裡實際應用中會調用 YOLO 模型進行分析
          // 檢查是否有可用的自訂模型
          console.log(`批次分析使用的模型URL: ${modelUrl || '預設模型'}`);
          
          // 如果有自訂模型URL，可以將URL傳遞給實際的模型API
          // const modelToUse = modelUrl || 'default_model_path.pt';
          // 調用 Python API 進行預測，並傳遞模型 URL
          
          // 目前使用模擬數據
          const mockPredictions = [
            { class_id: Math.floor(Math.random() * cloudTypes.length), confidence: 0.85 },
            { class_id: Math.floor(Math.random() * cloudTypes.length), confidence: 0.65 },
            { class_id: Math.floor(Math.random() * cloudTypes.length), confidence: 0.45 },
          ];
          
          // 模擬亮度計算 (在實際項目中應該計算真實亮度)
          const meanBrightness = Math.random() * 255;
          
          // 處理預測結果
          let topPreds = mockPredictions
            .sort((a, b) => b.confidence - a.confidence)
            .map(p => p.class_id)
            .slice(0, 3);
          
          topPreds = adjustByBrightness(topPreds, meanBrightness);
          topPreds = applyHighLevelCloudRules(topPreds);
          topPreds = applyMiddleLevelCloudRules(topPreds);
          topPreds = applyLowLevelCloudRules(topPreds);
          
          // 將識別結果轉換為詳細資訊
          const cloudResults = topPreds.map((classId, index) => {
            const cloudType = cloudTypes[classId] || cloudTypes[0];
            return {
              id: cloudType.id,
              name: cloudType.name,
              description: cloudType.description,
              confidence: mockPredictions[index]?.confidence || 0.5,
            };
          });
          
          // 生成雲型分佈
          const distribution: Record<string, number> = {};
          cloudTypes.forEach((cloudType) => {
            distribution[cloudType.id] = 0.01; // 基礎概率
          });
          
          // 根據預測結果增加主要雲型的概率值
          cloudResults.forEach((result, index) => {
            const factor = index === 0 ? 0.7 : index === 1 ? 0.2 : 0.05;
            distribution[result.id] = result.confidence * factor;
          });
          
          // 將分析結果保存到數據庫
          const { error: insertError } = await supabase
            .from('cloud_classification')
            .upsert({
              photo_id: photo.id,
              cloud_type: cloudResults[0].id,
              confidence: cloudResults[0].confidence,
              cloud_distribution: JSON.stringify(distribution),
              mean_brightness: meanBrightness,
              analyzed_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error('保存雲型分析結果失敗:', insertError);
          }
          
          return {
            photo_id: photo.id,
            file_url: photo.file_url,
            filename: photo.filename,
            success: true,
            primaryCloudType: cloudResults[0],
            results: cloudResults,
            distribution,
            meanBrightness
          };
        }));
        
        return NextResponse.json({
          success: true,
          batch_results: results
        });
      } catch (error) {
        console.error('批量處理照片時發生錯誤:', error);
        return NextResponse.json(
          { error: '批量處理照片時發生錯誤' },
          { status: 500 }
        );
      }
    }

    // 處理單一照片上傳
    if (!photoFile) {
      return NextResponse.json({ error: '未上傳照片' }, { status: 400 });
    }

    // 將照片轉為 ArrayBuffer 以便處理亮度
    await photoFile.arrayBuffer();
    // 在實際應用中，我們會使用 buffer 來計算亮度和進行雲型識別
    // const buffer = Buffer.from(arrayBuffer);
    
    // 實際應用中，這裡應該調用 Python 的 YOLO 模型 API
    // 檢查是否有可用的自訂模型
    console.log(`分析使用的模型URL: ${modelUrl || '預設模型'}`);
    
    // 如果有自訂模型URL，可以將URL傳遞給實際的模型API
    // const modelToUse = modelUrl || 'default_model_path.pt';
    // 調用 Python API 進行預測: fetch('http://your-ml-api/predict', { body: formData, method: 'POST' })
    // 模擬雲型識別結果 (實際環境中這應該是由您的 YOLO 模型提供)
    const mockPredictions = [
      { class_id: Math.floor(Math.random() * cloudTypes.length), confidence: 0.85 },
      { class_id: Math.floor(Math.random() * cloudTypes.length), confidence: 0.65 },
      { class_id: Math.floor(Math.random() * cloudTypes.length), confidence: 0.45 },
      { class_id: Math.floor(Math.random() * cloudTypes.length), confidence: 0.25 },
    ];
    
    // 模擬計算平均亮度 (在實際環境中應該使用適當的圖像處理庫)
    // 實際環境中可以考慮使用 npm 套件如 sharp 或 jimp
    const meanBrightness = Math.random() * 255; // 模擬亮度值 (0-255)
    
    // 應用各層雲規則和亮度調整
    let topPreds = mockPredictions
      .sort((a, b) => b.confidence - a.confidence)
      .map(p => p.class_id)
      .slice(0, 3);
    
    topPreds = adjustByBrightness(topPreds, meanBrightness);
    topPreds = applyHighLevelCloudRules(topPreds);
    topPreds = applyMiddleLevelCloudRules(topPreds);
    topPreds = applyLowLevelCloudRules(topPreds);
    
    // 將識別結果轉換為帶有詳細資訊的雲型物件
    const results = topPreds.map((classId, index) => {
      const cloudType = cloudTypes[classId] || cloudTypes[0];
      return {
        id: cloudType.id,
        name: cloudType.name,
        description: cloudType.description,
        confidence: mockPredictions[index]?.confidence || 0.5,
      };
    });
    
    // 生成雲型分佈
    const distribution: Record<string, number> = {};
    cloudTypes.forEach((cloudType) => {
      distribution[cloudType.id] = 0.01; // 基礎概率
    });
    
    // 根據預測結果增加主要雲型的概率值
    results.forEach((result, index) => {
      const factor = index === 0 ? 0.7 : index === 1 ? 0.2 : 0.05;
      distribution[result.id] = result.confidence * factor;
    });
    
    // 將照片保存到 Supabase Storage (實際使用時可取消註解)
    /*
    const filePath = `photos/uploaded/${Date.now()}_${photoFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, buffer);
      
    if (uploadError) {
      console.error('照片上傳失敗:', uploadError);
      return NextResponse.json({ error: '照片上傳失敗' }, { status: 500 });
    }
    
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);
    
    const photoUrl = urlData.publicUrl;
    */
    
    return NextResponse.json({
      success: true,
      primaryCloudType: results[0],
      results,
      distribution,
      meanBrightness,
    });
  } catch (error) {
    console.error('處理照片時發生錯誤:', error);
    return NextResponse.json(
      { error: '處理照片時發生錯誤' },
      { status: 500 }
    );
  }
}
