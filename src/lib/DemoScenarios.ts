
import { TableData, TableShape, Reservation, TableStatus } from './types';

// --- UTILS ---
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

// Helper to generate base tables (Geometry only)
const generateBaseLayout = (): TableData[] => {
    const tables: TableData[] = [];
    const CENTER_X = 2000;
    const CENTER_Y = 2000;
    const GAP = 210; // Updated gap (150 + 60)

    const addTable = (id: string, floor: string, name: string, x: number, y: number, shape: TableShape, capacity: number) => {
        tables.push({
            id, name, floor,
            position: { x: CENTER_X + x, y: CENTER_Y + y },
            shape, capacity, originalCapacity: capacity,
            status: 'FREE', isExtended: false, subTables: [], reservations: []
        });
    };

    // --- 1. SALA PRINCIPALE ---
    const floorMain = 'Sala Principale';
    // Shifted UP to -1400
    let startX = -800; let startY = -1400;
    addTable('m1', floorMain, '101', startX, startY, 'square', 4);
    addTable('m2', floorMain, '102', startX + GAP, startY, 'square', 4);
    addTable('m3', floorMain, '103', startX + GAP*2, startY, 'square', 4);
    addTable('m4', floorMain, '104', startX + GAP*3, startY, 'square', 4);
    addTable('m5', floorMain, '105', startX + GAP*4, startY, 'rectangle', 6);
    startY += GAP;
    addTable('m6', floorMain, '106', startX + GAP*0.5, startY, 'circle', 4);
    addTable('m7', floorMain, '107', startX + GAP*2, startY, 'circle', 5);
    addTable('m8', floorMain, '108', startX + GAP*3.5, startY, 'circle', 4);
    startY += GAP;
    addTable('m9', floorMain, '109', startX, startY, 'square', 4);
    addTable('m10', floorMain, '110', startX + GAP, startY, 'square', 2);
    addTable('m11', floorMain, '111', startX + GAP*2, startY, 'square', 2);
    addTable('m12', floorMain, '112', startX + GAP*3, startY, 'square', 4);
    addTable('m13', floorMain, '113', startX + GAP*4, startY, 'rectangle', 6);

    // --- 2. SALA CAMINETTO ---
    const floorFire = 'Sala Caminetto';
    startX = 700; startY = -1400;
    addTable('c1', floorFire, 'C1', startX + GAP*1.2, startY + GAP, 'oval', 8);
    addTable('c2', floorFire, 'C2', startX, startY, 'square', 2);
    addTable('c3', floorFire, 'C3', startX + GAP, startY, 'square', 2);
    addTable('c4', floorFire, 'C4', startX + GAP*2.5, startY, 'square', 4);
    addTable('c5', floorFire, 'C5', startX, startY + GAP*1.2, 'circle', 4);
    addTable('c6', floorFire, 'C6', startX + GAP*2.5, startY + GAP*1.2, 'circle', 4);
    addTable('c7', floorFire, 'C7', startX + GAP*0.5, startY + GAP*2.2, 'rectangle', 6);

    // --- 3. VERANDA ---
    const floorVeranda = 'Veranda';
    startX = -800; startY = 400;
    addTable('v1', floorVeranda, 'V1', startX, startY, 'square', 4);
    addTable('v2', floorVeranda, 'V2', startX + GAP*1.2, startY, 'square', 4);
    addTable('v3', floorVeranda, 'V3', startX + GAP*2.4, startY, 'square', 4);
    addTable('v4', floorVeranda, 'V4', startX, startY + GAP, 'rectangle', 6);
    addTable('v5', floorVeranda, 'V5', startX + GAP*2, startY + GAP, 'rectangle', 6);

    // --- 4. TERRAZZA ---
    const floorTerrace = 'Terrazza';
    startX = 700; startY = 400;
    addTable('t1', floorTerrace, 'T1', startX + GAP*0.5, startY, 'circle', 2);
    addTable('t2', floorTerrace, 'T2', startX + GAP*1.5, startY, 'circle', 2);
    addTable('t3', floorTerrace, 'T3', startX + GAP*2.5, startY, 'circle', 2);
    addTable('t4', floorTerrace, 'T4', startX, startY + GAP, 'square', 4);
    addTable('t5', floorTerrace, 'T5', startX + GAP*1.2, startY + GAP, 'square', 4);
    addTable('t6', floorTerrace, 'T6', startX + GAP*2.4, startY + GAP, 'square', 4);

    return tables;
};

