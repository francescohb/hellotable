# HelloTable - Sistema di Gestione Ristorante (Next.js App Router)

Un sistema moderno e ad alte prestazioni per la gestione dei tavoli e delle prenotazioni, costruito con tecnologie all'avanguardia per garantire reattività e scalabilità.

## 🚀 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
- **Linguaggio**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Stile**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Gestione Stato**: React Hooks (Migrazione a Zustand/TanStack Query in corso)
- **Drag & Drop**: Implementazione Custom (Migrazione a @dnd-kit pianificata)
- **Icone**: [Lucide React](https://lucide.dev/)
- **Animazioni**: [Framer Motion](https://www.framer.com/motion/)

## 📂 Struttura Progetto

```bash
src/
├── app/              # Pagine Next.js App Router
├── components/       # Componenti UI (Client & Server)
│   ├── FloorManager.tsx  # Canvas interattivo principale
│   ├── TableNode.tsx     # Componente tavolo individuale
│   └── ...
├── lib/              # Utility, Tipi e Costanti
│   ├── types.ts      # Interfacce TypeScript
│   └── constants.ts  # Configurazione e Dati Mock
```

## 🛠️ Per Iniziare

### Prerequisiti

- Node.js 18+
- npm / yarn / pnpm

### Installazione

1.  **Clona la repository**:
    ```bash
    git clone https://github.com/tuo-username/hellotable.git
    cd hellotable
    ```

2.  **Installa le dipendenze**:
    ```bash
    npm install
    ```

3.  **Avvia il server di sviluppo**:
    ```bash
    npm run dev
    ```

4.  **Apri l'app**:
    Visita [http://localhost:3000](http://localhost:3000)

## 🎯 Funzionalità (Attuali & Pianificate)

- [x] **Planimetria Interattiva**: Layout tavoli tramite drag and drop.
- [x] **Gestione Tavoli**: Setup guidato per il layout del ristorante.
- [x] **Logica Prenotazioni**: Simulazione base del flusso di prenotazione.
- [ ] **Sincronizzazione Real-time**: Aggiornamenti istantanei su tutti i dispositivi (in corso).
- [ ] **Integrazione Database**: Storage persistente per layout e prenotazioni (in corso).

## 🤝 Contribuire

Vedi `task.md` per la roadmap corrente e i task di sviluppo.
