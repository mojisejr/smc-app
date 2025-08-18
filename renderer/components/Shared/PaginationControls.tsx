import React from "react";
import { DialogButton, FilterDropdown } from "./DesignSystem";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  className?: string;
}

const ITEMS_PER_PAGE_OPTIONS = [
  { value: "10", label: "10 รายการ" },
  { value: "25", label: "25 รายการ" },
  { value: "50", label: "50 รายการ" },
  { value: "100", label: "100 รายการ" },
];

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className = "",
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className={`flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg ${className}`}>
      {/* Results Info */}
      <div className="text-sm text-gray-600">
        แสดง {startItem}-{endItem} จาก {totalItems} รายการ
      </div>
      
      {/* Page Navigation */}
      <div className="flex items-center justify-center gap-2 flex-1 lg:flex-none">
        <DialogButton
          variant="secondary"
          onClick={handlePrevious}
          disabled={currentPage <= 1}
          className="px-3 py-2 text-sm"
        >
          <span className="hidden sm:inline">← ก่อนหน้า</span>
          <span className="sm:hidden">←</span>
        </DialogButton>
        
        <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded whitespace-nowrap">
          <span className="hidden sm:inline">หน้า {currentPage} จาก {totalPages}</span>
          <span className="sm:hidden">{currentPage}/{totalPages}</span>
        </span>
        
        <DialogButton
          variant="secondary"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          className="px-3 py-2 text-sm"
        >
          <span className="hidden sm:inline">ถัดไป →</span>
          <span className="sm:hidden">→</span>
        </DialogButton>
      </div>

      {/* Items per page selector */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm text-gray-600 whitespace-nowrap">แสดง:</span>
        <FilterDropdown
          options={ITEMS_PER_PAGE_OPTIONS}
          value={itemsPerPage.toString()}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="text-sm w-28"
        />
      </div>
    </div>
  );
};

export default PaginationControls;