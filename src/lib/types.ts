
export type TableStatus = 'FREE' | 'OCCUPIED';

export type TableShape = 'circle' | 'square' | 'rectangle' | 'oval';

export interface Position {
    x: number;
    y: number;
}

export type ReservationStatus = 'CONFIRMED' | 'PENDING' | 'ARRIVED' | 'COMPLETED';

export interface Reservation {
    id: string;
    tableId?: string; // Optional: if null/undefined, it's an unassigned reservation
    tableName?: string; // Optional: specific table name for merged tables
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    guests: number;
    notes?: string;
    status?: ReservationStatus; // Optional, default is CONFIRMED
}

export interface TableData {
    id: string;
    name: string; // Display name e.g., "101"
    floor: string; // Dynamic floor name
    position: Position;
    shape: TableShape;
    capacity: number;
    originalCapacity: number; // To track resets
    status: TableStatus;

    // Flag for Extra/Temporary tables
    isTemporary?: boolean;

    // Temporal tracking
    seatedAt?: number; // Timestamp
    lastOrderAt?: number; // Timestamp for stall detection

    // Relationships & Extensions
    isExtended: boolean; // Visual cue for extension
    subTables: TableData[]; // Stores original tables for un-merging/splitting

    // Reservation Data
    reservations: Reservation[];
}

export interface DragEndEvent {
    id: string;
    point: Position;
}
