"use client";
import React, { useMemo, useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Users, Clock, CalendarCheck, Ban } from 'lucide-react';
import { TableData, TableShape, Position } from '../lib/types';
import { STATUS_STYLES, STALL_THRESHOLD_MINUTES } from '../lib/constants';

interface TableNodeProps {
  data: TableData;
  isSelected: boolean;
  isMergeCandidate: boolean; // Green dashed border
  isMergeError: boolean;     // Red dashed border (New prop)
  isManualSelected: boolean; // Checkmark/glow for manual merge selection
  onSelect: (id: string) => void;
  onDrag: (id: string, currentPos: Position) => void;
  onDragEnd: (id: string, newPos: Position) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  currentTime: number;
  selectedDate: string;
}

const TableNode: React.FC<TableNodeProps> = ({
  data,
  isSelected,
  isMergeCandidate,
  isMergeError,
  isManualSelected,
  onSelect,
  onDrag,
  onDragEnd,
  onContextMenu,
  currentTime,
  selectedDate
}) => {
  // Logic: A table is visually "RESERVED" if it's FREE but has at least one reservation FOR THE SELECTED DATE
  // Filter for ACTIVE reservations (CONFIRMED or PENDING) only for display
  const todaysReservations = data.reservations?.filter(r =>
    r.date === selectedDate && (r.status === 'CONFIRMED' || r.status === 'PENDING')
  ) || [];
  const isReserved = data.status === 'FREE' && todaysReservations.length > 0;

  // Get the most relevant reservation
  const upcomingReservations = useMemo(() => {
    if (!todaysReservations.length) return [];
    return [...todaysReservations]
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(0, 2);
  }, [todaysReservations]);

  const isPending = upcomingReservations.some(r => r.status === 'PENDING');

  const seatedReservation = data.status === 'OCCUPIED' ? data.reservations?.find(r => r.status === 'ARRIVED') : null;
  const displayGuests = seatedReservation ? `${seatedReservation.guests} / ${data.capacity}` : data.capacity;

  const visualStyle = isReserved
    ? STATUS_STYLES.RESERVED_VISUAL
    : STATUS_STYLES[data.status];

  // 10-minute warning logic (For OCCUPIED tables)
  const isUpcomingWarning = useMemo(() => {
    if (data.status !== 'OCCUPIED') return false;

    // We need to look at ALL reservations for today, not just active ones, 
    // because an OCCUPIED table might have a CONFIRMED reservation coming up
    const todayRes = data.reservations?.filter(r => r.date === selectedDate && r.status === 'CONFIRMED') || [];
    if (!todayRes.length) return false;

    const now = new Date(currentTime);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return todayRes.some(r => {
      const [rHour, rMin] = r.time.split(':').map(Number);
      const rMinutes = rHour * 60 + rMin;
      const diff = rMinutes - nowMinutes;
      // If the reservation is within the next 10 minutes (inclusive) or already passed
      return diff <= 10;
    });
  }, [data.status, data.reservations, selectedDate, currentTime]);

  // Late reservation warning (For FREE Tables)
  const isLateReservationWarning = useMemo(() => {
    if (data.status !== 'FREE' || !upcomingReservations.length) return false;

    const now = new Date(currentTime);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return upcomingReservations.some(r => {
      const [rHour, rMin] = r.time.split(':').map(Number);
      const rMinutes = rHour * 60 + rMin;
      // True if current time is past the reservation time
      return nowMinutes >= rMinutes;
    });
  }, [data.status, upcomingReservations, currentTime]);

  // Determine shape dimensions & roundedness
  // GRID SIZE is 60px.
  // Base Size requested: 150px.
  const getShapeStyle = (shape: TableShape, extended: boolean) => {
    if (extended) return 'w-[240px] h-[150px] rounded-3xl'; // Extended rectangle

    switch (shape) {
      case 'circle': return 'w-[150px] h-[150px] rounded-full';
      case 'square': return 'w-[150px] h-[150px] rounded-3xl';
      case 'rectangle': return 'w-[210px] h-[150px] rounded-3xl';
      case 'oval': return 'w-[220px] h-[150px] rounded-[80px]';
      default: return 'w-[150px] h-[150px] rounded-3xl';
    }
  };

  // Determine SVG border radius for the marching ants effect
  const getSvgRadius = (shape: TableShape, extended: boolean) => {
    if (extended) return 24;
    switch (shape) {
      case 'circle': return '50%';
      case 'square': return 24;
      case 'rectangle': return 24;
      case 'oval': return 75;
      default: return 24;
    }
  };

  // Timer logic
  const duration = useMemo(() => {
    if (!data.seatedAt || data.status === 'FREE') return null;
    const diff = Math.max(0, currentTime - data.seatedAt);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [data.seatedAt, data.status, currentTime]);

  const isDragging = useRef(false);

  const handleDragStart = () => {
    isDragging.current = true;
  };

  // Report position in real-time for proximity check
  const handleDrag = (_: any, info: PanInfo) => {
    const currentX = data.position.x + info.offset.x;
    const currentY = data.position.y + info.offset.y;
    onDrag(data.id, { x: currentX, y: currentY });
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    setTimeout(() => { isDragging.current = false; }, 200);
    const newX = data.position.x + info.offset.x;
    const newY = data.position.y + info.offset.y;
    onDragEnd(data.id, { x: newX, y: newY });
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging.current) { e.stopPropagation(); return; }
    e.stopPropagation();
    onSelect(data.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, data.id);
  };

  const resColorClass = isPending ? 'text-orange-400' : 'text-aura-gold';
  const shapeClass = getShapeStyle(data.shape, data.isExtended);
  const svgRadius = getSvgRadius(data.shape, data.isExtended);

  // Dynamic Styles based on Interaction State
  let containerClasses = "";
  if (isMergeError) {
    containerClasses = "border-aura-red/50 bg-aura-red/10 z-50";
  } else if (isMergeCandidate) {
    containerClasses = "z-50 bg-aura-primary/10"; // Border handled by SVG
  } else if (isManualSelected) {
    containerClasses = "border-aura-primary bg-aura-primary/20 z-50 shadow-[0_0_20px_-5px_rgba(0,227,107,0.5)]";
  } else if (isUpcomingWarning) {
    containerClasses = "border-transparent bg-aura-red/10 z-50 shadow-[0_0_15px_rgba(255,77,77,0.5)]";
  } else if (isLateReservationWarning) {
    containerClasses = "border-transparent bg-aura-gold/10 z-50 shadow-[0_0_15px_rgba(250,204,21,0.5)]";
  } else if (isPending) {
    containerClasses = "border-orange-500/50 bg-orange-500/5 z-10";
  } else {
    containerClasses = `${visualStyle.border} ${visualStyle.bg} ${data.status === 'FREE' && !isReserved ? 'bg-opacity-5' : 'bg-opacity-10'} ${isSelected ? 'z-50' : 'z-10'}`;
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.05}
      whileDrag={{
        scale: 1.05,
        cursor: 'grabbing',
        zIndex: 100,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
      }}
      whileHover={{ scale: 1.02 }}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      initial={{ opacity: 0, x: data.position.x, y: data.position.y }}
      animate={{
        x: data.position.x,
        y: data.position.y,
        opacity: 1,
        scale: (isMergeCandidate || isMergeError) ? 1.05 : 1,
        boxShadow: isSelected
          ? `0 0 0 2px white, 0 10px 25px -5px rgba(0,0,0,0.5)`
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`absolute flex flex-col items-center justify-center border backdrop-blur-sm transition-colors cursor-pointer select-none group will-change-transform
        ${shapeClass}
        ${containerClasses}
      `}
    >
      {/* MARCHING ANTS DASHED BORDER (SVG) - Green for Success, Red for Error/Warning, Yellow for Late */}
      {(isMergeCandidate || isMergeError || isUpcomingWarning || isLateReservationWarning) && (
        <div className="absolute inset-[-1px] pointer-events-none z-0">
          <svg width="100%" height="100%">
            <motion.rect
              width="100%"
              height="100%"
              rx={svgRadius}
              ry={svgRadius}
              fill="none"
              stroke={isMergeCandidate ? "#00e36b" : isLateReservationWarning ? "#facc15" : "#ff4d4d"}
              strokeWidth="3"
              strokeDasharray="8 8"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: -16 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            />
          </svg>
        </div>
      )}

      {/* Error Icon Overlay */}
      {isMergeError && (
        <div className="absolute -top-4 -right-4 bg-aura-red text-white p-1 rounded-full shadow-lg z-50 animate-bounce">
          <Ban size={20} />
        </div>
      )}
      <div className="flex flex-col items-center gap-1.5">
        <div className={`flex items-center gap-1 text-xs font-medium ${data.status === 'FREE' && !isReserved && !isMergeError ? 'text-white' : 'text-gray-300'}`}>
          <Users size={14} />
          <span>{displayGuests}</span>
        </div>
        <span className={`text-3xl font-bold tracking-tight text-white leading-none`}>
          {data.name}
        </span>
      </div>

      <div className="mt-2 flex flex-col items-center">
        {data.status === 'FREE' && !isReserved && !isMergeError && (
          <span className="text-xs font-bold tracking-widest uppercase text-aura-primary">LIBERO</span>
        )}
        {data.status === 'OCCUPIED' && !isMergeError && (
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-aura-red/10 border border-aura-red/20 mb-1">
            <Clock size={12} className="text-aura-red" />
            <span className="text-xs font-bold text-aura-red tabular-nums">{duration}</span>
          </div>
        )}
        {(isReserved || isUpcomingWarning) && upcomingReservations.length > 0 && !isMergeError && (
          <div className="flex flex-col items-center gap-1 mt-0.5">
            {data.status === 'FREE' && (
              <span className={`text-[10px] font-bold tracking-widest uppercase ${resColorClass}`}>
                {isPending ? 'DA CONFERMARE' : 'PRENOTATO'}
              </span>
            )}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border z-20 ${isPending ? 'bg-[#3a2010] border-orange-500/30' : 'bg-[#2a2415] border-aura-gold/30'}`}>
              <Clock size={10} className={isPending ? 'text-orange-400' : 'text-aura-gold shrink-0'} />
              <div className={`text-[10px] font-bold leading-none tracking-wide flex items-center gap-1.5 whitespace-nowrap ${isPending ? 'text-orange-400' : 'text-aura-gold'}`}>
                {upcomingReservations.map((r, idx) => (
                  <React.Fragment key={r.id}>
                    <span className="whitespace-nowrap">{r.time} <span className="text-[9px] opacity-75 font-medium ml-px">({r.guests})</span></span>
                    {idx < upcomingReservations.length - 1 && <span className="text-white/20">|</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
        {isMergeError && (
          <span className="text-[10px] font-bold tracking-widest uppercase text-aura-red bg-aura-black/50 px-2 py-0.5 rounded">OCCUPATO</span>
        )}
      </div>

      {data.subTables.length > 0 && (
        <div className="absolute -bottom-3 bg-aura-card border border-aura-border text-gray-400 text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
          <span>+ {data.subTables.length} tavoli uniti</span>
        </div>
      )}
    </motion.div>
  );
};

export default TableNode;