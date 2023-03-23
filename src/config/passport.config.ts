import passport from "passport";
import {
	Profile as LinekdInProfile,
	Strategy as LinkedInStrategy,
} from "passport-linkedin-oauth2";
import { Strategy as GitHubStrategy } from "passport-github2";
import {
	Strategy as GoogleStrategy,
	Profile as GoogleProfile,
	VerifyCallback,
} from "passport-google-oauth20";
import UserModel, { OauthProvider } from "../models/User";
import { GitHubProfile } from "../types/custom";

export default function configPassport(): void {
	passport.serializeUser((user, done) => {
		done(null, user.oauthID);
	});

	passport.deserializeUser(async (oauthID: string, done) => {
		const foundUser = await UserModel.findOne({ oauthID: oauthID });
		done(null, foundUser);
	});

	const {
		PORT,
		LINKEDIN_CLIENT_ID,
		LINKEDIN_CLIENT_SECRET,
		GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET,
		GITHUB_CLIENT_ID,
		GITHUB_CLIENT_SECRET,
	} = process.env;

	passport.use(
		new LinkedInStrategy(
			{
				clientID: LINKEDIN_CLIENT_ID,
				clientSecret: LINKEDIN_CLIENT_SECRET,
				callbackURL: `http://localhost:${PORT}/auth/linkedin/redirect`,
				scope: ["r_emailaddress", "r_liteprofile"],
				// @ts-ignore
				state: true,
			},
			async (
				accessToken: string,
				refreshToken: string,
				profile: LinekdInProfile,
				done: VerifyCallback
			) => {
				const foundUser = await UserModel.findOne({
					oauthID: profile.id,
				});

				if (foundUser) done(null, foundUser);
				else {
					const username =
						(profile.displayName as string)
							.replace(" ", "_")
							.toLowerCase() + profile.id;
					const newUser = await new UserModel({
						username,
						oauthID: profile.id,
						oauthProvider: OauthProvider.linkedin,
						profile: {
							name: profile.displayName,
							avatar:
								profile.photos.length > 0
									? profile.photos[0].value
									: "",
						},
					}).save();
					done(null, newUser);
				}
			}
		)
	);

	passport.use(
		new GitHubStrategy(
			{
				clientID: GITHUB_CLIENT_ID,
				clientSecret: GITHUB_CLIENT_SECRET,
				callbackURL: `http://localhost:${PORT}/auth/github/redirect`,
			},
			async (
				accessToken: string,
				refreshToken: string,
				profile: GitHubProfile,
				done: VerifyCallback
			) => {
				const foundUser = await UserModel.findOne({
					oauthID: profile.id,
				});

				if (foundUser) done(null, foundUser);
				else {
					const newUser = await new UserModel({
						username: profile.username,
						oauthID: profile.id,
						oauthProvider: OauthProvider.github,
						profile: {
							name: profile._json.name || profile.username,
							bio: profile._json.bio,
							avatar: profile._json.avatar_url,
							location: profile._json.location,
						},
					}).save();
					done(null, newUser);
				}
			}
		)
	);

	passport.use(
		new GoogleStrategy(
			{
				clientID: GOOGLE_CLIENT_ID,
				clientSecret: GOOGLE_CLIENT_SECRET,
				callbackURL: `http://localhost:${PORT}/auth/google/redirect`,
			},
			async (
				accessToken,
				refreshToken,
				profile: GoogleProfile,
				done: VerifyCallback
			) => {
				const foundUser = await UserModel.findOne({
					oauthID: profile.id,
				});

				if (foundUser) done(null, foundUser);
				else {
					const username =
						(profile.displayName as string)
							.replace(" ", "_")
							.toLowerCase() + profile.id;
					const newUser = await new UserModel({
						username,
						oauthID: profile.id,
						oauthProvider: OauthProvider.google,
						profile: {
							name: profile.displayName,
							email: profile._json.email,
							avatar: profile._json.picture,
						},
					}).save();
					done(null, newUser);
				}
			}
		)
	);
}
