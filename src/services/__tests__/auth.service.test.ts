import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mapAuthErrorCodeToMessage,
  signInWithGoogle,
  handleRedirectResult,
  signOutUser,
} from '../auth.service';
import * as firebaseAuth from 'firebase/auth';

vi.mock('../firebase', () => ({
  auth: { currentUser: null },
  googleAuthProvider: {},
  isDemoMode: false,
  isFirebaseConfigValid: true,
}));

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

describe('Auth Service & Error Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapAuthErrorCodeToMessage', () => {
    it('maps known error codes to friendly messages', () => {
      expect(mapAuthErrorCodeToMessage('auth/invalid-api-key')).toBe('Firebase config invalid, check .env');
      expect(mapAuthErrorCodeToMessage('auth/config-invalid')).toBe('Firebase config invalid, check .env');
      expect(mapAuthErrorCodeToMessage('auth/operation-not-allowed')).toContain('not enabled');
      expect(mapAuthErrorCodeToMessage('auth/popup-blocked')).toContain('Popup was blocked');
      expect(mapAuthErrorCodeToMessage('auth/popup-closed-by-user')).toContain('Sign-in window was closed');
      expect(mapAuthErrorCodeToMessage('auth/cancelled-popup-request')).toContain('Sign-in process was cancelled');
      expect(mapAuthErrorCodeToMessage('auth/network-request-failed')).toContain('Network connection failed');
      expect(mapAuthErrorCodeToMessage('auth/user-disabled')).toContain('account has been disabled');
      expect(mapAuthErrorCodeToMessage('auth/unauthorized-domain')).toContain('domain is not authorized');
      expect(mapAuthErrorCodeToMessage('unknown-error')).toContain('Sign in with Google failed');
    });
  });

  describe('signInWithGoogle', () => {
    it('returns AuthUser when signInWithPopup succeeds', async () => {
      vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValueOnce({
        user: {
          uid: 'user-123',
          displayName: 'Test User',
          email: 'test@example.com',
          photoURL: 'https://example.com/photo.jpg',
        },
      } as unknown as firebaseAuth.UserCredential);

      const result = await signInWithGoogle();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.uid).toBe('user-123');
        expect(result.value.displayName).toBe('Test User');
      }
    });

    it('falls back to signInWithRedirect when popup is blocked', async () => {
      vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValueOnce({
        code: 'auth/popup-blocked',
        message: 'Popup blocked by browser',
      });
      vi.mocked(firebaseAuth.signInWithRedirect).mockResolvedValueOnce(undefined as never);

      const result = await signInWithGoogle();
      expect(firebaseAuth.signInWithRedirect).toHaveBeenCalled();
      expect(result.ok).toBe(true);
    });

    it('returns mapped error when signInWithPopup fails with standard error', async () => {
      vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValueOnce({
        code: 'auth/popup-closed-by-user',
        message: 'Closed',
      });

      const result = await signInWithGoogle();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('auth/popup-closed-by-user');
        expect(result.error.message).toContain('Sign-in window was closed');
      }
    });

    it('returns mapped error if redirect also fails', async () => {
      vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValueOnce({
        code: 'auth/popup-blocked',
      });
      vi.mocked(firebaseAuth.signInWithRedirect).mockRejectedValueOnce({
        code: 'auth/network-request-failed',
      });

      const result = await signInWithGoogle();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('auth/network-request-failed');
        expect(result.error.message).toContain('Network connection failed');
      }
    });
  });

  describe('handleRedirectResult', () => {
    it('returns null if no redirect occurred', async () => {
      vi.mocked(firebaseAuth.getRedirectResult).mockResolvedValueOnce(null);
      const res = await handleRedirectResult();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBeNull();
      }
    });

    it('returns mapped user on successful redirect result', async () => {
      vi.mocked(firebaseAuth.getRedirectResult).mockResolvedValueOnce({
        user: {
          uid: 'redirect-123',
          displayName: 'Redirect User',
          email: 'redirect@example.com',
          photoURL: null,
        },
      } as unknown as firebaseAuth.UserCredential);

      const res = await handleRedirectResult();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value?.uid).toBe('redirect-123');
      }
    });
  });

  describe('signOutUser', () => {
    it('signs out successfully', async () => {
      vi.mocked(firebaseAuth.signOut).mockResolvedValueOnce(undefined);
      const res = await signOutUser();
      expect(res.ok).toBe(true);
    });
  });

  describe('invalid Firebase config check', () => {
    it('returns error when config is invalid and does not attempt sign-in', async () => {
      const firebaseModule = (await import('../firebase')) as unknown as { isFirebaseConfigValid: boolean };
      firebaseModule.isFirebaseConfigValid = false;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const res = await signInWithGoogle();
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('auth/invalid-api-key');
        expect(res.error.message).toBe('Firebase config invalid, check .env');
      }
      expect(consoleSpy).toHaveBeenCalledWith('auth/invalid-api-key', 'Firebase config invalid, check .env');
      consoleSpy.mockRestore();
      firebaseModule.isFirebaseConfigValid = true;
    });
  });
});
