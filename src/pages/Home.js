import React, { useCallback } from "react";
import "../styles/App.css";
import PropTypes from "prop-types";
import {
  GAME_STATUS,
  getDayCount,
  intialGuessDistribution,
  isProduction,
  MAX_ATTEMPTS
} from "../utils/constants";

import Game from "../components/Game";
import Stats from "../components/Stats";
import ImagesContainer from "../components/ImagesContainer";
import RulesModal from "../components/RulesModal";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";
import Leaderboard from "../components/Leaderboard";

const initialStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayedDay: null,
  guessDistribution: intialGuessDistribution
};

const Home = ({ timeTravelDate, moviesList }) => {
  const { user } = useAuth();
  const day = timeTravelDate >= 0 ? timeTravelDate : getDayCount();

  const [buttonLogic, setButtonLogic] = React.useState(false);
  const [currentIndexFromStorage, setCurrentIndexFromStorage] = React.useState(1);
  const [currentIndexFromButton, setCurrentIndexFromButton] = React.useState(1);
  const [currentGuesses, setCurrentGuesses] = React.useState("");
  const [gameStatus, setGameStatus] = React.useState(GAME_STATUS.RUNNING);
  const [openStatsModal, setOpenStatsModal] = React.useState(false);
  const [openRulesModal, setOpenRulesModal] = React.useState(false);
  const [movie, setMovie] = React.useState("");
  const [contributor, setContributor] = React.useState("");
  const [contributorTwitterId, setContributorTwitterId] = React.useState("");
  const [shareText, setShareText] = React.useState("SHARE");
  const [firestoreStats, setFirestoreStats] = React.useState(null);

  // Live stats listener — updates Stats modal in real time after each guess
  React.useEffect(() => {
    if (!user) {
      setFirestoreStats(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setFirestoreStats(snap.data().stats ?? initialStats);
    });
    return unsub;
  }, [user]);

  // Load today's play state from Firestore when user signs in
  React.useEffect(() => {
    if (!user) {
      setCurrentIndexFromStorage(1);
      setCurrentIndexFromButton(1);
      setCurrentGuesses("");
      setGameStatus(GAME_STATUS.RUNNING);
      return;
    }
    getDoc(doc(db, "users", user.uid, "plays", String(day)))
      .then((snap) => {
        if (!snap.exists()) return;
        const { guesses = [], result } = snap.data();
        if (result === "won") {
          setCurrentIndexFromStorage(guesses.length);
          setCurrentIndexFromButton(guesses.length);
          setCurrentGuesses(guesses.slice(0, -1).join(","));
          setGameStatus(GAME_STATUS.COMPLETED);
        } else if (result === "lost") {
          setCurrentIndexFromStorage(MAX_ATTEMPTS);
          setCurrentIndexFromButton(MAX_ATTEMPTS);
          setCurrentGuesses(guesses.join(","));
          setGameStatus(GAME_STATUS.FAILED);
        } else {
          setCurrentIndexFromStorage(guesses.length + 1);
          setCurrentIndexFromButton(guesses.length + 1);
          setCurrentGuesses(guesses.join(","));
        }
      })
      .catch(console.error);
  }, [user, day]);

  // Fetch movie metadata from S3 (still client-side until Cloud Functions are ready)
  React.useEffect(() => {
    fetch(`${process.env.REACT_APP_CDN_URL}${isProduction() ? "/" + day : ""}/meta-data.json`)
      .then((r) => r.json())
      .then((json) => {
        setMovie(json.movie);
        setContributor(json.contributor);
        setContributorTwitterId(json.twitterId);
      })
      .catch(console.error);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      window.gtag("event", "playingUsingPWA", { event_category: "pwaInstall" });
      if (localStorage.getItem("pwaInstall") == null) {
        localStorage.setItem("pwaInstall", "installed");
        window.gtag("event", "pwaInstall", { event_category: "pwaInstall" });
      }
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") window.location.reload();
      });
    }
  }, [day]);

  const navigate = useNavigate();
  const gotoArchives = useCallback(() => navigate("/timetravel", { replace: true }), [navigate]);

  const stats = firestoreStats ?? initialStats;
  const guessDistribution = JSON.stringify(stats.guessDistribution ?? intialGuessDistribution);

  return (
    <div className="bg-secondary dark:bg-primary min-h-screen h-auto pb-6 overflow-scroll">
      <h1 className="text-3xl font-semibold text-center p-4 text-primary dark:text-secondary mx-24">
        Pattukunte Pattucheera
      </h1>
      <div className="flex justify-center mb-3 mx-2">
        <div className="flex flex-col items-center justify-center w-fit mx-2">
          <button
            onClick={() => setOpenStatsModal(true)}
            alt="stats"
            className="material-symbols-outlined text-3xl border-2 rounded px-2 py-1 border-primary-800 text-red-400">
            equalizer
          </button>
          <span className="w-fit text-sm mt-2 dark:text-secondary">Stats</span>
        </div>
        <div className="flex flex-col items-center justify-center w-fit mx-2">
          <button
            onClick={gotoArchives}
            className="material-symbols-outlined text-3xl border-2 rounded px-2 py-1 border-primary-800 text-green-500">
            update
          </button>
          <span className="w-fit text-sm mt-2 dark:text-secondary">Time Travel</span>
        </div>
        <div className="flex flex-col items-center justify-center w-fit mx-2">
          <button
            onClick={() => setOpenRulesModal(true)}
            className="material-symbols-outlined text-3xl border-2 rounded px-2 py-1 border-primary-800 text-blue-400">
            help
          </button>
          <span className="w-fit text-sm mt-2 dark:text-secondary">Instructions</span>
        </div>
      </div>
      <Stats
        shareText={shareText}
        setShareText={setShareText}
        currentIndex={currentIndexFromStorage}
        gameStatus={gameStatus}
        dayCount={day}
        isTimeTravelled={false}
        openStatsModal={openStatsModal}
        setOpenStatsModal={setOpenStatsModal}
        statsObj={stats}
        guessData={stats.guessDistribution ?? intialGuessDistribution}
      />
      <RulesModal openRulesModal={openRulesModal} setOpenRulesModal={setOpenRulesModal} />
      <div>
        <ImagesContainer
          buttonLogic={buttonLogic}
          setButtonLogic={setButtonLogic}
          currentIndexFromButton={currentIndexFromButton}
          currentIndexFromStorage={currentIndexFromStorage}
          setCurrentIndexFromButton={setCurrentIndexFromButton}
          gameStatus={gameStatus}
          dayCount={day}
        />
        <Game
          currentIndex={currentIndexFromStorage}
          setCurrentIndex={setCurrentIndexFromStorage}
          currentIndexFromButton={currentIndexFromButton}
          setCurrentIndexFromButton={setCurrentIndexFromButton}
          guessDistribution={guessDistribution}
          setGuessDistribution={() => {}}
          currentGuesses={currentGuesses}
          setCurrentGuesses={setCurrentGuesses}
          gameStatus={gameStatus}
          setGameStatus={setGameStatus}
          day={day}
          setDay={() => {}}
          setStats={() => {}}
          stats={JSON.stringify(stats)}
          gameStats={stats}
          movie={movie}
          setOpenStatsModal={setOpenStatsModal}
          contributor={contributor}
          contributorTwitterId={contributorTwitterId}
          shareText={shareText}
          setShareText={setShareText}
          lastPlayedGame={stats.lastPlayedDay}
          setLastPlayedGame={() => {}}
          moviesList={moviesList}
        />
      </div>
      <Leaderboard />
    </div>
  );
};

Home.propTypes = {
  timeTravelDate: PropTypes.number,
  moviesList: PropTypes.array
};

export default Home;
