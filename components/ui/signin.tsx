"use client";
import { signIn } from "next-auth/react";
import { useEffect } from "react";

export const SignIn = () => {
  useEffect(() => {
    signIn();
  }, []);
  return <></>;
};
