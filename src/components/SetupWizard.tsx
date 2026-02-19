"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plus, Trash2, Layers, Grid, CheckCircle2, Armchair, AlertCircle, Minus, Square, Circle, RectangleHorizontal, MousePointer2 } from 'lucide-react';
import { TableData, TableShape } from '../lib/types';

interface SetupWizardProps {
  onComplete: (tables: TableData[], floors: string[]) => void;
}

// Helper type for local wizard state
interface WizardTableConfig {
  name: string;
  seats: number;
  shape: TableShape;
}

interface FloorSetupData {
  name: string;
  count: number;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
  // Step 1 State: Macro definition (Default 0 count)
  const [floorsData, setFloorsData] = useState<FloorSetupData[]>([
    { name: 'Sala Principale', count: 0 }
  ]);
  
  // Step 2 State: Micro details
  const [floorConfigs, setFloorConfigs] = useState<Record<string, WizardTableConfig[]>>({});
  
  const [activeFloorTab, setActiveFloorTab] = useState<string>('');

  // --- STEP 1: MANAGE FLOORS & COUNTS ---
  const addFloor = () => {
    const newName = `Sala ${floorsData.length + 1}`;
    setFloorsData([...floorsData, { name: newName, count: 0 }]);
    setError(null);
    setShowValidationErrors(false);
  };

  const removeFloor = (index: number) => {
    if (index === 0) return;

    const toRemove = floorsData[index];
    const newData = floorsData.filter((_, i) => i !== index);
    setFloorsData(newData);
    
    const newConfigs = { ...floorConfigs };
    delete newConfigs[toRemove.name];
    setFloorConfigs(newConfigs);
  };

  const updateFloorData = (index: number, field: 'name' | 'count', value: string | number) => {
    const newData = [...floorsData];
    setError(null);
    setShowValidationErrors(false);
    
    if (field === 'name') {
        const oldName = newData[index].name;
        const newName = value as string;
        newData[index].name = newName;
        
        if (floorConfigs[oldName]) {
             const newConfigs = { ...floorConfigs };
             newConfigs[newName] = newConfigs[oldName];
             delete newConfigs[oldName];
             setFloorConfigs(newConfigs);
        }
    } else {
        newData[index].count = Math.max(0, Number(value));
    }
    setFloorsData(newData);
  };

  const incrementFloorCount = (index: number) => {
    updateFloorData(index, 'count', floorsData[index].count + 1);
  };

  const decrementFloorCount = (index: number) => {
    updateFloorData(index, 'count', floorsData[index].count - 1);
  };

  // --- TRANSITION: STEP 1 -> STEP 2 ---
  const goToStep2 = () => {
      const invalidFloors = floorsData.filter(f => f.count <= 0);
      if (invalidFloors.length > 0) {
          setError(`Specifica il numero di tavoli per: ${invalidFloors.map(f => f.name).join(', ')}`);
          setShowValidationErrors(true);
          return;
      }

      const newConfigs = { ...floorConfigs };

      floorsData.forEach(floor => {
          const currentTables = newConfigs[floor.name] || [];
          const targetCount = floor.count;

          if (currentTables.length < targetCount) {
              const needed = targetCount - currentTables.length;
              const startingIndex = currentTables.length;
              const newTables: WizardTableConfig[] = Array.from({ length: needed }).map((_, i) => ({
                  name: `${startingIndex + i + 1}`,
                  seats: 2, // Default 2 seats to start
                  shape: 'square' // Default shape
              }));
              newConfigs[floor.name] = [...currentTables, ...newTables];
          } else if (currentTables.length > targetCount) {
              newConfigs[floor.name] = currentTables.slice(0, targetCount);
          }
      });

      setFloorConfigs(newConfigs);
      setActiveFloorTab(floorsData[0].name);
      setStep(2);
      setError(null);
      setShowValidationErrors(false);
  };

  // --- TRANSITION: STEP 2 -> STEP 1 ---
  const goToStep1 = () => {
      const updatedFloorsData = floorsData.map(f => ({
          ...f,
          count: floorConfigs[f.name]?.length || f.count
      }));
      setFloorsData(updatedFloorsData);
      setStep(1);
  };

  // --- STEP 2: MANAGE TABLES ---
  const addTableToFloor = (floor: string) => {
      const currentTables = floorConfigs[floor] || [];
      const nextNum = currentTables.length + 1;
      const newTable: WizardTableConfig = { name: `${nextNum}`, seats: 2, shape: 'square' };
      
      setFloorConfigs({
          ...floorConfigs,
          [floor]: [...currentTables, newTable]
      });
  };

