import Modal from "react-modal";
import React from "react";
import PropTypes from "prop-types";
import twitterIcon from "../assets/twitter.png";

const SignInModal = ({ isOpen, onClose, onSignIn }) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSignIn();
      onClose();
    } catch (err) {
      console.error("Sign in error:", err.code, err.message);
      setError(`Sign in failed: ${err.code || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      ariaHideApp={false}
      className="w-90 md:w-1/3 lg:w-1/4 border-2 dark:border-primary border-gray-300/50 rounded bg-slate-200 dark:bg-primary text-primary dark:text-secondary p-5 text-xl"
      style={{
        content: {
          position: "absolute",
          top: "50%",
          right: "50%",
          transform: "translate(50%,-50%)"
        }
      }}>
      <div className="flex mb-4">
        <h3 className="text-2xl w-11/12">Sign in to play</h3>
        <button onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <p className="text-sm mb-6 text-gray-500 dark:text-gray-400">
        Sign in with Twitter to submit your guess and track your streak.
      </p>
      <button
        onClick={handleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1DA1F2] hover:bg-[#1a91da] rounded text-white text-base font-medium disabled:opacity-50">
        <img src={twitterIcon} alt="Twitter" className="w-5 h-5" />
        {loading ? "Signing in..." : "Sign in with Twitter"}
      </button>
      {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
    </Modal>
  );
};

SignInModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onSignIn: PropTypes.func
};

export default SignInModal;
