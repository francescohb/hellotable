"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Users, Clock, X, ArrowRightLeft, Utensils, Divide, RotateCcw, Minus, Plus, Edit2, Calendar, Trash2, CalendarPlus, Check, AlertTriangle, UserCheck, CheckCircle, Anchor } from 'lucide-react';
import { TableData, TableStatus, Reservation, ReservationStatus } from '../lib/types';
import { STATUS_STYLES, RESERVATION_DURATION_MINUTES } from '../lib/constants';
import DatePicker from './DatePicker';
import PaxPicker from './PaxPicker';

interface TableDetailsProps {
    table: TableData | null;
    selectedDate: string; // From parent
    currentTime?: number; // From parent (for live timer)
    onUpdateStatus: (id: string, status: TableStatus) => void;
    onModifyCapacity: (id: string, delta: number) => void;
    onRenameTable: (id: string, newName: string) => void;
    onSplitTable: (id: string) => void;
    onResetTable: (id: string) => void;
    onDeleteTable: (id: string) => void;
    onAddReservation: (id: string, reservation: Reservation) => void;
    onRemoveReservation: (id: string, reservationId: string) => void;
    onUpdateReservation: (id: string, reservation: Reservation) => void;
    onClose: () => void;
    onMakePermanent?: (id: string) => void; // New prop
}

