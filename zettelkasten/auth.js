import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    // 許可リスト（ALLOWED_EMAILS、カンマ区切り）のメールだけログインを許可。
    // 未設定なら誰でも可（ローカル開発用）。本番では必ず自分のメールを設定する。
    async signIn({ user }) {
      const allowed = (process.env.ALLOWED_EMAILS || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (allowed.length === 0) return true;
      return !!user.email && allowed.includes(user.email.toLowerCase());
    },
    // Google アカウントの一意ID(sub)をセッションに載せ、これを user_id として使う
    async session({ session, token }) {
      if (session.user) session.user.id = token.sub;
      return session;
    },
  },
});
