/**
 * Shared, browser-safe password policy. Keep authentication enforcement and
 * registration feedback on this module so they cannot drift apart.
 */
export const passwordPolicy = {
  minLength: 12,
  maxLength: 1024,
  longPasswordLength: 20,
  minimumCharacterClasses: 3,
} as const;

export type PasswordRequirements = {
  minLength: boolean;
  maxLength: boolean;
  lowercase: boolean;
  uppercase: boolean;
  digit: boolean;
  symbol: boolean;
  characterClasses: number;
  valid: boolean;
};

export function passwordRequirements(value: string): PasswordRequirements {
  const lowercase = /[a-z]/.test(value);
  const uppercase = /[A-Z]/.test(value);
  const digit = /\d/.test(value);
  const symbol = /[^A-Za-z0-9]/.test(value);
  const characterClasses = [lowercase, uppercase, digit, symbol].filter(Boolean).length;
  const minLength = value.length >= passwordPolicy.minLength;
  const maxLength = value.length <= passwordPolicy.maxLength;
  return {
    minLength,
    maxLength,
    lowercase,
    uppercase,
    digit,
    symbol,
    characterClasses,
    valid: minLength && maxLength && (value.length >= passwordPolicy.longPasswordLength || characterClasses >= passwordPolicy.minimumCharacterClasses),
  };
}

export type PasswordStrength = "weak" | "medium" | "strong" | "veryStrong";

export function passwordStrength(value: string): PasswordStrength {
  const requirements = passwordRequirements(value);
  if (value.length >= passwordPolicy.longPasswordLength && requirements.characterClasses >= 3) return "veryStrong";
  if (requirements.valid) return "strong";
  if (requirements.minLength || requirements.characterClasses >= 2) return "medium";
  return "weak";
}
