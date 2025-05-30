import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DataInputForm } from './DataInputForm';
import { BarcodePreview } from './BarcodePreview';
import { type AamvaData, type FormDataType, EyeColor, Sex, USState, Truncation, ComplianceType } from '../types';
import { formatAamvaDataString } from '../services/aamvaFormatter';
import { generatePdf417Barcode } from '../services/barcodeService';
import { DownloadIcon, ProcessingIcon, InfoIcon, LogoutIcon, UserCircleIcon, CreditCardIcon } from './Icons';
import { STATE_IIN_MAP } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import CreditBalance from './CreditBalance';
import ReplenishCreditModal from './ReplenishCreditModal';

const initialSelectedState = USState.GA;
const initialIIN = STATE_IIN_MAP[initialSelectedState] || '';

const initialFormData: FormDataType = {
  issuerIdNumber: initialIIN, aamvaVersion: '09', jurisdictionVersion: '01', numberOfEntries: '01',
  subfileDesignator: 'DL',
  DCS: 'WEAVER', DAC: 'JESSICA', DAD: 'LOUISE', DBB: '1982-07-09', DBC: Sex.FEMALE, DAY: EyeColor.GRN,
  DAG: '14023 TRIBUTARY LN', DAH: '', DAI: 'VILLA RICA', DAJ: initialSelectedState, DAK: '301804199', DCG: 'USA',
  DAQ: '061651368', DBD: '2019-09-28', DBA: '2027-07-09', DCA: 'C', DCB: 'B', DCD: 'NONE', DCF: '394647701140030775',
  heightFeet: '5', heightInches: '9', DAW: '170',
  DDE: Truncation.UNKNOWN, DDF: Truncation.UNKNOWN, DDG: Truncation.UNKNOWN, DDA: ComplianceType.F, DDB: '2019-01-02',
  DCK: '10000576974', DDK: '1',
  pdf417ErrorCorrectionLevel: '5', pdf417Columns: '10',
};

const BARCODE_GENERATION_COST = 5;

