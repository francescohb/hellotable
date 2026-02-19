"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Bell, Grid, Plus, LogOut, Settings, Calendar, ChevronLeft, ChevronRight, Map as MapIcon, Merge, X, Check, BarChart2, TrendingUp, Users, Armchair, Percent, Clock, UserCheck, Minus, Scan, Search, MousePointer2, Anchor, LayoutGrid, RotateCcw } from 'lucide-react';
import TableNode from './TableNode';
import TableDetails from './TableDetails';
import SettingsView from './SettingsModal';
import ReservationsView from './ReservationsView';
import DatePicker from './DatePicker';
import ContextMenu from './ContextMenu';
import { TableData, Position, TableStatus, Reservation, TableShape } from '../lib/types';

interface FloorManagerProps {
    onLogout: () => void;
    restaurantName: string;
    initialTables: TableData[];
    floors: string[];
    initialTime?: number;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 1.5;

const FloorManager: React.FC<FloorManagerProps> = ({ onLogout, restaurantName, initialTables, floors: initialFloors, initialTime }) => {
    const [tables, setTables] = useState<TableData[]>(initialTables);
    const [floors, setFloors] = useState<string[]>(initialFloors);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    
    // Stats Modal State
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [statsTab, setStatsTab] = useState<'floor' | 'all'>('floor');
    
    // CONTEXT MENU STATE (Table)
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, tableId: string } | null>(null);
    
    // CONTEXT MENU STATE (Floor)
    const [floorMenu, setFloorMenu] = useState<{ x: number, y: number, canvasX: number, canvasY: number } | null>(null);

    const [currentTime, setCurrentTime] = useState<number>(initialTime || Date.now());
    const startTimeOffsetRef = useRef<number>(initialTime ? initialTime - Date.now() : 0);
    const [activeFloor, setActiveFloor] = useState<string>(initialFloors[0] || 'Default');
    const [notification, setNotification] = useState<string | null>(null);

    const [isEditingReservation, setIsEditingReservation] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [unassignedReservations, setUnassignedReservations] = useState<Reservation[]>([]);

    // --- DRAG & MERGE STATE ---
    const [draggedTableId, setDraggedTableId] = useState<string | null>(null);
    const [mergeCandidateId, setMergeCandidateId] = useState<string | null>(null);
    const [mergeErrorId, setMergeErrorId] = useState<string | null>(null); // New State for Red Feedback
    const [pendingMerge, setPendingMerge] = useState<{ sourceId: string, targetId: string, originalPosition: Position } | null>(null);

    const layoutsRef = useRef<Record<string, TableData[]>>({});
    const reservationsRef = useRef<Record<string, Reservation[]>>({});

