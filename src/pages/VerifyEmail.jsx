import { apiError } from "../utils/apiError";
import { apiErrorMessage } from "../utils/apiError.js";
import authStyles from "../styles/auth.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import FormField from "../components/ui/FormField";
import Button from "../components/ui/Button";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { resendVerification, verifyEmail } from "../api/authApi";

const css = bindStyles(authStyles);

const RESEND_COOLDOWN_SECONDS = 60;

const VerifyEmail = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");

  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [resendCountdown, setResendCountdown] = useState(
    RESEND_COOLDOWN_SECONDS,
  );

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendCountdown]);

  const handleVerify = async (event) => {
    event.preventDefault();

    setError("");
    setFieldErrors({});
    setSuccess("");
    setLoading(true);

    try {
      await verifyEmail({
        email,
        otp,
      });

      setSuccess("Email verified successfully. Redirecting to login...");

      window.setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      setFieldErrors(apiError(error).fieldErrors);
      console.error(error);

      setError(apiErrorMessage(error, "Unable to verify email"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) {
      return;
    }

    setError("");
    setFieldErrors({});
    setSuccess("");
    setResending(true);

    try {
      await resendVerification({
        email,
      });

      setSuccess("A new verification code has been sent.");

      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setFieldErrors(apiError(error).fieldErrors);
      console.error(error);

      setError(
        apiErrorMessage(error, "Unable to resend verification code"),
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={css("auth-page")}>
      <div className={css("auth-card")}>
        <h1>FrndBook</h1>

        <h2>Verify Your Email</h2>

        <p>Enter the 6-digit verification code sent to your email.</p>

        <form onSubmit={handleVerify}>
          <FormField label="Email" error={fieldErrors.email} autoComplete="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <FormField label="Verification code" error={fieldErrors.otp} autoComplete="one-time-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            required
          />

          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

          {success && <StatusMessage tone="success" className={css("success")}>{success}</StatusMessage>}

          <Button type="submit" disabled={loading || otp.length !== 6}>
            {loading ? "Verifying..." : "Verify Email"}
          </Button>
        </form>

        <Button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCountdown > 0}
        >
          {resending
            ? "Sending..."
            : resendCountdown > 0
              ? `Resend code in ${resendCountdown}s`
              : "Resend code"}
        </Button>

        <p>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
