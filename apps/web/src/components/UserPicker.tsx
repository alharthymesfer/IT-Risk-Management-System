import { useState } from 'react';
import type { UserOption } from '../hooks/useUserDirectory';
import { useLocale } from '../i18n/LocaleContext';
import { Select, TextInput } from './ui/form';

const CUSTOM_VALUE = '__custom__';

/**
 * Owner picker backed by the partial user directory (see useUserDirectory). Falls back to a raw
 * UUID input for users outside the directory — relevant for non-admin roles, who can't call
 * GET /users to look up an id they only know by UUID.
 */
export function UserPicker({
  value,
  onChange,
  options,
  id,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  options: UserOption[];
  id: string;
  required?: boolean;
}) {
  const { t } = useLocale();
  const knownValue = options.some((opt) => opt.value === value);
  const [manualMode, setManualMode] = useState(!knownValue && value !== '');

  if (manualMode) {
    return (
      <div className="space-y-1.5">
        <TextInput
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('userPicker.userIdPlaceholder')}
          required={required}
        />
        <button
          type="button"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
          onClick={() => {
            setManualMode(false);
            onChange('');
          }}
        >
          {t('userPicker.chooseFromKnownUsers')}
        </button>
      </div>
    );
  }

  return (
    <Select
      id={id}
      value={value}
      required={required}
      onChange={(e) => {
        if (e.target.value === CUSTOM_VALUE) {
          setManualMode(true);
          onChange('');
        } else {
          onChange(e.target.value);
        }
      }}
    >
      <option value="" disabled>
        {t('userPicker.selectUser')}
      </option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      <option value={CUSTOM_VALUE}>{t('userPicker.enterUserIdManually')}</option>
    </Select>
  );
}
