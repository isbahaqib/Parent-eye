"use client";

import { Suspense, useState } from "react";
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
import { useAuth } from "@/context/AuthContext";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    const err = await login(email, password);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Sign in
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Enter your credentials to access your account
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
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          fullWidth
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          sx={{ mb: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ textAlign: "right", mb: 3 }}>
          <MuiLink
            component={Link}
            href="/forgot-password"
            variant="body2"
            color="text.secondary"
          >
            Forgot password?
          </MuiLink>
        </Box>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          sx={{ py: 1.5 }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </Box>

      <Typography color="text.secondary" align="center" sx={{ mt: 3 }}>
        Don&apos;t have an account?{" "}
        <MuiLink component={Link} href="/signup" color="primary.main">
          Sign up
        </MuiLink>
      </Typography>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
