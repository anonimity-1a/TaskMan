export const apiBase = () => {
  const configured = import.meta.env.VITE_API_URL;
  if (typeof configured === "string" && configured.trim()) {
    return configured.trim().replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol;
    if (protocol === "chrome-extension:") {
      return "https://taskman.aamoghtech.org/api";
    }
    if (protocol === "file:") {
      return "http://127.0.0.1:8787/api";
    }
  }
  return "/api";
};
