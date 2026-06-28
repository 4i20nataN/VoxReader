import { useState, useEffect } from 'react';
import { ThemeBg, ThemeAccent, backgroundPalettes, accentPalettes } from '../themes';
import { loadData, saveData } from '../lib/persistence';

export function useTheme() {
  const [themeBg, setThemeBg] = useState<ThemeBg>('dark');
  const [themeAccent, setThemeAccent] = useState<ThemeAccent>('blue');
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (!loadData('leitor_setup_done')) setShowSetup(true);
    const savedBg = loadData('leitor_bg') as ThemeBg;
    if (savedBg && backgroundPalettes[savedBg]) setThemeBg(savedBg);
    const savedAccent = loadData('leitor_accent') as ThemeAccent;
    if (savedAccent && accentPalettes[savedAccent]) setThemeAccent(savedAccent);
  }, []);

  useEffect(() => { saveData('leitor_bg', themeBg); }, [themeBg]);
  useEffect(() => { saveData('leitor_accent', themeAccent); }, [themeAccent]);

  return { themeBg, setThemeBg, themeAccent, setThemeAccent, showSetup, setShowSetup };
}
