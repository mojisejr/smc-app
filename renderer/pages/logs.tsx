import React, { useEffect, useState, useMemo, useCallback } from "react";
import Head from "next/head";
import Image from "next/image";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Loading from "../components/Shared/Loading";

import { ipcRenderer } from "electron";
import Navbar from "../components/Shared/Navbar";

function Document() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    logType: '',
    category: '',
    user: '',
    level: '',
    search: '',
    dateRange: ''
  });
  
  // Enhanced filtering options
  const logTypes = [
    { value: 'USING', label: 'บันทึกการใช้งาน' },
    { value: 'SYSTEM', label: 'บันทึกระบบ' }
  ];
  
  const usingCategories = [
    { value: 'unlock', label: 'ปลดล็อกช่องยา' },
    { value: 'dispensing', label: 'จ่ายยา' },
    { value: 'force-reset', label: 'รีเซ็ตบังคับ' },
    { value: 'deactive', label: 'ปิดการใช้งาน' },
    { value: 'admin', label: 'การจัดการ' }
  ];
  
  const systemCategories = [
    { value: 'error', label: 'ข้อผิดพลาด' },
    { value: 'warning', label: 'คำเตือน' },
    { value: 'info', label: 'ข้อมูล' }
  ];
  
  const levels = [
    { value: 'error', label: 'ข้อผิดพลาด' },
    { value: 'warn', label: 'คำเตือน' },
    { value: 'info', label: 'ข้อมูล' }
  ];

  // Fetch users for filter dropdown
  const fetchUsers = async () => {
    try {
      const userData = await ipcRenderer.invoke("get-user");
      setUsers(userData || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Helper function to convert dateRange to actual dates
  const getDateRange = (dateRange: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return {
          startDate: today,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          startDate: weekAgo,
          endDate: now
        };
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return {
          startDate: monthAgo,
          endDate: now
        };
      default:
        return null;
    }
  };

  // Memoized filter application for better performance - ครบทุก filters
  const filteredLogs = useMemo(() => {
    let filtered = [...logs];
    
    // 1. logType Filter
    if (filters.logType) {
      filtered = filtered.filter(log => log.logType === filters.logType);
    }
    
    // 2. category Filter
    if (filters.category) {
      filtered = filtered.filter(log => log.category === filters.category);
    }
    
    // 3. level Filter
    if (filters.level) {
      filtered = filtered.filter(log => log.level === filters.level);
    }
    
    // 4. user Filter
    if (filters.user) {
      filtered = filtered.filter(log => log.userId && log.userId.toString() === filters.user);
    }
    
    // 5. dateRange Filter
    if (filters.dateRange) {
      const dateRange = getDateRange(filters.dateRange);
      if (dateRange) {
        filtered = filtered.filter(log => {
          const logDate = new Date(log.timestamp || log.createdAt);
          return logDate >= dateRange.startDate && logDate <= dateRange.endDate;
        });
      }
    }
    
    // 6. search Filter (ค้นหาใน message, userName, HN)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.message?.toLowerCase().includes(searchLower) ||
        log.userName?.toLowerCase().includes(searchLower) ||
        log.user?.toLowerCase().includes(searchLower) ||
        log.hn?.toLowerCase().includes(searchLower) ||
        log.reason?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [logs, filters]);

  useEffect(() => {
    const fetchEnhancedLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        // ใช้ Enhanced Logging System
        const result = await ipcRenderer.invoke("get_enhanced_logs", {
          limit: 500, // ตาม requirement
          includeDebug: false // ไม่แสดง debug logs ใน UI
        });
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        setLogs(result.logs || []);
      } catch (error) {
        console.error('Error fetching enhanced logs:', error);
        const errorMessage = 'ไม่สามารถโหลดข้อมูล logs ได้ กรุณาลองใหม่';
        setError(errorMessage);
        toast.error(errorMessage);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEnhancedLogs();
    fetchUsers();
  }, []);

  // Debounced search optimization
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  const handleSearchChange = useCallback((value) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value }));
    }, 300); // 300ms debounce
    
    setSearchTimeout(timeout);
  }, [searchTimeout]);

  return (
    <>
      <Head>
        <title>Smart Medication Cart V1.0</title>
      </Head>
      <div className=" grid grid-cols-12 text-2xl text-center h-screen overflow-y-auto">
        <div className="col-span-2 flex flex-col justify-between">
          <div className="w-full px-3 py-10 flex flex-col gap-3 justify-center items-center">
            <Image
              src="/images/deprecision.png"
              width={86}
              height={85}
              alt="logo"
            />

            <Navbar active={4} />
          </div>
        </div>
        <div className="col-span-10 bg-[#F3F3F3] rounded-l-[50px] text-[#000]">
          <div className="w-full h-[calc(100vh-2rem)] p-4 flex flex-col gap-2 overflow-hidden">
            {/**Content Goes here */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="ml-auto text-red-600 hover:text-red-800 px-3 py-1 border border-red-300 rounded"
                  >
                    ลองใหม่
                  </button>
                </div>
              </div>
            )}
            {/* Optimized Filter Panel - 30% smaller */}
            <div className="bg-white rounded-md shadow border border-gray-200 p-2 mb-2">
              <h3 className="font-medium text-gray-800 mb-2 text-sm">กรองข้อมูล</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">ประเภท</label>
                  <select 
                    className="select select-bordered select-sm w-full h-8 text-xs"
                    value={filters.logType}
                    onChange={(e) => setFilters({...filters, logType: e.target.value, category: ''})}
                  >
                    <option value="">ทั้งหมด</option>
                    {logTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">หมวดหมู่</label>
                  <select 
                    className="select select-bordered select-sm w-full h-8 text-xs"
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                    disabled={!filters.logType}
                  >
                    <option value="">ทั้งหมด</option>
                    {filters.logType === 'USING' && usingCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                    {filters.logType === 'SYSTEM' && systemCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">ผู้ใช้งาน</label>
                  <select 
                    className="select select-bordered select-sm w-full h-8 text-xs"
                    value={filters.user}
                    onChange={(e) => setFilters({...filters, user: e.target.value})}
                  >
                    <option value="">ทั้งหมด</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">ระดับ</label>
                  <select 
                    className="select select-bordered select-sm w-full h-8 text-xs"
                    value={filters.level}
                    onChange={(e) => setFilters({...filters, level: e.target.value})}
                  >
                    <option value="">ทั้งหมด</option>
                    {levels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">ช่วงเวลา</label>
                  <select 
                    className="select select-bordered select-sm w-full h-8 text-xs"
                    value={filters.dateRange}
                    onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                  >
                    <option value="">ทั้งหมด</option>
                    <option value="today">วันนี้</option>
                    <option value="week">7 วันที่แล้ว</option>
                    <option value="month">1 เดือนที่แล้ว</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-600 mb-0.5">ค้นหา</label>
                <input 
                  type="text"
                  placeholder="ค้นหาในข้อความ, ผู้ใช้งาน, HN, หรือเหตุผล"
                  className="input input-bordered input-sm w-full h-8 text-xs"
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
              
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-600">
                  แสดง {filteredLogs.length} จาก {logs.length} รายการ
                </div>
                <button 
                  className="btn btn-outline btn-xs h-6 px-2 text-xs"
                  onClick={() => {
                    setFilters({logType: '', category: '', user: '', level: '', search: '', dateRange: ''});
                  }}
                >
                  ล้างตัวกรอง
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loading />
              </div>
            ) : (
              <div className="bg-white rounded-md shadow border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0">
                  <h2 className="text-base font-semibold text-gray-800">บันทึกการจ่ายยา</h2>
                </div>
                
                <div className="flex-1 overflow-auto min-h-0">
                  <table className="table w-full h-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="text-gray-700">
                        <th className="font-medium text-left px-4 py-2 text-xs">วันที่</th>
                        <th className="font-medium text-left px-4 py-2 text-xs">ประเภท</th>
                        <th className="font-medium text-left px-4 py-2 text-xs">หมวดหมู่</th>
                        <th className="font-medium text-left px-4 py-2 text-xs">ข้อความ</th>
                        <th className="font-medium text-left px-4 py-2 text-xs">ผู้ใช้งาน</th>
                        <th className="font-medium text-left px-4 py-2 text-xs hidden sm:table-cell">ช่อง</th>
                        <th className="font-medium text-left px-4 py-2 text-xs hidden md:table-cell">HN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredLogs.length <= 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-gray-500">
                            <div className="flex flex-col items-center">
                              <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <p className="text-sm font-medium">ไม่พบข้อมูลบันทึก</p>
                              <p className="text-xs">ลองปรับเปลี่ยนตัวกรองข้อมูล</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log) => {
                          const logDate = new Date(log.timestamp || log.createdAt);
                          const logTypeColor = log.logType === 'USING' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
                          const levelColor = {
                            'error': 'bg-red-100 text-red-800',
                            'warn': 'bg-yellow-100 text-yellow-800', 
                            'info': 'bg-gray-100 text-gray-800'
                          }[log.level] || 'bg-gray-100 text-gray-800';
                          
                          return (
                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-2">
                                <div className="text-xs">
                                  <div className="font-medium text-gray-900" title={logDate.toLocaleString('th-TH')}>
                                    {logDate.toLocaleDateString('th-TH', { 
                                      day: '2-digit', 
                                      month: '2-digit', 
                                      year: '2-digit' 
                                    })}
                                  </div>
                                  <div className="text-gray-500">
                                    {logDate.toLocaleTimeString('th-TH', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${logTypeColor}`}>
                                  {log.logTypeDisplayName || log.logType}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${levelColor}`}>
                                  {log.categoryDisplayName || log.category}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <span className="text-xs text-gray-900 break-words" title={log.message}>
                                  {log.message}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <span className="text-xs font-medium text-gray-900 break-words" title={log.userName || log.user || 'ไม่ระบุผู้ใช้งาน'}>
                                  {log.userName || log.user || 'ไม่ระบุผู้ใช้งาน'}
                                </span>
                              </td>
                              <td className="px-4 py-2 hidden sm:table-cell">
                                <span className="text-xs text-gray-600" title={log.slotId ? `ช่องที่ ${log.slotId}` : '-'}>
                                  {log.slotId ? `ช่อง ${log.slotId}` : '-'}
                                </span>
                              </td>
                              <td className="px-4 py-2 hidden md:table-cell">
                                <span className="text-xs text-gray-600" title={log.hn || '-'}>
                                  {log.hn || '-'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Optimized Footer with stats */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex-shrink-0">
                  <div className="flex items-center justify-between text-xs text-gray-700">
                    <div className="font-medium">
                      รวม: {filteredLogs.length.toLocaleString()} รายการ
                    </div>
                    <div className="text-gray-500">
                      อัพเดท: {new Date().toLocaleTimeString('th-TH', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer
        limit={1}
        autoClose={1000}
        position="top-center"
        hideProgressBar
      />
    </>
  );
}

export default Document;
