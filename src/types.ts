export type HistoryItem = { id: string; text: string; date: number; type: 'read' | 'clipboard' | 'ocr' | 'arquivo'; favorite?: boolean };
export type SavedTextItem = { id: string; originalText: string; explanation: string; date: number; title: string; savedType: 'explain' | 'translate' | 'correct' };
