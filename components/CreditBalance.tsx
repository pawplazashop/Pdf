import React from 'react';
import { CreditCardIcon } from './Icons'; // Assuming CreditCardIcon is available

interface CreditBalanceProps {
  balance: number;
  onAddCredits: () => void;
}

const CreditBalance: React.FC<CreditBalanceProps> = ({ balance, onAddCredits }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-2 bg-slate-700/50 rounded-lg shadow">
      <div className="text-center sm:text-left">
        <p className="text-xs text-slate-400">Credit Balance</p>
        <p className="text-lg font-semibold text-green-400">
          ${balance.toFixed(2)}
        </p>
      </div>
      <button
        onClick={onAddCredits}
        className="flex items-center px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white text-xs sm:text-sm font-semibold rounded-md shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-teal-400"
        title="Add Credits"
      >
        <CreditCardIcon className="w-4 h-4 mr-1.5" />
        Add Credits
      </button>
    </div>
  );
};

export default CreditBalance;
