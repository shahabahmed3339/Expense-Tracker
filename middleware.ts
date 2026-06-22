import nextAuth from "next-auth/middleware";

export default nextAuth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/expenses/:path*",
    "/budgets/:path*",
    "/loans/:path*",
    "/persons/:path*",
    "/categories/:path*",
    "/splits/:path*",
    "/profile/:path*",
    "/reports/:path*",
    "/onboarding/:path*",
  ],
};
