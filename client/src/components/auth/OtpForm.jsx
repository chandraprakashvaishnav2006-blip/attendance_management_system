import React, { useState, useEffect, useRef } from 'react';
import { ROLES_CONFIG } from './authConfig';
import { Smartphone, ShieldCheck, RefreshCw, ArrowRight } from 'lucide-react';

export const OtpForm = ({
  role,
  phone,
  onChangePhone,
  onSubmit,
  isLoading,
}) => {
  const [step, setStep] = useState('request');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');
  const [mockSentNotification, setMockSentNotification] = useState(null);

  const inputRefs = useRef([]);
  const config = ROLES_CONFIG[role];

  // Countdown timer for resend
  useEffect(() => {
    let interval;
    if (step === 'verify' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 5) return;
    setStep('verify');
    setTimer(45);
    setCanResend(false);
    // Pre-fill demo OTP code hint for convenience
    setMockSentNotification(`SMS sent to ${countryCode} ${phone}. Demo code: 749210`);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  const handleDigitChange = (index, value) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      // Pasted content
      const pasted = cleaned.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    // Auto advance focus
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) return;
    onSubmit(code);
  };

  const handleAutoFillCode = () => {
    const demoCode = ['7', '4', '9', '2', '1', '0'];
    setOtpDigits(demoCode);
    inputRefs.current[5]?.focus();
  };

  return (
    <div className="space-y-4">
      {step === 'request' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Registered Mobile Number
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-24 px-2 py-2.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+91">🇮🇳 +91</option>
                <option value="+61">🇦🇺 +61</option>
                <option value="+81">🇯🇵 +81</option>
                <option value="+49">🇩🇪 +49</option>
              </select>

              <div className="relative flex-1 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-900/30 transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => onChangePhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none font-medium"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              We'll send a 6-digit one-time verification passcode via secure SMS.
            </p>
          </div>

          <button
            type="submit"
            className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              role === 'admin'
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25'
                : role === 'student'
                ? 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/25'
                : 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/25'
            }`}
          >
            <span>Send One-Time Passcode</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifySubmit} className="space-y-4">
          <div className="text-center space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Passcode Dispatched</span>
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 pt-1">
              Enter the 6-digit code sent to <strong className="text-slate-800 dark:text-slate-200">{countryCode} {phone}</strong>
            </p>
          </div>

          {/* 6 Digit OTP inputs */}
          <div className="flex justify-between items-center gap-2 py-1">
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`w-11 h-12 text-center text-lg font-bold rounded-xl border transition-all focus:outline-none ${
                  digit
                    ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/30 text-slate-900 dark:text-white ring-2 ring-sky-100 dark:ring-sky-900/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-50'
                }`}
              />
            ))}
          </div>

          {mockSentNotification && (
            <div className="p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
              <span className="truncate">{mockSentNotification}</span>
              <button
                type="button"
                onClick={handleAutoFillCode}
                className="text-xs font-bold text-blue-700 dark:text-blue-400 underline shrink-0 ml-2 hover:text-blue-900 dark:hover:text-blue-200 cursor-pointer"
              >
                Auto Fill
              </button>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <button
              type="button"
              onClick={() => setStep('request')}
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
            >
              Change number
            </button>

            {canResend ? (
              <button
                type="button"
                onClick={() => {
                  setTimer(45);
                  setCanResend(false);
                }}
                className="text-sky-600 dark:text-sky-400 font-semibold hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Resend OTP</span>
              </button>
            ) : (
              <span className="tabular-nums font-mono text-slate-400">
                Resend in 00:{timer < 10 ? `0${timer}` : timer}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || otpDigits.join('').length < 6}
            className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              role === 'admin'
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25'
                : role === 'student'
                ? 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/25'
                : 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/25'
            } ${isLoading || otpDigits.join('').length < 6 ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <span>Authenticating OTP...</span>
            ) : (
              <>
                <span>Verify & Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
