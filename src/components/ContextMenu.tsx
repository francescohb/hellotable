"use client";
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    UserCheck,
    LogOut,
    Divide,
    RotateCcw,
    Trash2,
    Utensils,
    Anchor,
    Merge,
    CheckCircle,
    CalendarPlus
} from 'lucide-react';
import { TableData } from '../lib/types';

interface ContextMenuProps {
    x: number;
    y: number;
    table: TableData;
    onClose: () => void;
    onAction: (action: 'toggle_status' | 'split' | 'delete' | 'make_permanent' | 'add_reservation', tableId: string) => void;
    hasPendingRes: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, table, onClose, onAction, hasPendingRes }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Adjust position if close to screen edge
    const adjustedX = Math.min(x, window.innerWidth - 220); // 220 is approx width
    const adjustedY = Math.min(y, window.innerHeight - 250); // 250 approx height

    const isOccupied = table.status === 'OCCUPIED';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.1 }}
            style={{ top: adjustedY, left: adjustedX }}
            className="fixed z-[100] min-w-[200px]"
            ref={menuRef}
        >
            <div className="bg-aura-card/95 backdrop-blur-xl border border-aura-border rounded-xl shadow-2xl overflow-hidden p-1.5 flex flex-col gap-1">
                {/* Header */}
                <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-aura-border/50 mb-1">
                    {table.name} <span className="font-normal text-gray-600">({table.floor})</span>
                </div>

                {/* STATUS TOGGLE */}
                <button
                    onClick={() => onAction('toggle_status', table.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors w-full text-left
                        ${isOccupied
                            ? 'text-aura-primary hover:bg-aura-primary/10'
                            : 'text-aura-red hover:bg-aura-red/10'
                        }`}
                >
                    {isOccupied ? (
                        <>
                            <CheckCircle size={16} /> <span>Libera tavolo</span>
                        </>
                    ) : (
                        <>
                            <UserCheck size={16} />
                            <span>Occupa tavolo</span>
                        </>
                    )}
                </button>

                {/* MAKE PERMANENT (Only for temporary tables) */}
                {table.isTemporary && (
                    <button
                        onClick={() => onAction('make_permanent', table.id)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-aura-secondary hover:bg-aura-secondary/10 rounded-lg transition-colors w-full text-left"
                    >
                        <Anchor size={16} /> <span>Rendi fisso</span>
                    </button>
                )}

                {/* SPLIT (Conditional) */}
                {table.subTables && table.subTables.length > 0 && (
                    <button
                        onClick={() => onAction('split', table.id)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors w-full text-left"
                    >
                        <Divide size={16} /> <span>Dividi tavoli</span>
                    </button>
                )}

                {/* AGGIUNGI PRENOTAZIONE */}
                <button
                    onClick={() => onAction('add_reservation', table.id)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors w-full text-left"
                >
                    <CalendarPlus size={16} /> <span>Aggiungi prenotazione</span>
                </button>


            </div>
        </motion.div>
    );
};

export default ContextMenu;