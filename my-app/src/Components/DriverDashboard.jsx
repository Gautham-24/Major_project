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
import RatingComponent from "./RatingComponent";

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
  const [driverRating, setDriverRating] = useState({ average: 0, total: 0 });
  // Add state for profile edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    carModel: "",
    licensePlate: "",
    carColor: "",
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState(null);

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

          // Fetch real driver statistics from the backend
          try {
            const statsResponse = await axios.get(
              `http://localhost:8080/api/driver-stats/${driverId}`,
              { withCredentials: true }
            );

            if (statsResponse.data.success && statsResponse.data.stats) {
              const { completedRides, activeRides, totalEarnings } =
                statsResponse.data.stats;
              setRideStats({
                completed: completedRides || 0,
                active: activeRides || 0,
                totalEarnings: parseFloat(totalEarnings) || 0,
              });
            } else {
              // If stats cannot be fetched, use zero values
              setRideStats({
                completed: 0,
                active: 0,
                totalEarnings: 0,
              });
              console.error(
                "Error in stats response:",
                statsResponse.data.message
              );
            }
          } catch (statsError) {
            console.error("Error fetching ride statistics:", statsError);
            // If error occurs, use zero values
            setRideStats({
              completed: 0,
              active: 0,
              totalEarnings: 0,
            });
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

  const fetchDriverRating = async (driverId) => {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/drivers/${driverId}/rating`
      );
      if (response.data.success) {
        setDriverRating({
          average: response.data.averageRating,
          total: response.data.totalRatings,
        });
      }
    } catch (error) {
      console.error("Error fetching driver rating:", error);
    }
  };

  useEffect(() => {
    if (driverData && driverData.driverId) {
      fetchDriverRating(driverData.driverId);
    }
  }, [driverData]);

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

  // Function to open edit modal and populate form with current data
  const openEditModal = () => {
    if (driverData) {
      setEditFormData({
        name: driverData.name || "",
        email: driverData.email || "",
        phone: driverData.phone || "",
        carModel: driverData.carModel || "",
        licensePlate: driverData.licensePlate || "",
        carColor: driverData.carColor || "",
      });
      setShowEditModal(true);
    }
  };

  // Function to handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value,
    });
  };

  // Function to handle form submission
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateError(null);

    try {
      const metaAccount = localStorage.getItem("metaAccount");
      if (!metaAccount) {
        throw new Error("MetaMask account not found. Please log in again.");
      }

      // Send update request to the backend API
      const response = await axios.put(
        "http://localhost:8080/api/driver/update",
        {
          metaAccount,
          name: editFormData.name,
          email: editFormData.email,
          phone: editFormData.phone,
          carModel: editFormData.carModel,
          licensePlate: editFormData.licensePlate,
          carColor: editFormData.carColor,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        // Update the driver data in state
        setDriverData(response.data.driver);

        // Close the modal
        setShowEditModal(false);
      } else {
        throw new Error(response.data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setUpdateError(error.message || "Failed to update profile");
    } finally {
      setUpdateLoading(false);
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
            <h3 className="stat-value">
              {rideStats.totalEarnings.toFixed(4)} ETH
            </h3>
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
    <div className="driver-profile-section">
      {driverData ? (
        <div className="profile-container">
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
              <label>Car Model:</label>
              <p>{driverData.carModel || "Not provided"}</p>
            </div>

            <div className="info-group">
              <label>License Plate:</label>
              <p>{driverData.licensePlate || "Not provided"}</p>
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
              <label>Rating:</label>
              <RatingComponent driverId={driverData.driverId} readOnly={true} />
            </div>

            <div className="info-group">
              <label>Car Color:</label>
              <p>{driverData.carColor || "Not provided"}</p>
            </div>

            <div className="info-group ride-stats">
              <label>Ride Statistics:</label>
              <div className="profile-stats">
                <div className="profile-stat-item">
                  <span className="stat-icon-small completed">
                    <FaClipboardList />
                  </span>
                  <span className="stat-label">Completed:</span>
                  <span className="stat-value">{rideStats.completed}</span>
                </div>
                <div className="profile-stat-item">
                  <span className="stat-icon-small active">
                    <FaCarAlt />
                  </span>
                  <span className="stat-label">Active:</span>
                  <span className="stat-value">{rideStats.active}</span>
                </div>
                <div className="profile-stat-item">
                  <span className="stat-icon-small earnings">
                    <FaWallet />
                  </span>
                  <span className="stat-label">Earnings:</span>
                  <span className="stat-value">
                    {rideStats.totalEarnings.toFixed(4)} ETH
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="loading-indicator">Loading profile...</div>
      )}

      <div className="profile-actions">
        <button className="edit-profile-btn" onClick={openEditModal}>
          Edit Profile
        </button>
        <button
          className="cancel-btn"
          onClick={() => setActiveSection("dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  // Edit Profile Modal
  const renderEditProfileModal = () => (
    <div className={`edit-profile-modal ${showEditModal ? "show" : ""}`}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Edit Profile</h2>
          <button className="close-btn" onClick={() => setShowEditModal(false)}>
            ×
          </button>
        </div>

        <form onSubmit={handleUpdateProfile}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={editFormData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={editFormData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={editFormData.phone}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="carModel">Car Model</label>
            <input
              type="text"
              id="carModel"
              name="carModel"
              value={editFormData.carModel}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="licensePlate">License Plate</label>
            <input
              type="text"
              id="licensePlate"
              name="licensePlate"
              value={editFormData.licensePlate}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="carColor">Car Color</label>
            <input
              type="text"
              id="carColor"
              name="carColor"
              value={editFormData.carColor}
              onChange={handleInputChange}
              required
            />
          </div>

          {updateError && <div className="error-message">{updateError}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => setShowEditModal(false)}
              disabled={updateLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="update-btn"
              disabled={updateLoading}
            >
              {updateLoading ? "Updating..." : "Update Profile"}
            </button>
          </div>
        </form>
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

      {/* Render the edit profile modal */}
      {renderEditProfileModal()}
    </div>
  );
}

export default DriverDashboard;
