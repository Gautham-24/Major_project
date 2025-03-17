/* global google */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

function DriverMap() {
  const navigate = useNavigate();
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

  // Update the ride selection handler to fetch requests
  const handleRideSelect = (ride) => {
    setSelectedRide(ride);
    fetchRideRequests(ride.rideId);
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
        fetchRideRequests(rideId);
        fetchMyRides(); // Refresh the rides list
      } else {
        alert("Error accepting ride request: " + response.data.message);
      }
    } catch (error) {
      console.error("Error confirming ride request:", error);
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

  return (
    <>
      <div className={`DriverMap-MainContainer ${showMap ? "show-map" : ""}`}>
        <div className="DriverControlsContainer">
          <div className="driver-controls">
            <button
              className="post-ride-button"
              onClick={() => {
                setShowPostRideForm(true);
                setSelectedRide(null);
              }}
            >
              Post a Ride
            </button>

            <button
              className="my-rides-button"
              onClick={() => {
                setShowPostRideForm(false);
                fetchMyRides();
              }}
            >
              My Rides
            </button>

            <button className="toggle-map-button" onClick={toggleMap}>
              {showMap ? "Hide Map" : "Show Map"}
            </button>
          </div>

          {/* Post Ride Form - Always visible by default */}
          {showPostRideForm && (
            <div className="post-ride-form">
              <h3>Post a New Ride</h3>

              {/* Form groups for location inputs */}
              <div className="form-group">
                <label>From (Start Location):</label>
                <div className="location-input-container">
                  <input
                    type="text"
                    value={startLocationName}
                    onChange={(e) => setStartLocationName(e.target.value)}
                    placeholder="Enter start location"
                  />
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
                  {showMap && (
                    <button
                      type="button"
                      className="map-select-button active"
                      onClick={() => toggleMap()}
                    >
                      Select on Map
                    </button>
                  )}
                </div>
              </div>

              <div className="form-group">
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

              <div className="form-group">
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
                  <p>Need to set pickup point on map?</p>
                  <button className="show-map-button" onClick={toggleMap}>
                    Show Map
                  </button>
                </div>
              )}

              <button
                className="submit-ride-button"
                onClick={postRide}
                disabled={isLoading}
              >
                {isLoading ? "Posting..." : "Post Ride"}
              </button>

              {!destinationName && (
                <p className="error-message">
                  Please enter a destination before posting.
                </p>
              )}
            </div>
          )}

          {/* My Rides List */}
          {!showPostRideForm && myRides.length > 0 && (
            <div className="my-rides-list">
              <h3>My Rides</h3>

              <div className="rides-container">
                {myRides.map((ride) => (
                  <div
                    key={ride.rideId}
                    className={`ride-item ${ride.status} ${
                      selectedRide && selectedRide.rideId === ride.rideId
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
                      <p>
                        <strong>From:</strong>{" "}
                        {ride.startLocation || "Not specified"}
                      </p>
                      <p>
                        <strong>To:</strong>{" "}
                        {ride.destination || "Not specified"}
                      </p>
                      <p>
                        <strong>Price:</strong> {ride.price} ETH
                      </p>
                      <p>
                        <strong>Available Seats:</strong> {ride.availableSeats}
                      </p>
                      <p>
                        <strong>Departure:</strong>{" "}
                        {new Date(ride.departureTime).toLocaleString()}
                      </p>
                      <p>
                        <strong>Passengers:</strong>{" "}
                        {ride.passengers ? ride.passengers.length : 0}
                      </p>

                      {ride.status === "active" && (
                        <button
                          className="start-ride-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startRide(ride.rideId);
                          }}
                        >
                          Start Ride
                        </button>
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ride Requests */}
          {selectedRide && rideRequests.length > 0 && (
            <div className="ride-requests">
              <h3>Ride Requests for Ride #{selectedRide.rideId}</h3>

              <div className="requests-container">
                {rideRequests.map((request, index) => (
                  <div key={index} className={`request-item ${request.status}`}>
                    <div className="request-header">
                      <h4>{request.clientName}</h4>
                      <span className={`status ${request.status}`}>
                        {request.status}
                      </span>
                    </div>

                    <div className="request-details">
                      <p>
                        <strong>Client ID:</strong> {request.clientId}
                      </p>
                      <p>
                        <strong>Client Account:</strong>{" "}
                        {request.clientMetaAccount
                          ? `${request.clientMetaAccount.substring(0, 8)}...`
                          : "Unknown"}
                      </p>
                      <p>
                        <strong>Requested:</strong>{" "}
                        {new Date(request.requestedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="request-actions">
                      {request.status === "pending" && (
                        <>
                          <button
                            className="confirm-button"
                            onClick={() =>
                              confirmRideRequest(
                                selectedRide.rideId,
                                request.requestId
                              )
                            }
                          >
                            Accept
                          </button>
                          <button
                            className="reject-button"
                            onClick={() =>
                              rejectRideRequest(
                                selectedRide.rideId,
                                request.requestId
                              )
                            }
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {request.status === "accepted" && (
                        <button
                          className="complete-button"
                          onClick={() =>
                            completeRideForPassenger(
                              selectedRide.rideId,
                              request.clientId
                            )
                          }
                        >
                          Complete
                        </button>
                      )}

                      {request.status === "rejected" && (
                        <p className="request-rejected-message">
                          This request has been rejected
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Only show the map when showMap is true */}
        {showMap && (
          <div className="map-container">
            <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
              <Map
                defaultCenter={
                  currentPosition || { lat: 43.6532, lng: -79.3832 }
                }
                defaultZoom={13}
                gestureHandling={"greedy"}
                disableDefaultUI={true}
                onClick={handleMapClick}
              >
                {currentPosition && (
                  <Marker
                    position={currentPosition}
                    title="Your Location (Start)"
                  />
                )}
                {destination && (
                  <Marker
                    position={destination}
                    title="Destination"
                    icon={{
                      url: DestinationMarker,
                      scaledSize: { width: 40, height: 40 },
                    }}
                  />
                )}
                {pickupLocation && (
                  <Marker
                    position={pickupLocation}
                    title="Pickup Point"
                    icon={{
                      url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
                    }}
                  />
                )}
                {currentPosition && destination && (
                  <Directions
                    origin={currentPosition}
                    destination={destination}
                    setDistance={setDistance}
                    setDuration={setDuration}
                  />
                )}
              </Map>
            </APIProvider>
          </div>
        )}
      </div>
    </>
  );
}

function Directions({ origin, destination, setDistance, setDuration }) {
  const map = useMap();
  const routesLibrary = useMapsLibrary("routes");

  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [routes, setRoutes] = useState(null);

  useEffect(() => {
    if (!routesLibrary || !map || typeof window.google === "undefined") return;

    const service = new routesLibrary.DirectionsService();
    const renderer = new routesLibrary.DirectionsRenderer({
      map,
      suppressMarkers: true,
    });
    setDirectionsService(service);
    setDirectionsRenderer(renderer);
  }, [routesLibrary, map]);

  useEffect(() => {
    if (
      !directionsService ||
      !directionsRenderer ||
      typeof window.google === "undefined"
    )
      return;

    // Ensure origin and destination are defined
    if (!origin || !destination) return;

    // Clear previous directions
    directionsRenderer.setDirections({ routes: [] });

    // Request a new route
    directionsService.route(
      {
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(
          destination.lat,
          destination.lng
        ),
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          directionsRenderer.setDirections(result);

          // Update state with the new route
          setRoutes(result.routes);

          // Extract distance and duration
          const route = result.routes[0];
          const leg = route.legs[0];
          const distance = leg.distance.text;
          const duration = leg.duration.text;

          setDistance(distance);
          setDuration(duration);
        } else {
          console.error("Directions request failed due to " + status);
        }
      }
    );
  }, [directionsService, directionsRenderer, origin, destination]);

  return (
    <>
      {origin && (
        <Marker
          position={origin}
          icon={{
            url: Thumbnail,
            scaledSize: new window.google.maps.Size(60, 40),
          }}
        />
      )}
      {destination && (
        <Marker
          position={destination}
          icon={{
            url: DestinationMarker,
            scaledSize: new window.google.maps.Size(20, 35),
          }}
        />
      )}
    </>
  );
}

export default DriverMap;
