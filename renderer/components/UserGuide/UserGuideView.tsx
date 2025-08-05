import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ipcRenderer } from 'electron';

// User Guide Content Interface
interface UserGuideSection {
  id: string;
  title: string;
  titleEn: string;
  content: React.ReactNode;
  searchKeywords: string[];
  hardwareSpecific?: 'CU12' | 'KU16' | 'UNIVERSAL';
  icon?: string;
}

// Hardware Content Filter Interface
interface HardwareContentFilter {
  showCU12Content: boolean;
  showKU16Content: boolean;
  showUniversalContent: boolean;
  currentHardware: 'KU16' | 'CU12' | 'UNKNOWN';
  slotCount: number;
  features: string[];
}

// Hardware Display Info Interface
interface HardwareDisplayInfo {
  displayName: string;
  statusColor: string;
  description: string;
  slotInfo: string;
  protocolInfo: string;
}

const UserGuideView: React.FC = () => {
  // State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('safety-overview');
  const [contentFilter, setContentFilter] = useState<HardwareContentFilter | null>(null);
  const [hardwareDisplay, setHardwareDisplay] = useState<HardwareDisplayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fetch hardware information and content filter
  useEffect(() => {
    const loadHardwareInfo = async () => {
      try {
        setLoading(true);
        
        // Get hardware content filter from enhanced getHardwareType
        const filter = await ipcRenderer.invoke('get-hardware-content-filter');
        const displayInfo = await ipcRenderer.invoke('get-hardware-display-info');
        
        setContentFilter(filter);
        setHardwareDisplay(displayInfo);
        
        console.log('[UserGuideView] Hardware info loaded:', {
          hardware: filter?.currentHardware,
          features: filter?.features,
          cached: true // From enhanced caching system
        });
        
      } catch (error) {
        console.error('[UserGuideView] Error loading hardware info:', error);
        // Fallback to show all content
        setContentFilter({
          showCU12Content: true,
          showKU16Content: true,
          showUniversalContent: true,
          currentHardware: 'UNKNOWN',
          slotCount: 0,
          features: ['all-features']
        });
      } finally {
        setLoading(false);
      }
    };

    loadHardwareInfo();
  }, []);

  // User Guide Sections Content
  const userGuideSections: UserGuideSection[] = useMemo(() => [
    {
      id: 'safety-overview',
      title: 'ข้อมูลเบื้องต้นและความปลอดภัย',
      titleEn: 'Safety & Overview',
      icon: '🛡️',
      hardwareSpecific: 'UNIVERSAL',
      searchKeywords: ['ความปลอดภัย', 'คำเตือน', 'safety', 'warning', 'เบื้องต้น', 'overview'],
      content: (
        <div className="space-y-6">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
            <div className="flex items-start">
              <div className="text-red-400 text-2xl mr-3">⚠️</div>
              <div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">คำเตือนสำคัญ</h3>
                <ul className="text-red-700 space-y-1 text-sm">
                  <li>• ระบบนี้เป็นอุปกรณ์การแพทย์สำหรับจ่ายยา ต้องใช้ความระมัดระวังสูงสุด</li>
                  <li>• ผู้ใช้งานต้องผ่านการฝึกอบรม Basic System Operations</li>
                  <li>• การดำเนินการทุกครั้งจะถูกบันทึกใน Log พร้อมชื่อผู้ใช้งาน</li>
                  <li>• ห้ามใช้งานระบบหากไม่แน่ใจในขั้นตอน</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <div className="flex items-start">
              <div className="text-blue-400 text-2xl mr-3">🔐</div>
              <div>
                <h3 className="text-lg font-semibold text-blue-800 mb-2">ความปลอดภัยการใช้งาน</h3>
                <ul className="text-blue-700 space-y-1 text-sm">
                  <li>• ตรวจสอบ Hardware Status ก่อนใช้งานทุกครั้ง</li>
                  <li>• ใช้ Passkey ที่ถูกต้องเท่านั้น</li>
                  <li>• อย่าแชร์ Passkey กับบุคคลอื่น</li>
                  <li>• รายงานปัญหาทันทีเมื่อเกิดขึ้น</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'normal-operations',
      title: 'การทำงานปกติ',
      titleEn: 'Normal Operations',
      icon: '🔄',
      hardwareSpecific: 'UNIVERSAL',
      searchKeywords: ['การใส่ยา', 'การจ่ายยา', 'loading', 'dispensing', 'ปกติ', 'normal'],
      content: (
        <div className="space-y-8">
          {/* Medication Loading Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-2">📥</span>
              การใส่ยา (Medication Loading)
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">1</div>
                <div>
                  <p className="font-medium text-gray-800">เลือกช่องที่ว่าง</p>
                  <p className="text-gray-600 text-sm">มองหา Slot ที่แสดงสถานะ "🔴 ว่าง" (Red - Empty)</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">2</div>
                <div>
                  <p className="font-medium text-gray-800">ปลดล็อกช่อง</p>
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 mt-1">
                    📱 กดปุ่ม "ปลดล็อก" บน Slot Card<br/>
                    🔐 กรอก Passkey ของคุณ<br/>
                    📝 กรอก HN ของผู้ป่วย<br/>
                    ✅ กดปุ่ม "Unlock"
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">3</div>
                <div>
                  <p className="font-medium text-gray-800">ใส่ยาและปิดช่อง</p>
                  <p className="text-gray-600 text-sm">รอจนช่องเปิดอัตโนมัติ → ใส่ยาลงในช่อง → เลื่อนช่องเข้าที่ให้แน่น</p>
                </div>
              </div>
            </div>
          </div>

          {/* Medication Dispensing Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-2">💊</span>
              การจ่ายยา (Medication Dispensing)
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">1</div>
                <div>
                  <p className="font-medium text-gray-800">เลือกช่องที่มียา</p>
                  <p className="text-gray-600 text-sm">มองหา Slot ที่แสดงสถานะ "🟢 มียา" (Green - Occupied)</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">2</div>
                <div>
                  <p className="font-medium text-gray-800">ยืนยันการจ่าย</p>
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 mt-1">
                    📱 กดปุ่ม "จ่ายยา" บน Slot Card<br/>
                    🔐 กรอก Passkey ของคุณ<br/>
                    📋 ยืนยัน HN ของผู้ป่วย<br/>
                    ✅ กดปุ่ม "Dispense"
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">3</div>
                <div>
                  <p className="font-medium text-gray-800">เลือกการดำเนินการ</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <p className="font-medium text-blue-800">🔄 Continue (ยังมียาเหลือ)</p>
                      <p className="text-blue-600 text-sm">ช่องจะคงสถานะ "🟢 มียา"</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded border border-orange-200">
                      <p className="font-medium text-orange-800">🗑️ Clear (ไม่มียาเหลือแล้ว)</p>
                      <p className="text-orange-600 text-sm">ช่องจะเปลี่ยนเป็น "🔴 ว่าง"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'emergency-procedures',
      title: 'ขั้นตอนฉุกเฉิน',
      titleEn: 'Emergency Procedures',
      icon: '🚨',
      hardwareSpecific: 'UNIVERSAL',
      searchKeywords: ['ฉุกเฉิน', 'emergency', 'deactivate', 'force reset', 'ระบบค้าง', 'hang'],
      content: (
        <div className="space-y-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-red-800 mb-4 flex items-center">
              <span className="text-2xl mr-2">⛔</span>
              เมื่อระบบค้างหรือไม่ตอบสนอง
            </h3>
            <div className="space-y-4">
              <p className="text-red-700"><strong>สถานการณ์:</strong> ระบบค้างที่หน้า Loading หรือไม่ตอบสนอง</p>
              <div className="bg-white p-4 rounded border border-red-200">
                <h4 className="font-semibold text-red-800 mb-2">🚨 วิธีแก้ไขฉุกเฉิน:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start space-x-3">
                    <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                    <span>📱 กดปุ่ม "Deactivate" บน Slot Card</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                    <span>🔐 กรอก Passkey ของคุณ</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                    <span>📝 กรอกเหตุผล (จำเป็นต้องกรอก)</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
                    <span>✅ กดปุ่ม "Deactivate"</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-yellow-800 mb-4 flex items-center">
              <span className="text-2xl mr-2">🔄</span>
              Force Reset (รีเซ็ตบังคับ)
            </h3>
            <div className="bg-red-100 border border-red-300 rounded p-4 mb-4">
              <h4 className="font-semibold text-red-800 mb-2">⚠️ คำเตือนสำคัญ:</h4>
              <ul className="text-red-700 text-sm space-y-1">
                <li>🚨 FORCE RESET จะทำให้ข้อมูลปัจจุบันหายไปทั้งหมด</li>
                <li>🚫 ไม่สามารถกู้คืนข้อมูลได้</li>
                <li>📊 ต้องตรวจสอบใน Log แทน</li>
                <li>⚡ ใช้เฉพาะเมื่อจำเป็นเท่านั้น</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'hardware-info',
      title: 'ข้อมูลฮาร์ดแวร์',
      titleEn: 'Hardware Information',
      icon: '🔌',
      hardwareSpecific: 'UNIVERSAL',
      searchKeywords: ['hardware', 'CU12', 'KU16', 'ฮาร์ดแวร์', 'เชื่อมต่อ', 'connection'],
      content: (
        <div className="space-y-6">
          {hardwareDisplay && (
            <div className={`border-2 rounded-lg p-6 ${
              hardwareDisplay.statusColor === 'green' ? 'bg-green-50 border-green-200' :
              hardwareDisplay.statusColor === 'blue' ? 'bg-blue-50 border-blue-200' :
              'bg-red-50 border-red-200'
            }`}>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">🖥️</span>
                Hardware ปัจจุบัน: {hardwareDisplay.displayName}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-gray-800">คำอธิบาย:</p>
                  <p className="text-gray-600 text-sm">{hardwareDisplay.description}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800">ข้อมูลช่อง:</p>
                  <p className="text-gray-600 text-sm">{hardwareDisplay.slotInfo}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="font-medium text-gray-800">Protocol:</p>
                  <p className="text-gray-600 text-sm">{hardwareDisplay.protocolInfo}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }
  ], [hardwareDisplay]);

  // Filter sections based on hardware and search
  const filteredSections = useMemo(() => {
    if (!contentFilter) return [];

    let sections = userGuideSections.filter(section => {
      // Hardware filtering
      if (section.hardwareSpecific === 'CU12' && !contentFilter.showCU12Content) return false;
      if (section.hardwareSpecific === 'KU16' && !contentFilter.showKU16Content) return false;
      
      // Search filtering
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return section.searchKeywords.some(keyword => 
          keyword.toLowerCase().includes(searchLower)
        ) || section.title.toLowerCase().includes(searchLower) ||
           section.titleEn.toLowerCase().includes(searchLower);
      }
      
      return true;
    });

    return sections;
  }, [userGuideSections, contentFilter, searchTerm]);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      setSearchTerm(value);
    }, 300);
    
    setSearchTimeout(timeout);
  }, [searchTimeout]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดคู่มือการใช้งาน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar Navigation */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">คู่มือการใช้งาน</h2>
          
          {/* Hardware Status Display */}
          {hardwareDisplay && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  hardwareDisplay.statusColor === 'green' ? 'bg-green-500' :
                  hardwareDisplay.statusColor === 'blue' ? 'bg-blue-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-700">
                  {hardwareDisplay.displayName}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{hardwareDisplay.slotInfo}</p>
            </div>
          )}
          
          {/* Search Box */}
          <input
            type="text"
            placeholder="ค้นหาในคู่มือ..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        
        {/* Navigation Menu */}
        <nav className="p-4">
          <ul className="space-y-2">
            {filteredSections.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{section.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{section.title}</div>
                      <div className="text-xs text-gray-500">{section.titleEn}</div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {filteredSections.find(section => section.id === activeSection)?.content || (
            <div className="text-center py-12">
              <p className="text-gray-500">ไม่พบเนื้อหาที่เลือก</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserGuideView;