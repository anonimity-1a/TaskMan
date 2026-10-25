import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import { App } from "../src/App.jsx";
import "../src/styles.css";
import "./popup.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
