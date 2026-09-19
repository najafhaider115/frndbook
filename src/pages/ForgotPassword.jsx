import { apiError } from "../utils/apiError";
import { apiErrorMessage } from "../utils/apiError.js";
import authStyles from "../styles/auth.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import FormField from "../components/ui/FormField";
import Button from "../components/ui/Button";
import { useState } from "react";
import { Link } from "react-router-dom";

import { forgotPassword } from "../api/authApi";

const css = bindStyles(authStyles);

const ForgotPassword = () => {
  const [email, setEmail] = useState("");

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setFieldErrors({});
    setSuccess("");
    setLoading(true);

    try {
      await forgotPassword(email);

      /*
       * Always show the same message.
       *
       * This prevents revealing whether
       * the email exists in FrndBook.
       */
      setSuccess(
        "If an account exists for this email, a password reset link has been sent.",
      );
    } catch (error) {
      setFieldErrors(apiError(error).fieldErrors);
      console.error(error);

      setError(
        apiErrorMessage(error, "Unable to process your request"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={css("auth-page")}>
      <div className={css("auth-card")}>
        <h1>FrndBook</h1>

        <h2>Forgot Password</h2>

        <p>
          Enter your email and we'll send you a password reset link if an
          account exists.
        </p>

        <form onSubmit={handleSubmit}>
          <FormField label="Email" error={fieldErrors.email} autoComplete="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

          {success && <StatusMessage tone="success" className={css("success")}>{success}</StatusMessage>}

          <Button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <p>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
