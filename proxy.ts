import nextAuth from "next-auth/middleware";

export default function proxy(...args: Parameters<typeof nextAuth>) {
  return nextAuth(...args);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/expenses/:path*",
    "/budgets/:path*",
    "/loans/:path*",
    "/groups/:path*",
    "/categories/:path*",
    "/splits/:path*",
  ],
};
