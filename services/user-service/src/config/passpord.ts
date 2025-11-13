import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { prisma } from "../../db/PrismaDBClient";


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/api/v1/auth/google/callback",
    },
    async ( profile:any, done:any) => {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error("No email found"));

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: profile.displayName,
            provider: "google",
            providerId: profile.id,
          },
        });
      }
      return done(null, user);
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: "/api/v1/auth/github/callback",
    },
    async ( profile:any, done:any) => {
      const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: profile.displayName || profile.username,
            provider: "github",
            providerId: profile.id,
          },
        });
      }
      return done(null, user);
    }
  )
);

export default passport;
