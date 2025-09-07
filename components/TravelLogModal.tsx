
import React, { useState, useMemo, useEffect } from 'react';
import type { LogData } from '../App';
import { useLocalization } from '../context/LocalizationContext';

interface TravelLogModalProps {
    log: LogData;
    onSave: (updatedLog: LogData, newCoords: { lat: number; lng: number } | null) => void;
    onClose: () => void;
}

const normalizeDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    try {
        const datePart = dateString.split(' ')[0];
        const sanitized = datePart.replace(/[/:]/g, '-');
        if (/^\d{4}-\d{2}-\d{2}$/.test(sanitized)) {
            return sanitized;
        }
        const d = new Date(dateString);
        if (isNaN(d.getTime())) {
            return '';
        }
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return '';
    }
};

export const TravelLogModal: React.FC<TravelLogModalProps> = ({ log, onSave, onClose }) => {
    const { t, language } = useLocalization();
    const [currentLog, setCurrentLog] = useState<LogData>(log);
    const [searchTerm, setSearchTerm] = useState<string>(log.location);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
    
    useEffect(() => {
        setCurrentLog(log);
        setSearchTerm(log.location);
        setSuggestions([]);
        setSelectedCoords(null);
    }, [log]);

    useEffect(() => {
        if (searchTerm.trim() === '' || searchTerm === log.location) {
            setSuggestions([]);
            return;
        }

        const handler = setTimeout(async () => {
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&accept-language=${language}`);
                if (response.ok) {
                    const data = await response.json();
                    setSuggestions(data);
                }
            } catch (error) {
                console.error("Failed to fetch location suggestions", error);
            }
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm, log.location, language]);

    const handleOtherChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCurrentLog(prev => ({ ...prev, [name]: value }));
    };

    const handleSuggestionClick = (suggestion: any) => {
        setSearchTerm(suggestion.display_name);
        setSelectedCoords({ lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) });
        setSuggestions([]);
    };

    const handleSave = () => {
        onSave({ ...currentLog, location: searchTerm }, selectedCoords);
    };

    const validDateValue = useMemo(() => normalizeDateForInput(currentLog.date), [currentLog.date]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-white p-6 border border-black shadow-lg text-black w-full max-w-md flex flex-col gap-4" 
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-xl text-center font-bold">{t('logTitle')}</h3>
                
                <div className="flex flex-col gap-1 relative">
                    <label htmlFor="location" className="text-sm font-bold">{t('logLocation')}</label>
                    <input
                        type="text"
                        id="location"
                        name="location"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-10 box-border px-3 py-2 border border-black bg-white text-black text-sm placeholder-neutral-600"
                        autoComplete="off"
                    />
                    {suggestions.length > 0 && (
                        <ul className="absolute top-full left-0 right-0 bg-white border border-black border-t-0 z-10 max-h-48 overflow-y-auto shadow-lg">
                            {suggestions.map((s) => (
                                <li
                                    key={s.place_id}
                                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                                    onClick={() => handleSuggestionClick(s)}
                                >
                                    {s.display_name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                
                <div className="flex flex-col gap-1">
                    <label htmlFor="date" className="text-sm font-bold">{t('logDate')}</label>
                    <input
                        type="date"
                        id="date"
                        name="date"
                        value={validDateValue}
                        onChange={handleOtherChange}
                        className="w-full h-10 box-border px-3 py-2 border border-black bg-white text-black text-sm"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="musings" className="text-sm font-bold">{t('logMusings')}</label>
                    <textarea
                        id="musings"
                        name="musings"
                        value={currentLog.musings}
                        onChange={handleOtherChange}
                        rows={6}
                        className="w-full box-border px-3 py-2 border border-black bg-white text-black text-sm placeholder-neutral-600"
                        placeholder={t('logMusingsPlaceholder')}
                    />
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 border border-black bg-white text-black text-sm hover:bg-gray-100">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 border border-black bg-black text-white text-sm hover:bg-neutral-800">{t('save')}</button>
                </div>
            </div>
        </div>
    );
};
