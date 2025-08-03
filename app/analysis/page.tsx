'use client';

import { useState, useEffect } from 'react';

// 定義照片類型
type PhotoRecord = {
  id: string;
  filename?: string;
  taken_at?: string;
  latitude?: number;
  longitude?: number;
  nearest_station?: string;
  uploaded_at?: string;
  file_size?: number;
  file_url: string;
  preview_url?: string;
  file_type?: string;
};

// 定義雲型分析結果的類型
type CloudAnalysisResult = {
  success: boolean;
  primaryCloudType: {
    id: string;
    name: string;
    description: string;
    confidence: number;
  };
  results: Array<{
    id: string;
    name: string;
    description: string;
    confidence: number;
  }>;
  distribution: Record<string, number>;
  meanBrightness: number;
};

// 定義批次分析結果類型
type BatchAnalysisResult = CloudAnalysisResult & {
  photo_id: string;
  file_url: string;
  filename?: string;
};

// 定義模型類型
type ModelRecord = {
  id: string;
  name: string;
  uploaded_at: string;
  is_active?: boolean;
  file_url?: string;
  file_path?: string;
  file_size?: number;
};

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
];

export default function AnalysisPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // 批次分析相關狀態
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [batchAnalysisLoading, setBatchAnalysisLoading] = useState<boolean>(false);
  const [batchAnalysisResults, setBatchAnalysisResults] = useState<BatchAnalysisResult[]>([]);
  
  // 模型相關狀態
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [uploadingModel, setUploadingModel] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelRecord[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // 獲取照片資料庫的照片列表
  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/photos');
      if (!response.ok) throw new Error('無法獲取照片資料');
      
      const photoData = await response.json();
      setPhotos(photoData);
    } catch (err) {
      console.error('獲取照片列表失敗:', err);
      setError(`獲取照片列表失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  };

  // 獲取已上傳的模型列表
  const fetchAvailableModels = async () => {
    try {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('無法獲取模型列表');
      
      const modelsData: ModelRecord[] = await response.json();
      setAvailableModels(modelsData);
      
      // 如果有活躍模型標記，設置為預設選擇
      if (modelsData.some((model: ModelRecord) => model.is_active)) {
        const activeModelData = modelsData.find((model: ModelRecord) => model.is_active);
        setSelectedModel(activeModelData?.id || null);
      }
    } catch (err) {
      console.error('獲取模型列表失敗:', err);
      setError(`獲取模型列表失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
    }
  };

  // 處理照片選擇
  const handlePhotoSelect = (photoId: string) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  // 上傳模型檔案
  const uploadModelFile = async () => {
    if (!modelFile) {
      setError('請先選擇模型檔案');
      return;
    }
    
    setUploadingModel(true);
    setUploadProgress(0);
    setUploadError(null);
    
    try {
      setUploadProgress(10); // 準備上傳
      
      // 創建表單數據，直接上傳用戶選擇的 .zip 檔案
      const formData = new FormData();
      formData.append('model', modelFile);
      
      // 使用 XMLHttpRequest 來跟踪上傳進度
      const xhr = new XMLHttpRequest();
      
      // 設置更長的超時時間以支持大文件上傳
      xhr.timeout = 600000; // 10分鐘
      
      // 設置進度監聽器
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          // 上傳進度從10%開始，最高到95%（保留5%給服務器處理）
          const uploadProgress = Math.round(10 + ((event.loaded / event.total) * 85));
          setUploadProgress(uploadProgress);
        }
      };
      
      // 定義上傳響應類型
      interface UploadResponse {
        success: boolean;
        model?: ModelRecord;
        message?: string;
        error?: string;
      }
      
      // 創建 Promise 來處理 XMLHttpRequest
      const uploadPromise = new Promise<UploadResponse>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText) as UploadResponse;
              resolve(response);
            } catch {
              reject(new Error('解析回應失敗'));
            }
          } else {
            reject(new Error(`上傳失敗: ${xhr.status} ${xhr.statusText}`));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('網絡錯誤，請檢查連接'));
        };
        
        xhr.onabort = () => {
          reject(new Error('上傳被中斷'));
        };
        
        xhr.ontimeout = () => {
          reject(new Error('上傳請求超時，文件可能太大或網絡較慢'));
        };
        
        // 開始請求
        xhr.open('POST', '/api/upload-model', true);
        xhr.send(formData);
      });
      
      // 等待上傳完成
      const result = await uploadPromise;
      
      if (result.success) {
        // 上傳成功，重新獲取模型列表
        fetchAvailableModels();
        setModelFile(null);
        setUploadProgress(100);
        
        // 5秒後重置上傳狀態，清除成功提示
        setTimeout(() => {
          setUploadProgress(0);
        }, 5000);
      } else {
        throw new Error(result.message || result.error || '上傳模型失敗');
      }
    } catch (err) {
      console.error('模型上傳失敗:', err);
      setUploadError(`模型上傳失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
      setError(`模型上傳失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      setUploadingModel(false);
    }
  };
  
  // 批次分析選擇的照片

  // 批次分析選擇的照片
  const analyzeBatchPhotos = async () => {
    if (selectedPhotos.length === 0) {
      setError('請選擇要分析的照片');
      return;
    }

    if (!selectedModel) {
      setError('請選擇要使用的模型');
      return;
    }

    setBatchAnalysisLoading(true);
    try {
      const formData = new FormData();
      formData.append('photoIds', JSON.stringify(selectedPhotos));
      formData.append('modelId', selectedModel);

      const response = await fetch('/api/analysis/weather-photos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`批次分析失敗: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.batch_results) {
        setBatchAnalysisResults(result.batch_results);
      } else {
        throw new Error('批次分析回應無效');
      }
    } catch (err) {
      console.error('批次照片分析失敗:', err);
      setError(`批次照片分析失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      setBatchAnalysisLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
    fetchAvailableModels();
    
    // 組件卸載時重置上傳狀態
    return () => {
      if (uploadingModel) {
        console.log('組件卸載時取消上傳操作');
        // 這裡如果有需要，可以添加取消上傳請求的邏輯
      }
    };
  }, []);

  // 產生雲型分布顯示元件
  const renderCloudDistribution = (distribution: Record<string, number>) => {
    return (
      <div className="space-y-2">
        {Object.entries(distribution)
          .sort(([, a], [, b]) => b - a)
          .map(([type, probability]) => (
            <div key={type}>
              <div className="flex justify-between mb-1 text-xs">
                <span>
                  {cloudTypes.find(t => t.id === type)?.name || type}
                </span>
                <span>{(probability * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${probability * 100}%` }}
                ></div>
              </div>
            </div>
          ))
        }
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">批次雲型辨識與分析</h1>
      
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：模型選擇區 */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">選擇分析模型</h2>
              
              {availableModels.length > 0 ? (
                <div className="space-y-3">
                  {availableModels.map((model) => (
                    <div 
                      key={model.id} 
                      onClick={() => setSelectedModel(model.id)}
                      className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                        selectedModel === model.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full mr-2 ${
                          selectedModel === model.id ? 'bg-blue-500' : 'bg-gray-300'
                        }`}></div>
                        <div className="flex-1">
                          <p className="font-medium">{model.name}</p>
                          <p className="text-xs text-gray-500">
                            上傳日期: {new Date(model.uploaded_at).toLocaleString('zh-TW')}
                          </p>
                        </div>
                        {model.is_active && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-1.5 h-1.5 mr-1 bg-green-500 rounded-full"></span>
                            預設
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-500">目前沒有可用的模型</p>
                </div>
              )}
            </div>
            
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">上傳新模型</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 flex flex-col items-center justify-center">
                {modelFile ? (
                  <div className="text-center py-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-green-600 font-medium">已選擇模型: {modelFile.name}</p>
                    <p className="text-gray-500 text-sm mt-1">檔案大小: {(modelFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-500">選擇或拖曳 .zip 模型檔案</p>
                  </div>
                )}
              </div>
              
              {/* 上傳進度顯示 */}
              {uploadingModel && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span>上傳進度</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* 上傳錯誤顯示 */}
              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-600">{uploadError}</p>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col space-y-3">
                <input 
                  type="file" 
                  accept=".zip"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setModelFile(e.target.files[0]);
                      setUploadError(null); // 清除之前的錯誤
                    }
                  }}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                  disabled={uploadingModel}
                />
                
                <div className="flex space-x-2">
                  <button 
                    onClick={uploadModelFile}
                    disabled={!modelFile || uploadingModel}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                  >
                    {uploadingModel 
                      ? `上傳中 (${uploadProgress}%)...`
                      : '上傳模型'}
                  </button>
                  
                  {uploadError && (
                    <button
                      onClick={() => {
                        setModelFile(null);
                        setUploadError(null);
                        setUploadProgress(0);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      重置
                    </button>
                  )}
                </div>
                
                {/* 上传成功提示 */}
                {!uploadingModel && uploadProgress === 100 && !uploadError && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md mt-2">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-green-600">模型上傳成功！</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 中間+右側：照片選擇區 */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">選擇要分析的照片</h2>
                <div>
                  <span className="text-sm text-gray-500 mr-2">已選擇 {selectedPhotos.length} 張照片</span>
                  <button 
                    onClick={analyzeBatchPhotos}
                    disabled={selectedPhotos.length === 0 || !selectedModel || batchAnalysisLoading}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                  >
                    {batchAnalysisLoading ? '分析中...' : '開始批次分析'}
                  </button>
                </div>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p>載入照片中...</p>
                  </div>
                </div>
              ) : photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {photos.map((photo) => (
                    <div 
                      key={photo.id} 
                      onClick={() => handlePhotoSelect(photo.id)}
                      className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                        selectedPhotos.includes(photo.id) 
                          ? 'ring-4 ring-blue-500' 
                          : 'hover:opacity-80'
                      }`}
                    >
                      <div className="relative pb-[75%]">
                        <img 
                          src={photo.file_url} 
                          alt={photo.filename || '照片'}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                      {selectedPhotos.includes(photo.id) && (
                        <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-1 text-xs text-white truncate">
                        {photo.nearest_station || '未知測站'}
                        {photo.taken_at && <span className="block">{new Date(photo.taken_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <p className="text-gray-500">目前沒有可用的照片</p>
                </div>
              )}
            </div>
            
            {/* 批次分析結果 */}
            {batchAnalysisLoading ? (
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p>批次分析照片中，請稍候...</p>
              </div>
            ) : batchAnalysisResults.length > 0 ? (
              <div>
                <h3 className="text-lg font-medium mb-4">批次分析結果</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {batchAnalysisResults.map((result) => (
                    <div key={result.photo_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex mb-3">
                        <div className="w-1/3">
                          <img 
                            src={result.file_url} 
                            alt={result.filename || '照片'} 
                            className="w-full h-auto rounded"
                          />
                        </div>
                        <div className="w-2/3 pl-4">
                          <h4 className="font-medium text-blue-800">
                            {result.primaryCloudType.name} ({result.primaryCloudType.id})
                          </h4>
                          <p className="text-xs text-gray-500 mb-1">{result.filename}</p>
                          <div className="space-y-1 mt-2">
                            <p className="text-sm">
                              信心指數: {(result.primaryCloudType.confidence * 100).toFixed(0)}%
                            </p>
                            <p className="text-sm">
                              平均亮度: {result.meanBrightness.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">雲型分布:</p>
                        {renderCloudDistribution(result.distribution)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      
      {/* 錯誤提示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="float-right font-bold"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
