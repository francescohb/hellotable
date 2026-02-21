"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Clock, X, ArrowRightLeft, Utensils, Divide, RotateCcw, Minus, Plus, Edit2, Calendar, Trash2, CalendarPlus, Check, AlertTriangle, UserCheck, CheckCircle, Anchor, Ban, MapPin } from 'lucide-react';
import { TableData, TableStatus, Reservation, ReservationStatus, TurnTimeConfig } from '../lib/types';
import { STATUS_STYLES, checkOverlap, getTurnTime, DEFAULT_TURN_TIME_CONFIG } from '../lib/constants';
import DatePicker from './DatePicker';
import PaxPicker from './PaxPicker';

interface TableDetailsProps {
    table: TableData | null;
    allTables: TableData[]; // New prop
    selectedDate: string; // From parent
    currentTime?: number; // From parent (for live timer)
    onUpdateStatus: (id: string, status: TableStatus) => void;
    onRenameTable: (id: string, newName: string) => void;
    onSplitTable: (id: string) => void;
    onResetTable: (id: string) => void;
    onDeleteTable: (id: string) => void;
    onAddReservation: (id: string, reservation: Reservation) => void;
    onRemoveReservation: (id: string, reservationId: string) => void;
    onUpdateReservation: (id: string, reservation: Reservation) => void;
    onClose: () => void;
    onMakePermanent?: (id: string) => void; // New prop
    onInitiateMerge?: (id: string) => void;
}

