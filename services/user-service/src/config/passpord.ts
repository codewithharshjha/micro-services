import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { prisma } from "../../db/PrismaDBClient";


const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: "/api/v1/auth/google/callback",
      },
      async (profile: any, done: any) => {
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
} else {
  console.warn(
    "[passport] Skipping Google OAuth strategy because GOOGLE_CLIENT_ID/SECRET are not set"
  );
}

const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

if (githubClientId && githubClientSecret) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: githubClientId,
        clientSecret: githubClientSecret,
        callbackURL: "/api/v1/auth/github/callback",
      },
      async (profile: any, done: any) => {
        const email =
          profile.emails?.[0]?.value || `${profile.username}@github.com`;

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
} else {
  console.warn(
    "[passport] Skipping GitHub OAuth strategy because GITHUB_CLIENT_ID/SECRET are not set"
  );
}

export default passport;
