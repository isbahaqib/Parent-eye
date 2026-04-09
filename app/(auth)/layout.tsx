import { Box, Container, Paper, Typography } from "@mui/material";
import Link from "next/link";
import MuiLink from "@mui/material/Link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124, 92, 255, 0.15), transparent), linear-gradient(180deg, #0c0d10 0%, #0f1015 100%)",
        py: 3,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <MuiLink
            component={Link}
            href="/"
            underline="none"
            sx={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "primary.main",
              letterSpacing: "-0.02em",
            }}
          >
            Parent Eye
          </MuiLink>
        </Box>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          {children}
        </Paper>
      </Container>
    </Box>
  );
}
