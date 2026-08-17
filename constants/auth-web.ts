const WHITE = "#FFFFFF";

/**
 * Shared high-contrast styling + localization overrides for Clerk's web sign-in
 * and sign-up cards so everything is branded as "Rook" instead of the default
 * Clerk application name, and so the Google / GitHub buttons read naturally.
 */
export const authWebAppearance = {
  variables: {
    colorPrimary: "#70E5BE",
    colorPrimaryForeground: WHITE,
    colorBackground: "#15161A",
    colorForeground: WHITE,
    colorDanger: "#FF7B7B",
    colorSuccess: "#77F3C4",
    colorWarning: "#F6C65B",
    colorMuted: "#9AA4B2",
    colorMutedForeground: WHITE,
    colorInput: "#050506",
    colorInputForeground: WHITE,
    colorNeutral: WHITE,
    colorTextOnPrimaryBackground: WHITE,
    colorTextSecondary: "#9AA4B2",
    borderRadius: "0.8rem",
  },
  elements: {
    backLink: { color: WHITE },
    headerBackLink: { color: WHITE },
    footerActionLink: { color: WHITE },
    footerPagesLink: { color: WHITE },
    formFieldAction: { color: WHITE },
    formResendCodeLink: { color: WHITE },
    identityPreviewEditButton: { color: WHITE },
    formButtonPrimary: { color: WHITE },
    // Hide Clerk's "Secured by Clerk" footer badge where it appears.
    footer: { display: "none" as const },
    footerAction: { display: "none" as const },
    branding: { display: "none" as const },
    clerkCopyrightBox: { display: "none" as const },
    badge: { display: "none" as const },
    poweredByClerk: { display: "none" as const },
    card: {
      backgroundColor: "transparent",
      boxShadow: "none",
      border: "none",
      width: "100%",
    },
    rootBox: {
      width: "100%",
    },
    header: {
      // The shell already renders the Rook brand, title, and detail — hide
      // Clerk's duplicate header inside the card to avoid doubled headings.
      display: "none" as const,
    },
    socialButtons: {
      gap: "0.6rem",
    },
    socialButtonsIconButton: {
      height: "2.75rem",
      borderRadius: "0.75rem",
      border: "1px solid rgba(255,255,255,0.18)",
      backgroundColor: "#050506",
    },
    socialButtonsBlockButton: {
      height: "2.75rem",
      borderRadius: "0.75rem",
      border: "1px solid rgba(255,255,255,0.18)",
      backgroundColor: "#050506",
      color: WHITE,
      fontSize: "0.9rem",
      fontWeight: "700",
    },
    dividerLine: {
      backgroundColor: "rgba(255,255,255,0.18)",
    },
    dividerText: {
      color: "#9AA4B2",
    },
    formFieldInput: {
      height: "2.75rem",
      borderRadius: "0.75rem",
    },
    formButtonReset: {
      color: WHITE,
    },
  },
  layout: {
    socialButtonsPlacement: "top" as const,
    showOptionalFields: false,
    termsPageUrl: undefined,
    privacyPageUrl: undefined,
    helpPageUrl: undefined,
    logoImageUrl: undefined,
    logoPlacement: "none" as const,
  },
};

/**
 * Localization overrides that replace every "Sign in to Clerk" / "Sign up for
 * Clerk" / "Continue to Clerk" string with Rook, and reword the OAuth buttons
 * to read naturally ("Continue with Google", not "Sign in with Clerk").
 */
