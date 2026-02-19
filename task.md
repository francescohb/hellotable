# Roadmap: HelloTable - Trasformazione Livello Produzione

## Fase 1: Fondamenta & Architettura
- [ ] **Configurazione Infrastruttura**
    - [ ] Inizializzare progetto Supabase (PostgreSQL + Auth + Realtime).
    - [ ] Configurare variabili d'ambiente (`.env`).
    - [ ] Configurare Drizzle ORM (o Prisma) per interazioni type-safe con il database.
- [ ] **Autenticazione**
    - [ ] Implementare Autenticazione (Supabase Auth / NextAuth.js).
    - [ ] Creare `middleware.ts` per rotte protette (Ruoli Manager vs Cameriere).
- [ ] **Gestione Stato Globale**
    - [ ] Rimpiazzare il prop-drilling con **Zustand** o **Jotai** per lo stato client-side (elementi trascinati, stato UI).
    - [ ] Utilizzare **TanStack Query (React Query)** per lo stato server (caching, aggiornamenti ottimistici).

## Fase 2: Modellazione Dati & Backend
- [ ] **Design Schema Database**
    - [ ] `Floors`: `id`, `name`, `index`, `restaurant_id`.
    - [ ] `Tables`: `id`, `floor_id`, `label`, `capacity`, `shape`, `x`, `y`, `rotation`.
    - [ ] `Reservations`: `id`, `customer_name`, `party_size`, `start_time`, `end_time`, `status`, `notes`.
    - [ ] `TableReservations`: Tabella di giunzione per relazioni N:M (tavoli uniti).
    - [ ] `TableMerges`: Tracciamento unioni fisiche ad-hoc dei tavoli.
- [ ] **Server Actions**
    - [ ] Implementare `createReservation` con rilevamento conflitti.
    - [ ] Implementare `updateTablePosition` (con debounce).
    - [ ] Implementare logica `mergeTables`.

## Fase 3: Frontend High-Performance
- [ ] **Refactoring Componenti**
    - [ ] Scomporre `FloorManager.tsx` in parti più piccole (`FloorCanvas`, `TableNode`, `Toolbar`).
    - [ ] Memoizzare componenti pesanti (`React.memo`) per prevenire re-render inutili durante il trascinamento.
- [ ] **Drag & Drop Avanzato**
    - [ ] Migrare/Raffinare Drag & Drop usando **@dnd-kit/core** (performance migliori & supporto touch rispetto a HTML5 DnD standard).
    - [ ] Implementare "snap-to-grid" o allineamento magnetico per i tavoli.
- [ ] **Sincronizzazione Real-Time**
    - [ ] Integrare sottoscrizioni Supabase Realtime per aggiornare lo stato dei tavoli istantaneamente su tutti i dispositivi.
    - [ ] Implementare indicatori visivi per "Tavolo attualmente in modifica da [Utente]".

## Fase 4: UX & Rifiniture
- [ ] **UI Interattiva**
    - [ ] Aggiungere animazioni per unione/divisione tavoli (Framer Motion).
    - [ ] Implementare dashboard "God View" per manager (statistiche, tasso occupazione).
- [ ] **Type Safety**
    - [ ] Imporre tipi TypeScript rigorosi tra Backend (Schema DB) e Frontend (Validazione Zod).
- [ ] **Testing**
    - [ ] Setup test E2E con Playwright per flussi critici (Prenotazione -> Assegnazione Tavolo).
