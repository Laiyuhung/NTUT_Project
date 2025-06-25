import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              🌤️ 氣象資料系統
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              專業的氣象觀測資料上傳與管理平台
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/upload/photo"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-200"
              >
                📸 上傳照片
              </Link>
              <Link 
                href="/upload/csv"
                className="bg-blue-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-900 transition-colors duration-200"
              >
                📊 上傳CSV資料
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            系統功能
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="text-4xl mb-4">📸</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">照片上傳</h3>
              <p className="text-gray-600 mb-4">
                支援自動定位功能，快速找到最近的氣象測站，並上傳相關的氣象觀測照片。
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• 自動GPS定位</li>
                <li>• 智能測站匹配</li>
                <li>• 手機拍照支援</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">CSV資料上傳</h3>
              <p className="text-gray-600 mb-4">
                批量上傳氣象觀測資料，支援標準CSV格式，適合大量資料處理需求。
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• 批量資料處理</li>
                <li>• 格式驗證</li>
                <li>• 錯誤提示</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            關於系統
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            本系統專為氣象觀測資料收集而設計，提供便利的資料上傳功能，
            支援雙北地區的氣象測站定位，讓研究人員能夠快速準確地記錄觀測資料。
          </p>
        </div>
      </div>
    </main>
  )
}
