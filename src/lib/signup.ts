import { createChallenge, discardChallenge } from "./auth-challenges.ts";
import { createUser, deleteUser } from "./auth.ts";
import type { AuthEmailDelivery } from "./auth-email.ts";
import { normalizeEmail, normalizeUsername, validEmail, validUsername } from "./identity.ts";
import { passwordRequirements } from "./password-policy.ts";
import type { VerificationStore } from "./verification-store.ts";

export type RegistrationInput = {
  displayName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};
export type RegistrationFailure =
  | "DISPLAY_NAME_INVALID"
  | "USERNAME_INVALID"
  | "EMAIL_INVALID"
  | "PASSWORD_MISMATCH"
  | "PASSWORD_INVALID"
  | "EMAIL_TAKEN"
  | "USERNAME_TAKEN"
  | "EMAIL_NOT_CONFIGURED"
  | "EMAIL_ORIGIN_INVALID"
  | "EMAIL_SENDER_REJECTED"
  | "EMAIL_RECIPIENT_NOT_ALLOWED"
  | "EMAIL_DELIVERY_UNAVAILABLE";
export type RegistrationResult = { ok: true; userId: string } | { ok: false; code: RegistrationFailure };
export type VerificationEmailSender = (input: { to: string; token: string; expiresAt: string }) => Promise<AuthEmailDelivery>;

function emailFailure(delivery: AuthEmailDelivery): RegistrationFailure {
  switch (delivery) {
    case "not_configured": return "EMAIL_NOT_CONFIGURED";
    case "origin_invalid": return "EMAIL_ORIGIN_INVALID";
    case "sender_rejected": return "EMAIL_SENDER_REJECTED";
    case "recipient_not_allowed": return "EMAIL_RECIPIENT_NOT_ALLOWED";
    default: return "EMAIL_DELIVERY_UNAVAILABLE";
  }
}

/** Creates an unverified account only when its verification message was accepted by Resend. */
export async function registerAccount(store: VerificationStore, input: RegistrationInput, sendVerificationEmail: VerificationEmailSender): Promise<RegistrationResult> {
  const displayName = input.displayName.trim();
  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);
  if (!displayName || displayName.length > 120) return { ok: false, code: "DISPLAY_NAME_INVALID" };
  if (!validUsername(username)) return { ok: false, code: "USERNAME_INVALID" };
  if (!validEmail(email)) return { ok: false, code: "EMAIL_INVALID" };
  if (input.password !== input.confirmPassword) return { ok: false, code: "PASSWORD_MISMATCH" };
  if (!passwordRequirements(input.password).valid) return { ok: false, code: "PASSWORD_INVALID" };

  let user: Awaited<ReturnType<typeof createUser>> | undefined;
  let challenge: { token: string; expiresAt: string } | undefined;
  try {
    user = await createUser(store, { displayName, username, email, password: input.password, role: "ENGINEER" });
    challenge = await createChallenge(store, user.id, "verify-email");
    const delivery = await sendVerificationEmail({ to: user.email, token: challenge.token, expiresAt: challenge.expiresAt });
    if (delivery !== "sent") {
      await discardChallenge(store, challenge.token, "verify-email");
      await deleteUser(store, user.id);
      return { ok: false, code: emailFailure(delivery) };
    }
    return { ok: true, userId: user.id };
  } catch (error) {
    if (challenge) await discardChallenge(store, challenge.token, "verify-email");
    if (user) await deleteUser(store, user.id);
    if (error instanceof Error && error.message === "User exists") return { ok: false, code: "EMAIL_TAKEN" };
    if (error instanceof Error && error.message === "Username exists") return { ok: false, code: "USERNAME_TAKEN" };
    throw error;
  }
}