  const removeTableFromFloor = (floor: string, index: number) => {
      const newTables = floorConfigs[floor].filter((_, i) => i !== index);
      setFloorConfigs({
          ...floorConfigs,
          [floor]: newTables
      });
  };

  const updateTableConfig = (floor: string, index: number, field: keyof WizardTableConfig, value: string | number | TableShape) => {
      const newTables = [...floorConfigs[floor]];
      // @ts-ignore
      newTables[index] = { ...newTables[index], [field]: value };
      setFloorConfigs({
          ...floorConfigs,
          [floor]: newTables
      });
  };

  // --- FINISH: GENERATE DATA ---
  const finishSetup = () => {
    // Validate Step 2: Ensure all tables have seats > 0? Let's check.
    const configValues = Object.values(floorConfigs) as WizardTableConfig[][];
    const hasZeroSeats = configValues.some(tables => tables.some(t => t.seats <= 0));
    if (hasZeroSeats) {
        setError("Tutti i tavoli devono avere almeno 1 posto.");
        setShowValidationErrors(true);
        return;
    }

    const generatedTables: TableData[] = [];
    const floorNames = floorsData.map(f => f.name);
    
    // Canvas center constants (Must match FloorManager)
    const CANVAS_CENTER_X = 2000;
    const CANVAS_CENTER_Y = 2000;

    floorNames.forEach((floor) => {
      const tables = floorConfigs[floor];
      if (!tables || tables.length === 0) return;

      const cols = 4;
      // Spacing Calculation: Table (150) + Gap (60) = 210
      const spacingX = 210; 
      const spacingY = 210;
      
      // Calculate grid dimensions to center it
      const rows = Math.ceil(tables.length / cols);
      const gridWidth = (Math.min(tables.length, cols) - 1) * spacingX;
      const gridHeight = (rows - 1) * spacingY;
      
      const startX = CANVAS_CENTER_X - (gridWidth / 2);
      const startY = CANVAS_CENTER_Y - (gridHeight / 2);

      tables.forEach((config, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;

        generatedTables.push({
          id: `gen-${floor.replace(/\s/g, '')}-${i}-${Date.now()}`,
          name: config.name,
          floor: floor,
          position: {
            x: startX + (col * spacingX),
            y: startY + (row * spacingY)
          },
          shape: config.shape,
          capacity: Number(config.seats),
          originalCapacity: Number(config.seats),
          status: 'FREE',
          isExtended: false,
          subTables: [],
          reservations: []
        });
      });
    });

    onComplete(generatedTables, floorNames);
  };

  // --- COMPONENTS ---
  const Stepper = ({ value, onIncrement, onDecrement, errorHighlight }: { value: number, onIncrement: () => void, onDecrement: () => void, errorHighlight?: boolean }) => (
    <div className={`flex items-center bg-aura-black/50 border rounded-xl overflow-hidden ${errorHighlight ? 'border-aura-red' : 'border-aura-border'}`}>
        <button onClick={onDecrement} className="px-3 py-3 text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
            <Minus size={16} />
        </button>
        <div className="w-12 text-center text-white font-mono font-medium text-sm">
            {value}
        </div>
        <button onClick={onIncrement} className="px-3 py-3 text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
            <Plus size={16} />
        </button>
    </div>
  );

  const ShapeSelector = ({ current, onChange }: { current: TableShape, onChange: (s: TableShape) => void }) => {
      return (
          <div className="flex gap-1 bg-aura-black/50 p-1 rounded-lg border border-aura-border">
              <button onClick={() => onChange('square')} className={`p-1.5 rounded-md transition-all ${current === 'square' ? 'bg-aura-primary text-black' : 'text-gray-500 hover:text-gray-300'}`} title="Quadrato"><Square size={14} /></button>
              <button onClick={() => onChange('circle')} className={`p-1.5 rounded-md transition-all ${current === 'circle' ? 'bg-aura-primary text-black' : 'text-gray-500 hover:text-gray-300'}`} title="Tondo"><Circle size={14} /></button>
              <button onClick={() => onChange('rectangle')} className={`p-1.5 rounded-md transition-all ${current === 'rectangle' ? 'bg-aura-primary text-black' : 'text-gray-500 hover:text-gray-300'}`} title="Rettangolare"><RectangleHorizontal size={14} /></button>
              <button onClick={() => onChange('oval')} className={`p-1.5 rounded-md transition-all ${current === 'oval' ? 'bg-aura-primary text-black' : 'text-gray-500 hover:text-gray-300'}`} title="Ovale">
                  {/* Custom Oval Icon using CSS or a generic icon */}
                  <div className={`w-3.5 h-2.5 rounded-full border-2 ${current === 'oval' ? 'border-current' : 'border-current'}`} />
              </button>
          </div>
      )
  }

