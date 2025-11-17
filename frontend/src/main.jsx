import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { store } from "./Store/store.js";
import { Provider } from "react-redux";
import React from "react";

createRoot(document.getElementById("root")).render(
  
    <Provider store={store}>
      <App />
    </Provider>
  
);
