import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../Styles/Registration.css";

function DriverRegistration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    carModel: "",
    licensePlate: "",
    carColor: "",
  });
  const [metaAccount, setMetaAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Connect to MetaMask
  const connectToMetaMask = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setMetaAccount(accounts[0]);
        return accounts[0];
      } else {
        setError(
          "MetaMask is not installed. Please install MetaMask to continue."
        );
        return null;
      }
    } catch (error) {
      setError("Error connecting to MetaMask: " + error.message);
      return null;
    }
  };

  // Check if driver is already registered
  const checkDriverRegistration = async (account) => {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/driver-by-account/${account}`,
        { withCredentials: true }
      );

      if (response.data.success && response.data.driver) {
        // Driver already registered, show message and redirect after delay
        setError(null);
        setSuccess(true);
        localStorage.setItem("driverId", response.data.driver.driverId);
        localStorage.setItem("metaAccount", account);

        // Show already registered message
        setSuccess(false); // Reset success to avoid showing "Registration successful"
        setError(
          "You are already registered as a driver. Redirecting to driver dashboard..."
        );

        // Redirect after a short delay
        setTimeout(() => {
          navigate("/DriverMap");
        }, 2000);
        return true;
      }
      return false;
    } catch (error) {
      // If 404, driver not found, which is expected
      if (error.response && error.response.status === 404) {
        return false;
      }
      console.error("Error checking driver registration:", error);
      return false;
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Ensure MetaMask is connected
      const account = metaAccount || (await connectToMetaMask());
      if (!account) {
        setError("Please connect your MetaMask account to continue.");
        setIsLoading(false);
        return;
      }

      // Check if already registered
      const isRegistered = await checkDriverRegistration(account);
      if (isRegistered) {
        // Already handled in checkDriverRegistration
        setIsLoading(false);
        return;
      }

      // Register driver
      const response = await axios.post(
        "http://localhost:8080/api/driver-register",
        {
          metaAccount: account,
          ...formData,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(true);
        setError(null);
        localStorage.setItem("driverId", response.data.driverId);
        localStorage.setItem("metaAccount", account);

        // Redirect after a short delay
        setTimeout(() => {
          navigate("/DriverMap");
        }, 1500);
      } else {
        setError(
          response.data.message || "Registration failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Error in driver registration:", error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        if (error.response.data.message.includes("already registered")) {
          // If already registered, try to get the ID and redirect
          const account = metaAccount || (await connectToMetaMask());
          await checkDriverRegistration(account);
        } else {
          setError(error.response.data.message);
        }
      } else {
        setError("Registration failed. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Connect to MetaMask on component mount
  useEffect(() => {
    connectToMetaMask();
  }, []);

  return (
    <div className="registration-container">
      <div className="registration-form-container">
        <h2>Driver Registration</h2>

        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="success-message">
            Registration successful! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="Enter your phone number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="carModel">Car Model</label>
            <input
              type="text"
              id="carModel"
              name="carModel"
              value={formData.carModel}
              onChange={handleChange}
              required
              placeholder="Enter your car model"
            />
          </div>

          <div className="form-group">
            <label htmlFor="licensePlate">License Plate</label>
            <input
              type="text"
              id="licensePlate"
              name="licensePlate"
              value={formData.licensePlate}
              onChange={handleChange}
              required
              placeholder="Enter your license plate"
            />
          </div>

          <div className="form-group">
            <label htmlFor="carColor">Car Color</label>
            <input
              type="text"
              id="carColor"
              name="carColor"
              value={formData.carColor}
              onChange={handleChange}
              required
              placeholder="Enter your car color"
            />
          </div>

          <div className="wallet-info">
            <p>
              Connected Wallet:{" "}
              {metaAccount
                ? `${metaAccount.substring(0, 6)}...${metaAccount.substring(
                    metaAccount.length - 4
                  )}`
                : "Not connected"}
            </p>
            {!metaAccount && (
              <button
                type="button"
                className="connect-wallet-button"
                onClick={connectToMetaMask}
              >
                Connect Wallet
              </button>
            )}
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isLoading || !metaAccount}
          >
            {isLoading ? "Registering..." : "Register as Driver"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default DriverRegistration;
