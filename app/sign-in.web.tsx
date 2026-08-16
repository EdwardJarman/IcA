import { SignIn } from "@clerk/expo/web";

import { AuthWebShell } from "@/components/auth-web-shell";

export default function WebSignInScreen() {
  return <AuthWebShell eyebrow="WELCOME BACK" title="Your workroom is ready." detail="Sign in securely to return to your Bots, tasks, and private Rook workspace."><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/" appearance={{ variables: { colorPrimary: "#70E5BE", colorBackground: "#15161A", borderRadius: "0.8rem" } }} /></AuthWebShell>;
}
