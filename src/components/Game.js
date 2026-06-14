import AsyncSelect from "react-select/async";
import React, { useMemo } from "react";
import { GAME_STATUS, MAX_ATTEMPTS, GUESS_POINTS, isGameDone } from "../utils/constants";
import PropTypes from "prop-types";
import ShareResults from "./ShareResults";
import Results from "./Results";
import Fuse from "fuse.js";
import Confetti from "react-dom-confetti";
import SignInModal from "./SignInModal";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, setDoc, updateDoc, increment, Timestamp } from "firebase/firestore";

const config = {
  angle: "180",
  spread: 300,
  startVelocity: "30",
  elementCount: 70,
  dragFriction: 0.12,
  duration: "2000",
  stagger: "2",
  width: "10px",
  height: "10px",
  perspective: "900px",
  colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"]
};

const Game = ({
  currentIndex,
  setCurrentIndex,
  setCurrentIndexFromButton,
  currentGuesses,
  setCurrentGuesses,
  gameStatus,
  setGameStatus,
  setStats,
  gameStats,
  movie,
  guessDistribution,
  setGuessDistribution,
  day,
  setOpenStatsModal,
  contributor,
  timeTravelled,
  contributorTwitterId,
  shareText,
  setShareText,
  lastPlayedGame,
  setLastPlayedGame,
  moviesList
}) => {
  const [inputValue, setValue] = React.useState("");
  const [selectedValue, setSelectedValue] = React.useState(null);
  const [isShowConfetti, setIsShowConfetti] = React.useState(null);
  const [showSignInModal, setShowSignInModal] = React.useState(false);
  const [pendingGuess, setPendingGuess] = React.useState(null);
  const gameFinished = useMemo(() => isGameDone(gameStatus), [gameStatus]);
  const { user, signIn } = useAuth();
  const statsModalTimeOut = 2000;

  const handleInputChange = (value) => {
    setValue(value);
  };
  const fuzzyOptions = {
    isCaseSensitive: false
    // includeScore: false,
    // shouldSort: true,
    // includeMatches: false,
    // findAllMatches: false,
    // minMatchCharLength: 1,
    // location: 0,
    // threshold: 0.6,
    // distance: 100,
    // useExtendedSearch: false,
    // ignoreLocation: false,
    // ignoreFieldNorm: false,
    // fieldNormWeight: 1,
  };

  const fuse = new Fuse(moviesList, fuzzyOptions);

  const setAttemptsInLocalStorage = (attempts) => {
    let currentGuessDistribution = JSON.parse(guessDistribution);
    currentGuessDistribution[attempts.toString()]++;
    setGuessDistribution(JSON.stringify(currentGuessDistribution));
  };

  const submit = (value) => {
    if (!user) {
      setPendingGuess(value || selectedValue);
      setShowSignInModal(true);
      return;
    }

    const guessTitle = selectedValue?.title && !value ? selectedValue.title : value.title;
    const allGuesses = currentGuesses ? [...currentGuesses.split(","), guessTitle] : [guessTitle];
    const playRef = doc(db, "users", user.uid, "plays", String(day));
    const userRef = doc(db, "users", user.uid);

    if (guessTitle.trim().toLowerCase() === movie.trim().toLowerCase()) {
      setIsShowConfetti(true);
      window.gtag("event", "GameWon", { event_category: "game-stats" });
      setTimeout(() => setOpenStatsModal(true), statsModalTimeOut);
      setGameStatus(GAME_STATUS.COMPLETED);
      setAttemptsInLocalStorage(currentIndex);
      const newStreak = lastPlayedGame === day - 1 ? gameStats.currentStreak + 1 : 1;
      setStats(
        JSON.stringify({
          gamesPlayed: gameStats.gamesPlayed + 1,
          gamesWon: gameStats.gamesWon + 1,
          currentStreak: newStreak,
          maxStreak: Math.max(gameStats.maxStreak, newStreak)
        })
      );
      setLastPlayedGame(day);

      const wonPoints = GUESS_POINTS[currentIndex] ?? 0;
      setDoc(playRef, {
        attempts: currentIndex,
        guesses: allGuesses,
        result: "won",
        solvedAt: currentIndex,
        points: wonPoints,
        playedAt: Timestamp.now()
      }).catch(console.error);
      updateDoc(userRef, {
        "stats.gamesPlayed": increment(1),
        "stats.gamesWon": increment(1),
        "stats.currentStreak": newStreak,
        "stats.maxStreak": Math.max(gameStats.maxStreak, newStreak),
        "stats.lastPlayedDay": day,
        [`stats.guessDistribution.${currentIndex}`]: increment(1),
        totalPoints: increment(wonPoints)
      }).catch(console.error);
    } else if (currentIndex === MAX_ATTEMPTS) {
      window.gtag("event", "GameFailed", { event_category: "game-stats" });
      setGameStatus(GAME_STATUS.FAILED);
      setTimeout(() => setOpenStatsModal(true), statsModalTimeOut);
      if (currentGuesses !== "") {
        setCurrentGuesses(currentGuesses + "," + guessTitle);
      } else {
        setCurrentGuesses(guessTitle);
      }
      setStats(
        JSON.stringify({
          gamesPlayed: gameStats.gamesPlayed + 1,
          gamesWon: gameStats.gamesWon,
          maxStreak: gameStats.maxStreak,
          currentStreak: 0
        })
      );
      setLastPlayedGame(day);
      setSelectedValue(null);

      setDoc(playRef, {
        attempts: MAX_ATTEMPTS,
        guesses: allGuesses,
        result: "lost",
        solvedAt: null,
        points: 0,
        playedAt: Timestamp.now()
      }).catch(console.error);
      updateDoc(userRef, {
        "stats.gamesPlayed": increment(1),
        "stats.currentStreak": 0,
        "stats.lastPlayedDay": day
      }).catch(console.error);
    } else {
      setCurrentIndex(currentIndex + 1);
      setCurrentIndexFromButton(currentIndex + 1);
      if (currentGuesses !== "") {
        setCurrentGuesses(currentGuesses + "," + guessTitle);
      } else {
        setCurrentGuesses(guessTitle);
      }

      setDoc(playRef, {
        attempts: currentIndex,
        guesses: allGuesses,
        result: "in_progress",
        solvedAt: null,
        playedAt: Timestamp.now()
      }).catch(console.error);
    }
    setSelectedValue(null);
  };

  const handleSignIn = async () => {
    await signIn();
    if (pendingGuess) {
      submit(pendingGuess);
      setPendingGuess(null);
    }
  };

  const fetchData = async (inputValue) => {
    const vals = fuse.search(inputValue, { limit: 6 });
    return vals.map((val) => ({ title: val.item }));
  };
  // custom styles
  const customStylesForAsyncSelect = {
    menu: (provided) => {
      if (!inputValue.length) {
        return {
          ...provided,
          visibility: "hidden"
        };
      }
      return {
        ...provided,
        border: "1px solid gray"
      };
    }
  };
  const customStylesForAsyncSelectDark = {
    control: (provided) => {
      return {
        ...provided,
        border: "1px solid #3d3d3d",
        background: "#3d3d3d"
      };
    },
    menu: (provided) => {
      if (!inputValue.length) {
        return {
          ...provided,
          visibility: "hidden"
        };
      }
      return {
        ...provided,
        background: "#3d3d3d",
        color: "white"
      };
    },
    input: (provided) => {
      return {
        ...provided,
        color: "white"
      };
    },
    singleValue: (provided) => {
      return {
        ...provided,
        color: "white"
      };
    },
    menuList: (provided) => {
      return {
        ...provided,
        color: "#808080"
      };
    }
  };
  return (
    <>
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => {
          setShowSignInModal(false);
          setPendingGuess(null);
        }}
        onSignIn={handleSignIn}
      />
      {!gameFinished && (
        <div className="w-full">
          <div className="w-full flex justify-center mb-3">
            <button
              onClick={() => submit({ title: "Skipped" })}
              className="block w-fit px-3 py-1 border-red-600 bg-red-600 rounded text-secondary">
              Skip
            </button>
          </div>

          <div className="w-full flex justify-center items-center">
            <div className="min-w-68 md:min-w-33">
              <AsyncSelect
                placeholder="Enter a movie name"
                cacheOptions
                defaultValue={false}
                // className={
                //   !inputValue.length ? "hide-dropdown w-full text-primary" : "w-full text-primary"
                // }
                styles={
                  localStorage.getItem("theme") === "dark"
                    ? customStylesForAsyncSelectDark
                    : customStylesForAsyncSelect
                }
                value={selectedValue}
                getOptionLabel={(e) => e.title}
                getOptionValue={(e) => e.title}
                loadOptions={fetchData}
                onInputChange={handleInputChange}
                onChange={(value) => {
                  setSelectedValue(value);
                }}
              />
            </div>

            <div className="w-20">
              <button
                className="px-4 py-1.5 bg-blue-600 border-blue-600 rounded text-secondary ml-2"
                onClick={() => submit()}>
                submit
              </button>
            </div>
          </div>
        </div>
      )}
      <Results
        currentGuesses={currentGuesses}
        gameStatus={gameStatus}
        currentIndex={currentIndex}
        movie={movie}
        contributor={contributor}
        contributorTwitterId={contributorTwitterId}
        gameFinished={gameFinished}
      />
      <div
        className="flex justify-center"
        style={{
          position: "absolute",
          top: "55%",
          left: "50%"
        }}>
        <Confetti active={isShowConfetti} config={config} />
      </div>

      {gameFinished && (
        <ShareResults
          gameStatus={gameStatus}
          shareText={shareText}
          setShareText={setShareText}
          currentIndex={currentIndex}
          dayCount={day}
          isTimeTravelled={timeTravelled}
        />
      )}
    </>
  );
};

Game.propTypes = {
  currentIndex: PropTypes.number,
  setCurrentIndex: PropTypes.func,
  currentGuesses: PropTypes.string,
  setCurrentGuesses: PropTypes.func,
  gameStatus: PropTypes.string,
  setGameStatus: PropTypes.func,
  setStats: PropTypes.func,
  day: PropTypes.number,
  gameStats: PropTypes.object,
  setCurrentIndexFromButton: PropTypes.func,
  movie: PropTypes.string,
  guessDistribution: PropTypes.string,
  setGuessDistribution: PropTypes.func,
  setOpenStatsModal: PropTypes.func,
  contributor: PropTypes.string,
  timeTravelled: PropTypes.bool,
  contributorTwitterId: PropTypes.string,
  shareText: PropTypes.string,
  setShareText: PropTypes.func,
  lastPlayedGame: PropTypes.string,
  setLastPlayedGame: PropTypes.func,
  moviesList: PropTypes.array
};

export default Game;
