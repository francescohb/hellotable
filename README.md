# helloTable

**Mission Critical Horeca Management System**

helloTable è una piattaforma avanzata per la gestione di sale ristorante in tempo reale, progettata per garantire performance elevate, sincronizzazione istantanea e un'esperienza utente fluida.

## 🚀 Tech Stack

*   **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
*   **Animations:** [Framer Motion](https://www.framer.com/motion/)
*   **Icons:** [Lucide React](https://lucide.dev/)
*   **Linting:** ESLint

## ✨ Funzionalità Attuali

### 1. 🔐 Autenticazione & Onboarding
- **Interfaccia Pulita:** Login screen con design _mission critical_ (Dark Mode nativa).
- **Accesso Rapido (Demo):** Bypass immediato per testare le funzionalità.
- **Setup Wizard Guidato:**
    - Configurazione iniziale delle sale (es: Principale, Dehor).
    - Definizione del numero di tavoli e capienza base.
    - **Generazione Automatica:** Creazione istantanea della planimetria basata sui parametri inseriti.

### 2. 🗺️ Floor Manager (Mappa Interattiva)
- **Vista God-Mode:** Panoramica completa di tutte le sale.
- **Navigazione Rapida:**
    - Switch istantaneo tra le sale (Bottom Bar).
    - Date Picker per navigare tra i turni/giorni.
- **Stati Tavolo Dinamici:**
    - 🟢 **Libero:** Disponibile per walk-in o assegnazione.
    - 🟡 **Occupato:** Tavolo attivo con clienti.
    - 🔒 **Riservato:** Assegnato a una prenotazione.

### 3. 📊 Sidebar Operativa (Right Panel)
- **Gestione Singolo Tavolo:**
    - Toggle Rapido Stato (Libero/Occupato).
    - **Gestione Plancia:** Aggiunta/Rimozione coperti temporanei (+/-) senza alterare la capacità base del tavolo.
    - Lista prenotazioni future per il tavolo selezionato.
- **Metriche Real-time:** Contatori live per clienti in sala, prenotati e walk-in.

## 🛠 Installazione e Avvio

### Prerequisiti
*   Node.js 18+
*   npm / yarn / pnpm

### Setup Locale

1.  **Clona il repository:**
    ```bash
    git clone https://github.com/hellobarrio/helloTable.git
    cd helloTable
    ```

2.  **Installa le dipendenze:**
    ```bash
    npm install
    ```

3.  **Avvia il server di sviluppo:**
    ```bash
    npm run dev
    ```
    L'app sarà disponibile su [http://localhost:3000](http://localhost:3000).

## 📂 Struttura del Progetto

```
helloTable/
├── src/
│   ├── app/          # Next.js App Router pages & layouts
│   ├── components/   # Reusable UI components
│   └── lib/          # Utility functions & shared logic
├── public/           # Static assets
└── ...config files   # Tailwind, Next.js, TypeScript configs
```

##  Roadmap

- [ ] **Data Layer:** Integrazione Database SQL (Postgres) per gestione Tavoli e Prenotazioni.
- [ ] **Table Management:** Drag & Drop interfaccia per unire e spostare tavoli.
- [ ] **Real-time:** Sincronizzazione istantanea stato tavoli (WebSocket).
- [ ] **Orders:** Gestione comande associata ai tavoli logici.
