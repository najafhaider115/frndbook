import { apiError } from "../utils/apiError";
import { apiErrorMessage } from "../utils/apiError.js";
import authStyles from "../styles/auth.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import FormField from "../components/ui/FormField";
import Button from "../components/ui/Button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

const css = bindStyles(authStyles);

const Signup = () => {
  const navigate = useNavigate();

  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      await signup(name, email, password);

      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      setFieldErrors(apiError(error).fieldErrors);
      console.error(error);

      setError(
        apiErrorMessage(error, "Unable to send verification code"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={css("auth-page")}>
      <div className={css("auth-card")}>
        <h1>FrndBook</h1>

        <h2>Create Account</h2>

        <form onSubmit={handleSubmit}>
          <FormField label="Name" error={fieldErrors.name} autoComplete="name"
            type="text"
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <FormField label="Email" error={fieldErrors.email} autoComplete="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <FormField label="Password" error={fieldErrors.password} autoComplete="new-password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />

          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

          <Button type="submit" disabled={loading}>
            {loading ? "Sending code..." : "Create Account"}
          </Button>
        </form>

        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
