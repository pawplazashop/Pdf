import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CreditCardIcon, ProcessingIcon } from './Icons';

interface ReplenishCreditModalProps {
  onClose: () => void;
}

const MIN_DEPOSIT = 10;
const BONUS_THRESHOLD = 20;
const BONUS_PERCENTAGE = 0.05; // 5%

const ReplenishCreditModal: React.FC<ReplenishCreditModalProps> = ({ onClose }) => {
  const [amount, setAmount] = useState<string>(MIN_DEPOSIT.toString());
  const [customAmountError, setCustomAmountError] = useState<string | null>(null);
  const { addCredits, loading, error: authError, clearError } = useAuth();

  useEffect(() => {
    // Clear auth errors when modal opens or amount changes
    clearError();
  }, [clearError, amount]);


  const numericAmount = parseFloat(amount);
  const isValidAmount = !isNaN(numericAmount) && numericAmount >= MIN_DEPOSIT;

  const { finalCredit, bonusApplied } = useMemo(() => {
    if (!isValidAmount) return { finalCredit: 0, bonusApplied: false };
    let calculatedCredit = numericAmount;
    let appliedBonus = false;
    if (numericAmount >= BONUS_THRESHOLD) {
      calculatedCredit = numericAmount * (1 + BONUS_PERCENTAGE);
      appliedBonus = true;
    }
    return { finalCredit: calculatedCredit, bonusApplied: appliedBonus };
  }, [numericAmount, isValidAmount]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmount(val);
    const numVal = parseFloat(val);
    if (val === "") {
      setCustomAmountError(null);
    } else if (isNaN(numVal) || numVal <= 0) {
      setCustomAmountError("Please enter a valid positive number.");
    } else if (numVal < MIN_DEPOSIT) {
      setCustomAmountError(`Minimum deposit is $${MIN_DEPOSIT.toFixed(2)}.`);
    } else {
      setCustomAmountError(null);
    }
  };
  
  const presetAmounts = [10, 20, 50, 100];

  const handlePresetClick = (preset: number) => {
    setAmount(preset.toString());
    setCustomAmountError(null); // Clear error if preset is clicked
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAmount || customAmountError) {
      // This should ideally be caught by button disable, but as a fallback:
      if (!customAmountError) setCustomAmountError(`Minimum deposit is $${MIN_DEPOSIT.toFixed(2)}.`);
      return;
    }
    try {
      await addCredits(numericAmount);
      if (!authError && !loading) { // Check if addCredits was successful without setting an authError
         onClose(); // Close modal on successful replenishment
      }
    } catch (submitError) {
      // Error is handled by authContext and displayed via authError
      console.error("Replenishment submission error:", submitError);
    }
  };
  
  // Close modal if Escape key is pressed
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);


  return (
    <div 
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
        onClick={onClose} // Close if backdrop is clicked
        role="dialog"
        aria-modal="true"
        aria-labelledby="replenish-modal-title"
    >
      <div 
        className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg ring-1 ring-white/10 transform transition-all"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal content
      >
        <div className="flex justify-between items-center mb-6">
            <h2 id="replenish-modal-title" className="text-2xl font-semibold text-sky-400 flex items-center">
                <CreditCardIcon className="w-7 h-7 mr-3 text-teal-400" />
                Replenish Credits
            </h2>
            <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-200 transition-colors text-2xl leading-none"
                aria-label="Close"
            >
                &times;
            </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="depositAmount" className="block text-sm font-medium text-slate-300 mb-1">
              Deposit Amount ($)
            </label>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {presetAmounts.map(pa => (
                    <button 
                        key={pa} 
                        type="button"
                        onClick={() => handlePresetClick(pa)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors border-2
                                    ${numericAmount === pa && !customAmountError ? 'bg-teal-500 border-teal-400 text-white' : 'bg-slate-700 border-slate-600 hover:border-teal-500 text-slate-200'}`}
                    >
                        ${pa}
                    </button>
                ))}
            </div>
            <input
              type="number"
              id="depositAmount"
              value={amount}
              onChange={handleAmountChange}
              min={MIN_DEPOSIT.toString()}
              step="0.01"
              className="w-full px-4 py-2 border border-slate-600 rounded-md shadow-sm text-slate-100 bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder-slate-500"
              required
              aria-describedby={customAmountError || authError ? "deposit-error" : "deposit-info"}
            />
            {(customAmountError || authError) && (
                <p id="deposit-error" className="text-red-400 text-sm mt-2" role="alert">
                    {customAmountError || authError}
                </p>
            )}
          </div>

          {isValidAmount && !customAmountError && (
            <div id="deposit-info" className="p-3 bg-slate-700/50 rounded-md text-sm">
              <p className="text-slate-300">
                You will receive: <span className="font-semibold text-green-400">${finalCredit.toFixed(2)}</span>
              </p>
              {bonusApplied && (
                <p className="text-teal-400 text-xs">
                  Includes a 5% bonus for depositing ${BONUS_THRESHOLD.toFixed(2)} or more!
                </p>
              )}
               <p className="text-slate-400 text-xs mt-1">
                  Minimum deposit is ${MIN_DEPOSIT.toFixed(2)}.
                </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isValidAmount || !!customAmountError}
            className="w-full flex items-center justify-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <ProcessingIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Processing...
              </>
            ) : (
              `Deposit $${numericAmount > 0 && !isNaN(numericAmount) ? numericAmount.toFixed(2) : '0.00'}`
            )}
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-6 text-center">
            This is a simulated credit system. No real payment is processed.
        </p>
      </div>
    </div>
  );
};

export default ReplenishCreditModal;
