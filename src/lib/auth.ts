import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { prisma } from './prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/signin' },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        await prisma.user.upsert({
          where: { email: user.email! },
          update: {
            name: user.name,
            image: user.image,
            googleId: account.providerAccountId,
          },
          create: {
            email: user.email!,
            name: user.name,
            image: user.image,
            googleId: account.providerAccountId,
          },
        })
      }
      return true
    },
    async jwt({ token }) {
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        })
        if (dbUser) {
          token.userId = dbUser.id
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string
      }
      return session
    },
  },
})
