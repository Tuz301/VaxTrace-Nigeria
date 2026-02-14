'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVaxTraceStore } from '@/store/useVaxTraceStore';
import { BiometricLogin } from '@/components/auth/BiometricLogin';
import { Shield, Fingerprint, Lock } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { setUserSession } = useVaxTraceStore();
  const [showPinFallback, setShowPinFallback] = useState(false);

  const handleAuthSuccess = (user: { id: string; name: string; role: string }) => {
    setUserSession({
      isAuthenticated: true,
      user: {
        id: user.id,
        email: `${user.id.toLowerCase()}@vaxtrace.gov.ng`,
        name: user.name,
        role: user.role as any,
      },
      permissions: {
        canViewNational: ['NATIONAL_ADMIN', 'STATE_MANAGER'].includes(user.role),
        canViewState: ['NATIONAL_ADMIN', 'STATE_MANAGER', 'LGA_SUPERVISOR'].includes(user.role),
        canViewLGA: ['NATIONAL_ADMIN', 'STATE_MANAGER', 'LGA_SUPERVISOR'].includes(user.role),
        canViewFacility: true,
        canEditStock: ['FACILITY_IN_CHARGE', 'LGA_SUPERVISOR'].includes(user.role),
        canEditUsers: ['NATIONAL_ADMIN'].includes(user.role),
        canViewReports: true,
      },
      loginTime: new Date().toISOString(),
    });
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">VaxTrace Nigeria</h1>
          <p className="text-slate-400">Vaccine Supply Chain Analytics</p>
        </div>

        {/* Biometric Login Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <div className="text-center mb-6">
            <Fingerprint className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-white mb-2">Secure Authentication</h2>
            <p className="text-sm text-slate-400">
              Use your biometrics or PIN to access the command center
            </p>
          </div>

          <BiometricLogin onSuccess={handleAuthSuccess} />

          {/* PIN Fallback */}
          {!showPinFallback ? (
            <button
              onClick={() => setShowPinFallback(true)}
              className="w-full mt-4 py-3 text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Use PIN instead
            </button>
          ) : (
            <PinFallbackForm onSuccess={handleAuthSuccess} onCancel={() => setShowPinFallback(false)} />
          )}

          {/* Security Notice */}
          <div className="mt-6 p-3 bg-slate-800/50 rounded-lg">
            <p className="text-xs text-slate-500 text-center">
              <Shield className="w-3 h-3 inline mr-1" />
              NDPR Compliant • AES-256 Encrypted • WebAuthn Secured
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-600">
            Federal Ministry of Health • National Primary Health Care Development Agency
          </p>
          <p className="text-xs text-slate-700 mt-1">© 2025 VaxTrace Nigeria</p>
        </div>
      </div>
    </div>
  );
}

// PIN Fallback Component
function PinFallbackForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (user: { id: string; name: string; role: string }) => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Simulate PIN verification (in production, this would call the backend)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (pin === '1234') {
        // Demo user
        onSuccess({
          id: 'demo-user',
          name: 'Demo User',
          role: 'NATIONAL_ADMIN',
        });
      } else {
        setError('Invalid PIN. Try 1234 for demo.');
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="mb-4">
        <label htmlFor="pin" className="block text-sm text-slate-400 mb-2">
          Enter PIN
        </label>
        <input
          id="pin"
          type="password"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:border-emerald-500"
          placeholder="••••"
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
      </div>

      <button
        type="submit"
        disabled={pin.length !== 4 || isLoading}
        className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Verifying...' : 'Login with PIN'}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        Back to Biometric
      </button>
    </form>
  );
}
