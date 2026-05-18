import { useEffect } from "react";

const GA_MEASUREMENT_ID = "G-C2FMPPN15R";
const ALLOWED_HOSTS = ["mindsell.ia.br", "www.mindsell.ia.br"];

/**
 * Injeta a Google tag (gtag.js) apenas no site institucional (mindsell.ia.br).
 * Não carrega em app.mindsell.ia.br nem em ambientes de preview/localhost.
 */
export const GoogleAnalytics = (): null => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ALLOWED_HOSTS.includes(window.location.hostname)) return;
    if (document.getElementById("ga-gtag-src")) return;

    const script = document.createElement("script");
    script.id = "ga-gtag-src";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    const inline = document.createElement("script");
    inline.id = "ga-gtag-init";
    inline.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_MEASUREMENT_ID}');
    `;
    document.head.appendChild(inline);
  }, []);

  return null;
};

export default GoogleAnalytics;
