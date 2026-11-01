'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Loader2, LockKeyhole, UserPlus } from 'lucide-react';
import BrandLogo from '@/components/brand-logo';
import {
  AcademicYearSelect,
  DepartmentSelect,
  PasswordField,
  PhoneInput,
  ProgramSelect,
  TextField,
  departmentPrograms,
} from '@/components/auth/StudentProfileFields';

type AuthMode = 'login' | 'register';

const LOGIN_INVALID = "That student ID and password combination didn't work.";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: LOGIN_INVALID,
  SessionRequired: 'Please sign in to continue.',
  AccessDenied: 'Your account does not have access to the student workspace.',
};

/** Only allow same-site relative callback paths to avoid open redirects. */
function safeCallback(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/login') ? value : '/dashboard';
}

function describeError(code: string | null) {
  if (!code) return '';
  return ERROR_MESSAGES[code] ?? 'Sign-in is temporarily unavailable. Please try again.';
}

function StudentAuthForm() {
  const { status } = useSession();
  const params = useSearchParams();
  const callbackUrl = safeCallback(params.get('callbackUrl'));

  const [mode, setMode] = useState<AuthMode>(params.get('mode') === 'register' ? 'register' : 'login');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [program, setProgram] = useState('');
  const [year, setYear] = useState('');
  const [countryCode, setCountryCode] = useState('+260');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(describeError(params.get('error')));
  const [success, setSuccess] = useState('');
  const [working, setWorking] = useState(false);

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 6) score += 35;
    if (password.length >= 10) score += 20;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    if (score < 40) return { label: 'Weak', value: 25, color: '#d9534f' };
    if (score < 70) return { label: 'Fair', value: 60, color: '#e0a03a' };
    return { label: 'Strong', value: 100, color: '#23804f' };
  }, [password]);

  useEffect(() => {
    if (status === 'authenticated') window.location.assign(callbackUrl);
  }, [status, callbackUrl]);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError('');
    setSuccess('');
  }

  function handleDepartmentChange(nextDepartment: string) {
    setDepartment(nextDepartment);
    setProgram(departmentPrograms[nextDepartment]?.[0] ?? '');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError('');
    setSuccess('');

    try {
      const normalizedId = studentId.trim();
      if (!normalizedId) throw new Error('Please enter your student ID.');

      if (mode === 'register') {
        if (!name.trim()) throw new Error('Please enter your full name.');
        if (!/^\d{6,12}$/.test(normalizedId)) throw new Error('Student ID must be 6–12 digits.');
        if (!email.trim()) throw new Error('Please enter your university email.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');

        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            studentId: normalizedId,
            email,
            password,
            department,
            program,
            year,
            phone: phoneNumber ? `${countryCode}${phoneNumber.replace(/\D/g, '')}` : '',
          }),
        }).catch(() => null);
        if (!response) throw new Error('Network connection error. Check your connection and try again.');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Registration failed.');
        setSuccess('Account created. Signing you in…');
      }

      const result = await signIn('credentials', { studentId: normalizedId, password, redirect: false }).catch(() => null);
      if (!result) throw new Error('Network connection error. Check your connection and try again.');
      if (result.error) throw new Error(ERROR_MESSAGES[result.error] ?? result.error);

      window.location.assign(callbackUrl);
    } catch (cause) {
      setSuccess('');
      setError(cause instanceof Error ? cause.message : 'Authentication failed.');
      setWorking(false);
    }
  }

  if (status === 'loading' || status === 'authenticated') {
    return (
      <main className="login-page">
        <div className="login-card" aria-busy="true">
          <div className="login-brand"><BrandLogo /></div>
          <p className="flex items-center justify-center gap-2"><Loader2 size={16} className="spin" /> Preparing secure campus access…</p>
        </div>
      </main>
    );
  }

  const registering = mode === 'register';

  return (
    <main className="login-page">
      <div className={`login-card ${registering ? 'is-wide' : ''}`}>
        <div className="login-brand"><BrandLogo /></div>
        <p className="text-center">Student workspace · Authorized access only</p>

        <div className="auth-tabs" role="tablist" aria-label="Choose sign-in or registration">
          <button type="button" role="tab" aria-selected={!registering} onClick={() => switchMode('login')}>Sign in</button>
          <button type="button" role="tab" aria-selected={registering} onClick={() => switchMode('register')}>Create account</button>
        </div>

        <form onSubmit={submit} noValidate>
          {registering && <TextField label="Full name" value={name} onChange={setName} autoComplete="name" maxLength={120} required autoFocus />}

          {registering ? (
            <div className="form-row">
              <TextField label="Student ID" value={studentId} onChange={setStudentId} placeholder="e.g. 20240001" inputMode="numeric" autoComplete="username" maxLength={12} required />
              <TextField label="University email" type="email" value={email} onChange={setEmail} autoComplete="email" inputMode="email" maxLength={254} required />
            </div>
          ) : (
            <TextField label="Student ID" value={studentId} onChange={setStudentId} inputMode="numeric" autoComplete="username" maxLength={32} required autoFocus />
          )}

          {registering && (
            <>
              <div className="form-row">
                <DepartmentSelect value={department} onChange={handleDepartmentChange} />
                <ProgramSelect value={program} onChange={setProgram} department={department} />
              </div>
              <div className="form-row">
                <AcademicYearSelect value={year} onChange={setYear} />
                <PhoneInput countryCode={countryCode} phoneNumber={phoneNumber} onCountryCodeChange={setCountryCode} onPhoneNumberChange={setPhoneNumber} />
              </div>
            </>
          )}

          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            showPassword={showPassword}
            onToggleVisibility={() => setShowPassword((current) => !current)}
            autoComplete={registering ? 'new-password' : 'current-password'}
          />

          {registering && password && (
            <div className="strength-meter" aria-live="polite">
              <div><span>Password strength</span><span>{passwordStrength.label}</span></div>
              <div className="strength-track"><span style={{ width: `${passwordStrength.value}%`, background: passwordStrength.color }} /></div>
            </div>
          )}

          {registering && (
            <PasswordField
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              showPassword={showConfirmPassword}
              onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
              autoComplete="new-password"
            />
          )}

          {error && <div className="form-error" role="alert">{error}</div>}
          {success && <div className="form-success" role="status">{success}</div>}

          <button type="submit" className="primary-button" disabled={working}>
            {working ? <Loader2 size={16} className="spin" /> : registering ? <UserPlus size={16} /> : <LockKeyhole size={16} />}
            {working ? (registering ? 'Creating account…' : 'Signing in…') : registering ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <small className="login-help text-center">
          Use your UNILUS student account. Staff sign in through the staff portal application.
        </small>
        <div className="login-footer-links">
          <Link href="/">Explore campus</Link>
          <a href="https://www.unilus.ac.zm" target="_blank" rel="noopener noreferrer">unilus.ac.zm</a>
        </div>
      </div>
    </main>
  );
}

export default function StudentAuthPage() {
  return (
    <Suspense fallback={<main className="login-page"><div className="login-card" aria-busy="true"><Loader2 size={16} className="spin" /></div></main>}>
      <StudentAuthForm />
    </Suspense>
  );
}