const MainAppLayout: React.FC = () => {
  const { currentUser, logout, deductCredits, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState<FormDataType>(initialFormData);
  const [barcodeImageSrc, setBarcodeImageSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isReplenishModalOpen, setIsReplenishModalOpen] = useState<boolean>(false);
  
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');
  const [isMapsScriptLoading, setIsMapsScriptLoading] = useState<boolean>(false);
  const [isMapsScriptLoaded, setIsMapsScriptLoaded] = useState<boolean>(false);
  const [mapsScriptError, setMapsScriptError] = useState<string | null>(null);
  const mapsScriptLoadedRef = useRef(false);

  const canGenerateBarcode = currentUser ? currentUser.creditBalance >= BARCODE_GENERATION_COST : false;

  const loadGoogleMapsScript = useCallback(() => {
    if (!googleMapsApiKey) {
      setMapsScriptError('Please enter a Google Maps API Key.');
      return;
    }
    if (mapsScriptLoadedRef.current || window.google?.maps?.places) {
      setIsMapsScriptLoaded(true); setMapsScriptError(null); return;
    }
    setIsMapsScriptLoading(true); setMapsScriptError(null);
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`;
    script.async = true; script.defer = true;
    script.onload = () => {
      setIsMapsScriptLoading(false); setIsMapsScriptLoaded(true); mapsScriptLoadedRef.current = true; setMapsScriptError(null);
      if (!window.google?.maps?.places) {
        setMapsScriptError('Google Maps Places library failed to initialize.'); setIsMapsScriptLoaded(false); mapsScriptLoadedRef.current = false;
      }
    };
    script.onerror = () => {
      setIsMapsScriptLoading(false); setIsMapsScriptLoaded(false); mapsScriptLoadedRef.current = false;
      setMapsScriptError('Failed to load Google Maps script. Check API key and network.');
    };
    document.head.appendChild(script);
  }, [googleMapsApiKey]);

  const handleSubmit = useCallback(async () => {
    if (!currentUser) {
      setError("User not authenticated.");
      return;
    }
    if (currentUser.creditBalance < BARCODE_GENERATION_COST) {
      setError(`Insufficient credits. Cost is $${BARCODE_GENERATION_COST.toFixed(2)}. Please add credits.`);
      setIsReplenishModalOpen(true);
      return;
    }

    const confirmGeneration = window.confirm(`Generating this barcode will cost $${BARCODE_GENERATION_COST.toFixed(2)}. Proceed?`);
    if (!confirmGeneration) return;

    setIsGenerating(true); setError(null); setBarcodeImageSrc(null);

    try {
      await deductCredits(BARCODE_GENERATION_COST);

      const heightInTotalInches = (parseInt(formData.heightFeet, 10) * 12) + parseInt(formData.heightInches, 10);
      if (isNaN(heightInTotalInches) || heightInTotalInches <=0) throw new Error("Invalid height.");
      if (!formData.issuerIdNumber) throw new Error("Issuer ID Number (IIN) is missing.");

      const aamvaInputData: AamvaData = { /* ... (mapping formData to AamvaData as before) ... */ 
        issuerIdNumber: formData.issuerIdNumber, aamvaVersion: formData.aamvaVersion, jurisdictionVersion: formData.jurisdictionVersion, numberOfEntries: formData.numberOfEntries,
        subfileDesignator: formData.subfileDesignator, DCS: formData.DCS, DAC: formData.DAC, DAD: formData.DAD, DBB: formData.DBB, DBC: formData.DBC, DAY: formData.DAY,
        DAG: formData.DAG, DAH: formData.DAH, DAI: formData.DAI, DAJ: formData.DAJ, DAK: formData.DAK, DCG: formData.DCG, DAQ: formData.DAQ, DBD: formData.DBD,
        DBA: formData.DBA, DCA: formData.DCA, DCB: formData.DCB, DCD: formData.DCD, DCF: formData.DCF, DAU: heightInTotalInches.toString().padStart(3, '0'),
        DAW: formData.DAW, DDE: formData.DDE, DDF: formData.DDF, DDG: formData.DDG, DDA: formData.DDA, DDB: formData.DDB, DCK: formData.DCK, DDK: formData.DDK,
      };
      
      const aamvaString = formatAamvaDataString(aamvaInputData);
      const pngDataUrl = await generatePdf417Barcode(
        aamvaString, parseInt(formData.pdf417ErrorCorrectionLevel, 10), parseInt(formData.pdf417Columns, 10)
      );
      setBarcodeImageSrc(pngDataUrl);
    } catch (err) {
      console.error("Error generating barcode:", err);
      setError(err instanceof Error ? err.message : String(err));
      // Note: Credits already deducted. In real app, consider rollback or more complex transaction logic.
    } finally {
      setIsGenerating(false);
    }
  }, [formData, currentUser, deductCredits]);

  const handleDownload = useCallback(async () => { /* ... (same as before) ... */ 
    if (!barcodeImageSrc) return;
    try {
      const response = await fetch(barcodeImageSrc);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `aamva_barcode_${formData.DAQ || 'generated'}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("Error preparing download:", downloadError);
      setError("Failed to prepare image for download.");
    }
  }, [barcodeImageSrc, formData.DAQ]);

  if (!currentUser) {
    return <div className="p-8 text-center">Loading user data or redirecting...</div>;
  }

  return (
    <>
      <header className="text-center py-6 px-4 sm:px-6 lg:px-8 sticky top-0 bg-slate-900/80 backdrop-blur-md z-50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-left">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-500">
                AAMVA PDF417 Generator
                </h1>
                <p className="text-slate-300 text-sm sm:text-base">
                    Welcome, <UserCircleIcon className="w-4 h-4 inline-block mr-1" /> {currentUser.username}!
                </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                <CreditBalance balance={currentUser.creditBalance} onAddCredits={() => setIsReplenishModalOpen(true)} />
                <button
                onClick={logout}
                className="flex items-center px-4 py-2 text-sm font-medium text-slate-300 hover:text-sky-400 bg-slate-700 hover:bg-slate-600 rounded-md shadow-sm transition-colors"
                title="Logout"
                >
                <LogoutIcon className="w-5 h-5 mr-2 sm:mr-0" />
                <span className="sm:hidden">Logout</span>
                </button>
            </div>
        </div>
      </header>
      
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="container mx-auto max-w-7xl mb-8 p-6 bg-slate-800 shadow-xl rounded-xl ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-sky-400 mb-3">Address Autocomplete (Optional)</h2>
          {/* ... (Google Maps API Key input and button as before) ... */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex-grow">
              <label htmlFor="googleMapsApiKey" className="block text-sm font-medium text-slate-300 mb-1">
                Google Maps API Key (Places API enabled)
              </label>
              <input
                type="password" id="googleMapsApiKey" value={googleMapsApiKey} onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                placeholder="Enter your Google Maps API Key"
                className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm text-slate-100 bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder-slate-500"
                disabled={isMapsScriptLoaded || isMapsScriptLoading}
              />
            </div>
            <button
              onClick={loadGoogleMapsScript}
              disabled={isMapsScriptLoading || isMapsScriptLoaded || !googleMapsApiKey}
              className="w-full sm:w-auto px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-md shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMapsScriptLoading ? 'Loading...' : (isMapsScriptLoaded ? 'Autocomplete Enabled' : 'Enable Autocomplete')}
            </button>
          </div>
          {mapsScriptError && <p className="text-red-400 text-sm mt-2">{mapsScriptError}</p>}
          {!mapsScriptError && isMapsScriptLoaded && <p className="text-green-400 text-sm mt-2">Google Places Autocomplete is active.</p>}
          <p className="text-xs text-slate-400 mt-2">
            <InfoIcon className="w-3 h-3 inline mr-1" />
            Provide your own Google Maps API key (Places API enabled) for address autocomplete. Used client-side only.
          </p>
        </div>

        <div className="container mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-800 shadow-2xl rounded-xl p-6 ring-1 ring-white/10">
            <DataInputForm 
              formData={formData} 
              setFormData={setFormData} 
              onSubmit={handleSubmit} 
              isGenerating={isGenerating || authLoading}
              isMapsScriptLoaded={isMapsScriptLoaded}
              canGenerate={canGenerateBarcode}
              generationCost={BARCODE_GENERATION_COST}
              onPromptAddCredits={() => setIsReplenishModalOpen(true)}
            />
          </div>
          
          <div className="bg-slate-800 shadow-2xl rounded-xl p-6 ring-1 ring-white/10 flex flex-col items-center justify-center">
            <BarcodePreview barcodeImageSrc={barcodeImageSrc} error={error} isLoading={isGenerating} />
            {barcodeImageSrc && !isGenerating && (
              <button
                onClick={handleDownload}
                className="mt-6 flex items-center justify-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75"
              >
                <DownloadIcon className="w-5 h-5 mr-2" />
                Download PNG
              </button>
            )}
            {isGenerating && (
              <div className="mt-6 flex items-center text-sky-400">
                  <ProcessingIcon className="w-5 h-5 mr-2 animate-spin" />
                  Generating barcode...
              </div>
            )}
            {error && !isGenerating && (
                 <p className="mt-4 text-sm text-red-400 text-center">{error}</p>
            )}
          </div>
        </div>
        <footer className="text-center text-slate-400 mt-12 py-4 border-t border-slate-700">
          <p>&copy; {new Date().getFullYear()} AAMVA Barcode Tool. For demonstration and simulation purposes only.</p>
          <p className="text-sm">Ensure data complies with AAMVA standards. Credits are simulated.</p>
        </footer>
      </main>
      {isReplenishModalOpen && (
        <ReplenishCreditModal 
          onClose={() => setIsReplenishModalOpen(false)} 
        />
      )}
    </>
  );
};

export default MainAppLayout;
