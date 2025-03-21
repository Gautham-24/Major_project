import React, { useState } from "react";
import Header from "./Header";
import Meta from "../Assets/Images/MetaMask.png";
import { useNavigate } from "react-router-dom";
import "../Styles/DriverLogin.css";
import DriverBackground from "../Assets/Images/Driver-BG.jpg";
import axios from "axios";

// Define server URLs with fallbacks - updated to include /api prefix
const SERVER_URLS = ["http://localhost:8080"];

function DriverLogin() {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function requestAccount() {
    setIsConnecting(true);
    setErrorMessage("");

    try {
      if (window.ethereum) {
        console.log("MetaMask Detected!");
        try {
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          console.log("Ethereum Accounts:", accounts);

          // First check if the driver is already registered
          try {
            const checkResponse = await axios.get(
              `${SERVER_URLS[0]}/api/driver-by-account/${accounts[0]}`,
              { withCredentials: true }
            );

            if (checkResponse.data.success && checkResponse.data.driver) {
              // Driver is registered, proceed with login
              console.log("Driver found:", checkResponse.data.driver);
              localStorage.setItem(
                "driverId",
                checkResponse.data.driver.driverId
              );
              localStorage.setItem("metaAccount", accounts[0]);
              setIsConnecting(false);
              navigate("/DriverMap");
              return;
            }
          } catch (error) {
            // If 404, driver not found, which means they need to register
            if (error.response && error.response.status === 404) {
              setIsConnecting(false);
              setErrorMessage(
                "You are not registered as a driver. Please register first."
              );
              return;
            }
            // For other errors, continue with the login attempt
            console.error("Error checking driver registration:", error);
          }

          // Try connecting to different server URLs
          let connected = false;
          let lastError = null;

          try {
            // Make the axios POST request to the backend with the correct API path
            const response = await axios({
              method: "post",
              url: `${SERVER_URLS[0]}/api/login`,
              data: { username: accounts[0] },
              withCredentials: true,
              timeout: 5000, // 5 second timeout
            });

            // Handle successful response
            console.log("Response from backend:", response.data);
            connected = true;
            setIsConnecting(false);
            // Navigate to /DriverMap after a successful response
            navigate("/DriverMap");
          } catch (error) {
            console.error(`Error connecting to ${SERVER_URLS[0]}:`, error);
            lastError = error;
          }

          if (!connected) {
            setIsConnecting(false);
            setErrorMessage(
              "Error connecting to server. Please try again later."
            );
          }
        } catch (error) {
          console.log("Error Connecting to MetaMask:", error);
          setIsConnecting(false);
          setErrorMessage(
            "Error connecting to MetaMask. Please make sure you have approved the connection."
          );
        }
      } else {
        setIsConnecting(false);
        setErrorMessage(
          "MetaMask not detected! Please install MetaMask to continue."
        );
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setIsConnecting(false);
      setErrorMessage("An unexpected error occurred. Please try again.");
    }
  }

  return (
    <>
      <Header />
      <div className="DriverLogin-Container">
        <div className="DriverLogin-Left">
          <div className="DriverLogin-Left-Content">
            <h2>Driver Login</h2>
            <p>Connect your MetaMask wallet to continue as a driver</p>
            <button
              className="DriverLogin-Button"
              onClick={requestAccount}
              disabled={isConnecting}
            >
              {isConnecting ? (
                "Connecting..."
              ) : (
                <>
                  <img src={Meta} alt="MetaMask" className="MetaMask-Logo" />
                  Connect with MetaMask
                </>
              )}
            </button>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            <div className="registration-link">
              <p>
                New to RideApp?{" "}
                <a href="/DriverRegistration">Register as a Driver</a>
              </p>
            </div>
          </div>
        </div>
        <div className="DriverLogin-Right">
          <img
            src={DriverBackground}
            alt="Driver"
            className="DriverLogin-Image"
          />
        </div>
      </div>
    </>
  );
}

export default DriverLogin;
