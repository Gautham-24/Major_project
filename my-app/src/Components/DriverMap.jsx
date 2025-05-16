/* global google */
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  APIProvider,
  Map,
  useMapsLibrary,
  useMap,
  Marker,
} from "@vis.gl/react-google-maps";
import axios, { Axios } from "axios";
import Thumbnail from "../Assets/Images/Car-Thumbnail.png";
import DestinationMarker from "../Assets/Images/DestinationMarker.png";
import "../Styles/DriverMap.css";
import Logo from "../Assets/Images/Logo.png";
import Web3 from "web3";
import ChainRideContract from "../Contracts/ChainRideContract.json";
import {
  FaUser,
  FaTachometerAlt,
  FaCarAlt,
  FaClipboardList,
  FaSignOutAlt,
  FaWallet,
  FaMapMarkedAlt,
  FaArrowLeft,
  FaLocationArrow,
} from "react-icons/fa";

function DriverMap() {
  const navigate = useNavigate();
  const location = useLocation();
  const [viewParam, setViewParam] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [driverId, setDriverId] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [error, setError] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [clientIdChecking, setClientIdChecking] = useState(null);
  const [rideCompletionCheck, setRideCompletionCheck] = useState(null);
  const [metaAccount, setMetaAccount] = useState(null);
  const [clientSearchActive, setClientSearchActive] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [selectedclinetId, setSelectedClientId] = useState(null);
  const [foundRide, setFoundRide] = useState(null);
  const [shorestDistance, setshorestDistance] = useState(null);
  const [rideCost, setRideCost] = useState(null);
  const [rideAccepted, setRideAccepted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recievedRide, setRecievedRide] = useState(false);
  const [driverInitalData, setdriverInitalData] = useState(false);
  const [initalMount, setInitalMount] = useState(true);
  const [destination, setDestination] = useState(null);
  const [totalTime, setTotalTime] = useState(null);
  const [clientSet, setClientSet] = useState(true);
  const [showPostRideForm, setShowPostRideForm] = useState(true);
  const [ridePrice, setRidePrice] = useState("");
  const [availableSeats, setAvailableSeats] = useState("1");
  const [departureTime, setDepartureTime] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [myRides, setMyRides] = useState([]);
  const [rideRequests, setRideRequests] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [startLocationName, setStartLocationName] = useState("");
  const [pickupPoint, setPickupPoint] = useState("");
  const [pickupLocation, setPickupLocation] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [showRequests, setShowRequests] = useState(false);
  const [ridePassengers, setRidePassengers] = useState([]);
  const [passengerLoading, setPassengerLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("requests");

  // This useEffect will run when the component mounts and when the URL changes
  useEffect(() => {
    // Parse the URL search params to get the view parameter
    const queryParams = new URLSearchParams(location.search);
    const view = queryParams.get("view");

    if (view) {
      setViewParam(view);
      if (view === "post") {
        setShowPostRideForm(true);
        setSelectedRide(null);
      } else if (view === "rides") {
        setShowPostRideForm(false);
        fetchMyRides();
      }
    }
  }, [location.search]);

  const connectToMetaMask = async () => {
    try {
      if (window.ethereum) {
        // Request accounts from MetaMask
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setMetaAccount(accounts[0]);
        return accounts[0];
      } else {
        console.error("MetaMask is not installed");
        setError("MetaMask is not installed");
        return null;
      }
    } catch (error) {
      console.error("Error fetching MetaMask account:", error);
      setError("MetaMask connection error");
      return null;
    }
  };

  async function UpdateLocation() {
    const metaAccount = await connectToMetaMask();
    if (!currentPosition || !driverId || !metaAccount) return;
    const { lat: latitude, lng: longitude } = currentPosition;
    console.log("Updating location...");

    try {
      const response = await axios.post(
        "http://localhost:8080/api/save-Driver-location",
        {
          driverId,
          latitude,
          longitude,
          metaAccount,
        },
        { withCredentials: true }
      );

      setdriverInitalData(response.data);

      console.log("Response from backend:", response.data);
    } catch (error) {
      console.error("Error updating location:", error);
    }
  }

  // Function to get a unique driverId from the backend
  const fetchDriverId = async () => {
    try {
      // First get MetaMask account
      const metaAccount = await connectToMetaMask();
      if (!metaAccount) {
        console.error("MetaMask account not available");
        return;
      }

      // Try to get existing driver ID first
      try {
        const getDriverResponse = await axios.get(
          `http://localhost:8080/api/driver-by-account/${metaAccount}`,
          { withCredentials: true }
        );

        if (getDriverResponse.data.success && getDriverResponse.data.driver) {
          const driverId = getDriverResponse.data.driver.driverId;
          localStorage.setItem("driverId", driverId);
          setDriverId(driverId);
          console.log("Found existing driver with ID:", driverId);
          return;
        }
      } catch (error) {
        console.log("No existing driver found, will register a new one");
      }

      // Register driver if not found
      try {
        const registerResponse = await axios.post(
          "http://localhost:8080/api/driver-register",
          {
            metaAccount,
            name: "Driver " + metaAccount.substring(0, 6),
            email: `driver_${metaAccount.substring(0, 6)}@example.com`,
            phone: "123-456-7890",
            carModel: "Toyota Camry",
            licensePlate: "ABC" + metaAccount.substring(0, 3),
            carColor: "Blue",
          },
          { withCredentials: true }
        );

        if (registerResponse.data.success) {
          const driverId = registerResponse.data.driverId;
          localStorage.setItem("driverId", driverId);
          setDriverId(driverId);
          console.log("Driver registered with ID:", driverId);
        } else {
          console.error(
            "Error registering driver:",
            registerResponse.data.message
          );
        }
      } catch (error) {
        // If driver already registered, try to get the ID again
        if (
          error.response &&
          error.response.data &&
          error.response.data.message &&
          error.response.data.message.includes("already registered")
        ) {
          console.log("Driver already registered, fetching ID");
          try {
            const getDriverResponse = await axios.get(
              `http://localhost:8080/api/driver-by-account/${metaAccount}`,
              { withCredentials: true }
            );

            if (
              getDriverResponse.data.success &&
              getDriverResponse.data.driver
            ) {
              const driverId = getDriverResponse.data.driver.driverId;
              localStorage.setItem("driverId", driverId);
              setDriverId(driverId);
              console.log("Retrieved existing driver ID:", driverId);
            }
          } catch (innerError) {
            console.error("Error fetching existing driver:", innerError);
          }
        } else {
          console.error("Error in driver registration:", error);
          if (error.response && error.response.status === 503) {
            alert(
              "Blockchain service is not initialized. Please try again later."
            );
          }
        }
      }
    } catch (error) {
      console.error("Error in driver registration/fetching:", error);
      if (error.response && error.response.status === 503) {
        alert("Blockchain service is not initialized. Please try again later.");
      }
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("Driver Location: " + latitude + " : " + longitude);
          setCurrentPosition({ lat: latitude, lng: longitude });
        },
        (err) => {
          setError("Error: " + err.message);
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  };

  // Verify user authentication
  const verifyCookie = async () => {
    try {
      const response = await axios.post(
        "http://localhost:8080/api/verified",
        null,
        {
          withCredentials: true,
        }
      );
      setVerificationResult(response.data);
    } catch (err) {
      console.error("Verification failed:", err);
      navigate("../DriverLogin");
      setVerificationResult(null);
    }
  };

  const SetDestination = async () => {
    if (destinationName && !destination) {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            destinationName
          )}&key=AIzaSyDot_e6Wp6K8J8-3bLWUGBzKoqYnzKo5Ek`
        );

        if (response.data.results && response.data.results.length > 0) {
          const location = response.data.results[0].geometry.location;
          setDestination({
            lat: location.lat,
            lng: location.lng,
          });
          console.log("Set destination from name:", destinationName, location);
        }
      } catch (error) {
        console.error("Error geocoding destination name:", error);
      }
    }
  };

  useEffect(() => {
    if (selectedclinetId) {
      console.log("Updated selectedClientId:", selectedclinetId);
      setClient(); // Trigger the client data fetch
    } else {
      console.log("selectedclinetId is not set.");
    }
  }, [selectedclinetId]); // Runs whenever selectedClientId changes

  const setClient = async () => {
    try {
      // Only make the API call if clientIdChecking is a valid value (not null, not undefined, not true)
      if (
        clientIdChecking &&
        clientIdChecking !== true &&
        clientIdChecking !== "null"
      ) {
        console.log(
          "Making GET request to /api/client with clientId:",
          clientIdChecking
        );
        const response = await axios.get(
          `http://localhost:8080/api/client/${clientIdChecking}`,
          {
            withCredentials: true,
          }
        );

        if (response.data.success) {
          setSelectedClientId(response.data.client.clientId);
          console.log("Response received:", response.data);
          setClientData(response.data.client);
          RideCompleted(response.data.client);
        } else {
          console.error("Error in response:", response.data.message);
          // Don't show alert for normal "Client not found" responses
          if (response.data.message !== "Client not found") {
            alert(`Error: ${response.data.message}`);
          }
        }
      } else {
        console.log("No valid clientId to check, skipping API call");
      }
    } catch (error) {
      console.error("Error fetching client data:", error);

      // Only show alerts for actual errors, not for missing clients
      if (error.response) {
        if (error.response.status === 503) {
          alert(
            "Blockchain service is not initialized. Please try again later."
          );
        } else if (error.response.status !== 404) {
          alert("Error fetching client data. Please try again.");
        }
      }
    }
  };

  const RideCompleted = async (response) => {
    UpdateLocation();
    setClientSearchActive(false);
    if (clientData === null) return;
    console.log(`Client Data here: -->` + clientData);

    let RideComplionDistance = null;

    let DriverDistance = calculateDistance(
      response.ClientDestinationLatiture,
      response.ClientDestinationLongitude,
      response.latitude,
      response.longitude
    );
    let Clientdistance = calculateDistance(
      currentPosition.lat,
      currentPosition.lng,
      response.longitude,
      response.latitude
    );

    RideComplionDistance = DriverDistance + Clientdistance;
    RideComplionDistance = parseFloat(RideComplionDistance);
    console.log(`Ride Inproess <-----...` + RideComplionDistance);
    console.log(RideComplionDistance);
    let id = clientData.clientId;

    if (RideComplionDistance < 10 && response.clientPicked) {
      setRideCompletionCheck(true);

      try {
        const response = await axios.post(
          "http://localhost:8080/api/set-RideComplete",
          {
            id,
          }
        );
        console.log("Response received:", response.data);
      } catch (error) {
        if (error.response) {
          // Server responded with a status code out of the 2xx range
          console.error("Error response from server:", error.response.data);
          console.error("Status code:", error.response.status);
        }
      }

      //////////////////////////
      console.log(`Ride Completed...`);
    } else {
      console.log("Destination does not match the client destination.");
    }
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let km = R * c;
    return km.toFixed(3);
  };

  const RadiusCheck = (res) => {
    if (res || clientData) {
      let id = res.clientId;

      let distance = calculateDistance(
        res.latitude,
        res.longitude,
        currentPosition.lat,
        currentPosition.lng
      );
      distance = parseFloat(distance);

      console.log("---->" + distance);
      if (distance < 10) {
        setProcessing(true);
        try {
          const response = axios.post(
            "http://localhost:8080/api/set-Received",
            {
              id,
            },
            {
              withCredentials: true,
            }
          );
          setVerificationResult(response.data);
        } catch (err) {
          console.error("Verification failed:", err);
        }
      }
    }
  };

  const DriverAceept = () => {
    setRideAccepted(true);

    setDestination({
      lat: clientData.latiture,
      lng: clientData.longitude,
    });
    let cost = parseFloat(distance);
    cost = cost * 0.00000029;
    cost = cost.toFixed(8);

    // Set the client ID for checking
    if (clientData && clientData.clientId) {
      setClientIdChecking(clientData.clientId);
    }

    axios
      .post("http://localhost:8080/api/driver-Accept", {
        id: clientData.clientId,
        driverId: driverId,
        costR: cost,
      })
      .then((response) => {
        console.log("Client assigned successfully:", response.data);
      })
      .catch((error) => {
        console.error(
          "Error accepting ride:",
          error.response?.data || error.message
        );
      });
  };

  const Received = async () => {
    let id = clientData.clientId;

    try {
      setVerificationResult(response.data);
      const response = await axios.post(
        "http://localhost:8080/api/set-DriverID",
        {
          id,
          driverId,
        }
      );
    } catch (err) {
      console.error("Verification failed:", err);
    }

    setRideAccepted(true);
    setRecievedRide(true);
    setDestination({
      lat: clientData.ClientDestinationLatiture,
      lng: clientData.ClientDestinationLongitude,
    });
  };

  useEffect(() => {
    const init = async () => {
      try {
        // First connect to MetaMask
        const account = await connectToMetaMask();
        if (!account) {
          alert("Please connect your MetaMask account to continue");
          return;
        }

        // Fetch driver data for header
        await fetchDriverData(account);

        // Check if driver is registered
        const isRegistered = await checkDriverRegistration(account);
        if (!isRegistered) {
          // If not registered, show registration prompt
          const confirmRegistration = window.confirm(
            "You are not registered as a driver. Would you like to register now?"
          );

          if (confirmRegistration) {
            await registerDriver(account);
          } else {
            // Redirect to login page if they don't want to register
            navigate("../DriverLogin");
            return;
          }
        }

        // Then get current location
        getCurrentLocation();

        // Verify cookie and fetch driver ID
        await verifyCookie();
        await fetchDriverId();
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };

    init();
  }, []);

  // Function to check if driver is registered
  const checkDriverRegistration = async (metaAccount) => {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/driver-by-account/${metaAccount}`,
        { withCredentials: true }
      );

      return response.data.success && response.data.driver;
    } catch (error) {
      // If 404, driver not found, which is expected
      if (error.response && error.response.status === 404) {
        return false;
      }
      console.error("Error checking driver registration:", error);
      return false;
    }
  };

  // Function to register a new driver
  const registerDriver = async (metaAccount) => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        "http://localhost:8080/api/driver-register",
        {
          metaAccount,
          name: "Driver " + metaAccount.substring(0, 6),
          email: `driver_${metaAccount.substring(0, 6)}@example.com`,
          phone: "123-456-7890",
          carModel: "Toyota Camry",
          licensePlate: "ABC" + metaAccount.substring(0, 3),
          carColor: "Blue",
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setDriverId(response.data.driverId);
        localStorage.setItem("driverId", response.data.driverId);
        alert("Registration successful! You can now use the app.");
        return true;
      } else {
        alert("Registration failed: " + response.data.message);
        return false;
      }
    } catch (error) {
      console.error("Error registering driver:", error);
      alert(
        "Registration failed: " +
          (error.response?.data?.message || error.message)
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Update the fetchMyRides function to work with blockchain
  const fetchMyRides = async () => {
    try {
      setIsLoading(true);
      const driverId = localStorage.getItem("driverId");

      if (!driverId) {
        console.error("Driver ID not found in localStorage");
        return;
      }

      const response = await axios.get(
        `http://localhost:8080/api/rides/driver/${driverId}`
      );

      if (response.data.success) {
        setMyRides(response.data.rides);
        setSelectedRide(null);
      } else {
        console.error("Error fetching rides:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching my rides:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the fetchRideRequests function to work with blockchain
  const fetchRideRequests = async (rideId) => {
    try {
      setIsLoading(true);
      console.log(`Fetching requests for ride ${rideId}`);

      const response = await axios.get(
        `http://localhost:8080/api/rides/${rideId}/requests`
      );

      if (response.data.success) {
        console.log("Ride requests:", response.data.requests);
        // Process the requests to add client information
        const processedRequests = await Promise.all(
          response.data.requests.map(async (request) => {
            try {
              // Get client details
              const clientResponse = await axios.get(
                `http://localhost:8080/api/client/${request.clientId}`
              );

              if (clientResponse.data.success) {
                return {
                  ...request,
                  clientMetaAccount:
                    clientResponse.data.client.walletAddress ||
                    request.clientWalletAddress,
                  clientName:
                    clientResponse.data.client.name ||
                    `Client #${request.clientId}`,
                  paid: false, // Default value
                };
              }
              return {
                ...request,
                clientMetaAccount: request.clientWalletAddress,
                clientName: `Client #${request.clientId}`,
                paid: false,
              };
            } catch (error) {
              console.error(
                `Error fetching client ${request.clientId} details:`,
                error
              );
              return {
                ...request,
                clientMetaAccount: request.clientWalletAddress,
                clientName: `Client #${request.clientId}`,
                paid: false,
              };
            }
          })
        );

        setRideRequests(processedRequests);
      } else {
        console.error("Error fetching ride requests:", response.data.message);
        setRideRequests([]);
      }
    } catch (error) {
      console.error("Error fetching ride requests:", error);
      setRideRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a debug function to log passenger information
  const logPassengerInfo = (ride) => {
    console.log("Passenger info for ride", ride.rideId || ride.id);
    console.log("Passenger count:", ride.passengerCount);
    console.log("Passenger IDs:", ride.passengerIds);
    console.log("Passengers array:", ride.passengers);
    console.log("Available seats:", ride.availableSeats);
  };

  // Add a new function to fetch passenger details including payment status
  const fetchPassengerDetails = async (rideId) => {
    try {
      setPassengerLoading(true);
      console.log(`Fetching passenger details for ride ${rideId}`);

      const response = await axios.get(
        `http://localhost:8080/api/rides/${rideId}/passengers`
      );

      if (response.data.success) {
        console.log("Ride passengers:", response.data.passengers);
        setRidePassengers(response.data.passengers);
      } else {
        console.error("Error fetching ride passengers:", response.data.message);
        setRidePassengers([]);
      }
    } catch (error) {
      console.error("Error fetching ride passengers:", error);
      setRidePassengers([]);
    } finally {
      setPassengerLoading(false);
    }
  };

  // Update the handleRideSelect function to also fetch passenger details
  const handleRideSelect = (ride) => {
    setSelectedRide(ride);
    logPassengerInfo(ride);
    fetchRideRequests(ride.rideId);
    fetchPassengerDetails(ride.rideId);
  };

  // Update the openRequestsPanel function to also fetch passenger details
  const openRequestsPanel = (ride) => {
    setSelectedRide(ride);
    logPassengerInfo(ride);
    fetchRideRequests(ride.rideId);
    fetchPassengerDetails(ride.rideId);
    setShowRequests(true);
  };

  // Add a function to close the requests panel
  const closeRequestsPanel = () => {
    setShowRequests(false);
  };

  // Update the confirmRideRequest function to work with blockchain
  const confirmRideRequest = async (rideId, requestId) => {
    try {
      const metaAccount = localStorage.getItem("metaAccount");

      const response = await axios.post(
        `http://localhost:8080/api/rides/${rideId}/accept-request/${requestId}`,
        { driverMetaAccount: metaAccount }
      );

      if (response.data.success) {
        alert("Ride request accepted!");
        fetchRideRequests(rideId); // Refresh requests

        // Add delay to allow blockchain to process
        setTimeout(async () => {
          // Get updated passenger count
          try {
            const passengerResponse = await axios.get(
              `http://localhost:8080/api/rides/${rideId}/passenger-count`
            );

            if (passengerResponse.data.success) {
              console.log(
                "Updated passenger count:",
                passengerResponse.data.passengerCount
              );

              // Update the selected ride with new passenger count
              if (selectedRide && selectedRide.rideId === rideId) {
                setSelectedRide((prev) => ({
                  ...prev,
                  passengerCount: passengerResponse.data.passengerCount,
                  passengerIds: passengerResponse.data.passengerIds,
                }));
              }
            }
          } catch (error) {
            console.error("Error getting updated passenger count:", error);
          }

          // Refresh all rides
          fetchMyRides();
        }, 2000);
      } else {
        alert("Error accepting ride request: " + response.data.message);
      }
    } catch (error) {
      console.error("Error accepting ride request:", error);
      alert("Error accepting ride request. Please try again.");
    }
  };

  // Update the completeRideForPassenger function to work with blockchain
  const completeRideForPassenger = async (rideId, passengerId) => {
    try {
      const metaAccount = localStorage.getItem("metaAccount");

      const response = await axios.post(
        `http://localhost:8080/api/rides/${rideId}/complete-passenger/${passengerId}`,
        { driverMetaAccount: metaAccount }
      );

      if (response.data.success) {
        alert("Ride completed for passenger!");
        fetchRideRequests(rideId);
        fetchMyRides(); // Refresh the rides list
      } else {
        alert("Error completing ride for passenger: " + response.data.message);
      }
    } catch (error) {
      console.error("Error completing ride for passenger:", error);
      alert("Error completing ride for passenger. Please try again.");
    }
  };

  // Function to complete a ride
  const completeRide = async (rideId) => {
    try {
      const metaAccount = localStorage.getItem("metaAccount");

      const response = await axios.post(
        `http://localhost:8080/api/rides/${rideId}/complete`,
        { driverMetaAccount: metaAccount }
      );

      if (response.data.success) {
        alert(
          "Ride marked as completed! Passengers can now make payments. The ride will be finalized once all passengers have paid."
        );
        fetchMyRides();
      } else {
        alert("Error completing ride: " + response.data.message);
      }
    } catch (error) {
      console.error("Error completing ride:", error);
      alert("Error completing ride. Please try again.");
    }
  };

  // Function to cancel a ride
  const cancelRide = async (rideId) => {
    try {
      if (
        !window.confirm(
          "Are you sure you want to cancel this ride? This action cannot be undone."
        )
      ) {
        return;
      }

      setIsLoading(true);
      const metaAccount = localStorage.getItem("metaAccount");

      const response = await axios.post(
        `http://localhost:8080/api/rides/${rideId}/cancel`,
        { driverMetaAccount: metaAccount }
      );

      if (response.data.success) {
        alert("Ride has been canceled successfully.");
        fetchMyRides();
      } else {
        alert("Error canceling ride: " + response.data.message);
      }
    } catch (error) {
      console.error("Error canceling ride:", error);
      alert("Error canceling ride. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to start a ride
  const startRide = async (rideId) => {
    try {
      const metaAccount = localStorage.getItem("metaAccount");

      const response = await axios.post(
        `http://localhost:8080/api/rides/${rideId}/start`,
        { driverMetaAccount: metaAccount }
      );

      if (response.data.success) {
        alert(
          "Ride started! You can now complete the ride when you arrive at the destination."
        );
        fetchMyRides();
      } else {
        alert("Error starting ride: " + response.data.message);
      }
    } catch (error) {
      console.error("Error starting ride:", error);
      alert("Error starting ride. Please try again.");
    }
  };

  // Function to toggle map visibility
  const toggleMap = () => {
    setShowMap(!showMap);

    // If we're showing the map, make sure we have the current location
    if (!showMap && !currentPosition) {
      getCurrentLocation();
    }
  };

  // Get current location name when component mounts
  useEffect(() => {
    if (currentPosition) {
      getAddressFromCoordinates(currentPosition.lat, currentPosition.lng)
        .then((address) => {
          setStartLocationName(address);
        })
        .catch((err) =>
          console.error("Error getting current location address:", err)
        );
    }
  }, [currentPosition]);

  // Update the rejectRideRequest function to work with blockchain
  const rejectRideRequest = async (rideId, requestId) => {
    try {
      const metaAccount = localStorage.getItem("metaAccount");

      const response = await axios.post(
        `http://localhost:8080/api/rides/${rideId}/reject-request/${requestId}`,
        { driverMetaAccount: metaAccount }
      );

      if (response.data.success) {
        alert("Ride request rejected!");
        fetchRideRequests(rideId);
        fetchMyRides(); // Refresh the rides list
      } else {
        alert("Error rejecting ride request: " + response.data.message);
      }
    } catch (error) {
      console.error("Error rejecting ride request:", error);
      alert("Error rejecting ride request. Please try again.");
    }
  };

  // Update postRide function to include the new fields
  const postRide = async () => {
    // Check if required fields are filled
    if (
      !ridePrice ||
      !availableSeats ||
      !startLocationName ||
      !destinationName
    ) {
      alert(
        "Please fill in all required fields: start location, destination, price, and available seats"
      );
      return;
    }

    setIsLoading(true);

    try {
      const serverUrl = "http://localhost:8080";

      // Get MetaMask account with proper connection
      let metaAccount;
      try {
        // Request accounts access first
        if (window.ethereum) {
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          metaAccount = accounts[0];
          console.log("Connected to MetaMask account:", metaAccount);
        } else {
          throw new Error("MetaMask not installed");
        }
      } catch (error) {
        console.error("Error connecting to MetaMask:", error);
        alert("Please make sure MetaMask is installed and unlocked");
        setIsLoading(false);
        return;
      }

      if (!metaAccount) {
        alert("Please connect your MetaMask account first");
        setIsLoading(false);
        return;
      }

      // Check if driver is registered
      const isRegistered = await checkDriverRegistration(metaAccount);
      if (!isRegistered) {
        // If not registered, show registration prompt
        const confirmRegistration = window.confirm(
          "You are not registered as a driver. Would you like to register now?"
        );

        if (confirmRegistration) {
          const registrationSuccess = await registerDriver(metaAccount);
          if (!registrationSuccess) {
            setIsLoading(false);
            return;
          }
        } else {
          setIsLoading(false);
          return;
        }
      }

      // Format the request data
      const rideData = {
        driverMetaAccount: metaAccount,
        startLocation: startLocationName || "Current Location",
        destination: destinationName,
        availableSeats: parseInt(availableSeats),
        price: parseFloat(ridePrice),
        departureTime: departureTime
          ? new Date(departureTime).toISOString()
          : new Date().toISOString(),
      };

      console.log("Posting ride with data:", rideData);

      // Now post the ride
      const response = await axios.post(`${serverUrl}/api/rides`, rideData, {
        withCredentials: true,
      });

      console.log("Ride posted successfully:", response.data);
      alert("Ride posted successfully!");

      // Reset form
      setDestinationName("");
      setDestination(null);
      setRidePrice("");
      setAvailableSeats("1");
      setDepartureTime("");

      // Fetch updated rides
      fetchMyRides();

      // Navigate to rides view after successful posting
      navigate("/DriverMap?view=rides", { replace: true });
    } catch (error) {
      console.error("Error posting ride:", error);
      if (error.response) {
        alert(
          `Error posting ride: ${
            error.response.data.message || "Please try again."
          }`
        );
      } else {
        alert("Error posting ride. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get address from coordinates using Google Maps Geocoding API
  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0].formatted_address;
      }
      return "Unknown location";
    } catch (error) {
      console.error("Error geocoding coordinates:", error);
      return "Error getting location";
    }
  };

  // Simplify the map click handler to only handle pickup point selection
  const handleMapClick = (event) => {
    const clickedLocation = {
      lat: event.detail.latLng.lat,
      lng: event.detail.latLng.lng,
    };

    // Always set as pickup point
    setPickupLocation(clickedLocation);

    // Get address for the clicked location
    getAddressFromCoordinates(clickedLocation.lat, clickedLocation.lng)
      .then((address) => {
        setPickupPoint(address);
        console.log("Set pickup point to:", address);
      })
      .catch((err) => console.error("Error getting address:", err));
  };

  // Function to fetch driver data for the header
  const fetchDriverData = async (metaAccount) => {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/driver-by-account/${metaAccount}`,
        { withCredentials: true }
      );

      if (response.data.success && response.data.driver) {
        setDriverData(response.data.driver);
      }
    } catch (error) {
      console.error("Error fetching driver data:", error);
    }
  };

  // New handleLogout function
  const handleLogout = () => {
    localStorage.removeItem("driverId");
    localStorage.removeItem("metaAccount");
    navigate("/DriverLogin");
  };

  return (
    <div className="driver-map-wrapper">
      {/* Header similar to dashboard */}
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
                onClick={() => navigate("/DriverDashboard")}
              >
                {driverData?.name
                  ? driverData.name.charAt(0).toUpperCase()
                  : "D"}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="driver-map-container">
        {/* Left sidebar for navigation */}
        <div className="driver-map-sidebar">
          <div className="sidebar-section">
            <button
              className={`sidebar-button ${showPostRideForm ? "active" : ""}`}
              onClick={() => {
                setShowPostRideForm(true);
                setSelectedRide(null);
                navigate("/DriverMap?view=post", { replace: true });
              }}
            >
              <FaCarAlt className="button-icon" />
              <span>Post a Ride</span>
            </button>

            <button
              className={`sidebar-button ${!showPostRideForm ? "active" : ""}`}
              onClick={() => {
                setShowPostRideForm(false);
                fetchMyRides();
                navigate("/DriverMap?view=rides", { replace: true });
              }}
            >
              <FaClipboardList className="button-icon" />
              <span>My Rides</span>
            </button>

            <button
              className={`sidebar-button ${showMap ? "active" : ""}`}
              onClick={toggleMap}
            >
              <FaMapMarkedAlt className="button-icon" />
              <span>{showMap ? "Hide Map" : "Show Map"}</span>
            </button>
          </div>

          <div className="sidebar-section">
            <button
              className="sidebar-button back-button"
              onClick={() => navigate("/DriverDashboard")}
            >
              <FaArrowLeft className="button-icon" />
              <span>Back to Dashboard</span>
            </button>

            <button
              className="sidebar-button logout-button"
              onClick={handleLogout}
            >
              <FaSignOutAlt className="button-icon" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="driver-map-main">
          {/* Map container - only shown when showMap is true */}
          {showMap && (
            <div className="map-container">
              <APIProvider apiKey="AIzaSyA5693GMMHGbrWou8pkCxTfjYndhs27sy0">
                <Map
                  center={currentPosition || { lat: 43.6532, lng: -79.3832 }}
                  zoom={12}
                  mapId="8e0a97af9386fef"
                  onClick={handleMapClick}
                >
                  {currentPosition && <Marker position={currentPosition} />}
                  {pickupLocation && (
                    <Marker position={pickupLocation} title="Pickup Location" />
                  )}
                  {destination && (
                    <Marker position={destination} title="Destination" />
                  )}
                </Map>
              </APIProvider>
            </div>
          )}

          {/* Your existing content, but remove the driver controls */}
          <div className={`driver-map-content ${showMap ? "with-map" : ""}`}>
            {/* Post Ride Form - Always visible by default */}
            {showPostRideForm && (
              <div className="post-ride-form">
                <h3>Post a New Ride</h3>

                <div className="form-section-title">
                  <FaLocationArrow className="form-section-icon" />
                  <span>Route Information</span>
                </div>

                <div className="form-group">
                  <label>From (Start Location):</label>
                  <div className="location-input-container">
                    <input
                      type="text"
                      value={startLocationName}
                      onChange={(e) => setStartLocationName(e.target.value)}
                      placeholder="Enter start location"
                    />
                    {currentPosition && (
                      <div className="current-location-tag">
                        <FaLocationArrow className="location-icon" />
                        <span>Current Location</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>To (Destination):</label>
                  <div className="location-input-container">
                    <input
                      type="text"
                      value={destinationName}
                      onChange={(e) => setDestinationName(e.target.value)}
                      placeholder="Enter destination address or name"
                    />
                    <small className="form-hint">
                      Enter destination manually or use the map
                    </small>
                  </div>
                </div>

                <div className="form-group">
                  <label>Pickup Point:</label>
                  <div className="location-input-container">
                    <input
                      type="text"
                      value={pickupPoint}
                      onChange={(e) => setPickupPoint(e.target.value)}
                      placeholder="Enter pickup point (if different from start)"
                    />
                    <button
                      type="button"
                      className={`map-select-button ${showMap ? "active" : ""}`}
                      onClick={toggleMap}
                    >
                      <FaMapMarkedAlt />
                      {showMap ? "Using Map" : "Select on Map"}
                    </button>
                  </div>
                </div>

                <div className="form-section-title">
                  <FaWallet className="form-section-icon" />
                  <span>Ride Details</span>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label>Price (ETH):</label>
                    <input
                      type="number"
                      value={ridePrice}
                      onChange={(e) => setRidePrice(e.target.value)}
                      placeholder="Enter price in ETH"
                      step="0.001"
                      min="0"
                    />
                  </div>

                  <div className="form-group half">
                    <label>Available Seats:</label>
                    <select
                      value={availableSeats}
                      onChange={(e) => setAvailableSeats(e.target.value)}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Departure Time:</label>
                  <input
                    type="datetime-local"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                  />
                </div>

                {!showMap && (
                  <div className="map-toggle-prompt">
                    <p>Need to set location on map?</p>
                    <button className="show-map-button" onClick={toggleMap}>
                      <FaMapMarkedAlt />
                      Show Map
                    </button>
                  </div>
                )}

                {distance && duration && (
                  <div className="route-summary">
                    <div className="summary-item">
                      <span className="summary-label">Distance:</span>
                      <span className="summary-value">{distance}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Duration:</span>
                      <span className="summary-value">{duration}</span>
                    </div>
                  </div>
                )}

                <button
                  className="submit-ride-button"
                  onClick={postRide}
                  disabled={isLoading || !destinationName}
                >
                  {isLoading ? (
                    <>
                      <span className="loading-spinner"></span>
                      <span>Posting...</span>
                    </>
                  ) : (
                    "Post Ride"
                  )}
                </button>

                {!destinationName && (
                  <p className="error-message">
                    Please enter a destination before posting.
                  </p>
                )}
              </div>
            )}

            {/* My Rides List */}
            {!showPostRideForm && (
              <>
                {/* <button className="toggle-map-button" onClick={toggleMap}>
                  {showMap ? (
                    <>
                      <FaArrowLeft /> Hide Map
                    </>
                  ) : (
                    <>
                      <FaMapMarkedAlt /> Show Map
                    </>
                  )}
                </button> */}

                <div className="driver-rides-layout">
                  {/* Rides Section */}
                  <div
                    className={`my-rides-list ${
                      showRequests ? "with-requests" : "full-width"
                    }`}
                  >
                    <h3>My Rides</h3>
                    <div className="rides-container">
                      {isLoading ? (
                        <div className="loading-spinner"></div>
                      ) : myRides.length > 0 ? (
                        [...myRides].reverse().map((ride) => (
                          <div
                            key={ride.rideId}
                            className={`ride-item ${
                              selectedRide?.rideId === ride.rideId
                                ? "selected"
                                : ""
                            }`}
                            onClick={() => handleRideSelect(ride)}
                          >
                            <div className="ride-header">
                              <h4>Ride #{ride.rideId}</h4>
                              <span className={`status ${ride.status}`}>
                                {ride.status}
                              </span>
                            </div>

                            <div className="ride-details">
                              <div className="detail-item">
                                <span className="detail-label">From</span>
                                <span className="detail-value">
                                  {ride.from || ride.startLocation}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">To</span>
                                <span className="detail-value">
                                  {ride.to || ride.destination}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Price</span>
                                <span className="detail-value">
                                  {ride.price} ETH
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Seats</span>
                                <span className="detail-value">
                                  {ride.availableSeats}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Departure</span>
                                <span className="detail-value">
                                  {new Date(
                                    parseInt(ride.departureTime) * 1000
                                  ).toLocaleString()}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Passengers</span>
                                <span className="detail-value">
                                  {ride.passengers
                                    ? ride.passengers.length
                                    : ride.passengerCount
                                    ? ride.passengerCount
                                    : ride.passengerIds
                                    ? ride.passengerIds.length
                                    : 0}
                                </span>
                              </div>
                            </div>

                            <div className="ride-actions">
                              {ride.status === "active" && (
                                <>
                                  <button
                                    className="start-ride-button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startRide(ride.rideId);
                                    }}
                                  >
                                    Start Ride
                                  </button>
                                  <button
                                    className="cancel-ride-button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      cancelRide(ride.rideId);
                                    }}
                                  >
                                    Cancel Ride
                                  </button>
                                </>
                              )}
                              {ride.status === "in_progress" && (
                                <button
                                  className="complete-ride-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    completeRide(ride.rideId);
                                  }}
                                >
                                  Complete Ride
                                </button>
                              )}
                              {ride.status === "canceled" && (
                                <span className="ride-canceled-tag">
                                  Ride Canceled
                                </span>
                              )}
                              <button
                                className="view-requests-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRideSelect(ride);
                                  openRequestsPanel(ride);
                                }}
                              >
                                View Requests
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p>No rides found.</p>
                      )}
                    </div>
                  </div>

                  {/* Ride Requests - Only visible when showRequests is true */}
                  {showRequests && (
                    <div className="ride-requests">
                      <div className="request-header-container">
                        <h3>
                          {selectedRide
                            ? `Ride #${selectedRide.rideId} Management`
                            : "Ride Management"}
                        </h3>
                        <button
                          className="close-requests-button"
                          onClick={closeRequestsPanel}
                          title="Close requests panel"
                        >
                          ×
                        </button>
                      </div>

                      {/* Add tabs for requests and passengers */}
                      <div className="request-tabs">
                        <button
                          className={`tab-button ${
                            activeTab === "requests" ? "active" : ""
                          }`}
                          onClick={() => setActiveTab("requests")}
                        >
                          Ride Requests
                        </button>
                        <button
                          className={`tab-button ${
                            activeTab === "passengers" ? "active" : ""
                          }`}
                          onClick={() => setActiveTab("passengers")}
                        >
                          Passengers & Payments
                        </button>
                      </div>

                      {/* Requests tab content */}
                      {activeTab === "requests" && (
                        <div className="requests-container">
                          {isLoading ? (
                            <div className="loading-spinner"></div>
                          ) : selectedRide && rideRequests.length > 0 ? (
                            rideRequests.map((request, index) => (
                              <div
                                key={index}
                                className={`request-item ${
                                  request.status || "pending"
                                }`}
                              >
                                <div className="request-header">
                                  <h4>
                                    {request.clientName ||
                                      `Client #${request.clientId}`}
                                  </h4>
                                  <span
                                    className={`status ${
                                      request.status || "pending"
                                    }`}
                                  >
                                    {request.status || "pending"}
                                  </span>
                                </div>

                                <div className="ride-details">
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Client ID
                                    </span>
                                    <span className="detail-value">
                                      {request.clientId}
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Account
                                    </span>
                                    <span className="detail-value">
                                      {request.clientMetaAccount
                                        ? `${request.clientMetaAccount.substring(
                                            0,
                                            8
                                          )}...`
                                        : "Unknown"}
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Requested
                                    </span>
                                    <span className="detail-value">
                                      {request.requestedAt
                                        ? new Date(
                                            request.requestedAt
                                          ).toLocaleString()
                                        : "Unknown time"}
                                    </span>
                                  </div>
                                </div>

                                <div className="request-actions">
                                  {(!request.status ||
                                    request.status === "pending") && (
                                    <>
                                      <button
                                        className="confirm-button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          confirmRideRequest(
                                            selectedRide.rideId,
                                            request.requestId
                                          );
                                        }}
                                      >
                                        Accept
                                      </button>
                                      <button
                                        className="reject-button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          rejectRideRequest(
                                            selectedRide.rideId,
                                            request.requestId
                                          );
                                        }}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}

                                  {request.status === "accepted" && (
                                    <p className="request-accepted-message">
                                      Ride request accepted
                                    </p>
                                  )}

                                  {request.status === "rejected" && (
                                    <p className="request-rejected-message">
                                      This request has been rejected
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="no-requests-message">
                              {selectedRide
                                ? "No requests for this ride yet."
                                : "Select a ride to view requests."}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Passengers & Payment Status tab content */}
                      {activeTab === "passengers" && (
                        <div className="passengers-container">
                          {passengerLoading ? (
                            <div className="loading-spinner"></div>
                          ) : selectedRide && ridePassengers.length > 0 ? (
                            <>
                              <h4 className="passenger-list-header">
                                {selectedRide.status === "completed"
                                  ? "Payment Status"
                                  : "Passengers List"}
                              </h4>
                              {ridePassengers.map((passenger, index) => (
                                <div
                                  key={index}
                                  className={`passenger-item ${
                                    passenger.paid ? "paid" : "unpaid"
                                  }`}
                                >
                                  <div className="passenger-header">
                                    <h4>
                                      {passenger.clientName ||
                                        `Client #${passenger.clientId}`}
                                    </h4>
                                    {selectedRide.status === "completed" && (
                                      <span
                                        className={`payment-status ${
                                          passenger.paid ? "paid" : "unpaid"
                                        }`}
                                      >
                                        {passenger.paid
                                          ? "Paid"
                                          : "Payment Pending"}
                                      </span>
                                    )}
                                  </div>

                                  <div className="passenger-details">
                                    <div className="detail-item">
                                      <span className="detail-label">
                                        Client ID
                                      </span>
                                      <span className="detail-value">
                                        {passenger.clientId}
                                      </span>
                                    </div>
                                    <div className="detail-item">
                                      <span className="detail-label">
                                        Status
                                      </span>
                                      <span className="detail-value">
                                        {passenger.status}
                                      </span>
                                    </div>
                                    {passenger.paid &&
                                      passenger.paymentTimestamp && (
                                        <div className="detail-item">
                                          <span className="detail-label">
                                            Payment Date
                                          </span>
                                          <span className="detail-value">
                                            {new Date(
                                              parseInt(
                                                passenger.paymentTimestamp
                                              ) * 1000
                                            ).toLocaleString()}
                                          </span>
                                        </div>
                                      )}
                                  </div>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div className="no-passengers-message">
                              {selectedRide
                                ? "No passengers for this ride yet."
                                : "Select a ride to view passengers."}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DriverMap;
