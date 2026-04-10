"use client";

import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Link as MuiLink,
  InputAdornment,
} from "@mui/material";
import Link from "next/link";
import { authApi } from "@/lib/api";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;

    if (!email) {
      setError("Please enter your email");
      setLoading(false);
      return;
    }

    const { data, error: err } = await authApi.forgotPassword(email.trim().toLowerCase());
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    setResetUrl(data?.resetUrl ?? null);
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <Alert severity="success" icon={false}>
        If an account exists with this email, you will receive a password reset
        link shortly. Check your inbox (and spam folder).
        {resetUrl && (
          <>
            {" "}
            Local dev reset link:{" "}
            <MuiLink component={Link} href={resetUrl}>
              open reset page
            </MuiLink>
            .
          </>
        )}
      </Alert>
    );
  }

  return (
    <>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Forgot password?
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Enter your email and we&apos;ll send you a reset link
      </Typography>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          fullWidth
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          sx={{ py: 1.5 }}
        >
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </Box>

      <Typography color="text.secondary" align="center" sx={{ mt: 3 }}>
        Remember your password?{" "}
        <MuiLink component={Link} href="/login" color="primary.main">
          Sign in
        </MuiLink>
      </Typography>
    </>
  );
}
