import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../Styles/DriverDashboard.css";
import {
  FaUser,
  FaTachometerAlt,
  FaCarAlt,
  FaClipboardList,
  FaSignOutAlt,
  FaWallet,
} from "react-icons/fa";

function DriverDashboard() {
  const navigate = useNavigate();
  const [driverData, setDriverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [rideStats, setRideStats] = useState({
    completed: 0,
    active: 0,
    totalEarnings: 0,
  });

  useEffect(() => {
    const fetchDriverData = async () => {
      setLoading(true);
      try {
        const driverId = localStorage.getItem("driverId");
        const metaAccount = localStorage.getItem("metaAccount");

        if (!driverId || !metaAccount) {
          setError("No driver credentials found. Please login again.");
          navigate("/DriverLogin");
          return;
        }

        // Fetch driver data
        const response = await axios.get(
          `http://localhost:8080/api/driver-by-account/${metaAccount}`,
          { withCredentials: true }
        );

        if (response.data.success && response.data.driver) {
          setDriverData(response.data.driver);

          // Sample code to fetch ride statistics
          // In a real app, you would fetch this from your backend
          try {
            // This is just a placeholder - replace with actual API call
            // const statsResponse = await axios.get(
            //   `http://localhost:8080/api/driver-statistics/${driverId}`,
            //   { withCredentials: true }
            // );

            // Instead of actual API, using mock data for now
            setRideStats({
              completed: Math.floor(Math.random() * 20),
              active: Math.floor(Math.random() * 3),
              totalEarnings: Math.floor(Math.random() * 1000),
            });
          } catch (statsError) {
            console.error("Error fetching ride statistics:", statsError);
          }
        } else {
          setError("Failed to load driver data");
        }
      } catch (err) {
        console.error("Error fetching driver data:", err);
        setError("Error loading driver information");
      } finally {
        setLoading(false);
      }
    };

    fetchDriverData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("driverId");
    localStorage.removeItem("metaAccount");
    navigate("/DriverLogin");
  };

  const navigateToMap = (viewType) => {
    if (viewType === "post") {
      navigate("/DriverMap?view=post");
    } else {
      navigate("/DriverMap?view=rides");
    }
  };

  // Dashboard content
  const renderDashboard = () => (
    <div className="dashboard-content">
      <h2>Driver Dashboard</h2>

      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon completed">
            <FaClipboardList />
          </div>
          <div className="stat-details">
            <h3 className="stat-value">{rideStats.completed}</h3>
            <p className="stat-label">Completed Rides</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon active">
            <FaCarAlt />
          </div>
          <div className="stat-details">
            <h3 className="stat-value">{rideStats.active}</h3>
            <p className="stat-label">Active Rides</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon earnings">
            <FaWallet />
          </div>
          <div className="stat-details">
            <h3 className="stat-value">${rideStats.totalEarnings}</h3>
            <p className="stat-label">Total Earnings</p>
          </div>
        </div>
      </div>

      <div className="dashboard-cards">
        <div className="dashboard-card" onClick={() => navigateToMap("post")}>
          <div className="card-icon">🚗</div>
          <h3>Post Ride</h3>
          <p>Create a new ride offer for passengers</p>
        </div>

        <div className="dashboard-card" onClick={() => navigateToMap("rides")}>
          <div className="card-icon">📋</div>
          <h3>My Rides</h3>
          <p>View and manage your current rides</p>
        </div>

        <div
          className="dashboard-card"
          onClick={() => setActiveSection("profile")}
        >
          <div className="card-icon">👤</div>
          <h3>Profile</h3>
          <p>View and update your profile information</p>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">💰</div>
          <h3>Earnings</h3>
          <p>Track your earnings and payment history</p>
        </div>
      </div>
    </div>
  );

  // Profile content
  const renderProfile = () => (
    <div className="profile-content">
      <h2>Driver Profile</h2>

      {driverData && (
        <div className="profile-details">
          <div className="profile-picture">
            <div className="profile-avatar">
              {driverData.name ? driverData.name.charAt(0).toUpperCase() : "D"}
            </div>
          </div>

          <div className="profile-info">
            <div className="info-group">
              <label>Name:</label>
              <p>{driverData.name || "Not provided"}</p>
            </div>

            <div className="info-group">
              <label>Email:</label>
              <p>{driverData.email || "Not provided"}</p>
            </div>

            <div className="info-group">
              <label>Phone:</label>
              <p>{driverData.phone || "Not provided"}</p>
            </div>

            <div className="info-group">
              <label>Wallet Address:</label>
              <p className="wallet-address">
                {driverData.walletAddress ||
                  driverData.metaAccount ||
                  "Not connected"}
              </p>
            </div>

            <div className="info-group">
              <label>Driver ID:</label>
              <p>{driverData.driverId || "Unknown"}</p>
            </div>

            <div className="info-group">
              <label>Car Model:</label>
              <p>{driverData.carModel || "Not provided"}</p>
            </div>

            <div className="info-group">
              <label>License Plate:</label>
              <p>{driverData.licensePlate || "Not provided"}</p>
            </div>

            <div className="info-group">
              <label>Car Color:</label>
              <p>{driverData.carColor || "Not provided"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="profile-actions">
        <button className="edit-profile-btn">Edit Profile</button>
        <button
          className="cancel-btn"
          onClick={() => setActiveSection("dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="driver-dashboard-wrapper">
      <div className="dashboard-header">
        <div className="dashboard-logo">
          <h1>RideApp</h1>
        </div>
        <div className="dashboard-user">
          {driverData && (
            <>
              <span className="user-greeting">
                Hello, {driverData.name || "Driver"}
              </span>
              <div
                className="user-avatar"
                onClick={() => setActiveSection("profile")}
              >
                {driverData.name
                  ? driverData.name.charAt(0).toUpperCase()
                  : "D"}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="driver-dashboard-container">
        <div className="dashboard-sidebar">
          <div className="sidebar-profile">
            {driverData && (
              <div
                className="sidebar-avatar"
                onClick={() => setActiveSection("profile")}
              >
                {driverData.name
                  ? driverData.name.charAt(0).toUpperCase()
                  : "D"}
              </div>
            )}
            <div className="sidebar-user-info">
              <h3>{driverData ? driverData.name || "Driver" : "Driver"}</h3>
              <p className="user-status">Online</p>
            </div>
          </div>

          <ul className="sidebar-menu">
            <li
              className={activeSection === "dashboard" ? "active" : ""}
              onClick={() => setActiveSection("dashboard")}
            >
              <FaTachometerAlt className="menu-icon" />
              <span>Dashboard</span>
            </li>
            <li
              className={activeSection === "profile" ? "active" : ""}
              onClick={() => setActiveSection("profile")}
            >
              <FaUser className="menu-icon" />
              <span>Profile</span>
            </li>
            <li onClick={() => navigateToMap("post")}>
              <FaCarAlt className="menu-icon" />
              <span>Post Ride</span>
            </li>
            <li onClick={() => navigateToMap("rides")}>
              <FaClipboardList className="menu-icon" />
              <span>My Rides</span>
            </li>
            <li onClick={handleLogout}>
              <FaSignOutAlt className="menu-icon" />
              <span>Logout</span>
            </li>
          </ul>
        </div>

        <div className="dashboard-main">
          {loading ? (
            <div className="loading-indicator">Loading...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <>
              {activeSection === "dashboard" && renderDashboard()}
              {activeSection === "profile" && renderProfile()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DriverDashboard;
