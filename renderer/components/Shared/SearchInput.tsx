import React from "react";
import { DialogInput, DialogButton } from "./DesignSystem";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch: () => void;
  loading?: boolean;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "กรอก keyword เพื่อค้นหา",
  onSearch,
  loading = false,
  className = "",
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-2 sm:items-start ${className}`}>
      <div className="flex-1">
        <DialogInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyPress={handleKeyPress}
          className="w-full"
        />
      </div>
      <DialogButton 
        variant="primary" 
        loading={loading}
        onClick={onSearch}
        className="px-6 py-2 h-10 min-w-[80px] self-start"
        icon="🔍"
      >
        <span className="hidden sm:inline">ค้นหา</span>
        <span className="sm:hidden">🔍</span>
      </DialogButton>
    </div>
  );
};

export default SearchInput;