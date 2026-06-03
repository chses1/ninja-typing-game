// js/auth.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getAnalytics,
  isSupported
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js';

export const API_BASE = location.hostname.includes('github.io')
  ? 'https://ninja-typing-game.onrender.com'
  : '';

const firebaseConfig = {
  apiKey: 'AIzaSyDVJTH0c5onZW5zzHyKVEtsgF1k307nZE4',
  authDomain: 'english-type.firebaseapp.com',
  projectId: 'english-type',
  storageBucket: 'english-type.firebasestorage.app',
  messagingSenderId: '1088736682898',
  appId: '1:1088736682898:web:43a63993115f1cde2b174b',
  measurementId: 'G-PYYX9ZB1F5'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

isSupported()
  .then((supported) => {
    if (supported) getAnalytics(app);
  })
  .catch(() => {});

let currentProfile = null;

function toErrorMessage(error) {
  if (!error) return '登入失敗，請稍後再試';
  if (error.code === 'auth/popup-closed-by-user') return '尚未完成 Google 登入';
  if (error.code === 'auth/popup-blocked') return '瀏覽器阻擋了登入視窗，請允許彈出視窗後再試一次';
  return error.message || '登入失敗，請稍後再試';
}

export function getCurrentProfile() {
  return currentProfile;
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function onFirebaseUserChanged(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getFirebaseIdToken(forceRefresh = false) {
  if (!auth.currentUser) {
    throw new Error('請先使用 Google 登入');
  }
  return auth.currentUser.getIdToken(forceRefresh);
}

export async function apiFetch(path, options = {}) {
  const token = await getFirebaseIdToken();
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
}

export async function syncGoogleSession(playerId = '') {
  const token = await getFirebaseIdToken(true);
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ playerId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || '登入驗證失敗');
  }
  currentProfile = data.user;
  return data.user;
}

export async function signInWithGoogle() {
  try {
    if (!auth.currentUser) {
      await signInWithPopup(auth, provider);
    }
    return syncGoogleSession();
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}

export async function bindStudentId(playerId) {
  return syncGoogleSession(playerId);
}

export async function fetchMyProgress() {
  const res = await apiFetch('/progress');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || '讀取進度失敗');
  }
  currentProfile = data.user || currentProfile;
  return data;
}

export async function signOutGoogle() {
  currentProfile = null;
  await signOut(auth);
}
