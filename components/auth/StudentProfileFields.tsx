import { Eye, EyeOff } from 'lucide-react';

export const departmentPrograms: Record<string, string[]> = {
  'Computer Science': ['BSc Computer Science', 'BSc Software Engineering', 'BSc Data Science', 'BSc Cybersecurity'],
  Engineering: ['BEng Civil Engineering', 'BEng Electrical Engineering', 'BEng Mechanical Engineering', 'BSc Architecture'],
  Business: ['BBA Finance', 'BBA Marketing', 'BCom Accounting', 'BSc Economics'],
  'Health Sciences': ['BSc Nursing', 'BSc Pharmacy', 'BSc Public Health', 'BSc Biomedical Science'],
  'Arts & Design': ['BA Graphic Design', 'BA Media Studies', 'BSc Interior Design', 'BFA Fine Arts'],
  Education: ['BEd Primary Education', 'BEd Secondary Education', 'BSc Educational Psychology', 'BA English Education'],
  'Social Sciences': ['BA Sociology', 'BA Political Science', 'BA Psychology', 'BSc Geography'],
  Law: ['LLB Law', 'BSc Legal Studies', 'BA Criminology', 'LLM Preparation'],
};

export const yearOptions = Array.from({ length: 7 }, (_, index) => String(new Date().getFullYear() - index));

export const countryCodes = [
  { label: '+260', value: '+260' },
  { label: '+27', value: '+27' },
  { label: '+256', value: '+256' },
  { label: '+233', value: '+233' },
  { label: '+1', value: '+1' },
  { label: '+44', value: '+44' },
  { label: '+91', value: '+91' },
];

type InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  name?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'email' | 'tel';
  required?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
};

export function TextField({ label, value, onChange, type = 'text', ...rest }: InputProps) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} {...rest} />
    </label>
  );
}

export function PasswordField({
  label,
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  placeholder,
  autoComplete = 'current-password',
  name,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggleVisibility: () => void;
  placeholder?: string;
  autoComplete?: string;
  name?: string;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <span className="input-affix">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={200}
          required
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="icon-button"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  disabled?: boolean;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

export function AcademicYearSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <SelectField label="Year of entry" value={value} onChange={onChange} options={yearOptions.map((year) => ({ label: year, value: year }))} />;
}

export function DepartmentSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <SelectField
      label="Department"
      value={value}
      onChange={onChange}
      options={Object.keys(departmentPrograms).map((department) => ({ label: department, value: department }))}
    />
  );
}

export function ProgramSelect({ value, onChange, department }: { value: string; onChange: (value: string) => void; department: string }) {
  const options = (departmentPrograms[department] ?? []).map((program) => ({ label: program, value: program }));
  return <SelectField label="Programme" value={value} onChange={onChange} options={options} disabled={!department} />;
}

export function PhoneInput({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
}: {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
}) {
  return (
    <div className="form-field">
      <span>Phone</span>
      <div className="phone-row">
        <select aria-label="Country code" value={countryCode} onChange={(event) => onCountryCodeChange(event.target.value)}>
          {countryCodes.map((code) => (
            <option key={code.value} value={code.value}>{code.label}</option>
          ))}
        </select>
        <input
          type="tel"
          aria-label="Phone number"
          autoComplete="tel-national"
          inputMode="tel"
          value={phoneNumber}
          onChange={(event) => onPhoneNumberChange(event.target.value.replace(/\D/g, '').slice(0, 12))}
          placeholder="97 123 4567"
        />
      </div>
    </div>
  );
}
