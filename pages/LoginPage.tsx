import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ProcessingIcon } from '../components/Icons';
import HCaptcha from '@hcaptcha/react-hcaptcha';

const LoginPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState(''); 
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); 
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { signup, login, loading, error: authContextError, clearError } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    clearError(); 
    setFormError(null); 
  }, [clearError, username, email, password, confirmPassword, isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!captchaToken) {
      setFormError("Please complete the captcha verification");
      return;
    }

    if (isSignUp) {
      if (!email.includes('@') || !email.includes('.')) { 
        setFormError("Please enter a valid email address.");
        return;
      }
      if (username.length < 3) {
        setFormError("Username must be at least 3 characters long.");
        return;
      }
      if (password.length < 6) {
        setFormError("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setFormError("Passwords do not match.");
        return;
      }
      try {
        await signup(email, username, password, captchaToken);
      } catch (err: any) {
        setFormError(err.message || "Signup failed. Please try again.");
      }
    } else {
      if (!username || !password) {
        setFormError("Username and password are required.");
        return;
      }
      try {
        await login(username, password, captchaToken);
      } catch (err: any) {
        setFormError(err.message || "Login failed. Please check your credentials.");
      }
    }
  };

  const displayError = authContextError || formError;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-700">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md ring-1 ring-white/10">
        <h1 className="text-3xl font-bold text-center text-sky-400 mb-6">
          {isSignUp ? 'Create Account' : 'Login'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div>
              <label htmlFor="signup-email\" className="block text-sm font-medium text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email" id="signup-email" name="signup-email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-slate-600 rounded-md text-slate-100 bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-500"
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1">
              Username
            </label>
            <input
              type="text" id="username" name="username" value={username} onChange={(e) => setUsername(e.target.value)}
              autoComplete={isSignUp ? "new-username" : "username"}
              placeholder={isSignUp ? "Choose a username" : "Enter your username"}
              className="w-full px-4 py-2 border border-slate-600 rounded-md text-slate-100 bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password" id="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border border-slate-600 rounded-md text-slate-100 bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-500"
              required
            />
          </div>
          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">
                Confirm Password
              </label>
              <input
                type="password" id="confirmPassword" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Confirm your password"
                className="w-full px-4 py-2 border border-slate-600 rounded-md text-slate-100 bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-500"
                required
              />
            </div>
          )}

          <div className="flex justify-center my-4">
            <HCaptcha
              sitekey={process.env.HCAPTCHA_SITE_KEY || ''}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
            />
          </div>
          
          {displayError && (
            <p className="text-red-400 text-sm text-center py-2 bg-red-900/20 border border-red-700 rounded-md" role="alert">
              {displayError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="w-full flex items-center justify-center px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <ProcessingIcon className="animate-spin -ml-1 mr-3 h-5 w-5" />
                {isSignUp ? 'Creating Account...' : 'Logging in...'}
              </>
            ) : (
              isSignUp ? 'Sign Up' : 'Login'
            )}
          </button>
        </form>
        <p className="text-sm text-slate-400 mt-6 text-center">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button
            onClick={() => {setIsSignUp(!isSignUp); setFormError(null); clearError();}}
            className="font-medium text-sky-400 hover:text-sky-300 ml-1 focus:outline-none"
            type="button"
          >
            {isSignUp ? 'Login here' : 'Sign up now'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;