// --- SCENARIO 1: MATTINA (11:00) ---
// Tutto libero, ma con molte prenotazioni per il pranzo (12:00 - 14:30)
export const getMorningScenario = (): { tables: TableData[], floors: string[], virtualTime: number } => {
    const tables = generateBaseLayout();
    const todayStr = new Date().toISOString().split('T')[0];

    // IDs da mantenere LIBERI e SENZA PRENOTAZIONI imminenti (Buffer per walk-in/unioni)
    const alwaysFreeIds = ['m1', 'm2', 'c2', 'c3', 'v1', 'v2', 't1', 't2'];

    // Imposta prenotazioni pranzo
    tables.forEach((t, i) => {
        if (alwaysFreeIds.includes(t.id)) return; // Skip guaranteed free tables

        // 70% dei tavoli prenotati per il pranzo
        if (Math.random() < 0.7) {
            const timeSlot = ['12:00', '12:30', '13:00', '13:30', '14:00'][Math.floor(Math.random() * 5)];
            t.reservations.push({
                id: `res-morning-${i}`,
                firstName: getRandomFirstName(),
                lastName: getRandomLastName(),
                date: todayStr,
                time: timeSlot,
                guests: Math.min(t.capacity, Math.floor(Math.random() * t.capacity) + 2),
                status: 'CONFIRMED'
            });
        }
    });

    // Orario virtuale: 11:00
    const now = new Date();
    now.setHours(11, 0, 0, 0);

    return {
        tables,
        floors: ['Sala Principale', 'Sala Caminetto', 'Veranda', 'Terrazza'],
        virtualTime: now.getTime()
    };
};

// --- SCENARIO 2: SERA (21:25) ---
// 80% Occupato, servizio in corso, doppi turni
export const getEveningScenario = (): { tables: TableData[], floors: string[], virtualTime: number } => {
    const tables = generateBaseLayout();
    const todayStr = new Date().toISOString().split('T')[0];

    // Orario virtuale: 21:25
    const now = new Date();
    now.setHours(21, 25, 0, 0);

    // IDs da mantenere LIBERI (Coppie adiacenti per demo unione)
    const alwaysFreeIds = ['m1', 'm2', 'c2', 'c3', 'v1', 'v2', 't1', 't2'];

    tables.forEach((t, i) => {
        if (alwaysFreeIds.includes(t.id)) {
            t.status = 'FREE';
            return;
        }

        const rand = Math.random();

        // 80% Occupato
        if (rand < 0.8) {
            t.status = 'OCCUPIED';
            // Seduti tra le 19:30 e le 21:00 (quindi tra 25 e 115 minuti fa)
            const minutesAgo = Math.floor(Math.random() * (115 - 25) + 25); 
            t.seatedAt = now.getTime() - (minutesAgo * 60 * 1000);
            t.lastOrderAt = now.getTime() - (Math.floor(Math.random() * 20) * 60 * 1000); // Ordine recente

            // Aggiungo la prenotazione che ha generato questa occupazione (es. alle 20:00)
            t.reservations.push({
                id: `res-curr-${i}`,
                firstName: getRandomFirstName(),
                lastName: getRandomLastName(),
                date: todayStr,
                time: '20:00', // Indicativo
                guests: Math.min(t.capacity, Math.floor(Math.random() * t.capacity) + 2),
                status: 'ARRIVED'
            });

            // 30% di questi ha una SECONDA prenotazione per il turno delle 21:30/22:00
            if (Math.random() < 0.3) {
                t.reservations.push({
                    id: `res-next-${i}`,
                    firstName: getRandomFirstName(),
                    lastName: getRandomLastName(),
                    date: todayStr,
                    time: Math.random() > 0.5 ? '21:45' : '22:00',
                    guests: Math.min(t.capacity, Math.floor(Math.random() * t.capacity) + 2),
                    status: 'CONFIRMED',
                    notes: 'Secondo turno'
                });
            }
        } else {
            // 20% Libero (rimanenti casuali)
            t.status = 'FREE';
            // Potrebbe avere una prenotazione imminente (es. 21:30)
            if (Math.random() < 0.5) {
                t.reservations.push({
                    id: `res-soon-${i}`,
                    firstName: getRandomFirstName(),
                    lastName: getRandomLastName(),
                    date: todayStr,
                    time: '21:30',
                    guests: Math.min(t.capacity, Math.floor(Math.random() * t.capacity) + 2),
                    status: 'CONFIRMED'
                });
            }
        }
    });

    return {
        tables,
        floors: ['Sala Principale', 'Sala Caminetto', 'Veranda', 'Terrazza'],
        virtualTime: now.getTime()
    };
};