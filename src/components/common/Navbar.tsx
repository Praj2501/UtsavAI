import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useEventStore } from '../../stores/eventStore';
import { isDemoMode } from '../../services/firebase';

export const Navbar: React.FC = () => {
  const { user, signIn, signOut, isLoading, error } = useAuthStore();
  const { currentEvent, activeView, setActiveView } = useEventStore();

  return (
    <header className="sticky top-0 z-40 bg-utsav-50/90 backdrop-blur-md border-b border-utsav-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView(currentEvent ? 'dashboard' : 'landing')}
            className="flex items-center gap-2 text-left focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-festive-marigold to-festive-gold p-1 shadow-sm flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-7 h-7" fill="none">
                <path
                  d="M10 38 C 10 52, 54 52, 54 38 C 42 42, 22 42, 10 38 Z"
                  fill="#fff"
                  opacity="0.95"
                />
                <path
                  d="M32 10 C 37 20, 40 26, 32 34 C 24 26, 27 20, 32 10 Z"
                  fill="#fde68a"
                />
              </svg>
            </div>
            <div>
              <span className="font-serif text-xl font-bold tracking-tight text-stone-900">
                Utsav <span className="text-festive-marigold font-sans font-semibold text-lg">AI</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-stone-500 font-medium">
                उत्सव AI
              </span>
            </div>
          </button>

          {/* Navigation items when an event is active */}
          {currentEvent && (
            <nav className="hidden md:flex items-center gap-1 ml-6 pl-6 border-l border-utsav-200">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-utsav-100'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveView('budget')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeView === 'budget'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-utsav-100'
                }`}
              >
                Budget
              </button>
              <button
                onClick={() => setActiveView('timeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeView === 'timeline'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-utsav-100'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setActiveView('vendors')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeView === 'vendors'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-utsav-100'
                }`}
              >
                Vendors
              </button>
              <button
                onClick={() => setActiveView('rsvp')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeView === 'rsvp'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-utsav-100'
                }`}
              >
                RSVP & Food
              </button>
              <button
                onClick={() => setActiveView('content')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeView === 'content'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-utsav-100'
                }`}
              >
                Content AI
              </button>
              <button
                onClick={() => setActiveView('runsheet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeView === 'runsheet'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-utsav-100'
                }`}
              >
                Runsheet
              </button>
            </nav>
          )}

          {/* Demo Mode Badge */}
          {isDemoMode && (
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 ml-2"
              title="Running in Demo Mode with Mock AI Provider"
            >
              Demo mode
            </span>
          )}
        </div>

        {/* User Auth controls */}
        <div className="flex items-center gap-3">
          {/* Auth status & error aria-live region */}
          <div
            role="status"
            aria-live="polite"
            className={
              error
                ? 'text-xs text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md max-w-xs'
                : 'sr-only'
            }
          >
            {error || ''}
          </div>
          {isLoading ? (
            <div className="w-24 h-9 bg-utsav-200/50 animate-pulse rounded-lg" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-stone-700 hidden md:inline">
                {user.displayName || user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="px-3.5 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-festive-marigold"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-festive-marigold hover:bg-orange-700 rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
