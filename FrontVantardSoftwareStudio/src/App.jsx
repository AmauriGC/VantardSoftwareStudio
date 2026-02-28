import "./App.css";

import { ENV } from "./config/env.js";

function App() {
  const appName = ENV.APP_NAME;

  return (
    <div className="bg-gray-50 w-full h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold text-gray-800">{appName}</h1>
      <span className="text-gray-600">Despliega rápido. Escala seguro. Controla todo.</span>
    </div>
  );
}

export default App;
