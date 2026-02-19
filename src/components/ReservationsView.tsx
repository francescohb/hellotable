"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Search, Users, Clock, ArrowLeft, Plus, Check, X, Filter, ChevronRight, ChevronLeft, CalendarCheck, Utensils, Edit2, Trash2, Map, Grid, Layers, Merge, AlertTriangle } from 'lucide-react';
import { TableData, Reservation, ReservationStatus } from '../lib/types';
import { RESERVATION_DURATION_MINUTES } from '../lib/constants';
import DatePicker from './DatePicker';
import PaxPicker from './PaxPicker';

interface ReservationsViewProps {
    tables: TableData[];
    unassignedReservations?: Reservation[]; // New prop
    selectedDate: string; // Passed from parent
    onDateChange: (date: string) => void;
    onClose: () => void;
    onAddReservation: (tableId: string | null, res: Reservation) => void;
    onUpdateReservation: (tableId: string | null, res: Reservation) => void;
    onDeleteReservation: (tableId: string | null, resId: string) => void;
    onMergeAndReserve?: (tableIds: string[], res: Reservation) => void; // New prop for merging
    preselectNew?: boolean;
    onConsumePreselect?: () => void;
    onEditModeChange?: (isEditing: boolean) => void;
}

const ReservationsView: React.FC<ReservationsViewProps> = ({
    tables, unassignedReservations = [], selectedDate, onDateChange, onClose, onAddReservation, onUpdateReservation, onDeleteReservation, onMergeAndReserve, preselectNew, onConsumePreselect, onEditModeChange
}) => {
    const [viewMode, setViewMode] = useState<'list' | 'new'>('list');
    const [searchTerm, setSearchTerm] = useState('');

    // List View specific states
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Form State
    const [showUnassignedConfirmation, setShowUnassignedConfirmation] = useState(false);
    const [formData, setFormData] = useState({
        id: null as string | null, // If ID exists, it's an edit
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        date: selectedDate, // Default to currently selected date
        time: '',
        pax: 2,
        notes: '',
        status: 'CONFIRMED' as ReservationStatus,
        selectedTableId: '' as string | null
    });

    // Multi-Select State (For merging)
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);

    const [confirmDeleteForm, setConfirmDeleteForm] = useState(false);

    // Notify parent of mode change
    useEffect(() => {
        if (onEditModeChange) {
            onEditModeChange(viewMode === 'new');
        }
    }, [viewMode, onEditModeChange]);

    // Handle preselection
    useEffect(() => {
        if (preselectNew) {
            // If we are already in new mode, we might want to reset or just stay.
            // Let's reset the form to defaults just in case
            const now = new Date();
            now.setHours(now.getHours() + 1, 0, 0, 0);
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            setFormData(prev => ({
                ...prev,
                id: null,
                date: selectedDate,
                time: timeStr,
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                pax: 2,
                notes: '',
                status: 'CONFIRMED',
                selectedTableId: null
            }));
            setViewMode('new');
            setIsMultiSelectMode(false);
            setSelectedTableIds([]);

            // Notify parent we handled the request
            if (onConsumePreselect) onConsumePreselect();
        }
    }, [preselectNew, selectedDate, onConsumePreselect]);

    // Sync internal form date if global date changes while in form
    useEffect(() => {
        if (viewMode === 'list') return;
        // Only sync if the user hasn't explicitly changed it? 
        // For simplicity, if global date changes, let's update the form date to match context
        setFormData(prev => ({ ...prev, date: selectedDate }));
    }, [selectedDate, viewMode]);

    // Reset multi select when switching tables
    useEffect(() => {
        setSelectedTableIds([]);
    }, [isMultiSelectMode]);


    // --- HELPER: CHECK OVERLAP ---
    const checkOverlap = (time1: string, time2: string) => {
        const d1 = new Date(`2000-01-01T${time1}`);
        const d2 = new Date(`2000-01-01T${time2}`);
        const diffMinutes = Math.abs(d1.getTime() - d2.getTime()) / 60000;
        return diffMinutes < RESERVATION_DURATION_MINUTES;
    };

    // --- DERIVED DATA: FILTERED BY DATE ---
    const dailyReservations = useMemo(() => {
        const list: { tableId: string | null; tableName: string; floor: string; res: Reservation }[] = [];

        // Assigned Reservations
        tables.forEach(t => {
            if (t.reservations) {
                t.reservations.forEach(r => {
                    if (r.date === selectedDate) {
                        list.push({ tableId: t.id, tableName: t.name, floor: t.floor, res: r });
                    }
                });
            }
        });

        // Unassigned Reservations
        unassignedReservations.forEach(r => {
            if (r.date === selectedDate) {
                list.push({ tableId: null, tableName: 'Da Assegnare', floor: '-', res: r });
            }
        });

        return list.sort((a, b) => a.res.time.localeCompare(b.res.time));
    }, [tables, unassignedReservations, selectedDate]);

    const filteredReservations = dailyReservations.filter(item =>
        `${item.res.firstName} ${item.res.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tableName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPax = useMemo(() => {
        return filteredReservations.reduce((acc, item) => acc + item.res.guests, 0);
    }, [filteredReservations]);

    // --- SMART TABLE ASSIGNMENT LOGIC ---
    const availableTables = useMemo(() => {
        if (viewMode !== 'new') return [];

        let candidates = tables;

        // Filter Logic
        if (!isMultiSelectMode) {
            // Single mode: filter tables that fit the pax
            candidates = tables.filter(t => t.capacity >= formData.pax);
        } else {
            // Multi mode: Show all tables, let user pick
            candidates = tables;
        }

        // Sort logic
        return candidates.sort((a, b) => {
            if (!isMultiSelectMode) {
                const capDiffA = a.capacity - formData.pax;
                const capDiffB = b.capacity - formData.pax;
                if (capDiffA !== capDiffB) return capDiffA - capDiffB;
            }
            if (a.floor !== b.floor) return a.floor.localeCompare(b.floor);
            return a.name.localeCompare(b.name);
        });
    }, [tables, formData.pax, viewMode, isMultiSelectMode]);

    // Calculate combined capacity for multi-select
    const multiSelectionCapacity = useMemo(() => {
        if (!isMultiSelectMode || selectedTableIds.length === 0) return 0;
        return tables.filter(t => selectedTableIds.includes(t.id)).reduce((acc, t) => acc + t.capacity, 0);
    }, [selectedTableIds, tables, isMultiSelectMode]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.firstName || !formData.time || !formData.date) return;

        if (isMultiSelectMode) {
            if (selectedTableIds.length < 2) return; // Must pick at least 2 to merge
            if (multiSelectionCapacity < formData.pax) {
                alert(`Capacità insufficiente (${multiSelectionCapacity}/${formData.pax})`);
                return;
            }
        }

        // If no table selected, show custom confirmation modal
        if (!isMultiSelectMode && !formData.selectedTableId) {
            setShowUnassignedConfirmation(true);
            return;
        }

        // --- CONFLICT CHECK (2h minimum gap) ---
        // Only check if tables are selected
        const tablesToCheck = isMultiSelectMode ? selectedTableIds : (formData.selectedTableId ? [formData.selectedTableId] : []);
        for (const tid of tablesToCheck) {
            const t = tables.find(tb => tb.id === tid);
            if (!t) continue;
            const existing = (t.reservations || []).filter(r => r.date === formData.date && r.id !== formData.id);
            const conflict = existing.some(r => checkOverlap(r.time, formData.time));
            if (conflict) {
                alert(`Il tavolo ${t.name} ha già una prenotazione entro 2 ore dall'orario selezionato.`);
                return;
            }
        }

        const newRes: Reservation = {
            id: formData.id || `res-${Date.now()}`,
            tableId: formData.selectedTableId || undefined,
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            date: formData.date,
            time: formData.time,
            guests: formData.pax,
            notes: formData.notes,
            status: formData.status
        };

        if (formData.id) {
            // UPDATE
            if (formData.selectedTableId) {
                onUpdateReservation(formData.selectedTableId, newRes);
            } else {
                // Handle update of unassigned? 
                // For now, if we update an unassigned one, we might need a separate handler or just treat it as add if logic differs
                // But simplistically:
                // If it was already unassigned, we just update it in unassigned list. 
                // Currently onUpdateReservation assumes it's in a table. 
                // TODO: Handle update for unassigned fully. For now assuming table selected or added as new.
            }
        } else {
            // CREATE
            if (isMultiSelectMode && selectedTableIds.length > 1 && onMergeAndReserve) {
                onMergeAndReserve(selectedTableIds, newRes);
            } else {
                // Pass null if no table selected
                onAddReservation(formData.selectedTableId || null, newRes);
            }
        }

        // Reset and go back
        setFormData({
            id: null,
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            date: selectedDate,
            time: '',
            pax: 2,
            notes: '',
            status: 'CONFIRMED',
            selectedTableId: null
        });
        setSelectedTableIds([]);
        setIsMultiSelectMode(false);
        setViewMode('list');
    };

    const confirmUnassignedSave = () => {
        const newRes: Reservation = {
            id: formData.id || `res-${Date.now()}`,
            tableId: undefined, // Unassigned
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            date: formData.date,
            time: formData.time,
            guests: formData.pax,
            notes: formData.notes,
            status: formData.status
        };

        if (formData.id) {
            // UPDATE
            onUpdateReservation(null, newRes);
        } else {
            // CREATE unassigned
            onAddReservation(null, newRes);
        }

        // Reset and close
        setShowUnassignedConfirmation(false);
        setFormData({
            id: null,
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            date: selectedDate,
            time: '',
            pax: 2,
            notes: '',
            status: 'CONFIRMED',
            selectedTableId: null
        });
        setViewMode('list');
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value;
        const newFormData = { ...formData, time: newTime };

        // Auto-deselect table if occupied at new time
        if (formData.selectedTableId) {
            const t = tables.find(tb => tb.id === formData.selectedTableId);
            if (t) {
                const existing = (t.reservations || []).filter(r => r.date === formData.date && r.id !== formData.id);
                // Check overlap
                const conflict = existing.some(r => checkOverlap(r.time, newTime));
                if (conflict) {
                    newFormData.selectedTableId = null; // Deselect
                    // Optional: could show a toast or small alert here. For now, just deselects.
                }
            }
        }

        setFormData(newFormData);
    };



    const handleDeleteFromForm = () => {
        if (formData.id) { // selectedTableId can be null for unassigned
            onDeleteReservation(formData.selectedTableId || null, formData.id);
            setFormData({
                id: null,
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                date: selectedDate,
                time: '',
                pax: 2,
                notes: '',
                status: 'CONFIRMED',
                selectedTableId: null
            });
            setViewMode('list');
        }
    }

    const handleEditClick = (item: { tableId: string | null; tableName: string; floor: string; res: Reservation }) => {
        setFormData({
            id: item.res.id,
            firstName: item.res.firstName,
            lastName: item.res.lastName,
            email: item.res.email || '',
            phone: item.res.phone || '',
            date: item.res.date,
            time: item.res.time,
            pax: item.res.guests,
            notes: item.res.notes || '',
            status: item.res.status || 'CONFIRMED',
            selectedTableId: item.tableId
        });
        // Disable multi select when editing existing
        setIsMultiSelectMode(false);
        setViewMode('new');
    };

    const handleTableClick = (tableId: string, hasConflict: boolean) => {
        if (hasConflict) return;

        if (isMultiSelectMode) {
            setSelectedTableIds(prev => {
                if (prev.includes(tableId)) return prev.filter(id => id !== tableId);
                return [...prev, tableId];
            });
        } else {
            setFormData({ ...formData, selectedTableId: tableId });
        }
    };

    const dateStr = new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex flex-col overflow-hidden bg-aura-bg text-white"
        >
            {/* TOP HEADER BAR (Replaces Floating Switcher) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-aura-border bg-aura-black/20 shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
                        <Calendar className="text-aura-primary" size={24} />
                        Prenotazioni
                    </h2>
                    <div className="h-6 w-px bg-aura-border mx-2"></div>
                    <div className="text-sm text-gray-400">
                        Gestione lista d'attesa e prenotazioni
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            // Reset form default
                            const now = new Date();
                            now.setHours(now.getHours() + 1, 0, 0, 0);
                            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            setFormData(prev => ({
                                ...prev,
                                id: null,
                                date: selectedDate,
                                time: timeStr,
                                firstName: '',
                                lastName: '',
                                email: '',
                                phone: '',
                                pax: 2,
                                notes: '',
                                status: 'CONFIRMED',
                                selectedTableId: null
                            }));
                            setViewMode('new');
                            setIsMultiSelectMode(false);
                            setSelectedTableIds([]);
                        }}
                        className="flex items-center gap-2 bg-aura-primary/10 border border-aura-primary/20 text-aura-primary px-4 py-2 rounded-lg text-sm font-bold hover:bg-aura-primary hover:text-black transition-colors mr-4 cursor-pointer"
                    >
                        <Plus size={16} /> Nuova prenotazione
                    </button>

                    {/* Switcher Tavoli / Prenotazioni */}
                    <div className="bg-aura-card border border-aura-border p-1 rounded-xl flex shadow-lg backdrop-blur-md">
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-bold uppercase text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
                        >
                            <Grid size={14} /> Tavoli
                        </button>
                        <button
                            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-bold uppercase bg-aura-primary text-black shadow-sm cursor-default"
                        >
                            <Calendar size={14} /> Prenotazioni
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">

                    {/* MODE: LIST */}
                    {viewMode === 'list' && (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col p-8"
                        >
                            {/* Search Bar & Stats */}
                            <div className="mb-6 relative flex justify-between items-center">
                                <div className="relative w-full max-w-md">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Cerca per nome ospite o numero tavolo..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-aura-card border border-aura-border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-aura-primary/50"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-sm text-gray-400 bg-aura-card border border-aura-border px-3 py-2 rounded-lg flex items-center gap-2">
                                        <span className="text-gray-500 uppercase text-[10px] font-bold">Pren.</span>
                                        <span className="text-white font-bold">{filteredReservations.length}</span>
                                    </div>
                                    <div className="text-sm text-gray-400 bg-aura-card border border-aura-border px-3 py-2 rounded-lg flex items-center gap-2">
                                        <span className="text-gray-500 uppercase text-[10px] font-bold">Pax</span>
                                        <span className="text-white font-bold">{totalPax}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Reservations Table */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-aura-black/30 border border-aura-border rounded-2xl">
                                {filteredReservations.length > 0 ? (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-aura-black sticky top-0 z-10">
                                            <tr>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase border-b border-aura-border">Orario</th>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase border-b border-aura-border">Ospite</th>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase border-b border-aura-border">Tavolo</th>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase border-b border-aura-border text-center">Pax</th>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase border-b border-aura-border">Note</th>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase border-b border-aura-border text-right">Azioni</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-aura-border/30">
                                            {filteredReservations.map((item, idx) => (
                                                <tr
                                                    key={`${item.tableId}-${item.res.id}`}
                                                    className="hover:bg-aura-border/20 transition-colors group cursor-pointer relative"
                                                    onClick={() => handleEditClick(item)}
                                                >
                                                    {/* INLINE DELETE CONFIRMATION OVERLAY */}
                                                    {confirmDeleteId === item.res.id && (
                                                        <td colSpan={6} className="absolute inset-0 z-20 bg-aura-black/90 backdrop-blur-sm flex items-center justify-end pr-4 gap-4 cursor-default" onClick={(e) => e.stopPropagation()}>
                                                            <span className="text-sm text-white font-medium">Vuoi eliminare la prenotazione di <span className="text-aura-primary">{item.res.firstName} {item.res.lastName}</span>?</span>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onDeleteReservation(item.tableId, item.res.id);
                                                                        setConfirmDeleteId(null);
                                                                    }}
                                                                    className="px-3 py-1 bg-aura-red text-white text-xs font-bold rounded hover:bg-red-600 transition-colors"
                                                                >
                                                                    CONFERMA
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                                                    className="px-3 py-1 bg-gray-700 text-white text-xs font-bold rounded hover:bg-gray-600 transition-colors"
                                                                >
                                                                    ANNULLA
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}

                                                    <td className="p-4 font-mono text-aura-primary font-bold">
                                                        {item.res.time}
                                                        {item.res.status === 'PENDING' && (
                                                            <span className="block mt-1 text-[9px] text-orange-400 uppercase font-bold tracking-wider">In Attesa</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 font-medium text-white">
                                                        {item.res.firstName} {item.res.lastName}
                                                        {(item.res.phone || item.res.email) && (
                                                            <div className="text-[10px] text-gray-400 font-normal">
                                                                {item.res.phone} {item.res.email && '• ' + item.res.email}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-gray-300">
                                                        <div className="flex flex-col">
                                                            <span className={`font-bold ${!item.tableId ? 'text-aura-gold' : 'text-white'}`}>
                                                                {item.tableName}
                                                            </span>
                                                            <span className="text-[10px] text-gray-500 uppercase">{item.floor}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="inline-flex items-center gap-1 bg-aura-grid px-2 py-1 rounded text-xs text-gray-400">
                                                            <Users size={12} /> {item.res.guests}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-400 italic max-w-xs truncate">
                                                        {item.res.notes || '-'}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}
                                                                className="p-2 text-gray-400 hover:text-white hover:bg-aura-border/20 rounded-lg transition-colors cursor-pointer"
                                                                title="Modifica"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmDeleteId(item.res.id);
                                                                }}
                                                                className="p-2 text-gray-400 hover:text-aura-red hover:bg-aura-red/10 rounded-lg transition-colors cursor-pointer"
                                                                title="Elimina"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                        <Calendar size={48} className="mb-4 opacity-20" />
                                        <p>Nessuna prenotazione per il {dateStr}.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* MODE: NEW / EDIT RESERVATION */}
                    {viewMode === 'new' && (
                        <motion.div
                            key="new"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex"
                        >
                            {/* LEFT: FORM */}
                            <div className="w-1/3 bg-aura-black/50 border-r border-aura-border p-8 flex flex-col overflow-y-auto">
                                <div className="flex items-center gap-2 mb-6">
                                    <button onClick={() => setViewMode('list')} className="p-1 hover:bg-aura-border/20 rounded text-gray-400 hover:text-white cursor-pointer"><ArrowLeft /></button>
                                    <h3 className="text-xl font-bold text-white">
                                        {formData.id ? 'Modifica Prenotazione' : 'Dettagli Richiesta'}
                                    </h3>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nome</label>
                                            <input
                                                autoFocus
                                                type="text"
                                                required
                                                placeholder="Mario"
                                                value={formData.firstName}
                                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                                className="w-full h-[50px] bg-aura-card border border-aura-border rounded-xl px-4 py-3 text-white focus:border-aura-primary focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cognome</label>
                                            <input
                                                type="text"
                                                placeholder="Rossi"
                                                value={formData.lastName}
                                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                                className="w-full h-[50px] bg-aura-card border border-aura-border rounded-xl px-4 py-3 text-white focus:border-aura-primary focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Telefono</label>
                                            <input
                                                type="tel"
                                                placeholder="333 1234567"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full h-[50px] bg-aura-card border border-aura-border rounded-xl px-4 py-3 text-white focus:border-aura-primary focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label>
                                            <input
                                                type="email"
                                                placeholder="email@esempio.com"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full h-[50px] bg-aura-card border border-aura-border rounded-xl px-4 py-3 text-white focus:border-aura-primary focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Data</label>
                                        <DatePicker
                                            date={formData.date}
                                            onDateChange={(d: string) => setFormData({ ...formData, date: d })}
                                            className="w-full h-[50px] bg-aura-card border border-aura-border rounded-xl px-4 py-3 text-white"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase ml-1">Orario</label>
                                            <input
                                                type="time"
                                                value={formData.time}
                                                onChange={(e) => {
                                                    const t = e.target.value;
                                                    const newFormData = { ...formData, time: t };
                                                    // Auto-deselect table if occupied at new time
                                                    if (formData.selectedTableId) {
                                                        const tb = tables.find(tbl => tbl.id === formData.selectedTableId);
                                                        if (tb) {
                                                            const existing = (tb.reservations || []).filter(r => r.date === formData.date && r.id !== formData.id);
                                                            const hasConflict = existing.some(r => checkOverlap(r.time, t));
                                                            if (hasConflict) {
                                                                newFormData.selectedTableId = null;
                                                            }
                                                        }
                                                    }
                                                    setFormData(newFormData);
                                                }}
                                                className="w-full h-[50px] bg-aura-card border border-aura-border rounded-xl px-4 py-3 text-white focus:border-aura-primary focus:outline-none [color-scheme:dark]"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase ml-1">Persone</label>
                                            <PaxPicker
                                                value={formData.pax}
                                                onChange={(v: number) => setFormData({ ...formData, pax: v, selectedTableId: null })}
                                                className="h-[50px]"
                                            />
                                        </div>
                                    </div>

                                    {/* STATUS SELECTION */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Stato Prenotazione</label>
                                        <div className="flex items-center gap-2 bg-aura-black p-1 rounded-xl border border-aura-border">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, status: 'CONFIRMED' })}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase transition-all cursor-pointer ${formData.status === 'CONFIRMED' ? 'bg-aura-gold text-black shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                Confermata
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, status: 'PENDING' })}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase transition-all cursor-pointer ${formData.status === 'PENDING' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                In Attesa
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Note</label>
                                        <textarea
                                            rows={3}
                                            placeholder="Allergie, tavolo preferito, compleanno..."
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            className="w-full bg-aura-card border border-aura-border rounded-xl px-4 py-3 text-white focus:border-aura-primary focus:outline-none resize-none"
                                        />
                                    </div>

                                    <div className="pt-6 border-t border-aura-border mt-auto space-y-4">
                                        <div className="bg-aura-primary/5 border border-aura-primary/20 rounded-xl p-4">
                                            <div className="text-xs text-aura-primary font-bold uppercase mb-1">
                                                {isMultiSelectMode ? 'Tavoli Selezionati' : 'Tavolo Selezionato'}
                                            </div>

                                            {!isMultiSelectMode ? (
                                                formData.selectedTableId ? (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-lg font-bold text-white">
                                                            {tables.find(t => t.id === formData.selectedTableId)?.name}
                                                            <span className="text-sm font-normal text-gray-400 ml-2">
                                                                ({tables.find(t => t.id === formData.selectedTableId)?.floor})
                                                            </span>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, selectedTableId: null })}
                                                            className="text-gray-400 hover:text-white cursor-pointer"
                                                            title="Deseleziona Tavolo"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-500 text-sm italic">Seleziona un tavolo dalla lista a destra</div>
                                                )
                                            ) : (
                                                selectedTableIds.length > 0 ? (
                                                    <div>
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {selectedTableIds.map(id => {
                                                                const t = tables.find(tb => tb.id === id);
                                                                return (
                                                                    <span key={id} className="text-xs bg-aura-black border border-aura-border rounded px-2 py-1 text-white">
                                                                        {t?.name}
                                                                    </span>
                                                                )
                                                            })}
                                                        </div>
                                                        <div className={`text-sm flex justify-between items-center ${multiSelectionCapacity >= formData.pax ? 'text-aura-primary' : 'text-aura-red'}`}>
                                                            <span>Capacità Totale: {multiSelectionCapacity}</span>
                                                            {multiSelectionCapacity >= formData.pax ? <Check size={16} /> : <X size={16} />}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-500 text-sm italic">Seleziona almeno 2 tavoli da unire</div>
                                                )
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <button
                                                type="submit"
                                                disabled={isMultiSelectMode && (selectedTableIds.length < 2 || multiSelectionCapacity < formData.pax)}
                                                className="w-full bg-aura-primary disabled:opacity-50 disabled:cursor-not-allowed text-black py-3.5 rounded-xl font-bold text-lg hover:bg-aura-secondary transition-all shadow-lg shadow-aura-primary/20 cursor-pointer"
                                            >
                                                {formData.id ? 'Salva Modifiche' : (isMultiSelectMode ? 'Unisci e Prenota' : 'Conferma Prenotazione')}
                                            </button>

                                            {/* DELETE BUTTON - MOVED BELOW */}
                                            {formData.id && (
                                                <div className="w-full">
                                                    {confirmDeleteForm ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={handleDeleteFromForm}
                                                                className="flex-1 bg-aura-red text-white py-2 font-bold text-xs rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                                                            >
                                                                CONFERMA ELIMINAZIONE
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setConfirmDeleteForm(false)}
                                                                className="flex-1 bg-gray-700 text-white py-2 font-bold text-xs rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                                                            >
                                                                ANNULLA
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmDeleteForm(true)}
                                                            className="w-full flex items-center justify-center gap-2 text-aura-red hover:bg-aura-red/10 py-2 rounded-lg transition-colors cursor-pointer"
                                                            title="Elimina prenotazione"
                                                        >
                                                            <Trash2 size={16} /> <span className="text-sm font-medium">Elimina prenotazione</span>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* RIGHT: TABLE SELECTOR */}
                            <div className="flex-1 bg-aura-bg p-8 overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">Assegnazione Tavolo</h3>
                                        <p className="text-sm text-gray-500">
                                            Disponibilità per il <span className="text-white font-bold">{new Date(formData.date).toLocaleDateString('it-IT')}</span>.
                                            {!isMultiSelectMode && ` Filtro capacità ≥ ${formData.pax}.`}
                                        </p>
                                    </div>

                                    {/* TOGGLE MULTI SELECT */}
                                    {!formData.id && ( // Only show merge option for new reservations
                                        <button
                                            type="button"
                                            onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase transition-all ${isMultiSelectMode ? 'bg-aura-gold/10 border-aura-gold text-aura-gold' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}
                                        >
                                            <Merge size={14} />
                                            {isMultiSelectMode ? 'Unione Attiva' : 'Unisci Tavoli'}
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {availableTables.map(table => {
                                        // Check overlap for THIS table
                                        // Filter reservations for selected date, EXCLUDING current reservation being edited (if any)
                                        const todaysReservations = table.reservations?.filter(r => r.date === formData.date && r.id !== formData.id) || [];
                                        const hasConflict = todaysReservations.some(r => checkOverlap(r.time, formData.time));

                                        const isSelected = isMultiSelectMode
                                            ? selectedTableIds.includes(table.id)
                                            : formData.selectedTableId === table.id;

                                        const capacityDiff = table.capacity - formData.pax;
                                        let efficiencyColor = 'text-gray-500';
                                        if (!isMultiSelectMode) {
                                            efficiencyColor = capacityDiff === 0 ? 'text-aura-primary' : (capacityDiff <= 2 ? 'text-aura-gold' : 'text-gray-500');
                                        } else {
                                            efficiencyColor = 'text-gray-400';
                                        }

                                        return (
                                            <div
                                                key={table.id}
                                                onClick={() => handleTableClick(table.id, hasConflict)}
                                                className={`
                                                relative p-4 rounded-xl border transition-all group
                                                ${hasConflict
                                                        ? 'bg-aura-black/20 border-aura-border opacity-50 cursor-not-allowed'
                                                        : 'cursor-pointer'
                                                    }
                                                ${isSelected
                                                        ? 'bg-aura-primary/20 border-aura-primary shadow-[0_0_20px_-5px_rgba(0,227,107,0.3)]'
                                                        : (!hasConflict && 'bg-aura-card border-aura-border hover:border-gray-500 hover:bg-aura-card/80')
                                                    }
                                            `}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-white'}`}>
                                                        {table.name}
                                                    </span>
                                                    {isSelected && <div className="w-5 h-5 bg-aura-primary rounded-full flex items-center justify-center text-black"><Check size={12} strokeWidth={4} /></div>}
                                                </div>

                                                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-3">
                                                    {table.floor}
                                                </div>

                                                <div className="flex items-center justify-between mt-auto">
                                                    <div className={`flex items-center gap-1.5 text-xs font-medium ${efficiencyColor}`}>
                                                        <Users size={14} />
                                                        <span>{table.capacity} Posti</span>
                                                        {!isMultiSelectMode && capacityDiff === 0 && <span className="ml-1 text-[9px] bg-aura-primary/20 px-1.5 py-0.5 rounded text-aura-primary">PERFECT</span>}
                                                    </div>
                                                </div>

                                                {/* Busy Times / Conflict Warning */}
                                                {todaysReservations.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-aura-border/20">
                                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
                                                            <Clock size={10} /> Occupato alle:
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {todaysReservations.sort((a, b) => a.time.localeCompare(b.time)).map(r => {
                                                                const isConflictTime = checkOverlap(r.time, formData.time);
                                                                return (
                                                                    <span
                                                                        key={r.id}
                                                                        className={`text-[10px] px-1.5 py-0.5 rounded border ${isConflictTime ? 'bg-aura-red/20 border-aura-red text-aura-red font-bold' : 'bg-aura-black border-aura-border text-gray-400'}`}
                                                                    >
                                                                        {r.time}
                                                                    </span>
                                                                )
                                                            })}
                                                        </div>
                                                        {hasConflict && (
                                                            <div className="text-xs text-aura-red font-bold mt-2">
                                                                Non disponibile a quest'ora
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}

                                    {availableTables.length === 0 && (
                                        <div className="col-span-full py-12 text-center text-gray-500 border-2 border-dashed border-aura-border rounded-xl">
                                            <Utensils size={32} className="mx-auto mb-3 opacity-30" />
                                            <p>Nessun tavolo disponibile {isMultiSelectMode ? '' : `con capacità sufficiente (${formData.pax})`}.</p>
                                            {!isMultiSelectMode && <p className="text-xs mt-1 cursor-pointer text-aura-primary hover:underline" onClick={() => setIsMultiSelectMode(true)}>Prova ad attivare "Unisci Tavoli" per combinare più tavoli.</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {/* UNASSIGNED CONFIRMATION MODAL */}
            {showUnassignedConfirmation && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-aura-black/80 backdrop-blur-sm">
                    <div className="bg-aura-card border border-aura-border rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-aura-gold/20 flex items-center justify-center text-aura-gold">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">Tavolo Non Assegnato</h3>
                                <p className="text-sm text-gray-400">
                                    Stai salvando la prenotazione per <span className="text-white font-medium">{formData.firstName} {formData.lastName}</span> senza assegnare un tavolo.
                                    La troverai nella lista "Da Assegnare".
                                </p>
                            </div>
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setShowUnassignedConfirmation(false)}
                                    className="flex-1 py-3 rounded-xl font-bold bg-aura-card border border-aura-border text-gray-400 hover:text-white hover:border-white/50 transition-colors cursor-pointer"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={confirmUnassignedSave}
                                    className="flex-1 py-3 rounded-xl font-bold bg-aura-gold text-black hover:bg-white transition-colors cursor-pointer"
                                >
                                    Conferma
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default ReservationsView;