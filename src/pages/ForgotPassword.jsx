import { useState } from "react";
import { Link } from "react-router-dom";

import { forgotPassword } from "../api/authApi";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
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
      console.error(error);

      setError(
        error.response?.data?.message || "Unable to process your request",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>FrndBook</h1>

        <h2>Forgot Password</h2>

        <p>
          Enter your email and we'll send you a password reset link if an
          account exists.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {error && <p className="error">{error}</p>}

          {success && <p className="success">{success}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
