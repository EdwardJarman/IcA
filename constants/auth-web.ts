const WHITE = "#FFFFFF";

/** Shared high-contrast styling for Clerk's web sign-in and sign-up cards. */
export const authWebAppearance = {
  variables: {
    colorPrimary: "#70E5BE",
    colorPrimaryForeground: WHITE,
    colorBackground: "#15161A",
    colorForeground: WHITE,
    colorMuted: "#050506",
    colorMutedForeground: WHITE,
    colorInput: "#050506",
    colorInputForeground: WHITE,
    colorNeutral: WHITE,
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
  },
};
