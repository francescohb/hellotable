"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Layers, Grid, Save, Plus, Trash2, Edit2, ShieldCheck, Mail, Key, Circle, Square, RectangleHorizontal, ArrowLeft, X } from 'lucide-react';
import { TableData, TableShape } from '../lib/types';

interface SettingsViewProps {
  onClose: () => void;
  floors: string[];
  tables: TableData[];
  onUpdateFloors: (action: 'add' | 'rename' | 'delete', oldName?: string, newName?: string) => void;
  onDeleteTable: (id: string) => void;
  onAddTable: (floor: string, name: string, capacity: number, shape: TableShape) => void;
  onUpdateTable: (id: string, updates: Partial<TableData>) => void;
  restaurantName: string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
    onClose, floors, tables, onUpdateFloors, onDeleteTable, onAddTable, onUpdateTable, restaurantName 
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'floors' | 'security' | 'tables'>('account');
  
  // Floor Management States
  const [newFloorName, setNewFloorName] = useState('');
  const [editingFloor, setEditingFloor] = useState<string | null>(null);
  const [tempFloorName, setTempFloorName] = useState('');

  // Tables Management State
  const [deleteTableId, setDeleteTableId] = useState<string | null>(null);
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>('all');
  
  // Add Table State
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [newTableConfig, setNewTableConfig] = useState<{name: string, floor: string, seats: number, shape: TableShape}>({
      name: '', floor: floors[0] || '', seats: 2, shape: 'square'
  });

