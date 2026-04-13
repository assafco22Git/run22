import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Run22Logo } from "@/components/Run22Logo";

// Server Action for login
async function loginAction(formData: FormData) {
  "use server";

  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  // Look up role before signIn so we can redirect to the right dashboard directly
  let redirectTo = "/calendar";
  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { name: username }] },
      select: { role: true, passwordHash: true },
    });
    if (user?.passwordHash && await bcrypt.compare(password, user.passwordHash)) {
      redirectTo = user.role === "TRAINER" ? "/trainer/dashboard" : "/calendar";
    }
  } catch {
    redirectTo = "/";
  }

  try {
    await signIn("credentials", { username, password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      return redirect(`/login?error=${encodeURIComponent("Invalid username or password")}`);
    }
    throw error;
  }
}

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <Run22Logo size="lg" className="mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Running & fitness platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Sign in
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Enter your credentials to continue
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={loginAction} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                placeholder="Your username or name"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              Sign in
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          &copy; {new Date().getFullYear()} run22
        </p>
      </div>
    </div>
  );
}
