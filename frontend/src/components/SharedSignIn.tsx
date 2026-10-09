import { useEffect } from "react";

/** Doctors and management sign in on the same page as everyone else. */
export function SharedSignIn() {
  useEffect(() => window.location.replace("/login"), []);
  return null;
}
