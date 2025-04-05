import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./Components/Home";
import ClientLogin from "./Components/ClientLogin";
import DriverLogin from "./Components/DriverLogin";
import ClientMap from "./Components/ClientLocation";
import DriverMap from "./Components/DriverMap";
import ApiKeyHelper from "./Components/ApiKeyHelper";
import DriverRegistration from "./Components/DriverRegistration";
import ClientRegistration from "./Components/ClientRegistration";
import DriverDashboard from "./Components/DriverDashboard";
import { useState, useEffect } from "react";

function App() {
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    // Check if the API key is set
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
      setHasApiKey(false);
    }
  }, []);

  if (!hasApiKey) {
    return <ApiKeyHelper />;
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/Home" replace />} />
          <Route path="/Home" element={<Home />} />
          <Route path="/DriverLogin" element={<DriverLogin />} />
          <Route path="/ClientLogin" element={<ClientLogin />} />
          <Route path="/DriverMap" element={<DriverMap />} />
          <Route path="/ClientLocation" element={<ClientMap />} />
          <Route path="/DriverRegistration" element={<DriverRegistration />} />
          <Route path="/ClientRegistration" element={<ClientRegistration />} />
          <Route path="/DriverDashboard" element={<DriverDashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