    const [currentView, setCurrentView] = useState<'map' | 'settings' | 'reservations'>('map');
    const [preselectNewReservation, setPreselectNewReservation] = useState<boolean>(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const [viewPos, setViewPos] = useState({ x: 0, y: 0 });
    const [zoomLevel, setZoomLevel] = useState(1);

    useEffect(() => {
        initialTables.forEach(t => {
            if (t.reservations && t.reservations.length > 0) {
                reservationsRef.current[t.id] = t.reservations;
            }
        });
    }, []);

    useEffect(() => {
        if (!floors.includes(activeFloor) && floors.length > 0) {
            setActiveFloor(floors[0]);
        }
    }, [floors]);

    const currentFloorTables = useMemo(() => tables.filter(t => t.floor === activeFloor), [tables, activeFloor]);

    // --- FIT CONTENT LOGIC ---
    const fitContent = useCallback(() => {
        if (!containerRef.current || currentFloorTables.length === 0) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        currentFloorTables.forEach(t => {
            if (t.position.x < minX) minX = t.position.x;
            if (t.position.y < minY) minY = t.position.y;
            
            // Calculate dimensions based on table size (approx 150-240px)
            // Using a tighter bounding box to minimize empty space
            const boundSize = t.isExtended ? 240 : 150; 
            
            if (t.position.x + boundSize > maxX) maxX = t.position.x + boundSize;
            if (t.position.y + 150 > maxY) maxY = t.position.y + 150;
        });

        // Reduced padding to fill screen more effectively (was 150)
        const padding = 80;
        const contentWidth = (maxX - minX) + (padding * 2);
        const contentHeight = (maxY - minY) + (padding * 2);
        
        const contentCenterX = (minX + maxX) / 2;
        const contentCenterY = (minY + maxY) / 2;
        
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        const scaleX = containerWidth / contentWidth;
        const scaleY = containerHeight / contentHeight;
        
        // Exact fit scale
        let targetScale = Math.min(scaleX, scaleY);
        
        // Clamp
        targetScale = Math.min(Math.max(targetScale, MIN_ZOOM), MAX_ZOOM);
        
        const newX = (containerWidth / 2) - (contentCenterX * targetScale);
        // Shift Y to lower the grid. Requested: -30px relative to center (reset).
        const newY = ((containerHeight / 2) - (contentCenterY * targetScale) - 30);
        
        setZoomLevel(targetScale);
        setViewPos({ x: newX, y: newY });
    }, [currentFloorTables]);

    const fitContentRef = useRef(fitContent);
    useEffect(() => { fitContentRef.current = fitContent; }, [fitContent]);

    useEffect(() => {
        if (currentView !== 'map') return;
        const fit = () => fitContentRef.current();
        if (containerRef.current && containerRef.current.clientWidth > 0) fit();
        window.addEventListener('resize', fit);
        const raf = requestAnimationFrame(fit);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', fit);
        };
    }, [activeFloor, currentView]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now() + startTimeOffsetRef.current), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (notification) {
            const t = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(t);
        }
    }, [notification]);

    // --- CONTEXT MENU HANDLERS (TABLE) ---
    const handleTableContextMenu = (e: React.MouseEvent, tableId: string) => {
        // Prevent opening if dragging
        if (draggedTableId) return;
        
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            tableId
        });
        setSelectedTableId(null); // Deselect to avoid sidebar conflict
        setFloorMenu(null); // Close floor menu if open
    };

    // --- CONTEXT MENU HANDLERS (FLOOR) ---
    const handleFloorContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (draggedTableId || contextMenu) return; // Priority to table interactions

        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        
        // Calculate world coordinates for potential new table placement
        const canvasX = (e.clientX - rect.left - viewPos.x) / zoomLevel;
        const canvasY = (e.clientY - rect.top - viewPos.y) / zoomLevel;

        setFloorMenu({
            x: e.clientX,
            y: e.clientY,
            canvasX,
            canvasY
        });
        setSelectedTableId(null);
        setContextMenu(null);
    };

    const handleQuickAddTable = () => {
        if (!floorMenu) return;
        
        const newId = `t-${Date.now()}`;
        
        // --- SMART NAMING: EXTRA 1, 2, 3... ---
        const extraTables = tables.filter(t => t.name.startsWith("Extra"));
        const existingNumbers = extraTables
            .map(t => parseInt(t.name.replace("Extra", "")))
            .filter(n => !isNaN(n));
        const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        const newName = `Extra${nextNum}`;

        // --- SMART PLACEMENT: AVOID OVERLAP ---
        const TABLE_SIZE = 150; // Updated size (2.5 squares)
        const BUFFER = 60; // Updated buffer
        const TOTAL_SPACE = TABLE_SIZE + BUFFER;
        
        let safeX = floorMenu.canvasX - (TABLE_SIZE / 2); // Center on click
        let safeY = floorMenu.canvasY - (TABLE_SIZE / 2);
        
        let collision = true;
        let attempts = 0;
        let radius = 0;
        let angle = 0;

        // Spiral search for free spot
        while (collision && attempts < 100) {
            collision = tables.filter(t => t.floor === activeFloor).some(t => {
                // Approximate bounding box check
                const tWidth = t.isExtended ? 240 : 150;
                const tHeight = 150;
                
                // Check if rects overlap with buffer
                return (
                    safeX < t.position.x + tWidth + BUFFER &&
                    safeX + TABLE_SIZE + BUFFER > t.position.x &&
                    safeY < t.position.y + tHeight + BUFFER &&
                    safeY + TABLE_SIZE + BUFFER > t.position.y
                );
            });

            if (collision) {
                // Move in a spiral
                radius += 10;
                angle += 1; // Radians roughly
                safeX = (floorMenu.canvasX - 75) + Math.cos(angle) * radius;
                safeY = (floorMenu.canvasY - 75) + Math.sin(angle) * radius;
                attempts++;
            }
        }

        if (attempts >= 100) {
            setNotification("Impossibile posizionare tavolo (spazio insufficiente)");
            setFloorMenu(null);
            return;
        }

        setTables(prev => [...prev, {
            id: newId,
            name: newName,
            floor: activeFloor,
            position: { x: safeX, y: safeY }, 
            shape: 'square',
            capacity: 2,
            originalCapacity: 2,
            status: 'FREE',
            isExtended: false,
            subTables: [],
            reservations: [],
            isTemporary: true // MARK AS TEMPORARY
        }]);
        
        setFloorMenu(null);
        setNotification(`Tavolo ${newName} aggiunto`);
    };

    const handleResetLayout = () => {
        if (!floorMenu) return;
        
        // Use the initialTables prop as the source of truth for default positions
        const originalMap = new Map(initialTables.map(t => [t.id, t.position]));

        const updatedTables = tables.map(t => {
            if (t.floor !== activeFloor) return t;
            
            // Restore original position if it exists
            const originalPos = originalMap.get(t.id);
            if (originalPos) {
                return { ...t, position: { ...originalPos } };
            }
            
            // If it's a temporary table or not in original set, keep it where it is
            return t;
        });

        setTables(updatedTables);
        setFloorMenu(null);
        setNotification("Layout ripristinato");
        
        // Fit content after reset
        setTimeout(() => fitContentRef.current(), 100);
    };

    const handleMakePermanent = (tableId: string) => {
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, isTemporary: false } : t));
        setNotification("Tavolo reso fisso");
        setContextMenu(null);
    };

    const handleContextMenuAction = (action: 'toggle_status' | 'split' | 'reset' | 'delete' | 'make_permanent', tableId: string) => {
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        if (action === 'make_permanent') {
            handleMakePermanent(tableId);
        } else if (action === 'toggle_status') {
            if (table.status === 'OCCUPIED') {
                updateTableStatus(tableId, 'FREE');
                setNotification('Tavolo Liberato');
            } else {
                // Smart Occupy logic
                const todaysRes = table.reservations.filter(r => r.date === selectedDate && r.status !== 'ARRIVED' && r.status !== 'COMPLETED');
                const resToCheckIn = todaysRes.sort((a,b) => a.time.localeCompare(b.time))[0];

                if (resToCheckIn) {
                    const updatedRes = { ...resToCheckIn, status: 'ARRIVED' as const };
                    updateReservation(tableId, updatedRes);
                    updateTableStatus(tableId, 'OCCUPIED');
                    setNotification(`Check-in effettuato per ${updatedRes.firstName} ${updatedRes.lastName}`);
                } else {
                    updateTableStatus(tableId, 'OCCUPIED');
                    setNotification('Tavolo Occupato (Walk-in)');
                }
            }
        } else if (action === 'split') {
            splitTable(tableId);
        } else if (action === 'reset') {
            resetTable(tableId);
        } else if (action === 'delete') {
            deleteTable(tableId);
        }
        setContextMenu(null);
    };

    // --- ZOOM HANDLERS ---
    const transformRef = useRef({ zoom: zoomLevel, x: viewPos.x, y: viewPos.y });
    const selectedTableIdRef = useRef(selectedTableId);
    // Ref for stats open state to use in event listeners
    const isStatsOpenRef = useRef(isStatsOpen);

    useEffect(() => { transformRef.current = { zoom: zoomLevel, x: viewPos.x, y: viewPos.y }; }, [zoomLevel, viewPos]);
    useEffect(() => { selectedTableIdRef.current = selectedTableId; }, [selectedTableId]);
    useEffect(() => { isStatsOpenRef.current = isStatsOpen; }, [isStatsOpen]);

    const handleZoom = (delta: number) => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const newZoom = Math.min(Math.max(zoomLevel + delta, MIN_ZOOM), MAX_ZOOM);
        const scaleFactor = newZoom / zoomLevel;
        
        const newX = centerX - (centerX - viewPos.x) * scaleFactor;
        const newY = centerY - (centerY - viewPos.y) * scaleFactor;
        
        setZoomLevel(newZoom);
        setViewPos({ x: newX, y: newY });
    };

    const onWheel = useCallback((e: WheelEvent) => {
        if (selectedTableIdRef.current || isStatsOpenRef.current) return; // Disable zoom if stats open
        e.preventDefault();
        const { zoom: oldZoom, x: oldX, y: oldY } = transformRef.current;
        if (e.ctrlKey) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const delta = e.deltaY * -0.01;
            const newZoom = Math.min(Math.max(oldZoom + delta, MIN_ZOOM), MAX_ZOOM);
            const newX = mouseX - ((mouseX - oldX) / oldZoom) * newZoom;
            const newY = mouseY - ((mouseY - oldY) / oldZoom) * newZoom;
            setZoomLevel(newZoom);
            setViewPos({ x: newX, y: newY });
        } else {
            setViewPos({ x: oldX - e.deltaX, y: oldY - e.deltaY });
        }
    }, []);

    const setContainerRef = useCallback((node: HTMLDivElement | null) => {
        if (containerRef.current) {
            containerRef.current.removeEventListener('wheel', onWheel);
        }
        containerRef.current = node;
        if (node) {
            node.addEventListener('wheel', onWheel, { passive: false });
            requestAnimationFrame(() => fitContentRef.current());
        }
    }, [onWheel]);

    // --- COLLISION & DRAG LOGIC ---
    // Updated dimensions to match TableNode visual update (2.5 squares = 150px min)
    const getTableDimensions = (shape: TableShape, extended: boolean) => {
        if (extended) return { w: 240, h: 150 }; 
        switch (shape) {
            case 'circle': return { w: 150, h: 150 };
            case 'square': return { w: 150, h: 150 };
            case 'rectangle': return { w: 210, h: 150 };
            case 'oval': return { w: 220, h: 150 };
            default: return { w: 150, h: 150 };
        }
    };

    // Calculate strict distance between edges
    const getEdgeDistance = (
        pos1: Position, dim1: { w: number, h: number },
        pos2: Position, dim2: { w: number, h: number }
    ) => {
        const left1 = pos1.x; const right1 = pos1.x + dim1.w;
        const top1 = pos1.y; const bottom1 = pos1.y + dim1.h;
        const left2 = pos2.x; const right2 = pos2.x + dim2.w;
        const top2 = pos2.y; const bottom2 = pos2.y + dim2.h;

        const xOverlap = Math.max(0, Math.min(right1, right2) - Math.max(left1, left2));
        const yOverlap = Math.max(0, Math.min(bottom1, bottom2) - Math.max(top1, top2));

        if (xOverlap > 0 && yOverlap > 0) return 0; // Touching or overlapping

        const xDist = xOverlap > 0 ? 0 : Math.max(left2 - right1, left1 - right2);
        const yDist = yOverlap > 0 ? 0 : Math.max(top2 - bottom1, top1 - bottom2);

        return Math.sqrt(xDist * xDist + yDist * yDist);
    };

    // --- REAL-TIME DRAG HANDLER ---
    const handleTableDrag = useCallback((id: string, currentPos: Position) => {
        setContextMenu(null); // Close context menu on drag
        setFloorMenu(null); // Close floor menu on drag
        setDraggedTableId(id);
        const activeTable = tables.find(t => t.id === id);
        if (!activeTable) return;

        const activeDim = getTableDimensions(activeTable.shape, activeTable.isExtended);
        const otherTables = tables.filter(t => t.id !== id && t.floor === activeFloor);

        // Check if within 30px of any other table
        let bestCandidate: string | null = null;
        let minDistance = Infinity;
        let foundError = null;

        for (const t of otherTables) {
            const tDim = getTableDimensions(t.shape, t.isExtended);
            const dist = getEdgeDistance(currentPos, activeDim, t.position, tDim);
            
            if (dist < 30) {
                // If either table is occupied, prioritize error detection
                if (activeTable.status === 'OCCUPIED' || t.status === 'OCCUPIED') {
                    foundError = t.id;
                } else if (dist < minDistance) {
                    minDistance = dist;
                    bestCandidate = t.id;
                }
            }
        }

        if (foundError) {
            setMergeErrorId(foundError);
            setMergeCandidateId(null);
        } else {
            setMergeErrorId(null);
            setMergeCandidateId(bestCandidate);
        }

    }, [tables, activeFloor]);

    // --- DRAG END HANDLER ---
    const handleTableDragEnd = useCallback((id: string, newPos: Position) => {
        setDraggedTableId(null);
        setMergeCandidateId(null); 
        setMergeErrorId(null); // Clear error highlight

        const activeTable = tables.find(t => t.id === id);
        if (!activeTable) return;

        const activeDim = getTableDimensions(activeTable.shape, activeTable.isExtended);
        const otherTables = tables.filter(t => t.id !== id && t.floor === activeFloor);
        
        // Re-check proximity
        const targetMergeTable = otherTables.find(t => {
            const tDim = getTableDimensions(t.shape, t.isExtended);
            return getEdgeDistance(newPos, activeDim, t.position, tDim) < 30;
        });

        if (targetMergeTable) {
            // SNAP BACK IF EITHER TABLE IS OCCUPIED
            if (activeTable.status === 'OCCUPIED' || targetMergeTable.status === 'OCCUPIED') {
                setNotification("Impossibile unire tavoli occupati");
                // Snap Back by forcefully resetting state to original position
                setTables(prev => prev.map(t => t.id === id ? { ...t, position: { ...activeTable.position } } : t));
                return;
            }

            // TRIGGER MERGE REQUEST (Valid)
            setPendingMerge({
                sourceId: id,
                targetId: targetMergeTable.id,
                originalPosition: { ...activeTable.position } // Save original for snap-back
            });
            // Update position to reflect user drop (visual feedback)
            setTables(prev => prev.map(t => t.id === id ? { ...t, position: newPos } : t));
        } else {
            // VALIDATE POSITION (Check strictly for overlap or < 0 distance)
            const isInvalid = otherTables.some(t => {
                const tDim = getTableDimensions(t.shape, t.isExtended);
                // Simple intersection check
                return (
                    newPos.x < t.position.x + tDim.w &&
                    newPos.x + activeDim.w > t.position.x &&
                    newPos.y < t.position.y + tDim.h &&
                    newPos.y + activeDim.h > t.position.y
                );
            });

            if (isInvalid) {
                // Snap Back
                setTables(prev => prev.map(t => t.id === id ? { ...t, position: { ...activeTable.position } } : t));
                setNotification("Posizione non valida");
            } else {
                // Confirm Move
                setTables(prev => prev.map(t => t.id === id ? { ...t, position: newPos } : t));
            }
        }
    }, [tables, activeFloor]);

    // --- MERGE HANDLERS ---
    const handleConfirmMerge = () => {
        if (!pendingMerge) return;
        const { sourceId, targetId, originalPosition } = pendingMerge;
        
        const targetTable = tables.find(t => t.id === targetId);
        const sourceTable = tables.find(t => t.id === sourceId);
        
        if (targetTable && sourceTable) {
             const sourceRecord = { ...sourceTable, position: originalPosition };
             const subTables = [
                ...(targetTable.subTables.length > 0 ? targetTable.subTables : [targetTable]),
                ...(sourceTable.subTables.length > 0 ? sourceTable.subTables : [sourceRecord])
            ];
            
            // Calculate new position (Centroid of both)
            const newX = (targetTable.position.x + sourceTable.position.x) / 2;
            const newY = (targetTable.position.y + sourceTable.position.y) / 2;

            const mergedTable: TableData = {
                ...targetTable,
                id: `merged-${Date.now()}`,
                name: `${targetTable.name}+${sourceTable.name}`,
                capacity: Math.max(0, targetTable.capacity) + Math.max(0, sourceTable.capacity),
                originalCapacity: targetTable.originalCapacity + sourceTable.originalCapacity,
                subTables: subTables,
                shape: 'rectangle', // Merged is usually rectangle
                isExtended: true,
                position: { x: newX, y: newY },
                status: sourceTable.status === 'OCCUPIED' ? 'OCCUPIED' : targetTable.status,
                reservations: [...targetTable.reservations, ...sourceTable.reservations],
                isTemporary: targetTable.isTemporary || sourceTable.isTemporary // Inherit temporary if either was
            };

            // Remove source, Replace target with Merged
            // NO repelNeighbors call here, allowing overlap if necessary per user request
            const newTables = tables.filter(t => t.id !== sourceId).map(t => t.id === targetId ? mergedTable : t);
            
            setTables(newTables);
            setSelectedTableId(mergedTable.id);
            setNotification(`Tavoli uniti: ${sourceTable.name} + ${targetTable.name}`);
        }
        
        setPendingMerge(null);
    };

    const handleCancelMerge = () => {
        if (!pendingMerge) return;
        const { sourceId, originalPosition } = pendingMerge;
        // SNAP BACK TO ORIGINAL
        setTables(prev => prev.map(t => t.id === sourceId ? { ...t, position: { ...originalPosition } } : t));
        setPendingMerge(null);
        setNotification("Unione annullata");
    };

    // --- OTHER HANDLERS (Same as before) ---
    const updateTableStatus = (id: string, status: TableStatus) => {
        setTables(prev => prev.map(t => {
            if (t.id !== id) return t;
            const updates: Partial<TableData> = { status };
            if (status === 'OCCUPIED' && t.status !== 'OCCUPIED') {
                updates.seatedAt = Date.now();
                updates.lastOrderAt = Date.now();
            }
            if (status === 'FREE') {
                updates.seatedAt = undefined;
                updates.lastOrderAt = undefined;
            }
            return { ...t, ...updates };
        }));
    };

    const modifyCapacity = (id: string, delta: number) => {
        setTables(prev => prev.map(t => {
            if (t.id !== id) return t;
            const newCap = Math.max(t.originalCapacity, t.capacity + delta);
            return { ...t, capacity: newCap, isExtended: newCap > t.originalCapacity };
        }));
    };

    const renameTable = (id: string, newName: string) => {
        setTables(prev => prev.map(t => t.id === id ? { ...t, name: newName } : t));
    };

    const addReservation = (tableId: string | null, reservation: Reservation) => {
        if (!tableId) {
            setUnassignedReservations(prev => [...prev, reservation]);
        } else {
            setTables(prev => prev.map(t => t.id === tableId ? { ...t, reservations: [...t.reservations, reservation] } : t));
        }
        setNotification(`Prenotazione aggiunta per ${reservation.firstName} ${reservation.lastName}`);
    };

    const removeReservation = (tableId: string | null, reservationId: string) => {
        if (!tableId) {
            setUnassignedReservations(prev => prev.filter(r => r.id !== reservationId));
        } else {
            setTables(prev => prev.map(t => t.id === tableId ? {
                ...t,
                reservations: t.reservations.filter(r => r.id !== reservationId)
            } : t));
        }
        setNotification('Prenotazione cancellata');
    };

    const updateReservation = (newTableId: string | null, updatedRes: Reservation) => {
        let found = false;
        setUnassignedReservations(prev => {
            const exists = prev.some(r => r.id === updatedRes.id);
            if (exists) found = true;
            return prev.filter(r => r.id !== updatedRes.id);
        });
        setTables(prev => prev.map(t => {
            const exists = t.reservations.some(r => r.id === updatedRes.id);
            if (exists) found = true;
            // Map the reservation to replace it if it exists in this table
            const newReservations = t.reservations.map(r => r.id === updatedRes.id ? updatedRes : r);
            // If it didn't exist before in this table but we want to update it (e.g. status change)
            // we should have handled filtering it out above.
            // Wait, the logic here was a bit simplified in previous prompt.
            // Correct update logic:
            if (exists) return { ...t, reservations: newReservations };
            
            // If we are strictly updating an existing reservation in place:
            return t; 
        }));
        
        // If we need to move it or add it if not found (handled loosely before)
        // For the purpose of the context menu "check-in", we assume the reservation is already on the table.
        // So the above map is sufficient for check-in status update.
        
        setNotification(`Prenotazione aggiornata`);
    };

    const mergeTablesAndAddReservation = (tableIds: string[], reservation: Reservation) => {
        const targetTables = tables.filter(t => tableIds.includes(t.id));
        if (targetTables.length < 2) return;
        const avgX = targetTables.reduce((sum, t) => sum + t.position.x, 0) / targetTables.length;
        const avgY = targetTables.reduce((sum, t) => sum + t.position.y, 0) / targetTables.length;
        const combinedCapacity = targetTables.reduce((sum, t) => sum + t.capacity, 0);
        const combinedOriginalCapacity = targetTables.reduce((sum, t) => sum + t.originalCapacity, 0);
        const newName = targetTables.map(t => t.name).join('+');
        const allSubTables = targetTables.flatMap(t => t.subTables.length > 0 ? t.subTables : [t]);
        const allReservations = targetTables.flatMap(t => t.reservations);
        const mergedTable: TableData = {
            id: `t-merged-${Date.now()}`,
            name: newName,
            floor: targetTables[0].floor,
            position: { x: avgX, y: avgY },
            shape: 'rectangle',
            capacity: combinedCapacity,
            originalCapacity: combinedOriginalCapacity,
            status: 'FREE',
            isExtended: true,
            subTables: allSubTables,
            reservations: [...allReservations, reservation]
        };
        const newTables = [
            ...tables.filter(t => !tableIds.includes(t.id)),
            mergedTable
        ];
        // Note: repelNeighbors was removed here as well to respect user choice
        setTables(newTables);
        setNotification(`Tavoli uniti e prenotazione aggiunta`);
    };

    const splitTable = (id: string) => {
        const tableToSplit = tables.find(t => t.id === id);
        if (!tableToSplit || tableToSplit.subTables.length === 0) return;
        const restoredTables = tableToSplit.subTables.map((sub) => ({
            ...sub, position: sub.position, status: 'FREE' as TableStatus, reservations: reservationsRef.current[sub.id] || []
        }));
        setTables(prev => [...prev.filter(t => t.id !== id), ...restoredTables]);
        setSelectedTableId(null);
        setNotification("Tavoli divisi");
    };

    const resetTable = (id: string) => {
        setTables(prev => prev.map(t => t.id === id ? { ...t, capacity: t.originalCapacity, status: 'FREE', seatedAt: undefined, lastOrderAt: undefined, isExtended: false } : t));
        setNotification("Tavolo ripristinato");
    };

    const deleteTable = (id: string) => {
        setTables(prev => prev.filter(t => t.id !== id));
        setSelectedTableId(null);
        setNotification("Tavolo eliminato");
    };

    const handleUpdateFloors = (action: 'add' | 'rename' | 'delete', oldName?: string, newName?: string) => {
        if (action === 'add' && newName) {
            if (floors.includes(newName)) { setNotification("Esiste già"); return; }
            setFloors([...floors, newName]);
        }
        if (action === 'rename' && oldName && newName) {
            setFloors(floors.map(f => f === oldName ? newName : f));
            setTables(prev => prev.map(t => t.floor === oldName ? { ...t, floor: newName } : t));
            if (activeFloor === oldName) setActiveFloor(newName);
        }
        if (action === 'delete' && oldName) {
            setFloors(floors.filter(f => f !== oldName));
            setTables(prev => prev.filter(t => t.floor !== oldName));
        }
    };

    const handleAddTable = (floor: string, name: string, capacity: number, shape: TableShape) => {
        const newId = `t-${Date.now()}`;
        const targetFloorTables = tables.filter(t => t.floor === floor);
        let safeX = 2000, safeY = 2000, collision = true, attempts = 0;
        while (collision && attempts < 50) {
            // Increased safe distance check to 250px due to larger tables (150px)
            collision = targetFloorTables.some(t => Math.sqrt(Math.pow(t.position.x - safeX, 2) + Math.pow(t.position.y - safeY, 2)) < 250);
            if (collision) { safeX += 250; if (safeX > 3000) { safeX = 2000; safeY += 250; } }
            attempts++;
        }
        setTables(prev => [...prev, {
            id: newId, name, floor, position: { x: safeX, y: safeY }, shape, capacity, originalCapacity: capacity,
            status: 'FREE', isExtended: false, subTables: [], reservations: []
        }]);
        setNotification(`Tavolo ${name} aggiunto`);
    };

    const handleUpdateTable = (id: string, updates: Partial<TableData>) => {
        setTables(prev => prev.map(t => t.id === id ? { ...t, ...updates, originalCapacity: updates.capacity !== undefined ? updates.capacity : t.originalCapacity } : t));
    };

    const selectedTable = tables.find(t => t.id === selectedTableId) || null;
    const dateStr = new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', month: 'long', day: 'numeric' });
    const timeStr = new Date(currentTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    const stats = useMemo(() => {
        const targetTables = statsTab === 'floor' ? currentFloorTables : tables;
        const totalTables = targetTables.length;
        const totalSeats = targetTables.reduce((acc, t) => acc + t.capacity, 0);
        const occupiedTables = targetTables.filter(t => t.status === 'OCCUPIED');
        const reservedTables = targetTables.filter(t => t.status === 'FREE' && t.reservations?.some(r => r.date === selectedDate));
        const freeTables = targetTables.filter(t => t.status === 'FREE' && !t.reservations?.some(r => r.date === selectedDate));
        
        const occupiedSeats = occupiedTables.reduce((acc, t) => acc + t.capacity, 0);
        const reservedSeats = reservedTables.reduce((acc, t) => acc + t.capacity, 0);
        
        // Collect detailed pending reservations for display
        const pendingList = targetTables.flatMap(t => 
            (t.reservations || [])
            .filter(r => r.date === selectedDate && r.status !== 'ARRIVED' && r.status !== 'COMPLETED')
            .map(r => ({ ...r, tableName: t.name }))
        ).sort((a, b) => a.time.localeCompare(b.time));

        return {
            totalSeats, totalTables,
            occupiedSeats,
            reservedSeats,
            freeTablesCount: freeTables.length,
            reservedTablesCount: reservedTables.length,
            occupiedTablesCount: occupiedTables.length,
            pendingList, // New detailed list
            occupancyRate: totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0,
            avgPartySize: occupiedTables.length > 0 ? Math.round(occupiedSeats / occupiedTables.length) : 0
        };
    }, [tables, currentFloorTables, selectedDate, statsTab]);

    const changeDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        handleDateSwitch(d.toISOString().split('T')[0]);
    }
    const setDateToToday = () => {
        handleDateSwitch(new Date().toISOString().split('T')[0]);
    }
    const handleDateSwitch = (newDate: string) => {
        if (newDate === selectedDate) return;
        layoutsRef.current[selectedDate] = JSON.parse(JSON.stringify(tables));
        let nextLayout = layoutsRef.current[newDate] || JSON.parse(JSON.stringify(initialTables));
        const hydratedLayout = nextLayout.map((t: TableData) => {
            const storedRes = reservationsRef.current[t.id];
            return storedRes ? { ...t, reservations: storedRes } : t;
        });
        setTables(hydratedLayout);
        setSelectedDate(newDate);
    };

    // Calculate Dynamic Position for Merge Modal
    let mergeModalPosition = { x: 0, y: 0 };
    if (pendingMerge) {
        const s = tables.find(t => t.id === pendingMerge.sourceId);
        const t = tables.find(t => t.id === pendingMerge.targetId);
        if (s && t) {
            // Find world space center
            const worldX = (s.position.x + t.position.x) / 2 + 75; // 75 is half width
            const worldY = Math.min(s.position.y, t.position.y) - 60; // Float above

            // Project to screen space
            mergeModalPosition = {
                x: viewPos.x + (worldX * zoomLevel),
                y: viewPos.y + (worldY * zoomLevel)
            };
        }
    }

    return (
        <div className="flex flex-col h-screen w-screen bg-aura-bg text-white overflow-hidden font-sans selection:bg-aura-primary selection:text-black">
            {/* HEADER */}
            <header className="h-16 border-b border-aura-border bg-aura-bg flex items-center justify-between px-6 z-50 shrink-0 relative">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('map')}>
                    <div className="w-8 h-8 rounded-lg bg-aura-primary flex items-center justify-center text-black font-bold text-lg shadow-[0_0_15px_-3px_rgba(0,227,107,0.5)]">A</div>
                    <span className="font-semibold text-lg text-white tracking-tight">helloTable</span>
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    <div className="flex items-center gap-2 pointer-events-auto">
                        <div className="flex items-center px-4 py-1.5">
                            <button onClick={() => changeDate(-1)} className="p-1.5 rounded-full border border-aura-border bg-aura-border/10 hover:bg-aura-border/30 hover:text-white text-gray-400 transition-colors cursor-pointer"><ChevronLeft size={16} /></button>
                            <DatePicker date={selectedDate} onDateChange={handleDateSwitch} align="center">
                                <div className="relative group mx-4 text-center cursor-pointer min-w-[150px]">
                                    <span className="text-xs font-bold text-gray-500 uppercase block leading-none mb-0.5">DATA</span>
                                    <div className="text-sm font-medium text-white flex items-center justify-center gap-2">{dateStr}</div>
                                </div>
                            </DatePicker>
                            <button onClick={() => changeDate(1)} className="p-1.5 rounded-full border border-aura-border bg-aura-border/10 hover:bg-aura-border/30 hover:text-white text-gray-400 transition-colors cursor-pointer"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={setDateToToday} className="px-3 py-1 bg-aura-primary text-black font-bold text-[10px] uppercase rounded cursor-pointer hover:bg-aura-secondary transition-colors shadow-sm">Oggi</button>
                        <div className="text-2xl font-bold text-white tabular-nums">{timeStr}</div>
                    </div>
                    <button onClick={() => setCurrentView('settings')} className={`p-2 rounded-full transition-colors ${currentView === 'settings' ? 'bg-aura-primary text-black' : 'text-gray-400 hover:text-white hover:bg-aura-border/20'}`}><Settings size={20} /></button>
                    <button className="relative p-2 rounded-full hover:bg-aura-border/20 transition-colors text-gray-400 hover:text-white"><Bell size={20} /><span className="absolute top-2 right-2 w-2 h-2 bg-aura-primary rounded-full border border-aura-bg animate-pulse"></span></button>
                    <button onClick={onLogout} className="p-2 rounded-full hover:bg-aura-red/10 text-gray-400 hover:text-aura-red transition-colors"><LogOut size={20} /></button>
                </div>
            </header>

            {/* CONTENT */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
                <AnimatePresence mode="wait">
                    {currentView === 'settings' && (
                        <SettingsView key="settings" onClose={() => setCurrentView('map')} floors={floors} tables={tables} onUpdateFloors={handleUpdateFloors} onDeleteTable={deleteTable} onAddTable={handleAddTable} onUpdateTable={handleUpdateTable} restaurantName={restaurantName} />
                    )}
                    {currentView === 'reservations' && (
                        <ReservationsView key="reservations" tables={tables} unassignedReservations={unassignedReservations} selectedDate={selectedDate} onDateChange={handleDateSwitch} onClose={() => setCurrentView('map')} onAddReservation={addReservation} onUpdateReservation={updateReservation} onDeleteReservation={removeReservation} onMergeAndReserve={mergeTablesAndAddReservation} preselectNew={preselectNewReservation} onConsumePreselect={() => setPreselectNewReservation(false)} onEditModeChange={setIsEditingReservation} />
                    )}
                    {currentView === 'map' && (
                        <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden relative">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-aura-border bg-aura-black/20 shrink-0 z-40">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight"><LayoutDashboard className="text-aura-primary" size={24} /> Tavoli</h2>
                                    <div className="h-6 w-px bg-aura-border mx-2"></div>
                                    <div className="text-sm text-gray-400 hidden sm:block">Visualizzazione e gestione tavoli</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-aura-card border border-aura-border p-1 rounded-xl flex shadow-lg backdrop-blur-md">
                                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-bold uppercase bg-aura-primary text-black shadow-sm cursor-default"><Grid size={14} /> Tavoli</button>
                                        <button onClick={() => setCurrentView('reservations')} className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-bold uppercase text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"><Calendar size={14} /> Prenotazioni</button>
                                    </div>
                                </div>
                            </div>

                            <div 
                                ref={setContainerRef} 
                                className="relative flex-1 bg-aura-bg overflow-hidden cursor-grab active:cursor-grabbing transition-colors duration-300" 
                                onClick={() => { setSelectedTableId(null); setContextMenu(null); setIsStatsOpen(false); setFloorMenu(null); }}
                                onContextMenu={handleFloorContextMenu}
                            >
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none z-0">
                                    <h1 className="text-[10rem] font-black text-white/[0.03] tracking-widest whitespace-nowrap uppercase">{activeFloor}</h1>
                                </div>
                                <motion.div 
                                    className="absolute w-[4000px] h-[4000px] origin-top-left z-10" 
                                    drag={!isStatsOpen && !selectedTableId} // Disable drag when stats or details are open
                                    dragMomentum={false} 
                                    animate={{ x: viewPos.x, y: viewPos.y, scale: zoomLevel }} 
                                    transition={{ type: 'tween', duration: 0 }} 
                                    onDragEnd={(_, info) => { setViewPos({ x: viewPos.x + info.offset.x, y: viewPos.y + info.offset.y }); }}
                                >
                                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, #1e3d2b 1px, transparent 1px), linear-gradient(to bottom, #1e3d2b 1px, transparent 1px)`, backgroundSize: '60px 60px', opacity: 0.3 }} />
                                    <div className="relative w-full h-full z-10">
                                        <AnimatePresence>
                                            {currentFloorTables.map(table => (
                                                <TableNode
                                                    key={table.id}
                                                    data={table}
                                                    isSelected={selectedTableId === table.id}
                                                    isMergeCandidate={mergeCandidateId === table.id}
                                                    isMergeError={mergeErrorId === table.id}
                                                    onSelect={(id) => { setSelectedTableId(id); setContextMenu(null); setIsStatsOpen(false); setFloorMenu(null); }}
                                                    onDrag={handleTableDrag}
                                                    onDragEnd={handleTableDragEnd}
                                                    onContextMenu={handleTableContextMenu}
                                                    currentTime={currentTime}
                                                    selectedDate={selectedDate}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>

                                <div className="absolute top-6 left-6 z-30 pointer-events-auto">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setIsStatsOpen(true); setSelectedTableId(null); setFloorMenu(null); }}
                                        onContextMenu={(e) => e.stopPropagation()} // PREVENT CONTEXT MENU
                                        className="bg-aura-card border border-aura-border hover:border-aura-primary/50 text-white p-3 rounded-xl shadow-lg backdrop-blur-md transition-all group"
                                        title="Apri Statistiche"
                                    >
                                        <BarChart2 size={24} className="text-gray-400 group-hover:text-aura-primary transition-colors" />
                                    </button>
                                </div>

                                {/* FLOOR NAVIGATION BAR */}
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-30 pointer-events-auto pb-0">
                                    <div className="flex items-center gap-1 bg-aura-card/95 backdrop-blur-xl border border-aura-border border-b-0 rounded-t-2xl p-2 px-3 shadow-2xl" onContextMenu={(e) => e.stopPropagation()}>
                                        {floors.map(floor => (
                                            <button
                                                key={floor}
                                                onClick={() => setActiveFloor(floor)}
                                                className={`
                                                    px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 relative
                                                    ${activeFloor === floor 
                                                        ? 'bg-aura-primary text-black shadow-lg shadow-aura-primary/20' 
                                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                    }
                                                `}
                                            >
                                                {activeFloor === floor && <Grid size={14} strokeWidth={2.5} />}
                                                {floor}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* ZOOM CONTROLS (Bottom Left) */}
                                <div className="absolute bottom-8 left-6 z-30 pointer-events-auto flex flex-col gap-2">
                                    <div className="bg-aura-card/90 backdrop-blur-md border border-aura-border rounded-xl p-1.5 shadow-xl flex flex-col gap-1" onContextMenu={(e) => e.stopPropagation()}>
                                        <button onClick={() => fitContentRef.current()} className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Adatta allo schermo">
                                            <Scan size={20} />
                                        </button>
                                        <div className="h-px w-full bg-aura-border/50" />
                                        <button onClick={() => handleZoom(0.2)} className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Zoom In">
                                            <Plus size={20} />
                                        </button>
                                        <button onClick={() => handleZoom(-0.2)} className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Zoom Out">
                                            <Minus size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* FLOOR CONTEXT MENU - REDESIGNED */}
                                <AnimatePresence>
                                    {floorMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                            transition={{ duration: 0.1 }}
                                            style={{ top: Math.min(floorMenu.y, window.innerHeight - 150), left: Math.min(floorMenu.x, window.innerWidth - 200) }}
                                            className="fixed z-[100] min-w-[180px]"
                                        >
                                            <div className="bg-aura-card/95 backdrop-blur-xl border border-aura-border rounded-xl shadow-2xl overflow-hidden p-1.5 pointer-events-auto">
                                                <button
                                                    onClick={handleQuickAddTable}
                                                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-lg transition-colors w-full text-left"
                                                >
                                                    <MousePointer2 size={16} className="text-aura-primary" /> <span>Aggiungi Tavolo qui</span>
                                                </button>
                                                <button
                                                    onClick={handleResetLayout}
                                                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-lg transition-colors w-full text-left"
                                                >
                                                    <RotateCcw size={16} className="text-aura-gold" /> <span>Ripristina Layout</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* OPTIMIZED MERGE CONFIRMATION MODAL */}
                                <AnimatePresence>
                                    {pendingMerge && mergeModalPosition.x !== 0 && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.8, y: 10 }} 
                                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                            style={{ left: mergeModalPosition.x, top: mergeModalPosition.y }}
                                            className="fixed z-[100] -translate-x-1/2 pointer-events-auto"
                                        >
                                            <div className="bg-aura-black/90 backdrop-blur-lg border border-aura-gold/50 rounded-full py-2 px-4 shadow-2xl flex items-center gap-4 min-w-[240px]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-aura-gold/20 flex items-center justify-center text-aura-gold">
                                                        <Merge size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unione</span>
                                                        <span className="text-sm font-bold text-white leading-none">
                                                            {tables.find(t=>t.id===pendingMerge.sourceId)?.name} <span className="text-aura-gold">+</span> {tables.find(t=>t.id===pendingMerge.targetId)?.name}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-8 w-px bg-white/10 mx-1"></div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={handleConfirmMerge} className="w-8 h-8 rounded-full bg-aura-gold text-black flex items-center justify-center hover:bg-white transition-colors shadow-lg">
                                                        <Check size={16} strokeWidth={3} />
                                                    </button>
                                                    <button onClick={handleCancelMerge} className="w-8 h-8 rounded-full bg-white/10 text-gray-400 flex items-center justify-center hover:bg-white/20 hover:text-white transition-colors">
                                                        <X size={16} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* TABLE CONTEXT MENU */}
                                <AnimatePresence>
                                    {contextMenu && (
                                        <ContextMenu 
                                            x={contextMenu.x} 
                                            y={contextMenu.y} 
                                            table={tables.find(t => t.id === contextMenu.tableId)!} 
                                            onClose={() => setContextMenu(null)}
                                            onAction={handleContextMenuAction}
                                            hasPendingRes={tables.find(t => t.id === contextMenu.tableId)?.reservations.some(r => r.date === selectedDate && r.status !== 'ARRIVED' && r.status !== 'COMPLETED') ?? false}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* STATS SIDEBAR (Inside container for proper z-indexing context) */}
                                <AnimatePresence>
                                    {isStatsOpen && (
                                        <motion.div
                                            initial={{ x: "100%" }}
                                            animate={{ x: 0 }}
                                            exit={{ x: "100%" }}
                                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                                            className="absolute top-0 right-0 h-full w-[420px] z-[70] shadow-[-20px_0_50px_-10px_rgba(0,0,0,0.5)] border-l border-aura-border bg-aura-bg/95 backdrop-blur-xl pointer-events-auto flex flex-col"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {/* Modal Header */}
                                            <div className="p-6 border-b border-aura-border bg-aura-black/50 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-aura-primary/10 flex items-center justify-center text-aura-primary">
                                                        <TrendingUp size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-white leading-none">Statistiche</h3>
                                                        <p className="text-xs text-gray-500 mt-1">Panoramica occupazione</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setIsStatsOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer">
                                                    <X size={20} />
                                                </button>
                                            </div>

                                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                                                {/* Tabs */}
                                                <div className="flex gap-1 mb-6 bg-aura-black p-1 rounded-xl border border-aura-border">
                                                    <button 
                                                        onClick={() => setStatsTab('floor')} 
                                                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${statsTab === 'floor' ? 'bg-aura-card border border-aura-border text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                                    >
                                                        {activeFloor}
                                                    </button>
                                                    <button 
                                                        onClick={() => setStatsTab('all')} 
                                                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${statsTab === 'all' ? 'bg-aura-card border border-aura-border text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                                    >
                                                        Globale
                                                    </button>
                                                </div>

                                                {/* STATS CONTENT */}
                                                <div className="space-y-6">
                                                    {/* PRIMARY METRICS (Top Row) */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-aura-black/50 border border-aura-border p-5 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden group hover:border-aura-primary/30 transition-colors">
                                                            <div className="absolute -right-6 -bottom-6 text-aura-primary/5 group-hover:text-aura-primary/10 transition-colors">
                                                                <Users size={100} />
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider z-10">Clienti in Sala</span>
                                                            <span className="text-5xl font-black text-white z-10 tracking-tighter">
                                                                {stats.occupiedSeats}
                                                            </span>
                                                        </div>
                                                        <div className="bg-aura-black/50 border border-aura-border p-5 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden group hover:border-aura-primary/30 transition-colors">
                                                            <div className="absolute -right-6 -bottom-6 text-aura-primary/5 group-hover:text-aura-primary/10 transition-colors">
                                                                <Armchair size={100} />
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider z-10">Tavoli Liberi</span>
                                                            <span className="text-5xl font-black text-aura-primary z-10 tracking-tighter">
                                                                {stats.freeTablesCount}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* SECONDARY METRICS GRID */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {/* Occupancy Rate */}
                                                        <div className="bg-aura-card border border-aura-border p-4 rounded-xl">
                                                            <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs font-bold uppercase">
                                                                <Percent size={14} className="text-aura-gold" /> Tasso Occupazione
                                                            </div>
                                                            <div className="flex items-end gap-2 mb-2">
                                                                <span className="text-2xl font-bold text-white">{stats.occupancyRate}%</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-aura-black rounded-full overflow-hidden">
                                                                <div className="h-full bg-gradient-to-r from-aura-primary to-aura-gold" style={{ width: `${stats.occupancyRate}%` }} />
                                                            </div>
                                                        </div>

                                                        {/* Average Party Size */}
                                                        <div className="bg-aura-card border border-aura-border p-4 rounded-xl">
                                                            <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs font-bold uppercase">
                                                                <UserCheck size={14} className="text-indigo-400" /> Media Ospiti/Tavolo
                                                            </div>
                                                            <span className="text-2xl font-bold text-white block">
                                                                {stats.avgPartySize}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* INCOMING RESERVATIONS - UPDATED LIST */}
                                                    <div className="bg-aura-card border border-aura-border p-4 rounded-xl flex gap-4 items-start">
                                                        {/* Left Side: Summary */}
                                                        <div className="flex flex-col justify-between h-full">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs font-bold uppercase">
                                                                    <Clock size={14} className="text-orange-500" /> In Arrivo
                                                                </div>
                                                                <span className="text-4xl font-bold text-orange-500 block leading-none">
                                                                    {stats.pendingList.length}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 mt-2">
                                                                Prenotazioni in attesa
                                                            </div>
                                                        </div>

                                                        {/* Right Side: Detailed List */}
                                                        <div className="flex-1 border-l border-aura-border pl-4">
                                                            {stats.pendingList.length > 0 ? (
                                                                <div className="space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar pr-1">
                                                                    {stats.pendingList.map((res, i) => (
                                                                        <div key={i} className="flex justify-between items-center text-xs">
                                                                            <span className="font-bold text-white">{res.tableName}</span>
                                                                            <span className="font-mono text-orange-400 bg-orange-500/10 px-1.5 rounded">{res.time}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-600 italic">Nessun arrivo imminente</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* TOTAL CAPACITY BAR */}
                                                    <div>
                                                        <div className="flex justify-between items-center mb-1 text-xs font-medium">
                                                            <span className="text-gray-400">Capacità Totale Utilizzata</span>
                                                            <span className="text-white">{stats.occupiedSeats + stats.reservedSeats} / {stats.totalSeats}</span>
                                                        </div>
                                                        <div className="h-2 bg-aura-border/30 rounded-full overflow-hidden flex">
                                                            {/* Occupied */}
                                                            <div className="h-full bg-aura-red" style={{ width: `${stats.totalSeats ? (stats.occupiedSeats / stats.totalSeats) * 100 : 0}%` }} title="In Sala" />
                                                            {/* Reserved */}
                                                            <div className="h-full bg-aura-gold" style={{ width: `${stats.totalSeats ? (stats.reservedSeats / stats.totalSeats) * 100 : 0}%` }} title="Prenotati" />
                                                        </div>
                                                        <div className="flex justify-between mt-1 text-[10px] uppercase text-gray-500 font-bold">
                                                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-aura-red" /> In Sala</span>
                                                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-aura-gold" /> Prenotati</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence mode='wait'>
                                    {selectedTableId && (
                                        <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="absolute top-0 right-0 h-full w-[420px] z-[70] shadow-[-20px_0_50px_-10px_rgba(0,0,0,0.5)] border-l border-aura-border bg-aura-bg pointer-events-auto">
                                            <TableDetails 
                                                table={selectedTable} 
                                                selectedDate={selectedDate} 
                                                currentTime={currentTime} 
                                                onUpdateStatus={updateTableStatus} 
                                                onModifyCapacity={modifyCapacity} 
                                                onRenameTable={renameTable} 
                                                onSplitTable={splitTable} 
                                                onResetTable={resetTable} 
                                                onDeleteTable={deleteTable} 
                                                onAddReservation={addReservation} 
                                                onRemoveReservation={removeReservation} 
                                                onUpdateReservation={updateReservation} 
                                                onClose={() => setSelectedTableId(null)}
                                                // Handle making a temporary table permanent
                                                onMakePermanent={(id) => {
                                                    setTables(prev => prev.map(t => t.id === id ? { ...t, isTemporary: false } : t));
                                                    setNotification("Tavolo reso fisso");
                                                }}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* NEW RESERVATION FAB (Global) */}
                <motion.button 
                    initial="idle"
                    whileHover="hover"
                    onClick={() => { setPreselectNewReservation(true); setCurrentView('reservations'); }}
                    onContextMenu={(e) => e.stopPropagation()} // BLOCK CONTEXT MENU ON FAB
                    className="absolute bottom-8 right-8 z-50 h-14 bg-aura-primary text-black rounded-full shadow-2xl flex items-center justify-start overflow-hidden hover:bg-aura-secondary active:scale-95 p-0"
                    variants={{
                        idle: { width: 56 },
                        hover: { width: "auto" }
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                    <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
                        <Plus size={28} />
                    </div>
                    <motion.span 
                        className="font-bold whitespace-nowrap overflow-hidden pr-6"
                        variants={{
                            idle: { opacity: 0, x: -10 },
                            hover: { opacity: 1, x: 0 }
                        }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                    >
                        Aggiungi prenotazione
                    </motion.span>
                </motion.button>

                <AnimatePresence>
                    {notification && (
                        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-28 right-8 bg-aura-card border border-aura-primary/50 text-aura-primary px-6 py-3 rounded-full shadow-2xl z-[80] flex items-center backdrop-blur-xl">
                            <span className="w-2 h-2 bg-aura-primary rounded-full mr-3 animate-pulse"></span><span className="text-sm font-medium">{notification}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FloorManager;