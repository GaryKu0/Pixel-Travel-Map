import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '../context/LocalizationContext';

interface SearchControlProps {
    onLocationSelect: (lat: number, lng: number) => void;
}

interface Suggestion {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
}

export const SearchControl: React.FC<SearchControlProps> = ({ onLocationSelect }) => {
    const { t, language } = useLocalization();
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isActive, setIsActive] = useState(false);

    const fetchSuggestions = useCallback(async (searchTerm: string) => {
        if (searchTerm.trim() === '') {
            setSuggestions([]);
            return;
        }
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&accept-language=${language}&limit=5`);
            if (response.ok) {
                const data = await response.json();
                setSuggestions(data);
            }
        } catch (error) {
            console.error("Failed to fetch location suggestions", error);
        }
    }, [language]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (isActive) {
                fetchSuggestions(query);
            }
        }, 300); // Debounce API calls

        return () => {
            clearTimeout(handler);
        };
    }, [query, isActive, fetchSuggestions]);

    const handleSelect = (suggestion: Suggestion) => {
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);
        onLocationSelect(lat, lng);
        setQuery(suggestion.display_name);
        setSuggestions([]);
        setIsActive(false);
    };
    
    const handleSearch = () => {
        if (suggestions.length > 0) {
            handleSelect(suggestions[0]);
        } else {
            fetchSuggestions(query).then(() => {
                if (suggestions.length > 0) {
                     handleSelect(suggestions[0]);
                }
            })
        }
    };

    return (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-full max-w-sm z-30" onBlur={() => setTimeout(() => setIsActive(false), 100)}>
            <div className="flex w-full">
                 <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsActive(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                    placeholder={t('searchPlaceholder')}
                    className="flex-grow h-10 box-border px-3 py-2 border border-black bg-white/90 text-black text-sm placeholder-neutral-600 focus:outline-none"
                    aria-label={t('searchPlaceholder')}
                />
                <button 
                    onClick={handleSearch} 
                    className="h-10 w-10 p-2 text-black bg-white/90 flex items-center justify-center hover:bg-gray-100 border-t border-b border-r border-black" 
                    aria-label={t('searchButton')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
            </div>
            {isActive && suggestions.length > 0 && (
                <ul className="bg-white border border-black border-t-0 max-h-60 overflow-y-auto shadow-lg">
                    {suggestions.map((s) => (
                        <li
                            key={s.place_id}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                            onMouseDown={() => handleSelect(s)} // Use onMouseDown to fire before onBlur
                        >
                            {s.display_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
