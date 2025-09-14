import React, { useState } from 'react';
import authService from '../services/authService';
import { useLocalization } from '../context/LocalizationContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useLocalization();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        await authService.register(username, email, displayName || username);
      } else {
        // For login, pass username only if provided (allows usernameless login)
        await authService.login(username || undefined);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUsernamelessLogin = async () => {
    setLoading(true);
    setError('');

    try {
      await authService.login(); // No username - let browser show available credentials
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
      <div className="bg-white border border-black shadow-lg max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold mb-4 text-black">
          {mode === 'login' ? t('signIn') : t('createAccount')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              {t('username')} {mode === 'login' && `(${t('optional')})`}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-black bg-white text-black focus:outline-none focus:bg-gray-50"
              required={mode === 'register'}
              disabled={loading}
              placeholder={mode === 'login' ? 'Leave empty to use any available passkey' : ''}
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {t('email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-black bg-white text-black focus:outline-none focus:bg-gray-50"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {t('displayName')} ({t('optional')})
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-black bg-white text-black focus:outline-none focus:bg-gray-50"
                  disabled={loading}
                />
              </div>
            </>
          )}

          {error && (
            <div className="bg-white border border-black p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 border border-black bg-black text-white text-sm hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t('processing') : (mode === 'login' ? t('signIn') : t('register'))}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-black bg-white text-black text-sm hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
          
          {mode === 'login' && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleUsernamelessLogin}
                disabled={loading}
                className="w-full px-4 py-3 border border-black bg-white text-black text-sm hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                🔐 Sign In with Any Passkey
              </button>
            </div>
          )}
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="text-black hover:underline text-sm"
            disabled={loading}
          >
            {mode === 'login' 
              ? t('dontHaveAccount')
              : t('alreadyHaveAccount')}
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-600 text-center">
          {t('passkeyAuthInfo')}
        </div>
      </div>
    </div>
  );
};