const TableDetails: React.FC<TableDetailsProps> = ({
    table,
    allTables,
    selectedDate,
    currentTime,
    onUpdateStatus,
    onRenameTable,
    onSplitTable,
    onResetTable,
    onDeleteTable,
    onAddReservation,
    onRemoveReservation,
    onUpdateReservation,
    onClose,
    onMakePermanent,
    onInitiateMerge
}) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');
    const [isAddingReservation, setIsAddingReservation] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [editingTableForResId, setEditingTableForResId] = useState<string | null>(null); // New state

    // Reservation Form State
    const [editResId, setEditResId] = useState<string | null>(null);
    const [resFirstName, setResFirstName] = useState('');
    const [resLastName, setResLastName] = useState('');
    const [resEmail, setResEmail] = useState('');
    const [resPhone, setResPhone] = useState('');
    const [resDate, setResDate] = useState(selectedDate);
    const [resTime, setResTime] = useState('');
    const [resGuests, setResGuests] = useState(2);
    const [resNotes, setResNotes] = useState('');
    const [resStatus, setResStatus] = useState<ReservationStatus>('CONFIRMED');

    // Confirmation States
    const [confirmDeleteTable, setConfirmDeleteTable] = useState(false);
    const [confirmResetTable, setConfirmResetTable] = useState(false);
    const [confirmSplitTable, setConfirmSplitTable] = useState(false);
    const [confirmDeleteResId, setConfirmDeleteResId] = useState<string | null>(null);
    const [forceConflictWarning, setForceConflictWarning] = useState<boolean>(false);
    const [forceCapacityWarning, setForceCapacityWarning] = useState<boolean>(false);
    const [confirmOccupyConflict, setConfirmOccupyConflict] = useState<Reservation[] | null>(null);
    const [confirmFinishTable, setConfirmFinishTable] = useState(false);

    // Sync temp name when table selection changes
    useEffect(() => {
        if (table) {
            setTempName(table.name);
            setResGuests(table.capacity); // Default guests to table capacity
            setResDate(selectedDate); // Sync with current view date
        }
        setIsEditingName(false);
        setIsAddingReservation(false);
        setEditResId(null);
        setFormError(null);
        setConfirmDeleteTable(false);
        setConfirmResetTable(false);
        setConfirmSplitTable(false);
        setConfirmDeleteResId(null);
        setConfirmOccupyConflict(null);
        setConfirmFinishTable(false);
    }, [table?.id, selectedDate]);

    const handleNameSave = () => {
        if (table && tempName.trim()) {
            onRenameTable(table.id, tempName);
        }
        setIsEditingName(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleNameSave();
    };

    // Timer Logic for Modal
    const durationStr = useMemo(() => {
        if (!table || !table.seatedAt || table.status !== 'OCCUPIED' || !currentTime) return null;
        const diff = Math.max(0, currentTime - table.seatedAt);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, [table?.seatedAt, table?.status, currentTime]);

    // Check Overlap Helper (now imported from constants)

    const startEditReservation = (res: Reservation) => {
        setEditResId(res.id);
        const fullName = [res.firstName, res.lastName].filter(Boolean).join(' ').trim();
        setResFirstName(fullName || res.firstName);
        setResLastName('');
        setResEmail(res.email || '');
        setResPhone(res.phone || '');
        setResDate(res.date);
        setResTime(res.time);
        setResGuests(res.guests);
        setResNotes(res.notes || '');
        setResStatus(res.status || 'CONFIRMED');
        setIsAddingReservation(true);
        setFormError(null);
    };

    const checkConflictsAndSave = () => {
        if (!table) return;

        // CONFLICT CHECK
        const existingRes = table.reservations || [];
        const hasConflict = existingRes.some(r => {
            // Skip the reservation being edited
            if (editResId && r.id === editResId) return false;
            // Check same date and overlap using dynamic turn times based on guests
            return r.date === resDate && checkOverlap(r.time, r.guests, resTime, resGuests, table.turnTimeConfig || DEFAULT_TURN_TIME_CONFIG);
        });

        if (hasConflict) {
            setForceConflictWarning(true);
            return;
        }

        proceedWithSave();
    };

    const handleReservationSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!table) return;
        if (!resFirstName || !resTime) {
            setFormError('Nome e Orario sono obbligatori.');
            return;
        }

        // CAPACITY CHECK
        const isOverCapacity = resGuests > table.capacity;
        if (isOverCapacity && !forceCapacityWarning) {
            setForceCapacityWarning(true);
            return;
        }

        checkConflictsAndSave();
    };

    const proceedWithSave = () => {
        if (!table) return;

        if (editResId) {
            // Update existing
            const originalReservation = table.reservations?.find(r => r.id === editResId);
            const updated: Reservation = {
                ...(originalReservation || {} as Reservation),
                id: editResId,
                firstName: resFirstName,
                lastName: resLastName,
                email: resEmail,
                phone: resPhone,
                date: resDate,
                time: resTime,
                guests: resGuests,
                notes: resNotes,
                status: resStatus
            };
            onUpdateReservation(table.id, updated);
        } else {
            // Create new
            const newReservation: Reservation = {
                id: `res-${Date.now()}`,
                firstName: resFirstName,
                lastName: resLastName,
                email: resEmail,
                phone: resPhone,
                date: resDate,
                time: resTime,
                guests: resGuests,
                notes: resNotes,
                status: resStatus
            };
            onAddReservation(table.id, newReservation);
        }

        // Reset form
        setIsAddingReservation(false);
        setEditResId(null);
        setResFirstName('');
        setResLastName('');
        setResEmail('');
        setResPhone('');
        setResTime('');
        setResNotes('');
        setFormError(null);
        setForceConflictWarning(false);
    };

    const cancelReservationForm = () => {
        setIsAddingReservation(false);
        setEditResId(null);
        setResFirstName('');
        setResLastName('');
        setResEmail('');
        setResPhone('');
        setResTime('');
        setResNotes('');
        setFormError(null);
    }

    const getImminentReservations = useCallback(() => {
        if (!table || !table.reservations || !currentTime) return null;
        const now = new Date(currentTime);
        const todayStr = now.toISOString().split('T')[0];

        const activeRes = table.reservations.filter(r => r.date === todayStr && (r.status === 'CONFIRMED' || r.status === 'PENDING'));
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const turnTimeMinutes = getTurnTime(table.capacity, table.turnTimeConfig || DEFAULT_TURN_TIME_CONFIG);

        const overlappingRes = activeRes.filter(res => {
            const [rHour, rMin] = res.time.split(':').map(Number);
            const resMinutes = rHour * 60 + rMin;
            const resTurnTime = getTurnTime(res.guests, table.turnTimeConfig || DEFAULT_TURN_TIME_CONFIG);

            // Overlap check (Walk-in interval: [currentMinutes, currentMinutes + turnTimeMinutes])
            return (currentMinutes < resMinutes + resTurnTime && resMinutes <= currentMinutes + turnTimeMinutes + 15);
        });

        return overlappingRes.length > 0 ? overlappingRes : null;
    }, [table, currentTime]);

    const handleContextualAction = () => {
        if (!table) return;

        if (table.status === 'FREE') {
            const imminent = getImminentReservations();
            if (imminent) {
                setConfirmOccupyConflict(imminent);
            } else {
                handleWalkIn();
            }
        } else if (table.status === 'OCCUPIED') {
            setConfirmFinishTable(true);
        }
    };

    const handleWalkIn = () => {
        if (!table || !currentTime) return;

        const now = new Date(currentTime);
        const newReservation: Reservation = {
            id: `walkin-${Date.now()}`,
            firstName: 'Walk-in',
            lastName: '',
            date: selectedDate,
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            guests: table.capacity,
            status: 'ARRIVED'
        };

        onAddReservation(table.id, newReservation);
        onUpdateStatus(table.id, 'OCCUPIED');
        setConfirmOccupyConflict(null);
    };

    if (!table) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-aura-bg border-l border-aura-border">
                <div className="w-16 h-16 rounded-full bg-aura-card flex items-center justify-center mb-4 border border-aura-border">
                    <Utensils size={24} className="opacity-50" />
                </div>
                <p className="text-sm font-medium tracking-wide">SELEZIONA UN TAVOLO</p>
            </div>
        );
    }

    // Determine effective style based on reservation for SELECTED DATE
    // Logic here: we show "RESERVED" visual if there is a reservation for TODAY/SELECTED DATE and status is free
    const hasReservationToday = table.reservations?.some(r => r.date === selectedDate);
    const isReserved = table.status === 'FREE' && hasReservationToday;
    const statusKey = isReserved ? 'RESERVED_VISUAL' : table.status;
    const activeStyle = STATUS_STYLES[statusKey];

    // FILTER ONLY SELECTED DATE RESERVATIONS (Hide COMPLETED and CANCELLED)
    const uniqueReservations = (table.reservations || []).filter(r => r.date === selectedDate && r.status !== 'COMPLETED' && r.status !== 'CANCELLED');
    // Sort: First by Date, then by Time
    uniqueReservations.sort((a, b) => a.time.localeCompare(b.time));

    // Status Button Component
    const StatusBtn = ({ status, label, activeClass }: { status: TableStatus, label: string, activeClass: string }) => (
        <button
            onClick={() => onUpdateStatus(table.id, status)}
            className={`flex-1 py-4 px-2 rounded-xl text-sm font-bold uppercase tracking-wider border transition-all shadow-lg cursor-pointer ${table.status === status
                ? activeClass
                : `bg-aura-black/50 border-aura-border text-gray-500 hover:border-gray-500 hover:text-gray-300`
                }`}
        >
            {label}
        </button>
    );

    return (
        <div
            className="h-full flex flex-col bg-[#0a1410] text-gray-100 font-sans border-l border-aura-border backdrop-blur-xl relative"
            onClick={(e) => e.stopPropagation()} // STOP PROPAGATION HERE TO PREVENT MODAL CLOSING
        >

            {/* Header */}
            <div className="p-6 border-b border-aura-border relative bg-aura-black/50">
                <div className="flex justify-between items-start">
                    <div className="flex-1 mr-4">
                        <span className={`text-[10px] font-bold tracking-widest uppercase mb-1 block flex items-center gap-2 ${activeStyle.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${activeStyle.dot}`}></span>
                            {activeStyle.label}
                        </span>

                        {/* Editable Name */}
                        {isEditingName ? (
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    autoFocus
                                    type="text"
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    onBlur={handleNameSave}
                                    onKeyDown={handleKeyDown}
                                    className="w-full bg-aura-bg border border-aura-primary/50 rounded px-2 py-1 text-3xl font-medium text-white focus:outline-none"
                                />
                            </div>
                        ) : (
                            <div className="group flex items-center gap-3 mb-2 cursor-pointer" onClick={() => setIsEditingName(true)}>
                                <h2 className="text-5xl font-medium text-white">{table.name}</h2>
                                <Edit2 size={16} className="text-gray-500 group-hover:text-aura-primary transition-colors" />
                            </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-400">
                            <div className="flex items-center gap-1.5 bg-aura-card px-2 py-1 rounded border border-aura-border">
                                <Users size={12} className="text-aura-primary" />
                                <span>{table.capacity} Coperti Attuali</span>
                            </div>
                            {table.seatedAt && table.status === 'OCCUPIED' && (
                                <div className="flex items-center gap-1.5 text-aura-red font-mono font-medium">
                                    <Clock size={12} />
                                    <span>{durationStr}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-aura-border rounded-full cursor-pointer">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">

                {/* SECTION 1: AZIONE RAPIDA CONTESTUALE */}
                {!isAddingReservation && (
                    <div className="p-6 border-b border-aura-border/30">

                        {table.status === 'FREE' && (
                            <div className="relative">
                                {confirmOccupyConflict ? (
                                    <div className="border border-aura-primary shadow-[0_0_20px_-5px_rgba(0,227,107,0.5)] bg-aura-black/50 rounded-xl p-3 flex flex-col items-start animate-in fade-in zoom-in duration-200">
                                        <span className="text-xs font-medium text-white mb-2 text-left leading-tight mt-1">Prenotazioni in arrivo: chi si sta accomodando?</span>
                                        <div className="flex flex-col gap-2 w-full">
                                            {confirmOccupyConflict.map(conflict => (
                                                <button
                                                    key={conflict.id}
                                                    onClick={() => {
                                                        onUpdateReservation(table.id, { ...conflict, status: 'ARRIVED' });
                                                        onUpdateStatus(table.id, 'OCCUPIED');
                                                        setConfirmOccupyConflict(null);
                                                    }}
                                                    className={`w-full py-2 text-white text-[10px] font-bold rounded-lg cursor-pointer px-2 transition-colors uppercase truncate ${conflict.status === 'PENDING' ? 'bg-orange-400 hover:bg-orange-500' : 'bg-aura-primary hover:bg-aura-secondary text-black'}`}
                                                >
                                                    {conflict.status === 'PENDING' ? <span className="mr-1">Da Conf:</span> : ''} {conflict.firstName} {conflict.lastName}
                                                </button>
                                            ))}
                                            <div className="flex gap-2 w-full">
                                                <button
                                                    onClick={handleWalkIn}
                                                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors uppercase"
                                                >
                                                    Walk-in
                                                </button>
                                                <button onClick={() => setConfirmOccupyConflict(null)} className="w-[36px] flex items-center justify-center hover:bg-aura-border text-white text-xs rounded-lg cursor-pointer transition-colors border border-transparent hover:border-aura-border"><X size={16} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleContextualAction}
                                        className="w-full py-4 rounded-xl text-sm font-bold uppercase tracking-wider border transition-all shadow-[0_0_20px_-5px_rgba(255,77,77,0.5)] bg-aura-red text-white border-aura-red hover:bg-red-500 cursor-pointer"
                                    >
                                        <span className="flex items-center justify-center gap-2"><UserCheck size={18} /> Occupa Tavolo</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {table.status === 'OCCUPIED' && (
                            <div className="relative">
                                {confirmFinishTable ? (
                                    <div className="border border-aura-primary shadow-[0_0_20px_-5px_rgba(0,227,107,0.5)] bg-aura-black/50 rounded-xl p-3 flex flex-col items-center animate-in fade-in zoom-in duration-200">
                                        <span className="text-xs font-medium text-white mb-3 mt-1">Liberare il tavolo in anticipo?</span>
                                        <div className="flex gap-2 w-full">
                                            <button onClick={() => { onUpdateStatus(table.id, 'FREE'); setConfirmFinishTable(false); }} className="flex-1 py-2 bg-aura-primary hover:bg-aura-secondary text-black text-xs font-bold rounded-lg cursor-pointer transition-colors uppercase">SI, LIBERA</button>
                                            <button onClick={() => setConfirmFinishTable(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors uppercase">ANNULLA</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleContextualAction}
                                        className="w-full py-4 rounded-xl text-sm font-bold uppercase tracking-wider border transition-all shadow-[0_0_20px_-5px_rgba(0,227,107,0.5)] bg-aura-primary text-black border-aura-primary hover:bg-aura-secondary cursor-pointer"
                                    >
                                        <span className="flex items-center justify-center gap-2"><CheckCircle size={18} /> Libera Tavolo</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* SECTION 2: ADD/EDIT RESERVATION FORM */}
                {isAddingReservation ? (
                    <div className="p-6 pb-0 border-b border-aura-border/50 bg-aura-black/30">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-aura-primary tracking-widest uppercase">{editResId ? 'Modifica prenotazione' : 'Nuova prenotazione'}</h3>
                            <button onClick={cancelReservationForm} className="text-gray-500 hover:text-white"><X size={16} /></button>
                        </div>
                        {formError && (
                            <div className="mb-3 p-2 bg-aura-red/10 border border-aura-red/30 rounded text-xs text-aura-red font-bold">
                                {formError}
                            </div>
                        )}
                        <form onSubmit={handleReservationSubmit} className="space-y-3">
                            <div className="w-full">
                                <input
                                    type="text"
                                    placeholder="Nominativo"
                                    value={resFirstName} onChange={e => setResFirstName(e.target.value)}
                                    className="w-full bg-aura-card border border-aura-border rounded-lg px-3 py-2 text-sm text-white focus:border-aura-primary/50 focus:outline-none"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="tel"
                                    placeholder="Telefono"
                                    value={resPhone} onChange={e => setResPhone(e.target.value)}
                                    className="w-full bg-aura-card border border-aura-border rounded-lg px-3 py-2 text-sm text-white focus:border-aura-primary/50 focus:outline-none"
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={resEmail} onChange={e => setResEmail(e.target.value)}
                                    className="w-full bg-aura-card border border-aura-border rounded-lg px-3 py-2 text-sm text-white focus:border-aura-primary/50 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase ml-1">Data</label>
                                <div className="w-full bg-aura-black/50 border border-aura-border/30 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed">
                                    {new Date(resDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase ml-1">Orario</label>
                                    <input
                                        type="time"
                                        value={resTime}
                                        onChange={(e) => setResTime(e.target.value)}
                                        className="w-full h-[40px] bg-aura-card border border-aura-border rounded-lg px-3 py-2 text-sm text-white focus:border-aura-primary/50 focus:outline-none [color-scheme:dark]"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase ml-1">Persone</label>
                                    <PaxPicker
                                        value={resGuests}
                                        onChange={(v: number) => setResGuests(v)}
                                        className="h-[40px]"
                                    />
                                </div>
                            </div>

                            {/* STATUS TOGGLE */}
                            <div className="flex items-center gap-2 bg-aura-black p-2 rounded-lg border border-aura-border">
                                <button
                                    type="button"
                                    onClick={() => setResStatus('CONFIRMED')}
                                    className={`flex-1 py-1 text-xs font-bold rounded uppercase transition-colors ${resStatus === 'CONFIRMED' ? 'bg-aura-gold text-black' : 'text-gray-500'}`}
                                >
                                    Confermata
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setResStatus('PENDING')}
                                    className={`flex-1 py-1 text-xs font-bold rounded uppercase transition-colors ${resStatus === 'PENDING' ? 'bg-orange-400 text-white' : 'text-gray-500'}`}
                                >
                                    Da Confermare
                                </button>
                            </div>

                            <textarea
                                placeholder="Note (es. Allergie, Compleanno)"
                                value={resNotes} onChange={e => setResNotes(e.target.value)}
                                className="w-full bg-aura-card border border-aura-border rounded-lg px-3 py-2 text-sm text-white focus:border-aura-primary/50 focus:outline-none resize-none"
                                rows={2}
                            />
                            <div className={`mt-2 ${editResId ? 'pb-8' : ''}`}>
                                <button type="submit" className="w-full bg-aura-primary text-black font-bold py-3 rounded-xl text-sm hover:border hover:border-aura-primary transition-all shadow-[0_0_15px_-3px_rgba(0,227,107,0.4)] uppercase tracking-wider">
                                    {editResId ? 'Salva modifiche' : 'Aggiungi prenotazione'}
                                </button>

                                {editResId && (() => {
                                    const resToEdit = (table.reservations || []).find(r => r.id === editResId);
                                    return (
                                        <div className="flex flex-col gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        cancelReservationForm();
                                                        setEditingTableForResId(editResId);
                                                    }}
                                                    className="flex items-center justify-center gap-2 py-3 bg-aura-card border border-aura-border hover:bg-white/10 hover:border-white/30 text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer transition-colors"
                                                >
                                                    <ArrowRightLeft size={16} /> Cambia tavolo
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (resToEdit) {
                                                            onUpdateReservation(table.id, { ...resToEdit, status: 'CANCELLED' });
                                                        }
                                                        cancelReservationForm();
                                                    }}
                                                    className="flex items-center justify-center gap-2 py-3 bg-gray-500/10 border border-gray-500/20 hover:bg-aura-red/20 hover:border-aura-red/30 text-gray-400 hover:text-aura-red rounded-xl text-[10px] font-bold uppercase cursor-pointer transition-colors"
                                                >
                                                    <Ban size={16} /> Annulla Preno
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={cancelReservationForm}
                                                className="w-full py-3 mt-1 bg-transparent hover:bg-gray-800 border border-transparent hover:border-gray-600 text-gray-500 hover:text-white rounded-xl transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                                            >
                                                Annulla modifiche
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>
                        </form>
                    </div>
                ) : (
                    // RESERVATION LIST
                    <div className="p-6 pb-0">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase flex items-center gap-2">
                                <Calendar size={14} /> Prenotazioni ({new Date(selectedDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })})
                            </h3>
                            <button
                                disabled
                                /* onClick={() => { setIsAddingReservation(true); setResGuests(table.capacity); setResDate(selectedDate); }} */
                                className="hidden"
                                title="Aggiunta prenotazioni disabilitata"
                            >
                                <Plus size={12} /> Aggiungi
                            </button>
                        </div>

                        {uniqueReservations.length > 0 ? (
                            <div className="space-y-2">
                                {uniqueReservations.map((res: Reservation, idx) => {
                                    const isArrived = res.status === 'ARRIVED';
                                    const isCompleted = res.status === 'COMPLETED';

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => !isCompleted && startEditReservation(res)}
                                            className={`border rounded-xl p-4 flex flex-col group relative transition-all cursor-pointer
                                                ${isArrived
                                                    ? 'bg-aura-red/5 border-aura-red shadow-[0_0_15px_-3px_rgba(255,77,77,0.3)]'
                                                    : (res.status === 'PENDING'
                                                        ? 'bg-orange-400/5 border-orange-400 hover:bg-orange-400/10'
                                                        : (res.status === 'CONFIRMED' || !res.status
                                                            ? 'bg-aura-gold/5 border-aura-gold hover:bg-aura-gold/10'
                                                            : (isCompleted || res.status === 'CANCELLED'
                                                                ? 'bg-aura-card/50 border-aura-border opacity-60 grayscale'
                                                                : 'bg-aura-card border-aura-border hover:border-aura-gold/30 hover:bg-aura-card/80')))
                                                }
                                            `}
                                        >
                                            {/* Delete Confirmation Overlay */}
                                            {confirmDeleteResId === res.id ? (
                                                <div
                                                    className="absolute inset-0 bg-aura-black/90 backdrop-blur-sm flex items-center justify-center gap-4 z-10 rounded-xl"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <span className="text-xs text-white font-medium">Eliminare?</span>
                                                    <button onClick={() => { onRemoveReservation(table.id, res.id); setConfirmDeleteResId(null); }} className="text-aura-red hover:underline text-xs font-bold cursor-pointer">SI</button>
                                                    <button onClick={() => setConfirmDeleteResId(null)} className="text-gray-400 hover:text-white text-xs cursor-pointer">NO</button>
                                                </div>
                                            ) : null}
                                            {/* Primary Card Content */}
                                            <div className="flex justify-between items-stretch w-full min-h-[120px]">
                                                <div className="flex-1 pr-4 flex flex-col">
                                                    <div className={`font-bold text-lg leading-tight flex-wrap mb-1 ${res.status === 'PENDING' ? 'text-orange-400' : (res.status === 'CONFIRMED' || !res.status ? 'text-aura-gold' : (isArrived ? 'text-aura-red' : 'text-gray-400'))}`}>
                                                        {res.firstName} {res.lastName}
                                                    </div>

                                                    {res.notes && <div className={`text-xs text-gray-400 mt-2 italic ${res.status === 'PENDING' || res.status === 'CONFIRMED' || !res.status ? '' : ''}`}>"{res.notes}"</div>}

                                                    {/* Primary CTA Check-in / Check-out */}
                                                    <div className="mt-auto flex items-center gap-1 flex-wrap">
                                                        {(!isArrived && !isCompleted && res.status !== 'CANCELLED') && (() => {
                                                            const isBlockedByPreviousRes = uniqueReservations.slice(0, idx).some(prevRes =>
                                                                prevRes.status === 'PENDING' || prevRes.status === 'CONFIRMED' || !prevRes.status
                                                            );
                                                            const isBlocked = table.status === 'OCCUPIED' || isBlockedByPreviousRes;
                                                            return (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isBlocked) return;
                                                                        onUpdateReservation(table.id, { ...res, status: 'ARRIVED' });
                                                                        onUpdateStatus(table.id, 'OCCUPIED');
                                                                    }}
                                                                    disabled={isBlocked}
                                                                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isBlocked
                                                                        ? 'bg-aura-gold/5 text-aura-gold/50 border border-aura-gold/10 cursor-not-allowed'
                                                                        : 'bg-aura-red/10 hover:bg-aura-red text-aura-red hover:text-white border border-aura-red/30 cursor-pointer'
                                                                        }`}
                                                                    title={isBlocked ? (table.status === 'OCCUPIED' ? "Impossibile occupare: libera prima il tavolo" : "Impossibile occupare: c'è una prenotazione precedente non completata") : "Occupa il tavolo"}
                                                                >
                                                                    <UserCheck size={16} />
                                                                </button>
                                                            );
                                                        })()}
                                                        {isArrived && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onUpdateReservation(table.id, { ...res, status: 'COMPLETED' });
                                                                    onUpdateStatus(table.id, 'FREE');
                                                                }}
                                                                className="flex items-center justify-center w-8 h-8 bg-aura-primary/10 hover:bg-aura-primary text-aura-primary hover:text-black border border-aura-primary/30 rounded-lg transition-colors cursor-pointer"
                                                                title="Libera il tavolo"
                                                            >
                                                                <CheckCircle size={16} />
                                                            </button>
                                                        )}
                                                        {!isArrived && !isCompleted && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    startEditReservation(res);
                                                                }}
                                                                className="flex items-center justify-center w-8 h-8 bg-gray-500/10 hover:bg-white/20 text-gray-400 hover:text-white border border-gray-500/20 hover:border-white/30 rounded-lg transition-colors cursor-pointer"
                                                                title="Modifica prenotazione"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                        )}
                                                        {!isArrived && !isCompleted && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onUpdateReservation(table.id, { ...res, status: 'CANCELLED' });
                                                                }}
                                                                className="flex items-center justify-center w-8 h-8 bg-gray-500/10 hover:bg-aura-red/20 text-gray-400 hover:text-aura-red border border-gray-500/20 hover:border-aura-red/30 rounded-lg transition-colors cursor-pointer"
                                                                title="Annulla prenotazione"
                                                            >
                                                                <Ban size={16} />
                                                            </button>
                                                        )}
                                                        {!isArrived && !isCompleted && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingTableForResId(res.id);
                                                                }}
                                                                className="flex items-center justify-center w-8 h-8 bg-gray-500/10 hover:bg-white/20 text-gray-400 hover:text-white border border-gray-500/20 hover:border-white/30 rounded-lg transition-colors cursor-pointer"
                                                                title="Cambia tavolo"
                                                            >
                                                                <ArrowRightLeft size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end justify-between h-full pt-1 pb-1 gap-3">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className={`font-mono text-2xl leading-none ${res.status === 'PENDING' ? 'text-orange-400' : (res.status === 'CONFIRMED' || !res.status ? 'text-aura-gold' : (isArrived ? 'text-aura-red' : 'text-gray-400'))}`}>
                                                            {res.time}
                                                        </div>
                                                        {res.status === 'PENDING' && <span className="text-[9px] bg-orange-400/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-400/30 uppercase mt-1">Da Confermare</span>}
                                                        {isArrived && <span className="text-[9px] bg-aura-red/20 text-aura-red px-1.5 py-0.5 rounded border border-aura-red/30 uppercase animate-pulse mt-1">Live</span>}
                                                    </div>

                                                    {/* Interactive Guests Counter */}
                                                    <div className="flex items-center gap-2 mt-auto">
                                                        <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Ospiti</span>
                                                        <div className="flex items-center gap-1.5 bg-aura-black/50 rounded-lg p-1 border border-aura-border">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (res.guests > 1) {
                                                                        onUpdateReservation(table.id, { ...res, guests: res.guests - 1 });
                                                                    }
                                                                }}
                                                                className="w-8 h-8 flex items-center justify-center rounded bg-aura-card hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                                            >
                                                                <Minus size={14} />
                                                            </button>
                                                            <span className="text-base font-bold w-6 text-center">{res.guests}</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onUpdateReservation(table.id, { ...res, guests: res.guests + 1 });
                                                                }}
                                                                className="w-8 h-8 flex items-center justify-center rounded bg-aura-card hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                                            >
                                                                <Plus size={14} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingTableForResId(editingTableForResId === res.id ? null : res.id);
                                                            }}
                                                            className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold cursor-pointer transition-colors ${editingTableForResId === res.id
                                                                ? 'bg-white text-black border-white'
                                                                : (res.status === 'PENDING'
                                                                    ? 'bg-orange-400/10 text-orange-400 border-orange-400/20 hover:bg-orange-400/20'
                                                                    : (res.status === 'CONFIRMED' || !res.status
                                                                        ? 'bg-aura-gold/10 text-aura-gold border-aura-gold/20 hover:bg-aura-gold/20'
                                                                        : (isArrived
                                                                            ? 'bg-aura-red/10 text-aura-red border-aura-red/20 hover:bg-aura-red/20'
                                                                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20')))
                                                                }`}
                                                            title="Clicca per spostare la prenotazione"
                                                        >
                                                            Tavolo {res.tableName || table.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-4 border border-dashed border-aura-border rounded-xl">
                                <p className="text-xs text-gray-600">Nessuna prenotazione per questa data</p>
                                <button
                                    disabled
                                    /* onClick={() => { setIsAddingReservation(true); setResGuests(table.capacity); setResDate(selectedDate); }} */
                                    className="hidden"
                                    title="Aggiunta prenotazioni disabilitata"
                                >
                                    <CalendarPlus size={12} /> Aggiungi prenotazione
                                </button>
                            </div>
                        )}
                    </div>
                )}


                {/* STRUMENTI AVANZATI (SPLIT / RESET / PERMANENT) */}
                {(table.isTemporary && onMakePermanent) || table.subTables.length > 0 ? (
                    <div className="p-6 border-t border-aura-border/30">
                        <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-4">Azioni</h3>
                        <div className="space-y-3">

                            {/* Tasto Rendi Fisso (Solo per tavoli temporanei) */}
                            {table.isTemporary && onMakePermanent && (
                                <div className="w-full relative overflow-hidden rounded-xl border border-aura-secondary/30 group hover:border-aura-secondary/50 transition-colors bg-aura-secondary/5 hover:bg-aura-secondary/10">
                                    <button
                                        onClick={() => onMakePermanent(table.id)}
                                        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
                                    >
                                        <div className="p-2 rounded-lg bg-aura-secondary/10 text-aura-secondary">
                                            <Anchor size={18} />
                                        </div>
                                        <div>
                                            <span className="block text-sm font-medium text-aura-secondary">Rendi Fisso</span>
                                            <span className="block text-[10px] text-aura-secondary/70">Trasforma in tavolo permanente</span>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {/* Tasto Dividi (Visibile solo se il tavolo è unito) */}
                            {table.subTables.length > 0 && (
                                <div className="w-full relative overflow-hidden rounded-xl border border-aura-border group hover:border-aura-gold/50 transition-colors bg-aura-card hover:bg-aura-gold/10">
                                    {confirmSplitTable ? (
                                        <div className="absolute inset-0 bg-aura-black flex items-center justify-between px-4 z-10 border border-aura-gold/50">
                                            <span className="text-sm font-medium text-aura-gold">Confermi la divisione?</span>
                                            <div className="flex gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); onSplitTable(table.id); setConfirmSplitTable(false); }} className="px-3 py-1 bg-aura-gold text-black text-xs font-bold rounded cursor-pointer">SI</button>
                                                <button onClick={(e) => { e.stopPropagation(); setConfirmSplitTable(false); }} className="px-3 py-1 bg-gray-800 text-white text-xs font-bold rounded cursor-pointer">NO</button>
                                            </div>
                                        </div>
                                    ) : null}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmSplitTable(true); }}
                                        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
                                    >
                                        <div className="p-2 rounded-lg bg-aura-gold/10 text-aura-gold">
                                            <Divide size={18} />
                                        </div>
                                        <div>
                                            <span className="block text-sm font-medium text-gray-200">Dividi tavoli</span>
                                            <span className="block text-[10px] text-gray-500">Ripristina {table.subTables.length} tavoli originali</span>
                                        </div>
                                    </button>
                                </div>
                            )}




                        </div>
                    </div>
                ) : null}
            </div>
            {/* CAPACITY OVERFLOW CONFIRMATION MODAL */}
            {forceCapacityWarning && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-aura-black/80 backdrop-blur-sm">
                    <div className="bg-aura-card border border-aura-border rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-aura-gold/20 flex items-center justify-center text-aura-gold">
                                <Users size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">Capacità Superata</h3>
                                <p className="text-sm text-gray-400">
                                    Stai inserendo <strong className="text-white">{resGuests} persone</strong> su un tavolo da <strong className="text-white">{table?.capacity}</strong>. Vuoi forzare l'inserimento o preferisci unire il tavolo?
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 w-full mt-2">
                                <button
                                    onClick={() => {
                                        setForceCapacityWarning(false);
                                        checkConflictsAndSave();
                                    }}
                                    className="w-full py-3 rounded-xl font-bold bg-aura-red text-white hover:bg-red-500 transition-colors cursor-pointer text-xs uppercase tracking-wider"
                                >
                                    Forza Inserimento
                                </button>
                                {onInitiateMerge && (
                                    <button
                                        onClick={() => {
                                            setForceCapacityWarning(false);
                                            proceedWithSave();
                                            onInitiateMerge(table!.id);
                                        }}
                                        className="w-full py-3 rounded-xl font-bold bg-aura-primary text-black hover:bg-aura-secondary transition-colors cursor-pointer text-xs uppercase tracking-wider shadow-[0_0_15px_-3px_rgba(0,227,107,0.4)]"
                                    >
                                        Unisci Tavolo
                                    </button>
                                )}
                                <button
                                    onClick={() => setForceCapacityWarning(false)}
                                    className="w-full py-2 mt-1 text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TIME CONFLICT CONFIRMATION MODAL */}
            {forceConflictWarning && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-aura-black/80 backdrop-blur-sm">
                    <div className="bg-aura-card border border-aura-border rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-aura-red/20 flex items-center justify-center text-aura-red">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">Conflitto Orario</h3>
                                <p className="text-sm text-gray-400">
                                    Attenzione: il tavolo è già occupato per questo orario o permanenza prevista ({getTurnTime(resGuests, table?.turnTimeConfig || DEFAULT_TURN_TIME_CONFIG)} min). Vuoi forzare l'inserimento?
                                </p>
                            </div>
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setForceConflictWarning(false)}
                                    className="flex-1 py-3 rounded-xl font-bold bg-aura-card border border-aura-border text-gray-400 hover:text-white hover:border-white/50 transition-colors cursor-pointer"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={proceedWithSave}
                                    className="flex-1 py-3 rounded-xl font-bold bg-aura-red text-white hover:bg-red-500 transition-colors cursor-pointer"
                                >
                                    Forza
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CHANGE TABLE MODAL */}
            {editingTableForResId && (() => {
                const resToEdit = uniqueReservations.find(r => r.id === editingTableForResId);
                if (!resToEdit) return null;
                return (
                    <div className="absolute inset-0 z-[70] flex items-center justify-center p-4 bg-aura-black/80 backdrop-blur-sm" onClick={() => setEditingTableForResId(null)}>
                        <div className="bg-aura-card border border-aura-border rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4 border-b border-aura-border/50 pb-3">
                                <h3 className="text-lg font-bold text-white">Sposta Prenotazione</h3>
                                <button onClick={() => setEditingTableForResId(null)} className="text-gray-500 hover:text-white transition-colors cursor-pointer p-1">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="text-sm text-gray-400 mb-4 text-center">
                                Seleziona un nuovo tavolo per <br /><strong className="text-white text-base">{resToEdit.firstName} {resToEdit.lastName}</strong> alle <strong className="text-aura-primary">{resToEdit.time}</strong>
                            </div>
                            <div className="grid grid-cols-4 gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2 pb-2">
                                {allTables.filter(t => {
                                    if (t.id === table.id) return true;
                                    const hasConflict = t.reservations?.some(r =>
                                        r.date === selectedDate &&
                                        r.status !== 'COMPLETED' && r.status !== 'CANCELLED' &&
                                        checkOverlap(r.time, r.guests, resToEdit.time, resToEdit.guests, t.turnTimeConfig || DEFAULT_TURN_TIME_CONFIG)
                                    );
                                    return t.status === 'FREE' && !hasConflict;
                                }).map(t => (
                                    <button
                                        key={t.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingTableForResId(null);
                                            if (t.id !== table.id) {
                                                onUpdateReservation(t.id, { ...resToEdit, tableName: t.name });
                                            }
                                        }}
                                        className={`py-3 rounded-xl font-bold uppercase transition-all cursor-pointer text-sm
                                            ${t.id === table.id
                                                ? 'bg-aura-primary/10 text-aura-primary border border-aura-primary/30'
                                                : 'bg-aura-black/50 border border-aura-border text-gray-400 hover:bg-aura-card hover:text-white hover:border-gray-500 shadow-sm'
                                            }
                                        `}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div >
    );
};

export default TableDetails;