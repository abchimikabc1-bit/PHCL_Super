"use client";

import { useEffect } from "react";
import { initFirebaseAnalytics } from "@/lib/firebaseClient";

export default function FirebaseAnalytics() {
  useEffect(() => {
    initFirebaseAnalytics();
  }, []);

  return null;
}