  return (
    <div className="h-screen w-screen bg-aura-black flex items-center justify-center font-sans overflow-hidden relative">
       {/* Background Ambience */}
       <div 
        className="absolute inset-0 pointer-events-none opacity-20" 
        style={{ 
            backgroundImage: `
                linear-gradient(to right, #122a1d 1px, transparent 1px),
                linear-gradient(to bottom, #122a1d 1px, transparent 1px)
            `, 
            backgroundSize: '40px 40px' 
        }}
      />
      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-aura-primary/5 to-transparent pointer-events-none" />

      <div className="w-full max-w-5xl z-10 p-6 h-[90vh] flex flex-col">
        <div className="bg-aura-card/90 backdrop-blur-xl border border-aura-border rounded-3xl shadow-2xl flex-1 flex flex-col overflow-hidden">
            
            {/* Header Steps */}
            <div className="flex justify-between items-center p-8 border-b border-aura-border bg-aura-black/20">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Configura il Ristorante</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {step === 1 ? 'Sale e Numero Tavoli' : 'Configura Posti e Forma'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className={`w-3 h-3 rounded-full transition-colors ${step >= 1 ? 'bg-aura-primary' : 'bg-aura-border'}`} />
                    <div className={`w-3 h-3 rounded-full transition-colors ${step >= 2 ? 'bg-aura-primary' : 'bg-aura-border'}`} />
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    
                    {/* STEP 1: ROOMS & COUNTS */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-8 h-full overflow-y-auto custom-scrollbar flex flex-col"
                        >
                            <h2 className="text-lg font-medium text-gray-200 mb-6 flex items-center gap-2">
                                <Layers size={20} className="text-aura-primary" />
                                Definisci le Sale e quanti tavoli ci sono
                            </h2>
                            
                            {/* Error Banner */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="bg-aura-red/10 border border-aura-red/30 text-aura-red px-4 py-3 rounded-xl mb-6 flex items-center gap-3 text-sm font-medium"
                                    >
                                        <AlertCircle size={18} />
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-4 w-full">
                                {floorsData.map((floor, idx) => (
                                    <div key={idx} className="flex gap-4 items-center bg-aura-black/20 p-2 rounded-xl border border-transparent hover:border-aura-border/50 transition-colors">
                                        <div className="flex-1 pl-2">
                                            <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Nome Sala</label>
                                            <input 
                                                type="text" 
                                                value={floor.name}
                                                onChange={(e) => updateFloorData(idx, 'name', e.target.value)}
                                                className="w-full bg-transparent border-b border-aura-border px-0 py-2 text-white focus:border-aura-primary/50 focus:outline-none transition-all text-lg font-medium placeholder-gray-700"
                                                placeholder="Es. Veranda"
                                            />
                                        </div>
                                        <div className="flex flex-col items-center px-4">
                                            <label className="text-[10px] text-gray-500 uppercase font-bold mb-1">N. Tavoli</label>
                                            <Stepper 
                                                value={floor.count} 
                                                onIncrement={() => incrementFloorCount(idx)} 
                                                onDecrement={() => decrementFloorCount(idx)}
                                                errorHighlight={showValidationErrors && floor.count === 0}
                                            />
                                        </div>
                                        <div className="w-12 flex justify-center">
                                            {idx !== 0 && (
                                                <button 
                                                    onClick={() => removeFloor(idx)}
                                                    className="p-3 text-gray-500 hover:text-aura-red transition-colors rounded-full hover:bg-aura-red/10"
                                                    title="Elimina Sala"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button 
                                    onClick={addFloor}
                                    className="w-full py-4 rounded-xl border border-dashed border-aura-border hover:border-aura-primary hover:text-aura-primary hover:bg-aura-primary/5 text-gray-400 transition-all flex items-center justify-center gap-2 font-medium mt-4"
                                >
                                    <Plus size={18} /> Aggiungi un'altra Sala
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: TABLES DETAILS */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full flex flex-col"
                        >
                            {/* Error Banner Step 2 */}
                             <AnimatePresence>
                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="mx-8 mt-6 bg-aura-red/10 border border-aura-red/30 text-aura-red px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium"
                                    >
                                        <AlertCircle size={18} />
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Room Tabs */}
                            <div className="flex items-center gap-2 px-8 pt-6 pb-0 overflow-x-auto scrollbar-hide border-b border-aura-border/50">
                                {floorsData.map(floor => (
                                    <button
                                        key={floor.name}
                                        onClick={() => setActiveFloorTab(floor.name)}
                                        className={`px-6 py-3 rounded-t-xl text-sm font-bold uppercase tracking-wide transition-all ${
                                            activeFloorTab === floor.name 
                                            ? 'bg-aura-primary/10 border-t border-x border-aura-primary/30 text-aura-primary' 
                                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                        }`}
                                    >
                                        {floor.name}
                                    </button>
                                ))}
                            </div>

                            {/* Table List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-aura-black/20">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-gray-300 font-medium flex items-center gap-2">
                                        <Grid size={18} className="text-aura-primary" />
                                        Dettaglio tavoli: <span className="text-white font-bold">{activeFloorTab}</span>
                                    </h3>
                                    <button 
                                        onClick={() => addTableToFloor(activeFloorTab)}
                                        className="bg-aura-primary text-black px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-aura-secondary transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={14} /> Aggiungi Tavolo
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <AnimatePresence>
                                        {floorConfigs[activeFloorTab]?.map((config, index) => (
                                            <motion.div 
                                                key={`${activeFloorTab}-${index}`}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                layout
                                                className="bg-aura-card border border-aura-border rounded-xl p-3 flex items-center gap-4 group hover:border-aura-primary/30 transition-colors"
                                            >
                                                <div className="flex-1">
                                                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1 block">Nome Tavolo</label>
                                                    <input 
                                                        type="text" 
                                                        value={config.name}
                                                        onChange={(e) => updateTableConfig(activeFloorTab, index, 'name', e.target.value)}
                                                        className="w-full bg-aura-black/50 border border-aura-border rounded-lg px-3 py-2.5 text-white text-sm font-bold focus:border-aura-primary/50 focus:outline-none"
                                                    />
                                                </div>
                                                
                                                <div className="flex flex-col items-center">
                                                     <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1 block">Forma</label>
                                                     <ShapeSelector 
                                                        current={config.shape} 
                                                        onChange={(s) => updateTableConfig(activeFloorTab, index, 'shape', s)} 
                                                     />
                                                </div>

                                                <div className="flex flex-col items-center">
                                                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1 block">Posti</label>
                                                    <div className="scale-90 origin-center">
                                                        <Stepper 
                                                            value={config.seats}
                                                            onIncrement={() => updateTableConfig(activeFloorTab, index, 'seats', config.seats + 1)}
                                                            onDecrement={() => updateTableConfig(activeFloorTab, index, 'seats', Math.max(0, config.seats - 1))}
                                                            errorHighlight={showValidationErrors && config.seats === 0}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="pt-5">
                                                     <button 
                                                        onClick={() => removeTableFromFloor(activeFloorTab, index)}
                                                        className="p-2 text-gray-600 hover:text-aura-red hover:bg-aura-red/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                                
                                {floorConfigs[activeFloorTab]?.length === 0 && (
                                    <div className="text-center py-12 border-2 border-dashed border-aura-border rounded-xl">
                                        <Armchair size={48} className="mx-auto text-aura-border mb-4" />
                                        <p className="text-gray-500">Nessun tavolo in questa sala.</p>
                                        <button onClick={() => addTableToFloor(activeFloorTab)} className="text-aura-primary text-sm font-bold mt-2 hover:underline">Aggiungine uno</button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-aura-border flex justify-between bg-aura-black/20">
                {step > 1 ? (
                    <button 
                        onClick={goToStep1}
                        className="px-6 py-3 rounded-xl border border-aura-border text-gray-400 hover:text-white hover:bg-aura-border/50 transition-all font-medium"
                    >
                        Indietro
                    </button>
                ) : (
                    <div></div> // Spacer
                )}

                {step < 2 ? (
                     <button 
                        onClick={goToStep2}
                        className="px-8 py-3 rounded-xl bg-aura-primary text-black font-bold flex items-center gap-2 hover:bg-aura-secondary transition-all shadow-lg shadow-aura-primary/20"
                    >
                        Continua <ArrowRight size={18} />
                    </button>
                ) : (
                    <button 
                        onClick={finishSetup}
                        className="px-8 py-3 rounded-xl bg-aura-primary text-black font-bold flex items-center gap-2 hover:bg-aura-secondary transition-all shadow-lg shadow-aura-primary/20"
                    >
                        Genera Planimetria <CheckCircle2 size={18} />
                    </button>
                )}
            </div>

        </div>
      </div>
    </div>
  );
};

export default SetupWizard;