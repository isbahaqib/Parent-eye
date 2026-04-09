"use client";

import { useState, Suspense } from "react";
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
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <Alert severity="error" icon={false}>
        Invalid or missing reset link.{" "}
        <MuiLink component={Link} href="/forgot-password">
          Request a new one
        </MuiLink>
      </Alert>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password !== confirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const { error: err } = await authApi.resetPassword(token ?? "", password);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (success) {
    return (
      <Alert severity="success" icon={false}>
        Password updated successfully. Redirecting to sign in...
      </Alert>
    );
  }

  return (
    <>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Reset password
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Enter your new password
      </Typography>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          fullWidth
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          helperText="Min 8 characters, 1 uppercase, 1 lowercase, 1 number"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          fullWidth
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon fontSize="small" color="action" />
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
          {loading ? "Resetting..." : "Reset password"}
        </Button>
      </Box>

      <Typography color="text.secondary" align="center" sx={{ mt: 3 }}>
        Back to{" "}
        <MuiLink component={Link} href="/login" color="primary.main">
          Sign in
        </MuiLink>
      </Typography>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Typography>Loading...</Typography>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
