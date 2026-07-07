/**
 * Invoked by a connector when a purchase flow hits a manual authentication
 * step (2FA, OTP, CAPTCHA) it must never attempt to bypass. The returned
 * promise resolves once the Execution Engine has observed the operator
 * completing that step in the live browser window and signaled resume.
 */
export type ManualAuthHandler = (message: string) => Promise<void>;
