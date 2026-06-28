import { useState, useEffect } from 'react';
import { HistoryItem } from '../types';
import { loadData, saveData } from '../lib/persistence';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [clipboardHistory, setClipboardHistory] = useState<HistoryItem[]>([]);
  const [savedTexts, setSavedTexts] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'favorites'>('all');
  const [historySort, setHistorySort] = useState<'newest' | 'oldest' | 'longest'>('newest');

  useEffect(() => {
    const saved = loadData('reader_history');
    if (saved) setHistory(JSON.parse(saved));
    const savedClip = loadData('reader_clipboard');
    if (savedClip) setClipboardHistory(JSON.parse(savedClip));
    const savedTexts = loadData('leitor_saved_texts');
    if (savedTexts) setSavedTexts(JSON.parse(savedTexts));
  }, []);

  useEffect(() => { saveData('reader_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { saveData('reader_clipboard', JSON.stringify(clipboardHistory)); }, [clipboardHistory]);
  useEffect(() => { saveData('leitor_saved_texts', JSON.stringify(savedTexts)); }, [savedTexts]);

  const toggleFavorite = (id: string, isClipboard = false) => {
    if (isClipboard) {
      setClipboardHistory(prev => prev.map(item => item.id === id ? { ...item, favorite: !item.favorite } : item));
    } else {
      setHistory(prev => prev.map(item => item.id === id ? { ...item, favorite: !item.favorite } : item));
    }
  };

  const getFilteredAndSortedHistory = (list: HistoryItem[]) => {
    let result = [...list];
    if (historyFilter === 'favorites') result = result.filter(item => item.favorite);
    result.sort((a, b) => {
      if (historySort === 'newest') return b.date - a.date;
      if (historySort === 'oldest') return a.date - b.date;
      if (historySort === 'longest') return b.text.length - a.text.length;
      return 0;
    });
    return result;
  };

  return {
    history, setHistory, clipboardHistory, setClipboardHistory,
    savedTexts, setSavedTexts,
    historyFilter, setHistoryFilter, historySort, setHistorySort,
    toggleFavorite, getFilteredAndSortedHistory
  };
}