const TableDetails: React.FC<TableDetailsProps> = ({
    table,
    selectedDate,
    currentTime,
    onUpdateStatus,
    onModifyCapacity,
    onRenameTable,
    onSplitTable,
    onResetTable,
    onDeleteTable,
    onAddReservation,
    onRemoveReservation,
    onUpdateReservation,
    onClose,
    onMakePermanent
}) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');
    const [isAddingReservation, setIsAddingReservation] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

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

    // Check Overlap Helper
    const checkOverlap = (time1: string, time2: string) => {
        const d1 = new Date(`2000-01-01T${time1}`);
        const d2 = new Date(`2000-01-01T${time2}`);
        const diffMinutes = Math.abs(d1.getTime() - d2.getTime()) / 60000;
        return diffMinutes < RESERVATION_DURATION_MINUTES;
    };

    const startEditReservation = (res: Reservation) => {
        setEditResId(res.id);
        setResFirstName(res.firstName);
        setResLastName(res.lastName);
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

    const handleReservationSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!table) return;
        if (!resFirstName || !resTime) {
            setFormError('Nome e Orario sono obbligatori.');
            return;
        }

        // CONFLICT CHECK
        const existingRes = table.reservations || [];
        const hasConflict = existingRes.some(r => {
            // Skip the reservation being edited
            if (editResId && r.id === editResId) return false;
            // Check same date and overlap
            return r.date === resDate && checkOverlap(r.time, resTime);
        });

        if (hasConflict) {
            setFormError('Conflitto di orario: ci devono essere almeno 2 ore di distanza tra le prenotazioni.');
            return;
        }


        if (editResId) {
            // Update existing
            const updated: Reservation = {
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

    // FILTER ONLY SELECTED DATE RESERVATIONS
    const uniqueReservations = (table.reservations || []).filter(r => r.date === selectedDate);
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

                {/* SECTION 1: STATO DEL TAVOLO (MOVED UP) */}
                <div className="p-6 border-b border-aura-border/30">
                    <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-4">Stato tavolo</h3>
                    <div className="flex gap-3">
                        <StatusBtn status="FREE" label="Libero" activeClass="bg-aura-primary text-black border-aura-primary shadow-[0_0_20px_-5px_rgba(0,227,107,0.5)]" />
                        <StatusBtn status="OCCUPIED" label="Occupato" activeClass="bg-aura-red text-white border-aura-red shadow-[0_0_20px_-5px_rgba(255,77,77,0.5)]" />
                    </div>
                </div>

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
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    placeholder="Nome"
                                    value={resFirstName} onChange={e => setResFirstName(e.target.value)}
                                    className="w-full bg-aura-card border border-aura-border rounded-lg px-3 py-2 text-sm text-white focus:border-aura-primary/50 focus:outline-none"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Cognome"
                                    value={resLastName} onChange={e => setResLastName(e.target.value)}
                                    className="w-full bg-aura-card border border-aura-border rounded-lg px-3 py-2 text-sm text-white focus:border-aura-primary/50 focus:outline-none"
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
                                    className={`flex-1 py-1 text-xs font-bold rounded uppercase transition-colors ${resStatus === 'PENDING' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}
                                >
                                    In Attesa
                                </button>
                            </div>

                            <textarea
                                placeholder="Note (es. Allergie, Compleanno)"
                                value={resNotes} onChange={e => setResNotes(e.target.value)}
                                className="w-full bg-aura-card border border-aura-border rounded-lg px-3 py-2 text-sm text-white focus:border-aura-primary/50 focus:outline-none resize-none"
                                rows={2}
                            />
                            <button type="submit" className="w-full bg-aura-primary text-black font-bold py-2 rounded-lg text-sm hover:bg-aura-secondary transition-colors">
                                {editResId ? 'Salva modifiche' : 'Aggiungi prenotazione'}
                            </button>
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
                                onClick={() => { setIsAddingReservation(true); setResGuests(table.capacity); setResDate(selectedDate); }}
                                className="text-xs flex items-center gap-1 text-aura-primary hover:text-white transition-colors cursor-pointer"
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
                                            className={`border rounded-xl p-4 flex justify-between items-center group relative overflow-hidden transition-all cursor-pointer
                                                ${isArrived
                                                    ? 'bg-aura-secondary/5 border-aura-secondary shadow-[0_0_15px_-3px_rgba(0,227,107,0.3)]'
                                                    : (isCompleted
                                                        ? 'bg-aura-card/50 border-aura-border opacity-60 grayscale'
                                                        : 'bg-aura-card border-aura-border hover:border-aura-gold/30 hover:bg-aura-card/80')
                                                }
                                            `}
                                        >
                                            {/* Delete Confirmation Overlay */}
                                            {confirmDeleteResId === res.id ? (
                                                <div
                                                    className="absolute inset-0 bg-aura-black/90 backdrop-blur-sm flex items-center justify-center gap-4 z-10"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <span className="text-xs text-white font-medium">Eliminare?</span>
                                                    <button onClick={() => { onRemoveReservation(table.id, res.id); setConfirmDeleteResId(null); }} className="text-aura-red hover:underline text-xs font-bold cursor-pointer">SI</button>
                                                    <button onClick={() => setConfirmDeleteResId(null)} className="text-gray-400 hover:text-white text-xs cursor-pointer">NO</button>
                                                </div>
                                            ) : null}

                                            <div className="flex-1">
                                                <div className={`font-bold text-lg leading-tight flex items-center gap-2 ${res.status === 'PENDING' ? 'text-orange-400' : (isArrived ? 'text-aura-secondary' : 'text-white')}`}>
                                                    {res.firstName} {res.lastName}
                                                    {res.status === 'PENDING' && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/30 uppercase">In Attesa</span>}
                                                    {isArrived && <span className="text-[9px] bg-aura-secondary/20 text-aura-secondary px-1.5 py-0.5 rounded border border-aura-secondary/30 uppercase animate-pulse">Live</span>}

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1 transition-opacity ml-2">
                                                        {/* CHECK-IN ACTION */}
                                                        {(res.status === 'CONFIRMED' || res.status === 'PENDING' || !res.status) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onUpdateReservation(table.id, { ...res, status: 'ARRIVED' });
                                                                    onUpdateStatus(table.id, 'OCCUPIED');
                                                                }}
                                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-aura-secondary/10 text-aura-secondary hover:bg-aura-secondary hover:text-black transition-colors"
                                                                title="Check-in (Ospiti Arrivati)"
                                                            >
                                                                <UserCheck size={16} />
                                                            </button>
                                                        )}

                                                        {/* CHECK-OUT ACTION */}
                                                        {isArrived && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onUpdateReservation(table.id, { ...res, status: 'COMPLETED' });
                                                                    onUpdateStatus(table.id, 'FREE');
                                                                }}
                                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-aura-red/10 text-aura-red hover:bg-aura-red hover:text-white transition-colors"
                                                                title="Termina (Tavolo Liberato)"
                                                            >
                                                                <CheckCircle size={16} />
                                                            </button>
                                                        )}

                                                        {!isCompleted && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); startEditReservation(res); }}
                                                                    className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <Edit2 size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteResId(res.id); }}
                                                                    className="p-1 text-gray-400 hover:text-aura-red hover:bg-aura-red/10 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={`text-[10px] mt-1 uppercase tracking-wide flex gap-2 text-gray-500`}>
                                                    <span>{res.guests} Ospiti</span>
                                                    <span>•</span>
                                                    <span>Ore {res.time}</span>
                                                </div>
                                                {res.notes && <div className="text-xs text-gray-400 mt-1 italic">"{res.notes}"</div>}
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <div className={`font-mono text-xl ${res.status === 'PENDING' ? 'text-orange-400' : (isArrived ? 'text-aura-secondary' : 'text-aura-gold')}`}>
                                                    {res.time}
                                                </div>
                                                {res.tableName && <span className="text-[10px] bg-aura-primary/10 text-aura-primary px-1.5 py-0.5 rounded border border-aura-primary/20 uppercase font-bold mt-1">Tavolo {res.tableName}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-4 border border-dashed border-aura-border rounded-xl">
                                <p className="text-xs text-gray-600">Nessuna prenotazione per questa data</p>
                                <button
                                    onClick={() => { setIsAddingReservation(true); setResGuests(table.capacity); setResDate(selectedDate); }}
                                    className="text-xs text-aura-primary hover:text-aura-secondary transition-colors mt-2 flex items-center gap-1 mx-auto cursor-pointer"
                                >
                                    <CalendarPlus size={12} /> Aggiungi prenotazione
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* GESTIONE CAPACITA (PLANCIA) */}
                <div className="p-6 border-t border-aura-border/30 mt-6">
                    <div className="flex justify-between items-end mb-4">
                        <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase">Gestione Plancia</h3>
                        <span className="text-[10px] text-gray-600 bg-aura-card border border-aura-border px-2 py-1 rounded">Base: {table.originalCapacity} posti</span>
                    </div>

                    <div className="flex items-center justify-between bg-aura-card p-2 rounded-xl border border-aura-border">
                        <button
                            onClick={() => onModifyCapacity(table.id, -1)}
                            className="w-12 h-12 flex items-center justify-center bg-aura-grid rounded-lg hover:bg-aura-border text-gray-300 transition-colors cursor-pointer"
                        >
                            <Minus size={20} />
                        </button>
                        <div className="text-center flex-1">
                            <span className={`block text-3xl font-bold ${table.capacity > table.originalCapacity ? 'text-aura-primary' : 'text-white'}`}>
                                {table.capacity > table.originalCapacity ? `+${table.capacity - table.originalCapacity}` : '0'}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                                {table.capacity > table.originalCapacity ? `Totale: ${table.capacity} coperti` : 'Nessun posto aggiunto'}
                            </span>
                        </div>
                        <button
                            onClick={() => onModifyCapacity(table.id, 1)}
                            className="w-12 h-12 flex items-center justify-center bg-aura-primary/10 border border-aura-primary/20 rounded-lg hover:bg-aura-primary/20 text-aura-primary transition-colors cursor-pointer"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                {/* STRUMENTI AVANZATI (SPLIT / RESET / PERMANENT) */}
                <div className="p-6 border-t border-aura-border/30">
                    <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-4">Strumenti Avanzati</h3>
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
                                        <span className="block text-sm font-medium text-gray-200">Dividi Tavoli</span>
                                        <span className="block text-[10px] text-gray-500">Ripristina {table.subTables.length} tavoli originali</span>
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* Tasto Reset - Fixed UI */}
                        <div className="w-full relative overflow-hidden rounded-xl border border-aura-border/50 group hover:border-aura-secondary/30 transition-colors bg-aura-black hover:bg-aura-secondary/5">
                            {confirmResetTable ? (
                                <div className="absolute inset-0 bg-aura-black flex items-center justify-between px-4 z-10">
                                    <span className="text-sm font-medium text-white">Confermi reset?</span>
                                    <div className="flex gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); onResetTable(table.id); setConfirmResetTable(false); }} className="px-3 py-1 bg-aura-secondary text-black text-xs font-bold rounded cursor-pointer">SI</button>
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmResetTable(false); }} className="px-3 py-1 bg-gray-800 text-white text-xs font-bold rounded cursor-pointer">NO</button>
                                    </div>
                                </div>
                            ) : null}
                            <button
                                onClick={(e) => { e.stopPropagation(); setConfirmResetTable(true); }}
                                className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
                            >
                                <div className="p-2 rounded-lg bg-gray-800 text-gray-400 group-hover:text-aura-secondary transition-colors">
                                    <RotateCcw size={18} />
                                </div>
                                <div>
                                    <span className="block text-sm font-medium text-gray-300 group-hover:text-aura-secondary transition-colors">Reset totale</span>
                                    <span className="block text-[10px] text-gray-600">Torna a {table.originalCapacity} posti e pulisci stato</span>
                                </div>
                            </button>
                        </div>

                        {/* Tasto Elimina - Fixed UI */}
                        <div className="w-full relative overflow-hidden rounded-xl mt-6 border border-aura-red/30 group hover:border-aura-red/50 transition-colors bg-aura-red/5 hover:bg-aura-red/10">
                            {confirmDeleteTable ? (
                                <div className="absolute inset-0 bg-aura-black flex items-center justify-between px-4 z-10">
                                    <span className="text-sm font-medium text-aura-red">Eliminare davvero?</span>
                                    <div className="flex gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteTable(table.id); }} className="px-3 py-1 bg-aura-red text-white text-xs font-bold rounded cursor-pointer">SI</button>
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteTable(false); }} className="px-3 py-1 bg-gray-800 text-white text-xs font-bold rounded cursor-pointer">NO</button>
                                    </div>
                                </div>
                            ) : null}
                            <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteTable(true); }}
                                className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
                            >
                                <div className="p-2 rounded-lg bg-aura-red/10 text-aura-red">
                                    <Trash2 size={18} />
                                </div>
                                <div>
                                    <span className="block text-sm font-medium text-aura-red">Elimina tavolo</span>
                                    <span className="block text-[10px] text-aura-red/70">Rimuovi definitivamente dalla sala</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default TableDetails;