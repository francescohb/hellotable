
import { TableData, TableShape, Reservation } from './types';

// Palette mapping for statuses (Tailwind classes)
export const STATUS_STYLES = {
    FREE: {
        border: 'border-aura-primary',
        text: 'text-aura-primary',
        bg: 'bg-aura-primary/5',
        dot: 'bg-aura-primary',
        label: 'Libero'
    },
    OCCUPIED: {
        border: 'border-aura-red',
        text: 'text-white',
        bg: 'bg-aura-red/5',
        dot: 'bg-aura-red',
        label: 'Occupato'
    },
    // Visual style for reserved tables (Logic handled in components)
    RESERVED_VISUAL: {
        border: 'border-aura-gold border-solid',
        text: 'text-aura-gold',
        bg: 'bg-aura-gold/5',
        dot: 'bg-aura-gold',
        label: 'Prenotato'
    }
};

export const MERGE_THRESHOLD = 80;
export const STALL_THRESHOLD_MINUTES = 20;
export const RESERVATION_DURATION_MINUTES = 120; // 2h minimum gap between reservations

export const INITIAL_TABLES: TableData[] = []; // Empty default

// --- NOMI PER PRENOTAZIONI CASUALI ---
// --- NOMI PER PRENOTAZIONI CASUALI ---
const FIRST_NAMES = [
    'Marco', 'Giulia', 'Alessandro', 'Sofia', 'Matteo', 'Alice', 'Lorenzo', 'Emma',
    'Leonardo', 'Aurora', 'Davide', 'Ginevra', 'Luca', 'Giorgia', 'Federico', 'Martina'
];

const LAST_NAMES = [
    'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci',
    'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini'
];

const getRandomFirstName = () => FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
const getRandomLastName = () => LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

const getRandomTime = () => {
    const hours = ['19', '20', '21'];
    const minutes = ['00', '15', '30', '45'];
    return `${hours[Math.floor(Math.random() * hours.length)]}:${minutes[Math.floor(Math.random() * minutes.length)]}`;
};

