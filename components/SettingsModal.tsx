import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasServerKey, setHasServerKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load existing API key from localStorage
      const stored = localStorage.getItem('gemini_api_key');
      setApiKey(stored || '');

      // Check if server has a fallback API key
      setHasServerKey(!!(import.meta as any).env.VITE_GEMINI_API_KEY);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    onClose();
  };

  const handleClear = () => {
    setApiKey('');
    localStorage.removeItem('gemini_api_key');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-black p-6 max-w-md w-full mx-4 font-mono">
        <h2 className="text-xl font-bold mb-4">Settings</h2>

        <div className="mb-6">
          <h3 className="font-bold mb-2">Gemini API Key</h3>
          <p className="text-sm text-gray-600 mb-3">
            {hasServerKey
              ? "Optional: Provide your own API key to use without login. Leave empty to use the server's key (requires authentication)."
              : "Required: Get your API key from https://aistudio.google.com/apikey"
            }
          </p>

          <div className="mb-3">
            <div className="flex">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1 px-3 py-2 border border-gray-300 focus:outline-none focus:border-black"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 py-2 border border-l-0 border-gray-300 hover:bg-gray-100"
                type="button"
              >
                {showApiKey ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {apiKey && (
            <button
              onClick={handleClear}
              className="text-sm text-red-600 hover:text-red-800 mb-2"
            >
              Clear API key
            </button>
          )}

          <div className="text-xs text-gray-500 mt-2">
            <p>✓ Stored locally in your browser</p>
            <p>✓ Never sent to our servers</p>
            <p>✓ Used directly with Google's API</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-black hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-black text-white hover:bg-gray-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};