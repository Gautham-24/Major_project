import React, { useState } from "react";
import Header from "./Header";
import Meta from "../Assets/Images/MetaMask.png";
import { useNavigate } from "react-router-dom";
import "../Styles/DriverLogin.css";
import ClientLogo from "../Assets/Images/Client-Logo.jpg";
import axios from "axios";

// Define server URLs with fallbacks - updated to include /api prefix
const SERVER_URLS = ["http://localhost:8080"];

function ClientLogin() {
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
          // Request accounts from MetaMask
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          console.log("Ethereum Accounts:", accounts);

          // First check if the client is already registered
          try {
            const checkResponse = await axios.get(
              `${SERVER_URLS[0]}/api/client-by-account/${accounts[0]}`,
              { withCredentials: true }
            );

            if (checkResponse.data.success && checkResponse.data.client) {
              // Client is registered, proceed with login
              console.log("Client found:", checkResponse.data.client);
              localStorage.setItem(
                "clientId",
                checkResponse.data.client.clientId
              );
              localStorage.setItem("metaAccount", accounts[0]);
              setIsConnecting(false);
              navigate("/ClientLocation");
              return;
            }
          } catch (error) {
            // If 404, client not found, which means they need to register
            if (error.response && error.response.status === 404) {
              setIsConnecting(false);
              setErrorMessage(
                "You are not registered as a rider. Please register first."
              );
              return;
            }
            // For other errors, continue with the login attempt
            console.error("Error checking client registration:", error);
          }

          // Try connecting to the server
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
            setIsConnecting(false);
            // Navigate to /ClientLocation after a successful response
            navigate("/ClientLocation");
          } catch (error) {
            console.error(`Error connecting to ${SERVER_URLS[0]}:`, error);
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
      <div className="ClientLogin-Container">
        <div className="ClientLogin-Left">
          <div className="ClientLogin-Left-Content">
            <h2>Rider Login</h2>
            <p>Connect your MetaMask wallet to continue as a rider</p>
            <button
              className="ClientLogin-Button"
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
                New to ChainRide?{" "}
                <a href="/ClientRegistration">Register as a Rider</a>
              </p>
            </div>
          </div>
        </div>
        <div className="ClientLogin-Right">
          <img src={ClientLogo} alt="Client" className="ClientLogin-Image" />
        </div>
      </div>
    </>
  );
}

export default ClientLogin;
