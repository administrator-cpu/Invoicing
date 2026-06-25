import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

export const SelectableCard = ({ title, subtitle, details, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-[24px] border-2 cursor-pointer transition-all duration-200 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] ${isSelected
          ? 'border-[#EA580C] bg-orange-50/30'
          : 'border-transparent bg-white hover:border-gray-200'
        }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
        {isSelected ? (
          <CheckCircle2 className="text-[#EA580C] w-5 h-5" />
        ) : (
          <Circle className="text-gray-300 w-5 h-5" />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs text-gray-500 font-medium">GST: <span className="text-gray-900">{subtitle || 'N/A'}</span></p>
        <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">{details}</p>
      </div>
    </div>
  );
};