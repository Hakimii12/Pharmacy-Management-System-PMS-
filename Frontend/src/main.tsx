import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { PersistGate } from "redux-persist/integration/react"
import { BrowserRouter } from "react-router-dom"

import App from "./App"
import { persistor, store } from "./app/store"
import { registerServiceWorker } from "./service-worker/register"
import "./styles/index.css"

const container = document.getElementById("root")
if (!container) throw new Error("Root element not found")

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </StrictMode>,
)

registerServiceWorker()
