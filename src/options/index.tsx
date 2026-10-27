import { subscribeTheme } from "../theme/theme";
import "../theme/theme.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Options } from "./Options";

subscribeTheme(document.documentElement);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Options />
  </StrictMode>
);
