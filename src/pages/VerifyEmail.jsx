import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { resendVerification, verifyEmail } from "../api/authApi";

const RESEND_COOLDOWN_SECONDS = 60;

const VerifyEmail = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");

  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
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
      console.error(error);

      setError(error.response?.data?.message || "Unable to verify email");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) {
      return;
    }

    setError("");
    setSuccess("");
    setResending(true);

    try {
      await resendVerification({
        email,
      });

      setSuccess("A new verification code has been sent.");

      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message || "Unable to resend verification code",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>FrndBook</h1>

        <h2>Verify Your Email</h2>

        <p>Enter the 6-digit verification code sent to your email.</p>

        <form onSubmit={handleVerify}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
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

          {error && <p className="error">{error}</p>}

          {success && <p className="success">{success}</p>}

          <button type="submit" disabled={loading || otp.length !== 6}>
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCountdown > 0}
        >
          {resending
            ? "Sending..."
            : resendCountdown > 0
              ? `Resend code in ${resendCountdown}s`
              : "Resend code"}
        </button>

        <p>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
