"use client";

import React, { useState } from 'react';
import FloorManager from '../components/FloorManager';
import AuthScreen from '../components/AuthScreen';
import SetupWizard from '../components/SetupWizard';
import { TableData } from '../lib/types';
import { DEMO_DATA } from '../lib/constants';

import { getMorningScenario, getEveningScenario } from '../lib/DemoScenarios';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [restaurantName, setRestaurantName] = useState<string>('');

  // State to track if restaurant needs initial setup
  const [needsSetup, setNeedsSetup] = useState<boolean>(true);

  // Store generated data
  const [appData, setAppData] = useState<{ tables: TableData[], floors: string[], virtualTime?: number }>({
    tables: [],
    floors: [],
    virtualTime: undefined
  });

  const handleLogin = (name: string) => {
    setRestaurantName(name);
    setIsAuthenticated(true);

    if (name === "Demo Morning") {
        const scenario = getMorningScenario();
        setAppData({ 
            tables: scenario.tables, 
            floors: scenario.floors,
            virtualTime: scenario.virtualTime 
        });
        setNeedsSetup(false);
    } 
    else if (name === "Demo Evening") {
        const scenario = getEveningScenario();
        setAppData({ 
            tables: scenario.tables, 
            floors: scenario.floors,
            virtualTime: scenario.virtualTime
        });
        setNeedsSetup(false);
    }
    else if (name === "Ristorante Demo Quick") {
      setAppData({
        tables: DEMO_DATA.tables,
        floors: DEMO_DATA.floors
      });
      setNeedsSetup(false);
    } else {
      // Normal flow
      setNeedsSetup(true);
    }
  };

  const handleSetupComplete = (tables: TableData[], floors: string[]) => {
    setAppData({ tables, floors });
    setNeedsSetup(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setRestaurantName('');
    setNeedsSetup(true);
    // Optional: clear appData if you want full reset
    setAppData({ tables: [], floors: [] });
  };

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  if (needsSetup) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return (
    <FloorManager
      onLogout={handleLogout}
      restaurantName={restaurantName}
      initialTables={appData.tables}
      floors={appData.floors}
      initialTime={appData.virtualTime}
    />
  );
}
