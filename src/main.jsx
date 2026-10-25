import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import { App } from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
