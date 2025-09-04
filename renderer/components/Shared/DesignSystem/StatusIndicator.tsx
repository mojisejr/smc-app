import React from 'react';

type StatusType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface StatusIndicatorProps {
  status: StatusType;
  message: string;
  animated?: boolean;
  slotNo?: number;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  message, 
  animated = true,
  slotNo 
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          dot: 'bg-green-500'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          dot: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          dot: 'bg-yellow-500'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          dot: 'bg-blue-500'
        };
      case 'loading':
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          dot: 'bg-gray-500'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          dot: 'bg-gray-500'
        };
    }
  };

  const styles = getStatusStyles();
  const pulseClass = animated ? 'animate-pulse' : '';

  return (
    <div className={`flex items-center gap-3 p-3 ${styles.bg} rounded-lg border ${styles.border}`}>
      <div className={`w-3 h-3 ${styles.dot} rounded-full ${pulseClass}`}></div>
      <div className={`font-bold ${styles.text}`}>
        {slotNo ? `ช่อง #${slotNo} ${message}` : message}
      </div>
    </div>
  );
};

export default StatusIndicator;