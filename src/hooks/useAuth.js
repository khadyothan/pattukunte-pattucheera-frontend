import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, twitterProvider, db } from "../firebase";

const initialStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayedDay: null,
  guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
};

async function ensureUserDoc(uid, twitterHandle, photoURL) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, { twitterHandle, photoURL, stats: initialStats, totalPoints: 0 });
  }
}

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const handle = "@" + (currentUser.reloadUserInfo?.screenName || currentUser.displayName);
        ensureUserDoc(currentUser.uid, handle, currentUser.photoURL || "").catch((err) =>
          console.error("Failed to create user doc:", err)
        );
      }
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = () => signInWithPopup(auth, twitterProvider);
  const signOut = () => {
    localStorage.clear();
    return firebaseSignOut(auth);
  };

  return { user, loading, signIn, signOut };
};
