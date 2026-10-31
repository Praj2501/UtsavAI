import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleAuthProvider, isDemoMode, isFirebaseConfigValid } from './firebase';
import { AppError, Result, ok, err } from '../types/result.types';

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

export const DEMO_USER: AuthUser = {
  uid: 'demo-user-pune-2026',
  displayName: 'Pooja Deshmukh (Demo)',
  email: 'demo@utsav.ai',
  photoURL: null,
};

export function mapAuthErrorCodeToMessage(code?: string): string {
  switch (code) {
    case 'auth/config-invalid':
    case 'auth/invalid-api-key':
      return 'Firebase config invalid, check .env';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Redirecting to Google Sign-In...';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completion. Please try again.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in process was cancelled. Please try again.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in provider.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled for this project.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google sign-in.';
    case 'auth/sign-out-failed':
      return 'Failed to sign out. Please try again.';
    default:
      return 'Sign in with Google failed. Please try again.';
  }
}

export async function signInWithGoogle(): Promise<Result<AuthUser, AppError>> {
  if (!isFirebaseConfigValid) {
    const code = 'auth/invalid-api-key';
    const message = 'Firebase config invalid, check .env';
    console.error(code, message);
    return err({
      code,
      message,
    });
  }

  if (isDemoMode) {
    return ok(DEMO_USER);
  }

  try {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const user: AuthUser = {
      uid: cred.user.uid,
      displayName: cred.user.displayName,
      email: cred.user.email,
      photoURL: cred.user.photoURL,
    };
    return ok(user);
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string };
    const code = e.code || 'auth/sign-in-failed';
    console.error(code, e.message || error);

    if (code === 'auth/popup-blocked') {
      try {
        await signInWithRedirect(auth, googleAuthProvider);
        return ok(DEMO_USER);
      } catch (redirectErr: unknown) {
        const re = redirectErr as { code?: string; message?: string };
        const redirectCode = re.code || 'auth/redirect-failed';
        console.error(redirectCode, re.message || redirectErr);
        return err({
          code: redirectCode,
          message: mapAuthErrorCodeToMessage(redirectCode),
        });
      }
    }

    return err({
      code,
      message: mapAuthErrorCodeToMessage(code),
    });
  }
}

export async function handleRedirectResult(): Promise<Result<AuthUser | null, AppError>> {
  if (isDemoMode) {
    return ok(DEMO_USER);
  }
  try {
    const cred = await getRedirectResult(auth);
    if (!cred) {
      return ok(null);
    }
    return ok({
      uid: cred.user.uid,
      displayName: cred.user.displayName,
      email: cred.user.email,
      photoURL: cred.user.photoURL,
    });
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string };
    const code = e.code || 'auth/redirect-error';
    console.error(code, e.message || error);
    return err({
      code,
      message: mapAuthErrorCodeToMessage(code),
    });
  }
}

export async function signOutUser(): Promise<Result<void, AppError>> {
  if (isDemoMode) {
    return ok(undefined);
  }
  try {
    await firebaseSignOut(auth);
    return ok(undefined);
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string };
    const code = e.code || 'auth/sign-out-failed';
    console.error(code, e.message || error);
    return err({
      code,
      message: mapAuthErrorCodeToMessage(code),
    });
  }
}

export function subscribeToAuthState(callback: (user: AuthUser | null) => void): () => void {
  if (isDemoMode) {
    callback(DEMO_USER);
    return () => {};
  }
  return onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      callback(null);
    } else {
      callback({
        uid: fbUser.uid,
        displayName: fbUser.displayName,
        email: fbUser.email,
        photoURL: fbUser.photoURL,
      });
    }
  });
}
