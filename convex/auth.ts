import { convexAuth } from "@convex-dev/auth/server";
import MicrosoftEntraID from "@auth/core/providers/microsoft-entra-id"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT}/v2.0`,
      checks: ["state"],
      profile: async (profile) => { // This is seperate but the profile image that we get from microsoft is not a path to an image
        if (!profile.sub || !profile.email) {
          throw new Error("Invalid profile data received from Microsoft Entra ID");
        }

        return {
          id: profile.sub,  
          name: profile.name,
          email: profile.email,
        }
      },
    })
  ],
});