// --- GENERATORE DATI DEMO ---
const generateDemoTables = (): TableData[] => {
    const tables: TableData[] = [];
    const today = new Date();

    // CENTER OFFSET: Position tables in the middle of a 4000x4000 canvas
    const CENTER_X = 2000;
    const CENTER_Y = 2000;

    // Helper per generare prenotazioni
    const generateReservations = (capacity: number): Reservation[] => {
        const reservations: Reservation[] = [];
        // Loop next 7 days
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            // 35% chance of reservation per day per table
            if (Math.random() < 0.35) {
                reservations.push({
                    id: `res-${Date.now()}-${Math.random()}`,
                    // tableId not needed here as it's nested in the table, but we can add it for consistency if we want
                    firstName: getRandomFirstName(),
                    lastName: getRandomLastName(),
                    email: Math.random() > 0.5 ? 'ospite@example.com' : undefined,
                    phone: Math.random() > 0.5 ? '3331234567' : undefined,
                    date: dateStr,
                    time: getRandomTime(),
                    guests: Math.max(2, Math.min(capacity, Math.floor(Math.random() * capacity) + 1)), // Realistic party size
                    notes: Math.random() > 0.8 ? 'Allergia noci' : (Math.random() > 0.9 ? 'Compleanno' : '')
                });
            }
        }
        return reservations;
    };

    const addTable = (
        id: string,
        floor: string,
        name: string,
        x: number,
        y: number,
        shape: TableShape,
        capacity: number
    ) => {
        tables.push({
            id: id,
            name,
            floor,
            position: { x: CENTER_X + x, y: CENTER_Y + y },
            shape,
            capacity,
            originalCapacity: capacity,
            status: 'FREE', // Start all free as requested
            isExtended: false,
            subTables: [],
            reservations: generateReservations(capacity)
        });
    };

    // GAP Updated to 210 (150px table + 60px gap)
    const GAP = 210;

    // --- 1. SALA PRINCIPALE (Top Left Quadrant) ---
    // Large open space, mixed tables. Approx 50 seats.
    const floorMain = 'Sala Principale';
    // Shifted UP to -1400 to align top row (101-105) higher visually
    let startX = -800;
    let startY = -1400;

    // Row 1: Wall banquettes (Squares)
    addTable('m1', floorMain, '101', startX, startY, 'square', 4);
    addTable('m2', floorMain, '102', startX + GAP, startY, 'square', 4);
    addTable('m3', floorMain, '103', startX + GAP*2, startY, 'square', 4);
    addTable('m4', floorMain, '104', startX + GAP*3, startY, 'square', 4);
    addTable('m5', floorMain, '105', startX + GAP*4, startY, 'rectangle', 6);

    // Row 2: Center Rounds
    startY += GAP;
    addTable('m6', floorMain, '106', startX + GAP*0.5, startY, 'circle', 4);
    addTable('m7', floorMain, '107', startX + GAP*2, startY, 'circle', 5);
    addTable('m8', floorMain, '108', startX + GAP*3.5, startY, 'circle', 4);

    // Row 3: More squares
    startY += GAP;
    addTable('m9', floorMain, '109', startX, startY, 'square', 4);
    addTable('m10', floorMain, '110', startX + GAP, startY, 'square', 2);
    addTable('m11', floorMain, '111', startX + GAP*2, startY, 'square', 2);
    addTable('m12', floorMain, '112', startX + GAP*3, startY, 'square', 4);
    addTable('m13', floorMain, '113', startX + GAP*4, startY, 'rectangle', 6);


    // --- 2. SALA CAMINETTO (Top Right Quadrant) ---
    // Cozy, smaller, intimate. Approx 30 seats.
    const floorFire = 'Sala Caminetto';
    startX = 700;
    startY = -1400; // Aligned with main hall top

    // Big central oval table
    addTable('c1', floorFire, 'C1', startX + GAP*1.2, startY + GAP, 'oval', 8);

    // Surrounding small tables
    addTable('c2', floorFire, 'C2', startX, startY, 'square', 2);
    addTable('c3', floorFire, 'C3', startX + GAP, startY, 'square', 2);
    addTable('c4', floorFire, 'C4', startX + GAP*2.5, startY, 'square', 4);

    addTable('c5', floorFire, 'C5', startX, startY + GAP*1.2, 'circle', 4);
    addTable('c6', floorFire, 'C6', startX + GAP*2.5, startY + GAP*1.2, 'circle', 4);

    addTable('c7', floorFire, 'C7', startX + GAP*0.5, startY + GAP*2.2, 'rectangle', 6);


    // --- 3. VERANDA (Bottom Left Quadrant) ---
    // Bright, linear layout. Approx 24 seats.
    const floorVeranda = 'Veranda';
    startX = -800;
    startY = 400;

    // Two rows of tables
    addTable('v1', floorVeranda, 'V1', startX, startY, 'square', 4);
    addTable('v2', floorVeranda, 'V2', startX + GAP*1.2, startY, 'square', 4);
    addTable('v3', floorVeranda, 'V3', startX + GAP*2.4, startY, 'square', 4);

    addTable('v4', floorVeranda, 'V4', startX, startY + GAP, 'rectangle', 6);
    addTable('v5', floorVeranda, 'V5', startX + GAP*2, startY + GAP, 'rectangle', 6);


    // --- 4. TERRAZZA (Bottom Right Quadrant) ---
    // Outdoor, spaced out. Approx 20 seats.
    const floorTerrace = 'Terrazza';
    startX = 700;
    startY = 400;

    addTable('t1', floorTerrace, 'T1', startX + GAP*0.5, startY, 'circle', 2);
    addTable('t2', floorTerrace, 'T2', startX + GAP*1.5, startY, 'circle', 2);
    addTable('t3', floorTerrace, 'T3', startX + GAP*2.5, startY, 'circle', 2);

    addTable('t4', floorTerrace, 'T4', startX, startY + GAP, 'square', 4);
    addTable('t5', floorTerrace, 'T5', startX + GAP*1.2, startY + GAP, 'square', 4);
    addTable('t6', floorTerrace, 'T6', startX + GAP*2.4, startY + GAP, 'square', 4);

    return tables;
};

export const DEMO_DATA = {
    floors: ['Sala Principale', 'Sala Caminetto', 'Veranda', 'Terrazza'],
    tables: generateDemoTables()
};