"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DatePickerProps {
    date: string; // YYYY-MM-DD
    onDateChange: (date: string) => void;
    label?: string;
    className?: string; // Additional classes for the trigger
    children?: React.ReactNode;
    align?: 'left' | 'center' | 'right';
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MONTHS = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const DatePicker: React.FC<DatePickerProps> = ({ date, onDateChange, label, className, children, align = 'left' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Internal state for navigation (month/year view)
    // Initialize with the selected date or today
    const selectedDateObj = date ? new Date(date) : new Date();
    const [currentMonth, setCurrentMonth] = useState(selectedDateObj.getMonth());
    const [currentYear, setCurrentYear] = useState(selectedDateObj.getFullYear());

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update internal state when prop changes, ONLY if not open (to avoid jumping while navigating)
    useEffect(() => {
        if (!isOpen && date) {
            const d = new Date(date);
            setCurrentMonth(d.getMonth());
            setCurrentYear(d.getFullYear());
        }
    }, [date, isOpen]);

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const handleDateClick = (day: number) => {
        // Create date string manually to avoid timezone issues
        // Format: YYYY-MM-DD
        const monthStr = (currentMonth + 1).toString().padStart(2, '0');
        const dayStr = day.toString().padStart(2, '0');
        const newDateStr = `${currentYear}-${monthStr}-${dayStr}`;

        onDateChange(newDateStr);
        setIsOpen(false);
    };

    // Calculate days in month
    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    // Calculate start day of week (0-6, Mon-Sun)
    const getFirstDayOfMonth = (month: number, year: number) => {
        const day = new Date(year, month, 1).getDay();
        // Convert Sunday (0) to 6, others shift back by 1 (Mon 1 -> 0)
        return day === 0 ? 6 : day - 1;
    };

    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const startDay = getFirstDayOfMonth(currentMonth, currentYear);

    // Generate grid
    const renderCalendarDays = () => {
        const days = [];

        // Empty cells for previous month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
        }

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
            const isSelected = date === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            days.push(
                <button
                    key={i}
                    onClick={(e) => { e.preventDefault(); handleDateClick(i); }}
                    className={`
                        h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                        ${isSelected
                            ? 'bg-aura-primary text-black font-bold shadow-[0_0_10px_-2px_rgba(0,227,107,0.5)]'
                            : isToday
                                ? 'bg-aura-border text-white border border-aura-primary/30'
                                : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }
                    `}
                >
                    {i}
                </button>
            );
        }
        return days;
    };

    // Trigger contents
    // If we have a label prop, use that. Otherwise use the date.
    // Actually, let's make it flexible. 
    // This component renders the trigger button which opens the popover.

    const formatDateForDisplay = (d: string) => {
        if (!d) return 'Seleziona data';
        const dateObj = new Date(d);
        return dateObj.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Compute alignment classes
    const alignClasses = {
        left: 'left-0',
        center: 'left-1/2 -translate-x-1/2',
        right: 'right-0'
    };

    return (
        <div className={`relative ${className?.includes('w-full') ? 'w-full' : 'inline-block'}`} ref={containerRef}>
            {/* TRIGGER */}
            <div onClick={() => setIsOpen(!isOpen)} className={className?.includes('w-full') ? 'w-full' : ''}>
                {children ? (
                    children
                ) : (
                    <div className={`
                        bg-aura-card border border-aura-border rounded-xl px-4 py-2 flex items-center gap-3 cursor-pointer hover:border-aura-primary/50 transition-colors group
                        ${className}
                    `}>
                        <CalendarIcon size={16} className="text-aura-primary group-hover:text-aura-primary transition-colors flex-shrink-0" />
                        <span className="text-white font-medium truncate flex-1">
                            {formatDateForDisplay(date)}
                        </span>
                    </div>
                )}
            </div>

            {/* POPOVER */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute top-full mt-2 z-50 bg-[#1A1A1A] border border-aura-border rounded-2xl shadow-2xl p-4 w-[300px] ${alignClasses[align]}`}
                        style={{ minWidth: '280px' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={handlePrevMonth} className="p-1 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer">
                                <ChevronLeft size={18} />
                            </button>
                            <span className="font-bold text-white capitalize">
                                {MONTHS[currentMonth]} {currentYear}
                            </span>
                            <button onClick={handleNextMonth} className="p-1 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer">
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        {/* Days Header */}
                        <div className="grid grid-cols-7 mb-2">
                            {DAYS.map(day => (
                                <div key={day} className="text-center text-[10px] uppercase font-bold text-gray-500 py-1">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-y-1 justify-items-center">
                            {renderCalendarDays()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DatePicker;
