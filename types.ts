export enum USState {
  AL = "AL", AK = "AK", AS = "AS", AZ = "AZ", AR = "AR", CA = "CA", CO = "CO", CT = "CT", DE = "DE", DC = "DC", FL = "FL",
  GA = "GA", GU = "GU", HI = "HI", ID = "ID", IL = "IL", IN = "IN", IA = "IA", KS = "KS", KY = "KY", LA = "LA", ME = "ME",
  MD = "MD", MA = "MA", MI = "MI", MN = "MN", MS = "MS", MO = "MO", MP = "MP", MT = "MT", NE = "NE", NV = "NV", NH = "NH",
  NJ = "NJ", NM = "NM", NY = "NY", NC = "NC", ND = "ND", OH = "OH", OK = "OK", OR = "OR", PA = "PA", PR = "PR", RI = "RI",
  SC = "SC", SD = "SD", TN = "TN", TX = "TX", UT = "UT", VT = "VT", VA = "VA", VI = "VI", WA = "WA", WV = "WV", WI = "WI", WY = "WY"
}

export enum EyeColor {
  BLK = "BLK", BLU = "BLU", BRO = "BRO", GRY = "GRY", GRN = "GRN", HAZ = "HAZ", MAR = "MAR", PNK = "PNK", DIC = "DIC", MUL = "MUL", OTH="OTH"
}

export enum Sex {
  MALE = "1",
  FEMALE = "2",
  NOT_SPECIFIED = "9" 
}

export enum Truncation {
  NONE = "N",
  TRUNCATED = "T",
  UNKNOWN = "U"
}

export enum ComplianceType {
  F = "F", 
  N = "N"  
}

export interface AamvaData {
  issuerIdNumber: string;
  aamvaVersion: string;
  jurisdictionVersion: string;
  numberOfEntries: string; 
  subfileDesignator: string; 
  DCS: string; 
  DAC: string; 
  DAD?: string; 
  DBB: string; 
  DBC: Sex;    
  DAY?: EyeColor; 
  DAG: string; 
  DAH?: string; 
  DAI: string; 
  DAJ: USState; 
  DAK: string; 
  DCG?: string; 
  DAQ: string; 
  DBD: string; 
  DBA: string; 
  DCA?: string; 
  DCB?: string; 
  DCD?: string; 
  DCF?: string; 
  DAU: string; 
  DAW?: string; 
  DDE?: Truncation; 
  DDF?: Truncation; 
  DDG?: Truncation; 
  DDA?: ComplianceType; 
  DDB?: string; 
  DCK?: string; 
  DDK?: string; 
}

export interface FormDataType extends Omit<AamvaData, 'DAU' | 'DBC' | 'DAY' | 'DAJ' | 'DDE' | 'DDF' | 'DDG' | 'DDA' > {
  heightFeet: string;
  heightInches: string;
  DBC: Sex;
  DAY?: EyeColor;
  DAJ: USState;
  DDE?: Truncation;
  DDF?: Truncation;
  DDG?: Truncation;
  DDA?: ComplianceType;

  pdf417ErrorCorrectionLevel: string;
  pdf417Columns: string;
}

export type AamvaFormFieldId = keyof FormDataType | 
  'heightFeet' | 
  'heightInches' | 
  'issuerIdNumber' | 
  'aamvaVersion' | 
  'jurisdictionVersion' |
  'numberOfEntries' |
  'subfileDesignator' |
  'pdf417ErrorCorrectionLevel' |
  'pdf417Columns';


export interface AamvaFieldDescription {
  id: AamvaFormFieldId;
  label: string;
  tooltip: string;
  group: string;
  required?: boolean;
  maxLength?: number;
  pattern?: string; 
  options?: { value: string | number; label: string }[];
  type?: 'text' | 'date' | 'number' | 'select';
  placeholder?: string;
  readOnly?: boolean;
  min?: number; 
  max?: number; 
}

// --- Authentication and User Types ---
export interface User {
  id: string; // Typically a UUID or DB ID from backend
  username: string;
  email: string; // Added email
  creditBalance: number;
}

export interface ApiError {
  message: string;
  details?: any; // For more detailed error information from backend (e.g. validation errors object)
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  loading: boolean;
  error: string | null; // Store API error messages or general auth errors
}

export interface AuthContextType extends AuthState {
  signup: (email: string, username: string, password: string) => Promise<void>;
  login: (username: string, password?: string) => Promise<void>; // Password is now essential
  logout: () => Promise<void>; // Logout might involve an API call to invalidate a token
  addCredits: (amount: number) => Promise<void>; // Will involve an API call
  deductCredits: (amount: number) => Promise<void>; // Will involve an API call
  clearError: () => void;
  fetchCurrentUser: (token?: string) => Promise<void>; // To check token on app load
}
