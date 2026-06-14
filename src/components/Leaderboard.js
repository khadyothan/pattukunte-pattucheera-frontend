import React from "react";
import { collection, query, orderBy, limit, startAfter, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";

const PAGE_SIZE = 10;
const SEARCH_LIMIT = 200;
const DEBOUNCE_MS = 1000;
const rankColor = { 1: "text-yellow-400", 2: "text-gray-400", 3: "text-amber-600" };

function useDebounce(value, delay) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const cursorsRef = React.useRef([null]);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [leaders, setLeaders] = React.useState([]);
  const [hasNext, setHasNext] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [allUsers, setAllUsers] = React.useState([]);

  // Debounced term drives the DB query — waits for the user to pause typing
  const debouncedSearch = useDebounce(search, DEBOUNCE_MS);
  const isSearching = debouncedSearch.trim().length > 0;

  // Paginated query — unaffected by typing
  React.useEffect(() => {
    if (isSearching) return;

    const cursor = cursorsRef.current[pageIndex];
    const base = [collection(db, "users"), orderBy("totalPoints", "desc"), limit(PAGE_SIZE)];
    const q = cursor ? query(...base, startAfter(cursor)) : query(...base);

    const unsub = onSnapshot(
      q,
      (snap) => {
        setLeaders(
          snap.docs.map((d, i) => ({
            id: d.id,
            rank: pageIndex * PAGE_SIZE + i + 1,
            twitterHandle: d.data().twitterHandle ?? "unknown",
            totalPoints: d.data().totalPoints ?? 0,
            isCurrentUser: d.id === user?.uid
          }))
        );
        if (snap.docs.length === PAGE_SIZE) {
          cursorsRef.current[pageIndex + 1] = snap.docs[snap.docs.length - 1];
          setHasNext(true);
        } else {
          setHasNext(false);
        }
      },
      (err) => console.error("Leaderboard query failed:", err)
    );

    return unsub;
  }, [user, pageIndex, isSearching]);

  // Search query — fires ONE time when the debounced term first becomes non-empty,
  // then stays live. Subsequent keystrokes filter from allUsers client-side.
  React.useEffect(() => {
    if (!isSearching) {
      setAllUsers([]);
      return;
    }

    const q = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(SEARCH_LIMIT));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAllUsers(
          snap.docs.map((d, i) => ({
            id: d.id,
            rank: i + 1,
            twitterHandle: d.data().twitterHandle ?? "unknown",
            totalPoints: d.data().totalPoints ?? 0,
            isCurrentUser: d.id === user?.uid
          }))
        );
      },
      (err) => console.error("Leaderboard search failed:", err)
    );

    return unsub;
  }, [user, isSearching]); // NOT debouncedSearch — only fires on mode switch

  // Client-side filter — debounced so it updates at the same cadence as the input
  const searchResults = React.useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return [];
    return allUsers.filter((u) => u.twitterHandle.toLowerCase().includes(term));
  }, [debouncedSearch, allUsers]);

  React.useEffect(() => {
    if (isSearching) {
      setPageIndex(0);
      cursorsRef.current = [null];
    }
  }, [isSearching]);

  const displayed = isSearching ? searchResults : leaders;

  return (
    <div className="mx-4 my-6 xl:mx-0 xl:my-0 xl:fixed xl:right-6 xl:top-24 xl:w-56 xl:z-10">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-lg text-primary dark:text-secondary overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5">
          <h2 className="text-sm font-bold text-white tracking-wide text-center">🏆 Leaderboard</h2>
        </div>
        <div className="p-3">
          <div className="relative mb-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search player..."
              className="w-full text-xs px-2.5 py-1.5 pr-7 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-primary dark:text-secondary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm leading-none">
                ×
              </button>
            )}
          </div>

          {displayed.length === 0 ? (
            <p className="text-xs text-center text-gray-400 py-2">
              {search ? "No players found" : "No scores yet"}
            </p>
          ) : (
            <ol className="space-y-1">
              {displayed.map((u) => (
                <li
                  key={u.id}
                  className={`flex justify-between items-center px-2 py-1.5 rounded-lg text-xs transition-colors ${
                    u.isCurrentUser
                      ? "bg-yellow-400/20 border border-yellow-400/40 font-semibold"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`shrink-0 w-4 font-bold ${rankColor[u.rank] ?? "text-gray-500"}`}>
                      {u.rank}
                    </span>
                    <a
                      href={`https://twitter.com/${u.twitterHandle.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:underline">
                      {u.twitterHandle}
                    </a>
                  </span>
                  <span className="shrink-0 ml-2 font-semibold text-blue-500">{u.totalPoints}</span>
                </li>
              ))}
            </ol>
          )}

          {!isSearching && (
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((p) => p - 1)}
                className="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                ← Prev
              </button>
              <span className="text-xs text-gray-400">Page {pageIndex + 1}</span>
              <button
                disabled={!hasNext}
                onClick={() => setPageIndex((p) => p + 1)}
                className="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
