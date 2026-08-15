import { Redirect } from "expo-router";

/** Native account creation is launched from the Clerk-hosted sign-up action on /sign-in. */
export default function NativeSignUpRedirect() {
  return <Redirect href="/sign-in" />;
}
