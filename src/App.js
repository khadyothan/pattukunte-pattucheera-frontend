import React from "react";
import "./styles/App.css";
import Home from "./pages/Home";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TimeTravel from "./pages/TimeTravel";
import Banner from "./components/banner";
import { missingMovies } from "./utils/constants";
import { useAuth } from "./hooks/useAuth";

const fabBtn = {
  // border-radius: 50%;
  backgroundImage: `url(
    https://d2t2f7d530jwgo.cloudfront.net/bm.gif
  )`,
  backgroundPosition: "-12px",
  cursor: "pointer"
  // width: 90px;
  // height: 90px;
  // position: sticky;
  // left: 80%;
  // top: 80%;
};

const App = () => {
  const [moviesList, setMoviesList] = React.useState([]);
  const [theme, setTheme] = React.useState(
    localStorage.getItem("theme") ? localStorage.getItem("theme") : "dark"
  );
  const [showUploadIcon, setShowUploadIcon] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const { user, signOut } = useAuth();
  React.useEffect(() => {
    if (!localStorage.getItem("theme")) {
      localStorage.setItem("theme", "dark");
      document.querySelector("html").classList.add("dark");
    } else {
      if (
        localStorage.getItem("theme") === "dark" ||
        (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ) {
        document.querySelector("html").classList.add(localStorage.getItem("theme"));
      }
    }
    fetch(`${process.env.REACT_APP_S3}/movies.json`)
      .then((response) => response.json())
      .then((movies) => {
        const moviesSet = new Set(movies);
        missingMovies.forEach((mv) => {
          if (!moviesSet.has(mv)) {
            movies.push(mv);
          }
        });
        setMoviesList(movies);
      })
      .catch((error) => console.log(error));
  }, []);

  return (
    <>
      <div id="content" className="relative bg-secondary dark:bg-primary pb-3">
        <div className="fixed left-3/4 md:left-90 top-85 w-20 h-20 rounded-full">
          {showUploadIcon && (
            <>
              <a
                className="absolute bottom-24 right-3"
                href={process.env.REACT_APP_FormsLink}
                target="__blank">
                <i className="fas fa-upload bg-green-500 px-3 py-2 rounded-full text-xl text-secondary dark:text-primary"></i>
              </a>

              <p className="text-primary dark:text-secondary font-semibold absolute bottom-36 right-[-0.15rem] text-xs text-center bg-transparentBg px-2 py-1 rounded">
                upload movies
              </p>
            </>
          )}
          {/* <i
            className="fas fa-plus-circle text-5xl text-red-500 cursor-pointer"
            onClick={() => {
              setShowUploadIcon(!showUploadIcon);
            }}></i> */}
          <div
            onClick={() => {
              setShowUploadIcon(!showUploadIcon);
              window.gtag("event", "UploadClicked", { event_category: "game-stats" });
            }}
            className="w-full h-full rounded-full"
            style={fabBtn}></div>
        </div>
        {theme === "dark" && (
          <button
            onClick={() => {
              localStorage.setItem("theme", "light");
              setTheme("light");
              document.querySelector("html").classList.remove("dark");
            }}
            alt="stats"
            className="bg-transparent material-symbols-outlined absolute text-gray-500 z-1 top-[2.5%] right-[2%]">
            light_mode
          </button>
        )}
        {theme === "light" && (
          <button
            onClick={() => {
              localStorage.setItem("theme", "dark");
              setTheme("dark");
              document.querySelector("html").classList.add("dark");
            }}
            alt="stats"
            className="bg-transparent material-symbols-outlined absolute text-gray-500 z-1 top-[2.5%] right-[2%]">
            dark_mode
          </button>
        )}
        {user && (
          <>
            {showProfileMenu && (
              <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
            )}
            <div className="absolute top-[2%] right-[8%] z-20">
              <button onClick={() => setShowProfileMenu((prev) => !prev)}>
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-9 h-9 rounded-full border-2 border-gray-400"
                />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-44 rounded border border-gray-300 dark:border-gray-600 bg-slate-200 dark:bg-primary shadow-lg">
                  <div className="px-4 py-3 border-b border-gray-300 dark:border-gray-600">
                    <p className="text-sm font-medium text-primary dark:text-secondary truncate">
                      {user.displayName}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span className="material-symbols-outlined text-base">logout</span>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        {process.env.REACT_APP_BANNER && <Banner />}
        <BrowserRouter>
          <Routes>
            <Route exact path="/timetravel" element={<TimeTravel moviesList={moviesList} />} />
            <Route path="/*" element={<Home moviesList={moviesList} />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  );
};

export default App;
