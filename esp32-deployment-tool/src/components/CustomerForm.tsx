'use client'

import { useState } from 'react';
import { CustomerInfo } from '@/types';

interface CustomerFormProps {
  onSubmit: (customer: CustomerInfo) => void;
  disabled?: boolean;
}

export default function CustomerForm({ onSubmit, disabled }: CustomerFormProps) {
  const [formData, setFormData] = useState<CustomerInfo>({
    organization: '',
    customerId: '',
    applicationName: ''
  });

  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerInfo> = {};
    
    if (!formData.organization.trim()) {
      newErrors.organization = 'กรุณากรอกชื่อองค์กร';
    }
    
    if (!formData.customerId.trim()) {
      newErrors.customerId = 'กรุณากรอกรหัสลูกค้า';
    } else if (!/^[A-Z0-9]{3,10}$/.test(formData.customerId)) {
      newErrors.customerId = 'รหัสลูกค้าต้องเป็นตัวอักษรใหญ่และตัวเลข 3-10 ตัว';
    }
    
    if (!formData.applicationName.trim()) {
      newErrors.applicationName = 'กรุณากรอกชื่อแอปพลิเคชัน';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: keyof CustomerInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">📝 ข้อมูลลูกค้า</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อองค์กร
          </label>
          <input
            type="text"
            value={formData.organization}
            onChange={(e) => handleChange('organization', e.target.value)}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            placeholder="เช่น โรงพยาบาลกรุงเทพ"
          />
          {errors.organization && (
            <p className="text-red-500 text-sm mt-1">{errors.organization}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            รหัสลูกค้า
          </label>
          <input
            type="text"
            value={formData.customerId}
            onChange={(e) => handleChange('customerId', e.target.value.toUpperCase())}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            placeholder="เช่น BGK001"
          />
          {errors.customerId && (
            <p className="text-red-500 text-sm mt-1">{errors.customerId}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อแอปพลิเคชัน
          </label>
          <input
            type="text"
            value={formData.applicationName}
            onChange={(e) => handleChange('applicationName', e.target.value)}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            placeholder="เช่น SMC_Cabinet_Ward_A"
          />
          {errors.applicationName && (
            <p className="text-red-500 text-sm mt-1">{errors.applicationName}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          ถัดไป: ตรวจหา ESP32
        </button>
      </form>
    </div>
  );
}