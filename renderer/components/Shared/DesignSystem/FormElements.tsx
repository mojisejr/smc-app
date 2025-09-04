import React, { InputHTMLAttributes, ButtonHTMLAttributes, SelectHTMLAttributes } from "react";
import Loading from "../Loading";

interface DialogInputProps extends InputHTMLAttributes<HTMLInputElement> {
  placeholder: string;
  error?: string;
}

interface DialogButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  icon?: string;
  children: React.ReactNode;
}

interface FilterDropdownProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string; }[];
  placeholder?: string;
  error?: string;
}

export const DialogInput = React.forwardRef<HTMLInputElement, DialogInputProps>(({
  placeholder,
  error,
  className = "",
  ...props
}, ref) => {
  const baseClasses =
    "p-2 bg-gray-100 rounded-md text-black border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all duration-200";
  const errorClasses = error
    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
    : "";

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={ref}
        className={`${baseClasses} ${errorClasses} ${className}`}
        placeholder={placeholder}
        {...props}
      />
      {error && (
        <span className="text-sm text-red-600 font-medium">{error}</span>
      )}
    </div>
  );
});

DialogInput.displayName = 'DialogInput';

export const FilterDropdown = React.forwardRef<HTMLSelectElement, FilterDropdownProps>(({
  options,
  placeholder = "เลือก",
  error,
  className = "",
  ...props
}, ref) => {
  const baseClasses =
    "p-2 bg-gray-100 rounded-md text-black border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all duration-200 cursor-pointer";
  const errorClasses = error
    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
    : "";

  return (
    <div className="flex flex-col gap-1">
      <select
        ref={ref}
        className={`${baseClasses} ${errorClasses} ${className}`}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-sm text-red-600 font-medium">{error}</span>
      )}
    </div>
  );
});

FilterDropdown.displayName = 'FilterDropdown';

export const DialogButton: React.FC<DialogButtonProps> = ({
  variant = "primary",
  loading = false,
  icon,
  children,
  disabled,
  className = "",
  ...props
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-blue-500 hover:bg-blue-600 text-white";
      case "secondary":
        return "bg-gray-100 hover:bg-gray-200 text-gray-700";
      case "danger":
        return "bg-red-500 hover:bg-red-600 text-white";
      default:
        return "bg-blue-500 hover:bg-blue-600 text-white";
    }
  };

  const baseClasses =
    "font-bold px-8 py-3 rounded-lg shadow-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2";
  const variantClasses = getVariantClasses();

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loading />}
      {icon && !loading && <span>{icon}</span>}
      {children}
    </button>
  );
};
