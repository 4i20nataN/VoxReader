import { useState, useEffect } from 'react';
import { ThemeBg, ThemeAccent, backgroundPalettes, accentPalettes } from '../themes';

export function useTheme() {
  const [themeBg, setThemeBg] = useState<ThemeBg>('dark');
  const [themeAccent, setThemeAccent] = useState<ThemeAccent>('blue');
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('leitor_setup_done')) setShowSetup(true);
    const savedBg = localStorage.getItem('leitor_bg') as ThemeBg;
    if (savedBg && backgroundPalettes[savedBg]) setThemeBg(savedBg);
    const savedAccent = localStorage.getItem('leitor_accent') as ThemeAccent;
    if (savedAccent && accentPalettes[savedAccent]) setThemeAccent(savedAccent);
  }, []);

  useEffect(() => { localStorage.setItem('leitor_bg', themeBg); }, [themeBg]);
  useEffect(() => { localStorage.setItem('leitor_accent', themeAccent); }, [themeAccent]);

  return { themeBg, setThemeBg, themeAccent, setThemeAccent, showSetup, setShowSetup };
}
