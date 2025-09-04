'use client'

interface ProgressBarProps {
  progress: number;
  status: string;
  isActive: boolean;
}

export default function ProgressBar({ progress, status, isActive }: ProgressBarProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">📊 สถานะการ Deploy</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">ความคืบหน้า</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                isActive ? 'bg-blue-600' : 'bg-gray-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isActive && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
          )}
          <span className="text-sm text-gray-700">{status}</span>
        </div>

        {/* Progress Steps */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className={`p-2 rounded text-center ${progress >= 25 ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
            สร้าง Firmware
          </div>
          <div className={`p-2 rounded text-center ${progress >= 50 ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
            Build Project
          </div>
          <div className={`p-2 rounded text-center ${progress >= 75 ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
            Upload ESP32
          </div>
          <div className={`p-2 rounded text-center ${progress >= 100 ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
            เสร็จสิ้น
          </div>
        </div>
      </div>
    </div>
  );
}