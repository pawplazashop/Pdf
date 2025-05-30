import React, { useEffect, useRef } from 'react';
import { type FormDataType, type AamvaFieldDescription, USState } from '../types';
import { AAMVA_FIELD_DEFINITIONS, FIELD_GROUPS, STATE_IIN_MAP } from '../constants';
import { InputField } from './InputField';
import { SelectField } from './SelectField';
import { Section } from './Section';
import { GenerateIcon, CreditCardIcon } from './Icons';

// Helper to find USState enum key by value (abbreviation)
const findStateKeyByValue = (value: string): USState | undefined => {
  return Object.values(USState).find(v => v === value.toUpperCase()) as USState | undefined;
};


interface DataInputFormProps {
  formData: FormDataType;
  setFormData: React.Dispatch<React.SetStateAction<FormDataType>>;
  onSubmit: () => void;
  isGenerating: boolean;
  isMapsScriptLoaded: boolean;
  canGenerate: boolean; // New prop
  generationCost: number; // New prop
  onPromptAddCredits: () => void; // New prop
}

export const DataInputForm: React.FC<DataInputFormProps> = ({ 
    formData, setFormData, onSubmit, isGenerating, isMapsScriptLoaded,
    canGenerate, generationCost, onPromptAddCredits
}) => {
  const streetInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (isMapsScriptLoaded && streetInputRef.current && !autocompleteRef.current) {
      if (window.google?.maps?.places) {
        const autocomplete = new window.google.maps.places.Autocomplete(
          streetInputRef.current,
          { types: ['address'], componentRestrictions: { country: 'us' }, fields: ['address_components', 'formatted_address'] }
        );
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place?.address_components) {
            let streetNumber = '', route = '', city = '', state = '', postalCode = '', postalCodeSuffix = '';
            place.address_components.forEach(component => {
              const types = component.types;
              if (types.includes('street_number')) streetNumber = component.long_name;
              if (types.includes('route')) route = component.long_name;
              if (types.includes('locality') || types.includes('postal_town')) city = component.long_name;
              if (types.includes('administrative_area_level_1')) state = component.short_name;
              if (types.includes('postal_code')) postalCode = component.long_name;
              if (types.includes('postal_code_suffix')) postalCodeSuffix = component.long_name;
            });
            const fullStreetAddress = `${streetNumber} ${route}`.trim();
            const fullPostalCode = postalCodeSuffix ? `${postalCode}${postalCodeSuffix}` : postalCode;
            const foundState = findStateKeyByValue(state);
            setFormData(prev => ({
              ...prev, DAG: fullStreetAddress, DAI: city, 
              DAJ: foundState || prev.DAJ, DAK: fullPostalCode.replace(/-/g, ''),
            }));
            if (foundState && foundState !== formData.DAJ) {
               const newIIN = STATE_IIN_MAP[foundState] || '';
               setFormData(prev => ({...prev, issuerIdNumber: newIIN}));
            }
          }
        });
        autocompleteRef.current = autocomplete;
      } else {
        console.warn("Google Maps Places library not available.");
      }
    }
  }, [isMapsScriptLoaded, setFormData, formData.DAJ]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newValues = { ...prev, [name]: value };
      if (name === 'DAJ') {
        const selectedState = value as USState;
        const newIIN = STATE_IIN_MAP[selectedState] || '';
        newValues.issuerIdNumber = newIIN;
      }
      return newValues;
    });
  };

  const renderField = (fieldDef: AamvaFieldDescription) => {
    const key = fieldDef.id as keyof FormDataType;
    if (fieldDef.type === 'select' && fieldDef.options) {
      return (
        <SelectField key={fieldDef.id} id={fieldDef.id} label={fieldDef.label} value={formData[key] || ''}
          onChange={handleChange} options={fieldDef.options} tooltipText={fieldDef.tooltip} required={fieldDef.required}
        />
      );
    }
    return (
      <InputField key={fieldDef.id} id={fieldDef.id} label={fieldDef.label} type={fieldDef.type || 'text'}
        value={formData[key] === null || formData[key] === undefined ? '' : String(formData[key])}
        onChange={handleChange} placeholder={fieldDef.placeholder || ''} tooltipText={fieldDef.tooltip}
        required={fieldDef.required} maxLength={fieldDef.maxLength} pattern={fieldDef.pattern} readOnly={!!fieldDef.readOnly}
        inputRef={fieldDef.id === 'DAG' ? streetInputRef : undefined}
      />
    );
  };

  const isSubmitDisabled = isGenerating || !formData.issuerIdNumber || !canGenerate;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (canGenerate) onSubmit(); else onPromptAddCredits(); }} className="space-y-8">
      {FIELD_GROUPS.map(groupName => (
        <Section key={groupName} title={groupName}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {AAMVA_FIELD_DEFINITIONS
              .filter(field => field.group === groupName)
              .flatMap(fieldDef => { 
                const components = [renderField(fieldDef)];
                if (fieldDef.id === 'DAJ' && formData.DAJ && !formData.issuerIdNumber) {
                  components.push(
                    <div key={`${fieldDef.id}-warning`} className="md:col-span-2 text-xs text-amber-400 pt-1">
                      <p>IIN not found for {formData.DAJ}. Barcode generation disabled for this state.</p>
                    </div>
                  );
                }
                return components;
              })}
          </div>
        </Section>
      ))}
      
      <div className="mt-8 pt-6 border-t border-slate-700">
        {!canGenerate && !isGenerating && (
            <div className="mb-4 p-3 bg-amber-700/30 border border-amber-600 rounded-md text-center">
                <p className="text-amber-300 text-sm">
                    Insufficient credits. Barcode generation costs ${generationCost.toFixed(2)}.
                </p>
                <button 
                    type="button" 
                    onClick={onPromptAddCredits}
                    className="mt-2 inline-flex items-center px-4 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-md shadow-sm"
                >
                    <CreditCardIcon className="w-4 h-4 mr-2" /> Add Credits
                </button>
            </div>
        )}
        <button
          type="submit"
          disabled={isSubmitDisabled} 
          className={`w-full flex items-center justify-center px-6 py-3 font-semibold rounded-lg shadow-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed
            ${canGenerate ? 'bg-sky-500 hover:bg-sky-600 text-white focus:ring-sky-400' : 'bg-slate-600 text-slate-400 focus:ring-slate-500 cursor-not-allowed'}`}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            canGenerate ? (
                <>
                    <GenerateIcon className="w-5 h-5 mr-2" />
                    Generate Barcode (${generationCost.toFixed(2)})
                </>
            ) : (
                <>
                    <CreditCardIcon className="w-5 h-5 mr-2" />
                    Add Credits to Generate
                </>
            )
          )}
        </button>
         {formData.issuerIdNumber ? null : (
          <p className="text-xs text-amber-400 mt-2 text-center">
            Barcode generation is disabled because an Issuer ID Number (IIN) is not set. Please select a state with a configured IIN.
          </p>
        )}
      </div>
    </form>
  );
};
