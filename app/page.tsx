"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Typography } from "@mui/material";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124, 92, 255, 0.12), transparent)",
        gap: 2,
      }}
    >
      <Typography variant="h4" fontWeight={700}>
        Parent Eye
      </Typography>
      <Typography color="text.secondary" textAlign="center" sx={{ maxWidth: 360, px: 2 }}>
        Parent dashboard — pair and monitor Android child devices only
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        <Button component={Link} href="/login" variant="contained" size="large">
          Sign In
        </Button>
        <Button
          component={Link}
          href="/signup"
          variant="outlined"
          size="large"
          sx={{ borderColor: "divider" }}
        >
          Sign Up
        </Button>
      </Box>
    </Box>
  );
}
