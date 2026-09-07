'use client';

import {
  useState,
} from 'react';

const WEB3_LOGIN_ENABLED =
  false;

export default function Web3LoginButton() {
  const [
    message,
    setMessage,
  ] = useState('');

  function handleUnavailable():
    void {
    setMessage(
      'Web3 Wallet Login inaandaliwa kwa uthibitishaji salama wa wallet. Kwa sasa tumia Email na Password.'
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={
          handleUnavailable
        }
        disabled={
          WEB3_LOGIN_ENABLED
        }
        aria-describedby="web3-login-status"
        className="rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Ingia na Web3 Wallet
      </button>

      {message && (
        <p
          id="web3-login-status"
          role="status"
          aria-live="polite"
          className="mt-3 max-w-md text-sm text-amber-300"
        >
          {message}
        </p>
      )}
    </div>
  );
}