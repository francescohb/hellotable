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
  const nextReservation = useMemo(() => {
    if (!todaysReservations.length) return null;
    return [...todaysReservations].sort((a, b) => a.time.localeCompare(b.time))[0];
  }, [todaysReservations]);

  const visualStyle = isReserved
    ? STATUS_STYLES.RESERVED_VISUAL
    : STATUS_STYLES[data.status];

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

  const isPending = nextReservation?.status === 'PENDING';
  const resColorClass = isPending ? 'text-orange-400' : 'text-aura-gold';
  const shapeClass = getShapeStyle(data.shape, data.isExtended);
  const svgRadius = getSvgRadius(data.shape, data.isExtended);

  // Dynamic Styles based on Interaction State
  let containerClasses = "";
  if (isMergeError) {
    containerClasses = "border-aura-red/50 bg-aura-red/10 z-50";
  } else if (isMergeCandidate) {
    containerClasses = "z-50 bg-aura-primary/10"; // Border handled by SVG
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
      {/* MARCHING ANTS DASHED BORDER (SVG) - Green for Success, Red for Error */}
      {(isMergeCandidate || isMergeError) && (
        <div className="absolute inset-[-12px] pointer-events-none z-0">
          <svg width="100%" height="100%">
            <motion.rect
              width="100%"
              height="100%"
              rx={svgRadius}
              ry={svgRadius}
              fill="none"
              stroke={isMergeError ? "#ff4d4d" : "#00e36b"}
              strokeWidth="2"
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

      {/* Top Right Status Dot */}
      {data.status === 'OCCUPIED' && !isMergeError && (
        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-aura-red shadow-[0_0_8px_rgba(255,77,77,0.6)]" />
      )}

      {/* Reserved Icon */}
      {isReserved && !isMergeError && (
        <div className={`absolute top-3 right-3 animate-pulse ${resColorClass} ${data.shape === 'circle' ? 'bg-black/60 rounded-full p-1 -m-1' : ''}`}>
          <CalendarCheck size={16} />
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5">
        <div className={`flex items-center gap-1 text-xs font-medium ${data.status === 'FREE' && !isReserved && !isMergeError ? 'text-gray-500' : 'text-gray-300'}`}>
          <Users size={14} />
          <span>{data.capacity}</span>
        </div>
        <span className={`text-3xl font-bold tracking-tight text-white leading-none`}>
          {data.name}
        </span>
      </div>

      <div className="mt-2">
        {data.status === 'FREE' && !isReserved && !isMergeError && (
          <span className="text-xs font-bold tracking-widest uppercase text-aura-primary">LIBERO</span>
        )}
        {isReserved && nextReservation && !isMergeError && (
          <div className="flex flex-col items-center gap-0.5">
            <span className={`text-[10px] font-bold tracking-widest uppercase ${resColorClass}`}>
              {isPending ? 'IN ATTESA' : 'PRENOTATO'}
            </span>
            <span className={`text-xs font-medium ${isPending ? 'text-orange-400/80' : 'text-aura-gold/80'}`}>
              {nextReservation.time}
            </span>
          </div>
        )}
        {data.status === 'OCCUPIED' && !isMergeError && (
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-aura-red/10 border border-aura-red/20">
            <Clock size={12} className="text-aura-red" />
            <span className="text-xs font-bold text-aura-red tabular-nums">{duration}</span>
          </div>
        )}
        {isMergeError && (
          <span className="text-[10px] font-bold tracking-widest uppercase text-aura-red bg-aura-black/50 px-2 py-0.5 rounded">OCCUPATO</span>
        )}
      </div>

      {data.subTables.length > 0 && (
        <div className="absolute -bottom-3 bg-aura-card border border-aura-border text-gray-400 text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
          <span>+ {data.subTables.length} Uniti</span>
        </div>
      )}
    </motion.div>
  );
};

export default TableNode;