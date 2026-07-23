"use client";

import { useEffect } from "react";

const TAWK_PROPERTY_ID = "646f1d5874285f0ec46d8d19";

interface TawkToChatProps {
  visitorName?: string;
  visitorEmail?: string;
}

export default function TawkToChat({ visitorName, visitorEmail }: TawkToChatProps) {
  useEffect(() => {
    // Prevent duplicate script injection
    if (document.getElementById("tawk-script")) return;

    const Tawk_API = (window as any).Tawk_API || {};
    (window as any).Tawk_API = Tawk_API;
    (window as any).Tawk_LoadStart = new Date();

    // Pre-chat form: empty name/email triggers tawk.to's pre-chat form
    // to collect visitor info before the chat begins
    Tawk_API.visitor = {
      name: visitorName || "",
      email: visitorEmail || "",
    };

    const s1 = document.createElement("script");
    s1.id = "tawk-script";
    s1.async = true;
    s1.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/default`;
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    document.body.appendChild(s1);
  }, [visitorName, visitorEmail]);

  return null;
}
