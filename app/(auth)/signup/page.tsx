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
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    if (!email || !password || !name) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    const { error: err } = await authApi.register(
      email.trim().toLowerCase(),
      password,
      name.trim()
    );
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
        Account created successfully. Redirecting to sign in...
      </Alert>
    );
  }

  return (
    <>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Create an account
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Get started with a secure account
      </Typography>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          fullWidth
          label="Name"
          name="name"
          autoComplete="name"
          required
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
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
          autoComplete="new-password"
          required
          helperText="Min 8 characters, 1 uppercase, 1 lowercase, 1 number"
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
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </Box>

      <Typography color="text.secondary" align="center" sx={{ mt: 3 }}>
        Already have an account?{" "}
        <MuiLink component={Link} href="/login" color="primary.main">
          Sign in
        </MuiLink>
      </Typography>
    </>
  );
}
