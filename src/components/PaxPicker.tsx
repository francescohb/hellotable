"use client";

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface PaxPickerProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    className?: string;
}

const PaxPicker: React.FC<PaxPickerProps> = ({
    value,
    onChange,
    min = 1,
    max = 50,
    className = ""
}) => {
    const handleDecrement = (e: React.MouseEvent) => {
        e.preventDefault();
        if (value > min) {
            onChange(value - 1);
        }
    };

    const handleIncrement = (e: React.MouseEvent) => {
        e.preventDefault();
        if (value < max) {
            onChange(value + 1);
        }
    };

    return (
        <div className={`flex items-center bg-aura-card border border-aura-border rounded-xl p-1 shadow-inner ${className}`}>
            <button
                type="button"
                onClick={handleDecrement}
                disabled={value <= min}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
                <Minus size={18} />
            </button>

            <div className="flex-1 text-center">
                <span className="text-xl font-bold text-white tracking-tight">{value}</span>
            </div>

            <button
                type="button"
                onClick={handleIncrement}
                disabled={value >= max}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
                <Plus size={18} />
            </button>
        </div>
    );
};

export default PaxPicker;