export const authWebLocalization = {
  locale: "en-US",
  socialButtonsBlockButton: "Continue with {{provider|titleize}}",
  socialButtonsBlockButtonManyInView: "{{provider|titleize}}",
  dividerText: "or",
  signIn: {
    start: {
      title: "Sign in to Rook",
      subtitle: "Welcome back — your workroom is waiting.",
      actionText: "New to Rook?",
      actionLink: "Create an account",
    },
    password: {
      title: "Enter your password",
      subtitle: "to continue to Rook",
      formTitle: "Password",
      formSubtitle: "Enter the password associated with your account",
      forgotPassword: "Forgot password?",
      resetPassword: {
        title: "Reset your password",
        subtitle: "We'll send a code to your email",
        formTitle: "Email code",
        formSubtitle: "to verify your identity",
        resendButton: "Didn't receive a code? Resend",
        successMessage:
          "Check your email for a password reset link. You can close this tab once reset.",
      },
    },
    emailCode: {
      title: "Check your email",
      subtitle: "to continue to Rook",
      formTitle: "Verification code",
      formSubtitle: "Enter the verification code sent to your email",
      resendButton: "Didn't receive a code? Resend",
      successMessage: "You're signed in to Rook.",
    },
    emailLink: {
      title: "Check your email",
      subtitle: "to continue to Rook",
      formTitle: "Email link",
      formSubtitle: "Open the link sent to your email to sign in to Rook",
      resendButton: "Didn't receive a link? Resend",
      expired: {
        title: "This link expired",
        subtitle: "Return to Rook to request a new link.",
      },
      verified: {
        title: "You're signed in",
        subtitle: "Return to Rook to continue.",
      },
      failed: {
        title: "This link is invalid",
        subtitle: "Return to Rook and try again.",
      },
      loading: {
        title: "Signing in…",
        subtitle: "You'll be in your Rook workroom shortly.",
      },
      clientMismatch: {
        title: "Link opened on another device",
        subtitle: "Return to Rook on the original device to continue.",
      },
    },
    phoneCode: {
      title: "Check your phone",
      subtitle: "to continue to Rook",
      formTitle: "Verification code",
      formSubtitle: "Enter the verification code sent to your phone",
      resendButton: "Didn't receive a code? Resend",
      successMessage: "You're signed in to Rook.",
    },
    alternateMethods: {
      title: "Use another method",
      subtitle: "to sign in to Rook",
      actionText: "Sign in with another method",
      actionLink: "View all methods",
      getHelp: {
        title: "Need help signing in to Rook?",
        subtitle:
          "Reach out to Rook support if you're having trouble accessing your workroom.",
        blockButton__emailSupport: "Email Rook support",
        backLink: "Back to sign in",
      },
    },
    noAvailableMethods: {
      title: "Can't sign in",
      subtitle:
        "There are no available sign-in methods connected to your Rook account.",
      message: "Contact Rook support to regain access to your workroom.",
    },
  },
  signUp: {
    start: {
      title: "Create your Rook account",
      subtitle: "Begin with a clear workroom.",
      actionText: "Already have a Rook account?",
      actionLink: "Sign in",
    },
    emailCode: {
      title: "Verify your email",
      subtitle: "to create your Rook account",
      formTitle: "Verification code",
      formSubtitle: "Enter the code sent to your email",
      resendButton: "Didn't receive a code? Resend",
      successMessage: "Your Rook account is ready.",
    },
    emailLink: {
      title: "Verify your email",
      subtitle: "to create your Rook account",
      formTitle: "Email link",
      formSubtitle: "Open the link sent to your email to create your Rook account",
      resendButton: "Didn't receive a link? Resend",
      loading: {
        title: "Creating your account…",
        subtitle: "You'll be in your Rook workroom shortly.",
      },
      verified: {
        title: "Email verified",
        subtitle: "Return to Rook to finish creating your account.",
      },
    },
    phoneCode: {
      title: "Verify your phone",
      subtitle: "to create your Rook account",
      formTitle: "Verification code",
      formSubtitle: "Enter the code sent to your phone",
      resendButton: "Didn't receive a code? Resend",
      successMessage: "Your Rook account is ready.",
    },
    continue: {
      title: "Fill in missing fields",
      subtitle: "to finish creating your Rook account",
      actionText: "",
      actionLink: "",
    },
  },
  userButton: {
    action__signOut: "Sign out of Rook",
    action__manageAccount: "Manage Rook account",
  },
};
