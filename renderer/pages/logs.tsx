import React, { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Image from "next/image";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Loading from "../components/Shared/Loading";

import { ipcRenderer } from "electron";
import Navbar from "../components/Shared/Navbar";
import { FilterDropdown } from "../components/Shared/DesignSystem";
import SearchInput from "../components/Shared/SearchInput";
import PaginationControls from "../components/Shared/PaginationControls";

// Filter options for dropdown
const FILTER_OPTIONS = [
  { value: "user", label: "ผู้ใช้งาน" },
  { value: "slotId", label: "ช่องยาเลขที่" },
  { value: "hn", label: "HN" },
];

function Document() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter and search states
  const [filterType, setFilterType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // useEffect(() => {
  //   setLoading(true);
  //   ipcRenderer.invoke("get_logs");
  //   ipcRenderer.on("retrive_logs", (event, payload) => {
  //     setLoading(false);
  //     setLogs(payload);
  //   });
  // }, []);

  useEffect(() => {
    setLoading(true);
    const fetchLogs = async () => {
      const logs = await ipcRenderer.invoke("get_dispensing_logs");
      // Sort by createdAt descending (newest first)
      const sortedLogs = logs.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setLogs(sortedLogs);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  // Filtered logs based on search criteria
  const filteredLogs = useMemo(() => {
    if (!filterType || !searchTerm) {
      return logs;
    }

    return logs.filter((log) => {
      const searchValue = searchTerm.toLowerCase();

      switch (filterType) {
        case "user":
          return log.user?.toLowerCase().includes(searchValue);
        case "slotId":
          return log.slotId?.toString().includes(searchValue);
        case "hn":
          return log.hn?.toLowerCase().includes(searchValue);
        default:
          return true;
      }
    });
  }, [logs, filterType, searchTerm]);

  // Paginated logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  // Search handler
  const handleSearch = () => {
    setIsSearching(true);
    setCurrentPage(1); // Reset to first page when searching
    setTimeout(() => setIsSearching(false), 200);
  };

  // Reset search
  const handleResetSearch = () => {
    setFilterType("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  return (
    <>
      <Head>
        <title>Smart Medication Cart V1.0</title>
      </Head>
      <div className="grid grid-cols-12 text-2xl text-center h-screen">
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
        <div className="col-span-10 bg-[#F3F3F3] rounded-l-[50px] text-[#000] h-screen flex flex-col">
          <div className="w-full p-[2rem] flex flex-col h-full">
            {/* Filter Section - Sticky Header */}
            <div className="bg-white rounded-lg p-6 shadow-sm mb-[1.2rem] flex-shrink-0 sticky top-0 z-9">
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  ค้นหาและกรองข้อมูล
                </h2>
                {(filterType || searchTerm) && (
                  <button
                    onClick={handleResetSearch}
                    className="text-blue-500 text-sm hover:underline"
                  >
                    ล้างการค้นหา
                  </button>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:items-end">
                <div className="w-full md:w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ประเภทการค้นหา
                  </label>
                  <FilterDropdown
                    options={FILTER_OPTIONS}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    placeholder="เลือกประเภท"
                  />
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    คำค้นหา
                  </label>
                  <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    onSearch={handleSearch}
                    loading={isSearching}
                    placeholder={
                      filterType
                        ? `กรอก${
                            FILTER_OPTIONS.find(
                              (opt) => opt.value === filterType
                            )?.label
                          }`
                        : "เลือกประเภทการค้นหาก่อน"
                    }
                  />
                </div>
              </div>
            </div>

            {/* Results Section - Full Height */}
            <div className="bg-white rounded-lg p-6 shadow-sm flex-1 flex flex-col min-h-0">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loading />
                </div>
              ) : (
                <>
                  {/* Results Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">
                      รายการบันทึกการจ่ายยา
                    </h3>
                    <div className="text-sm text-gray-600">
                      {filteredLogs.length} รายการ
                      {(filterType || searchTerm) && (
                        <span className="ml-1 text-blue-600">(กรองแล้ว)</span>
                      )}
                    </div>
                  </div>

                  {/* Table Container - Scrollable */}
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {filteredLogs.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 h-full flex items-center justify-center">
                        {filterType || searchTerm
                          ? "ไม่พบข้อมูลที่ค้นหา"
                          : "ไม่มีข้อมูลบันทึก"}
                      </div>
                    ) : (
                      <div className="h-full">
                        <div className="overflow-x-auto">
                          <table className="table table-sm w-full min-w-[800px]">
                            <thead className="sticky top-0 bg-white z-9">
                              <tr className="text-[#000] border-b-2 border-gray-200">
                                <th className="font-bold text-left py-3 min-w-[150px] bg-white">
                                  วันที่และเวลา
                                </th>
                                <th className="font-bold text-center py-3 min-w-[100px] bg-white">
                                  ช่องยาเลขที่
                                </th>
                                <th className="font-bold text-center py-3 min-w-[80px] bg-white">
                                  HN
                                </th>
                                <th className="font-bold text-left py-3 min-w-[200px] bg-white">
                                  สถานะ
                                </th>
                                <th className="font-bold text-center py-3 min-w-[100px] bg-white">
                                  ผู้ใช้งาน
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedLogs.map((log) => (
                                <tr
                                  key={log.id}
                                  className="hover:bg-gray-50 border-b border-gray-100"
                                >
                                  <td className="py-3">
                                    <div className="text-sm">
                                      <div className="font-medium text-gray-900">
                                        {new Date(
                                          log.createdAt
                                        ).toLocaleDateString("th-TH")}
                                      </div>
                                      <div className="text-gray-600">
                                        {new Date(
                                          log.createdAt
                                        ).toLocaleTimeString("th-TH")}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-center py-3">
                                    <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                                      #{log.slotId}
                                    </span>
                                  </td>
                                  <td className="text-center py-3 text-sm font-medium text-gray-900">
                                    {log.hn || "-"}
                                  </td>
                                  <td className="py-3">
                                    <span
                                      className={`inline-block text-sm px-2 py-1 rounded ${
                                        log.message.includes("สำเร็จ") ||
                                        log.message.includes("ปลดล็อค")
                                          ? "bg-green-100 text-green-800"
                                          : log.message.includes("ผิดพลาด") ||
                                            log.message.includes("error")
                                          ? "bg-red-100 text-red-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {log.message}
                                    </span>
                                  </td>
                                  <td className="text-center py-3 text-sm font-medium text-gray-900">
                                    {log.user}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pagination - Fixed Bottom */}
                  {filteredLogs.length > 0 && (
                    <div className="mt-4 flex-shrink-0">
                      <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredLogs.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
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