  // Edit Table State
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editTableConfig, setEditTableConfig] = useState<{name: string, floor: string, seats: number, shape: TableShape} | null>(null);

  // --- HANDLERS FOR FLOORS ---
  const handleAddFloor = () => {
      if (newFloorName.trim()) {
          onUpdateFloors('add', undefined, newFloorName);
          setNewFloorName('');
      }
  };

  const handleRenameFloor = (oldName: string) => {
      if (tempFloorName.trim() && tempFloorName !== oldName) {
          onUpdateFloors('rename', oldName, tempFloorName);
      }
      setEditingFloor(null);
  };

  const handleDeleteFloor = (name: string) => {
      if (confirm(`Eliminando la sala "${name}" eliminerai anche tutti i tavoli al suo interno. Continuare?`)) {
          onUpdateFloors('delete', name);
      }
  };

  // --- HANDLERS FOR TABLES ---
  const handleSaveNewTable = () => {
      if (newTableConfig.name.trim() && newTableConfig.floor) {
          onAddTable(newTableConfig.floor, newTableConfig.name, newTableConfig.seats, newTableConfig.shape);
          setIsAddingTable(false);
          setNewTableConfig({ name: '', floor: floors[0] || '', seats: 2, shape: 'square' });
      }
  };

  const startEditingTable = (table: TableData) => {
      setEditingTableId(table.id);
      setEditTableConfig({
          name: table.name,
          floor: table.floor,
          seats: table.capacity,
          shape: table.shape
      });
  };

  const saveEditedTable = (id: string) => {
      if (editTableConfig) {
          onUpdateTable(id, {
              name: editTableConfig.name,
              floor: editTableConfig.floor,
              capacity: editTableConfig.seats,
              shape: editTableConfig.shape
          });
          setEditingTableId(null);
          setEditTableConfig(null);
      }
  };

  // Filter tables: remove temporary tables and apply floor filter
  const filteredTables = tables.filter(t => !t.isTemporary).filter(t => 
      selectedFloorFilter === 'all' ? true : t.floor === selectedFloorFilter
  );

  // Shape icon helper
  const ShapeIcon = ({ shape, className }: { shape: TableShape, className?: string }) => {
      switch(shape) {
          case 'circle': return <Circle size={14} className={className} />;
          case 'square': return <Square size={14} className={className} />;
          case 'rectangle': return <RectangleHorizontal size={14} className={className} />;
          case 'oval': return <div className={`w-3.5 h-2 rounded-full border border-current ${className}`} />;
          default: return <Square size={14} className={className} />;
      }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex bg-aura-bg overflow-hidden"
    >
        {/* SIDEBAR */}
        <div className="w-64 bg-aura-black/50 border-r border-aura-border flex flex-col p-6">
            <button 
                onClick={onClose}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 hover:bg-white/5 p-2 rounded-lg transition-colors"
            >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium">Torna alla Sala</span>
            </button>

            <h2 className="text-xl font-bold text-white mb-6 tracking-tight px-2">Impostazioni</h2>
            
            <nav className="flex-1 space-y-2">
                <button 
                    onClick={() => setActiveTab('account')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'account' ? 'bg-aura-primary text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <User size={18} /> Profilo & Account
                </button>
                <button 
                    onClick={() => setActiveTab('floors')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'floors' ? 'bg-aura-primary text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Layers size={18} /> Gestione Sale
                </button>
                <button 
                    onClick={() => setActiveTab('tables')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'tables' ? 'bg-aura-primary text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Grid size={18} /> Gestione Tavoli
                </button>
                <button 
                    onClick={() => setActiveTab('security')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-aura-primary text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <ShieldCheck size={18} /> Sicurezza
                </button>
            </nav>

            <div className="pt-6 border-t border-aura-border text-xs text-gray-600 px-2">
                v1.2.0 • Build 2405
            </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 flex flex-col relative bg-aura-bg/50 overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                
                {/* ACCOUNT TAB */}
                {activeTab === 'account' && (
                    <div className="space-y-8 max-w-2xl mx-auto lg:mx-0">
                        <div>
                            <h3 className="text-3xl font-bold text-white mb-2">Profilo Ristorante</h3>
                            <p className="text-gray-500">Gestisci le informazioni visibili e i contatti principali.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-full bg-aura-card border-2 border-dashed border-aura-border flex items-center justify-center text-gray-500 hover:text-aura-primary hover:border-aura-primary transition-colors cursor-pointer">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{restaurantName.charAt(0)}</div>
                                    </div>
                                </div>
                                <div>
                                    <button className="text-sm text-aura-primary font-bold hover:underline">Carica Logo</button>
                                    <p className="text-xs text-gray-500 mt-1">JPG, PNG max 2MB</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nome Attività</label>
                                    <input type="text" value={restaurantName} readOnly className="w-full bg-aura-black border border-aura-border rounded-xl px-4 py-3 text-white focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipologia</label>
                                    <input type="text" value="Fine Dining" readOnly className="w-full bg-aura-black border border-aura-border rounded-xl px-4 py-3 text-gray-400 focus:outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Amministratore</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input type="email" value="admin@lumina.rest" readOnly className="w-full bg-aura-black border border-aura-border rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none" />
                                </div>
                            </div>
                        </div>

                         <div className="pt-8 border-t border-aura-border">
                            <h4 className="text-lg font-bold text-white mb-4">Preferenze Sistema</h4>
                            <div className="flex items-center justify-between py-4 border-b border-aura-border/30">
                                <div>
                                    <div className="text-white font-medium">Notifiche Sonore</div>
                                    <div className="text-xs text-gray-500">Riproduci suono all'arrivo di nuovi ordini o chiamate</div>
                                </div>
                                <div className="w-12 h-6 bg-aura-primary rounded-full relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full shadow-md" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* FLOORS TAB */}
                {activeTab === 'floors' && (
                    <div className="max-w-4xl mx-auto lg:mx-0">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h3 className="text-3xl font-bold text-white mb-2">Gestione Sale</h3>
                                <p className="text-gray-500">Aggiungi, rinomina o rimuovi le aree del tuo ristorante.</p>
                            </div>
                        </div>

                        {/* Add New Floor */}
                        <div className="flex gap-4 mb-8 bg-aura-card p-6 rounded-2xl border border-aura-border">
                             <input 
                                type="text" 
                                placeholder="Nome nuova sala..." 
                                value={newFloorName}
                                onChange={(e) => setNewFloorName(e.target.value)}
                                className="flex-1 bg-aura-black border border-aura-border rounded-xl px-4 py-3 text-white focus:border-aura-primary/50 focus:outline-none"
                            />
                            <button 
                                onClick={handleAddFloor}
                                disabled={!newFloorName.trim()}
                                className="bg-aura-primary disabled:opacity-50 text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-aura-secondary transition-colors"
                            >
                                <Plus size={18} /> Aggiungi
                            </button>
                        </div>

                        {/* Floor List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {floors.map((floor) => (
                                <div key={floor} className="flex items-center justify-between bg-aura-black/50 border border-aura-border rounded-xl p-5 group hover:border-aura-primary/30 transition-colors">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-lg bg-aura-grid flex items-center justify-center text-aura-primary">
                                            <Layers size={24} />
                                        </div>
                                        
                                        {editingFloor === floor ? (
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    autoFocus
                                                    type="text" 
                                                    value={tempFloorName}
                                                    onChange={(e) => setTempFloorName(e.target.value)}
                                                    className="bg-aura-black border border-aura-primary rounded px-2 py-1 text-white focus:outline-none w-full"
                                                />
                                                <button onClick={() => handleRenameFloor(floor)} className="p-1 text-aura-primary hover:bg-aura-primary/10 rounded"><Save size={16}/></button>
                                                <button onClick={() => setEditingFloor(null)} className="p-1 text-gray-500 hover:text-white rounded"><X size={16}/></button>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="text-lg font-bold text-white">{floor}</div>
                                                <div className="text-xs text-gray-500">
                                                    {tables.filter(t => t.floor === floor).length} Tavoli assegnati
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {editingFloor !== floor && (
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => { setEditingFloor(floor); setTempFloorName(floor); }}
                                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteFloor(floor)}
                                                className="p-2 text-gray-400 hover:text-aura-red hover:bg-aura-red/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TABLES TAB */}
                {activeTab === 'tables' && (
                    <div className="h-full flex flex-col max-w-6xl mx-auto lg:mx-0">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h3 className="text-3xl font-bold text-white mb-2">Inventario Tavoli</h3>
                                <p className="text-gray-500">Visione d'insieme e configurazione strutturale.</p>
                            </div>
                            <button 
                                onClick={() => setIsAddingTable(true)}
                                className="bg-aura-primary text-black px-6 py-3 rounded-xl text-sm font-bold hover:bg-aura-secondary transition-colors flex items-center gap-2"
                            >
                                <Plus size={18} /> Nuovo Tavolo
                            </button>
                        </div>

                        {/* Room Filter */}
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                            <button 
                                onClick={() => setSelectedFloorFilter('all')}
                                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap border ${selectedFloorFilter === 'all' ? 'bg-aura-primary/10 border-aura-primary text-aura-primary' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                            >
                                Tutte le Sale
                            </button>
                            {floors.map(f => (
                                <button 
                                    key={f}
                                    onClick={() => setSelectedFloorFilter(f)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap border ${selectedFloorFilter === f ? 'bg-aura-primary/10 border-aura-primary text-aura-primary' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* ADD TABLE FORM */}
                        <div className={`overflow-hidden transition-all duration-300 ${isAddingTable ? 'max-h-40 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                            <div className="bg-aura-card border border-aura-primary/30 p-4 rounded-xl flex items-center gap-4">
                                <div className="flex-1 grid grid-cols-4 gap-4">
                                    <input 
                                        type="text" placeholder="Nome (es. 104)"
                                        value={newTableConfig.name}
                                        onChange={(e) => setNewTableConfig({...newTableConfig, name: e.target.value})}
                                        className="bg-aura-black border border-aura-border rounded-lg px-3 py-2 text-sm text-white focus:border-aura-primary"
                                    />
                                    <select 
                                        value={newTableConfig.floor}
                                        onChange={(e) => setNewTableConfig({...newTableConfig, floor: e.target.value})}
                                        className="bg-aura-black border border-aura-border rounded-lg px-3 py-2 text-sm text-white focus:border-aura-primary"
                                    >
                                        {floors.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 uppercase">Posti:</span>
                                        <input 
                                            type="number" min="1"
                                            value={newTableConfig.seats}
                                            onChange={(e) => setNewTableConfig({...newTableConfig, seats: parseInt(e.target.value)})}
                                            className="w-full bg-aura-black border border-aura-border rounded-lg px-3 py-2 text-sm text-white focus:border-aura-primary"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                            {(['square', 'circle', 'rectangle', 'oval'] as TableShape[]).map(s => (
                                                <button 
                                                key={s}
                                                onClick={() => setNewTableConfig({...newTableConfig, shape: s})}
                                                className={`p-2 rounded-lg border ${newTableConfig.shape === s ? 'bg-aura-primary text-black border-aura-primary' : 'bg-aura-black border-aura-border text-gray-400'}`}
                                                >
                                                    <ShapeIcon shape={s} />
                                                </button>
                                            ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleSaveNewTable} className="p-2 bg-aura-primary text-black rounded-lg font-bold"><Save size={18}/></button>
                                    <button onClick={() => setIsAddingTable(false)} className="p-2 text-gray-500 hover:text-white rounded-lg"><X size={18}/></button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-aura-black/30 border border-aura-border rounded-2xl">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-aura-black sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase border-b border-aura-border">Nome</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase border-b border-aura-border">Sala</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase border-b border-aura-border text-center">Posti</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase border-b border-aura-border text-center">Forma</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase border-b border-aura-border text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-aura-border/30">
                                    {filteredTables.sort((a,b) => a.floor.localeCompare(b.floor) || a.name.localeCompare(b.name)).map(table => (
                                        <tr key={table.id} className="hover:bg-white/5 transition-colors group">
                                            
                                            {/* EDIT MODE */}
                                            {editingTableId === table.id && editTableConfig ? (
                                                <>
                                                    <td className="p-4">
                                                        <input 
                                                            value={editTableConfig.name}
                                                            onChange={(e) => setEditTableConfig({...editTableConfig, name: e.target.value})}
                                                            className="w-full bg-aura-black border border-aura-primary rounded px-2 py-1 text-white text-sm"
                                                        />
                                                    </td>
                                                    <td className="p-4">
                                                        <select 
                                                            value={editTableConfig.floor}
                                                            onChange={(e) => setEditTableConfig({...editTableConfig, floor: e.target.value})}
                                                            className="w-full bg-aura-black border border-aura-primary rounded px-2 py-1 text-white text-sm"
                                                        >
                                                            {floors.map(f => <option key={f} value={f}>{f}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="p-4">
                                                         <input 
                                                            type="number" min="1"
                                                            value={editTableConfig.seats}
                                                            onChange={(e) => setEditTableConfig({...editTableConfig, seats: parseInt(e.target.value)})}
                                                            className="w-16 mx-auto block bg-aura-black border border-aura-primary rounded px-2 py-1 text-white text-sm text-center"
                                                        />
                                                    </td>
                                                    <td className="p-4 flex justify-center gap-1">
                                                         {(['square', 'circle', 'rectangle', 'oval'] as TableShape[]).map(s => (
                                                             <button 
                                                                key={s}
                                                                onClick={() => setEditTableConfig({...editTableConfig, shape: s})}
                                                                className={`p-1.5 rounded border ${editTableConfig.shape === s ? 'bg-aura-primary text-black border-aura-primary' : 'bg-aura-black border-aura-border text-gray-400'}`}
                                                             >
                                                                 <ShapeIcon shape={s} className="w-3 h-3" />
                                                             </button>
                                                         ))}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => saveEditedTable(table.id)} className="p-1 text-aura-primary hover:bg-aura-primary/10 rounded"><Save size={16}/></button>
                                                            <button onClick={() => setEditingTableId(null)} className="p-1 text-gray-500 hover:text-white rounded"><X size={16}/></button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                // DISPLAY MODE
                                                <>
                                                    <td className="p-4 text-white font-medium">{table.name}</td>
                                                    <td className="p-4 text-gray-400 text-sm">{table.floor}</td>
                                                    <td className="p-4 text-center">
                                                        <span className="bg-aura-grid border border-aura-border px-2 py-1 rounded text-xs text-white">{table.capacity}</span>
                                                    </td>
                                                    <td className="p-4 text-center text-gray-400">
                                                        <div className="flex justify-center">
                                                            <ShapeIcon shape={table.shape} />
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {deleteTableId === table.id ? (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <span className="text-xs text-aura-red">Eliminare?</span>
                                                                <button onClick={() => { onDeleteTable(table.id); setDeleteTableId(null); }} className="text-aura-red font-bold text-xs hover:underline">SI</button>
                                                                <button onClick={() => setDeleteTableId(null)} className="text-gray-400 text-xs hover:text-white">NO</button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => startEditingTable(table)} className="p-2 text-gray-500 hover:text-aura-primary hover:bg-aura-primary/5 rounded-lg transition-colors">
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button onClick={() => setDeleteTableId(table.id)} className="p-2 text-gray-500 hover:text-aura-red hover:bg-aura-red/5 rounded-lg transition-colors">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                 {/* SECURITY TAB */}
                 {activeTab === 'security' && (
                    <div className="max-w-xl space-y-8 mx-auto lg:mx-0">
                        <div>
                            <h3 className="text-3xl font-bold text-white mb-2">Sicurezza</h3>
                            <p className="text-gray-500">Gestisci password e accessi al terminale.</p>
                        </div>

                        <div className="space-y-6 bg-aura-black/30 p-6 rounded-2xl border border-aura-border">
                            <h4 className="text-lg font-bold text-white flex items-center gap-2"><Key size={18} className="text-aura-primary"/> Modifica Password</h4>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Password Attuale</label>
                                    <input type="password" placeholder="••••••••" className="w-full bg-aura-black border border-aura-border rounded-xl px-4 py-3 text-white focus:border-aura-primary/50 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nuova Password</label>
                                    <input type="password" placeholder="••••••••" className="w-full bg-aura-black border border-aura-border rounded-xl px-4 py-3 text-white focus:border-aura-primary/50 focus:outline-none" />
                                </div>
                                <button className="bg-aura-grid border border-aura-border text-white px-6 py-2 rounded-xl font-bold hover:bg-aura-border transition-colors">
                                    Aggiorna Password
                                </button>
                            </div>
                        </div>

                         <div className="flex items-center justify-between p-6 bg-aura-black/30 rounded-2xl border border-aura-border">
                            <div>
                                <div className="text-white font-bold flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-aura-gold"/> Autenticazione a Due Fattori
                                </div>
                                <div className="text-xs text-gray-500 mt-1">Richiedi un codice via email per i nuovi accessi</div>
                            </div>
                            <div className="w-12 h-6 bg-gray-700 rounded-full relative cursor-pointer">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-gray-400 rounded-full shadow-md" />
                            </div>
                        </div>
                    </div>
                 )}

            </div>
        </div>
    </motion.div>
  );
};

export default SettingsView;