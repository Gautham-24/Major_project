import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios, { Axios } from "axios";
import {
  APIProvider,
  Map,
  useMapsLibrary,
  useMap,
  Marker,
} from "@vis.gl/react-google-maps";
import Thumbnail from "../Assets/Images/Car-Thumbnail.png";
import DestinationMarker from "../Assets/Images/DestinationMarker.png";
import "../Styles/ClientMap.css";
import Logo from "../Assets/Images/Logo.png";
import ChainRideContract from "../Contracts/ChainRideContract.json";
import Web3 from "web3";
import { toast } from "react-hot-toast";

function ClientLocation() {
  const navigate = useNavigate();
  const [initalData, setInitialData] = useState(true);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [error, setError] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [destinationInput, setDestinationInput] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [SearchRequest, setSearchRequest] = useState("");
  const [driverId, setDriverId] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [searchActive, setSearchActive] = useState(false);
  const [selectedDriverData, setSelectedDriverData] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [holdDistance, setHoldDistance] = useState(null);
  const [location, setLocation] = useState({});
  const [clientMetaAccount, setClientMetaAccount] = useState("");
  const [assigned, setAssigned] = useState(false);
  const [acceptRide, setAcceptRide] = useState(false);
  const [recieved, setRecieved] = useState(false);
  const [transactionCheck, settransactionCheck] = useState(false);
  const [destination, setDestination] = useState({
    lat: 43.6596,
    lng: -79.396,
  });
  const [currentDestination, SetCurrentDestination] = useState({
    lat: 43.6596,
    lng: -79.396,
  });
  const [clientLocationUpdates, setClientLocationUpdates] = useState(null);
  const [availableRides, setAvailableRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [showRidesList, setShowRidesList] = useState(true);
  const [myRides, setMyRides] = useState([]);
  const [showMyRides, setShowMyRides] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState({});

  const fetchMetaAccount = async () => {
    if (window.ethereum) {
      try {
        // Request accounts from MetaMask
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const account = accounts[0];
        setClientMetaAccount(account); // Use the first account
        localStorage.setItem("metaAccount", account); // Store in localStorage
        return account;
      } catch (error) {
        console.error("Error fetching MetaMask account:", error);
        setError("MetaMask connection error");
        return null;
      }
    } else {
      setError("MetaMask is not installed");
      return null;
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
    return R * c;
  };

  const getCurrentLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const clientLocation = {
            lat: latitude,
            lng: longitude,
          };
          setCurrentPosition(clientLocation);
          setLocation({
            lat: latitude,
            lng: longitude,
          });

          setClientLocationUpdates({
            lat: latitude,
            lng: longitude,
          });
          console.log("Client's current location:", clientLocation);

          let ClientAcount = await fetchMetaAccount();
          console.log("Client Accounts--->:", ClientAcount);
        },
        (err) => {
          setError("Error: " + err.message);
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  };

  const saveLocation = async () => {
    try {
      const metaAccount = localStorage.getItem("metaAccount");

      if (!metaAccount) {
        console.error("MetaAccount not found in localStorage");
        return;
      }

      // Only show alert if user explicitly tries to save location
      // by checking if clientLocationUpdates is not null
      if (clientLocationUpdates && (!currentPosition || !destination)) {
        alert("Please set your current location and destination");
        return;
      }

      // Don't proceed with API call if location data is incomplete
      if (!currentPosition || !destination) {
        return;
      }

      const response = await axios.post(
        "http://localhost:8080/api/client-location",
        {
          metaAccount,
          latitude: currentPosition.lat,
          longitude: currentPosition.lng,
          locationName: "Current Location",
          destinationLatitude: destination.lat,
          destinationLongitude: destination.lng,
          destinationName: destinationName || "Destination",
        }
      );

      if (response.data.success) {
        console.log("Location saved successfully");
      } else {
        console.error("Error saving location:", response.data.message);
      }
    } catch (error) {
      console.error("Error saving location:", error);
    }
  };

  useEffect(() => {
    // Only call saveLocation when both currentPosition and destination are set
    // or when clientLocationUpdates changes (user explicitly saves location)
    if ((currentPosition && destination) || clientLocationUpdates) {
      saveLocation();
    }
  }, [clientLocationUpdates, destination, currentPosition]);

  const checkClientRegistration = async (account) => {
    try {
      console.log(
        `Checking if client with account ${account} is registered...`
      );
      const response = await axios.get(
        `http://localhost:8080/api/client-by-account/${account}`,
        { withCredentials: true }
      );

      console.log("Client registration check response:", response.data);

      if (response.data.success && response.data.client) {
        // Client already registered, set clientId
        console.log("Client found:", response.data.client);
        setClientId(response.data.client.id || response.data.client.clientId);
        localStorage.setItem(
          "clientId",
          response.data.client.id || response.data.client.clientId
        );
        return true;
      }

      console.log("Client not found in registration check");
      return false;
    } catch (error) {
      // If 404, client not found, which is expected
      if (error.response && error.response.status === 404) {
        console.log("Client not found (404 response)");
        return false;
      }

      // If 500 or other error, log it but continue
      console.error(
        "Error checking client registration:",
        error.response?.data || error.message
      );

      // If the error message mentions that the client is already registered,
      // consider them registered
      if (
        error.response?.data?.message &&
        error.response.data.message.includes("already registered")
      ) {
        console.log("Client is already registered according to error message");
        return true;
      }

      return false;
    }
  };

  const fetchClientId = async () => {
    try {
      // First, check if the client is already registered
      if (clientMetaAccount) {
        const isRegistered = await checkClientRegistration(clientMetaAccount);

        if (isRegistered) {
          console.log("Client already registered, skipping registration");
          return;
        }

        // If not registered, proceed with registration
        try {
          const registerResponse = await axios.post(
            "http://localhost:8080/api/client-register",
            {
              metaAccount: clientMetaAccount,
              name: "Client " + clientMetaAccount.substring(0, 6),
              email: `client_${clientMetaAccount.substring(0, 6)}@example.com`,
              phone: "123-456-7890",
            },
            { withCredentials: true }
          );

          console.log("Client registration response:", registerResponse.data);

          if (registerResponse.data.success) {
            setClientId(registerResponse.data.clientId);
            localStorage.setItem("clientId", registerResponse.data.clientId);
          }
        } catch (error) {
          // If client already registered, try to get the ID
          if (
            error.response &&
            error.response.data &&
            error.response.data.message &&
            error.response.data.message.includes("already registered")
          ) {
            await checkClientRegistration(clientMetaAccount);
          } else {
            console.error("Error registering client:", error);
          }
        }
      }

      // Get client ID from API
      try {
        const response = await axios.get(
          "http://localhost:8080/api/generate-client-id",
          {
            params: { metaAccount: clientMetaAccount },
            withCredentials: true,
          }
        );

        if (response.data.success) {
          console.log("Client ID response:", response.data);
          setClientId(response.data.clientId);
          localStorage.setItem("clientId", response.data.clientId);
        } else {
          console.error("Error getting client ID:", response.data.message);
        }
      } catch (error) {
        console.error("Error fetching client ID:", error);
      }
    } catch (error) {
      console.error("Error in client ID process:", error);
    }
  };

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
      navigate("../ClientLogin");
      setVerificationResult(null);
    }
  };

  ///////////////////////////////
  const getDrivers = async () => {
    try {
      // Only make the API call if clientId is a valid value (not null, not undefined)
      if (clientId && clientId !== "null") {
        console.log("Getting client data for clientId:", clientId);
        const response = await axios.get(
          `http://localhost:8080/api/client/${clientId}`
        );

        if (response.data.success) {
          console.log("Client data:", response.data.client);
          setClientData(response.data.client);
        } else {
          console.error("Error in response:", response.data.message);
        }
      } else {
        console.log(
          "No valid clientId available, skipping getDrivers API call"
        );
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
          // Don't show alert for 404 errors (client not found)
          alert("Error fetching client data. Please try again.");
        }
      }
    }
  };

  const geocodeDestination = async () => {
    setSearchRequest(true);
    if (!destinationInput) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: destinationInput }, (results, status) => {
      if (status === "OK" && results[0].geometry) {
        const newDestination = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        };

        // Set new destination
        setDestination(newDestination);

        // Set the destination name from the input or use the formatted address
        setDestinationName(destinationInput || results[0].formatted_address);

        // If a driver is selected, set the current destination to the driver's location
        if (selectedDriverData) {
          SetCurrentDestination({
            lat: selectedDriverData.latitude,
            lng: selectedDriverData.longitude,
          });
        } else {
          // Set the destination location if no driver is selected
          SetCurrentDestination(newDestination);
        }

        DriverSelected();
        // Activate search after a short delay

        console.log("New destination:", newDestination);
      } else {
        console.error(
          "Geocode was not successful for the following reason:",
          status
        );
      }
    });
  };
  let n = 0;
  const DriverSelected = async () => {
    try {
      // Only make the API call if clientId is a valid value (not null, not undefined)
      if (clientId && clientId !== "null") {
        console.log("Fetching client data for clientId:", clientId);
        const response = await axios.get(
          `http://localhost:8080/api/client/${clientId}`
        );

        if (response.data.success) {
          console.log("Client data 2:", response.data.client);
          setClientData(response.data.client);
        } else {
          console.error("Error in response:", response.data.message);
        }
      } else {
        console.log("No valid clientId available, skipping API call");
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
          // Don't show alert for 404 errors (client not found)
          alert("Error fetching client data. Please try again.");
        }
      }
    }
  };

  const metaTransaction = async (RideDistance, Res) => {};

  useEffect(() => {
    if (driverId) {
      console.log("Driver ID has been updated:", driverId);
      // Add additional logic here if needed
    }
  }, [driverId]);

  const getDriverInfo = async (driverid) => {
    try {
      console.log("DriverId" + driverid);
      const response = await axios.get(
        `http://localhost:8080/api/get-driver?driverId=${driverid}`
      );
      console.log("Driver:", response.data);
      setDriverData(response.data);
    } catch (error) {
      console.error("Error fetching driver data:", error);
    }
  };
  useEffect(() => {
    if (driverData) {
      console.log("Driver Data Updated:", driverData);
    } else {
      console.log("Driver Data is null or not yet updated.");
    }
  }, [driverData]);

  const RideAccepted = () => {
    setAcceptRide(true);

    console.log(
      " LAT: " + driverData.latitude + "longitude" + driverData.longitude
    );
    if (clientData.assigned === true) {
      SetCurrentDestination({
        lat: driverData.latitude,
        lng: driverData.longitude,
      });
    }
  };

  useEffect(() => {
    // Only set up polling if we have a valid clientId
    if (clientId && clientId !== "null") {
      console.log("Setting up client data polling for clientId:", clientId);

      // Call once immediately
      DriverSelected();

      // Set the interval to call DriverSelected every 5 seconds (5000ms)
      const intervalId2 = setInterval(() => {
        DriverSelected();
      }, 5000); // Adjust the time interval as needed

      // Cleanup the interval when the component unmounts
      return () => clearInterval(intervalId2);
    } else {
      console.log("No valid clientId, skipping client data polling");
    }
  }, [SearchRequest, clientId]);

  useEffect(() => {
    // Initialize basic functionality
    getCurrentLocation();
    verifyCookie();

    // Connect to MetaMask and fetch client ID
    const initializeClient = async () => {
      try {
        // First get MetaMask account
        const account = await fetchMetaAccount();
        if (!account) {
          console.error("No MetaMask account available");
          return;
        }

        console.log("Got MetaMask account:", account);
        localStorage.setItem("metaAccount", account);

        // Simple direct approach: Try to get the client ID directly
        try {
          console.log("Checking if client exists directly with API...");
          // First, try to register directly (this will return existing client if already registered)
          const registerResponse = await axios.post(
            "http://localhost:8080/api/client-register",
            {
              metaAccount: account,
              name: "Client " + account.substring(0, 6),
              email: `client_${account.substring(0, 6)}@example.com`,
              phone: "123-456-7890",
            }
          );

          console.log("Registration/login response:", registerResponse.data);

          if (registerResponse.data.success) {
            // Client registered or already existed
            const clientId = registerResponse.data.clientId;
            console.log("Client ID obtained:", clientId);
            setClientId(clientId);
            localStorage.setItem("clientId", clientId);

            // Now fetch available rides
            fetchAvailableRides();
          } else {
            console.error(
              "Failed to register client:",
              registerResponse.data.message
            );
            alert("Error registering: " + registerResponse.data.message);
          }
        } catch (error) {
          console.error("Error during registration/login:", error);
          if (error.response?.data?.message?.includes("already registered")) {
            // This is actually fine - the client is registered
            console.log(
              "Client is already registered, trying to get client ID..."
            );

            // Try to get client ID
            try {
              const clientIdResponse = await axios.get(
                `http://localhost:8080/api/generate-client-id`,
                { params: { metaAccount: account } }
              );

              if (clientIdResponse.data.success) {
                const clientId = clientIdResponse.data.clientId;
                console.log("Got client ID:", clientId);
                setClientId(clientId);
                localStorage.setItem("clientId", clientId);

                // Now fetch available rides
                fetchAvailableRides();
              }
            } catch (clientIdError) {
              console.error("Error getting client ID:", clientIdError);
            }
          } else {
            alert(
              "Error during login: " +
                (error.response?.data?.message || error.message)
            );
          }
        }
      } catch (error) {
        console.error("Error in client initialization:", error);
      }
    };

    initializeClient();
  }, []);

  // Function to register a new client
  const registerClient = async (metaAccount) => {
    try {
      setIsLoading(true);
      console.log(
        `Attempting to register client with account ${metaAccount}...`
      );

      const response = await axios.post(
        "http://localhost:8080/api/client-register",
        {
          metaAccount: metaAccount,
          name: "Client " + metaAccount.substring(0, 6),
          email: `client_${metaAccount.substring(0, 6)}@example.com`,
          phone: "123-456-7890",
        },
        { withCredentials: true }
      );

      console.log("Client registration response:", response.data);

      if (response.data.success) {
        setClientId(response.data.clientId);
        localStorage.setItem("clientId", response.data.clientId);

        // If there's a message indicating the client was already registered, inform the user
        if (
          response.data.message &&
          response.data.message.includes("already registered")
        ) {
          console.log(
            "Client was already registered, ID:",
            response.data.clientId
          );
          alert(
            "You were already registered as a client. Your account has been loaded."
          );
        } else {
          alert("Registration successful! You can now use the app.");
        }
        return true;
      } else {
        alert("Registration failed: " + response.data.message);
        return false;
      }
    } catch (error) {
      console.error("Error registering client:", error);

      // Handle the case where the error indicates the client is already registered
      if (
        error.response?.data?.message &&
        error.response.data.message.includes("already registered")
      ) {
        console.log("Client was already registered according to error");
        alert("You were already registered as a client.");

        // Try to fetch the client ID
        const isRegistered = await checkClientRegistration(metaAccount);
        if (isRegistered) {
          return true;
        }
      }

      alert(
        "Registration failed: " +
          (error.response?.data?.message || error.message)
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Web3 and contract
  const initWeb3 = async () => {
    if (window.ethereum) {
      try {
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);

        // Get network ID
        const networkId = await web3Instance.eth.net.getId();

        // Get contract instance
        const deployedNetwork = ChainRideContract.networks[networkId];
        if (deployedNetwork) {
          const contractInstance = new web3Instance.eth.Contract(
            ChainRideContract.abi,
            deployedNetwork.address
          );
          setContract(contractInstance);
        } else {
          console.error("Contract not deployed on the current network");
        }
      } catch (error) {
        console.error("Error initializing Web3:", error);
      }
    } else {
      console.error("No Ethereum provider detected");
    }
  };

  // Function to toggle map visibility
  const toggleMap = () => {
    setShowMap(!showMap);
  };

  // Function to check ride request status for current client
  const getRideRequestStatus = async (rideId) => {
    try {
      const clientId = localStorage.getItem("clientId");
      if (!clientId) return null;

      const response = await axios.get(
        `http://localhost:8080/api/rides/${rideId}/request-status/${clientId}`
      );

      if (response.data.success) {
        return response.data.status; // "pending", "accepted", "rejected", or null
      }
      return null;
    } catch (error) {
      console.error(`Error checking request status for ride ${rideId}:`, error);
      return null;
    }
  };

  // Function to fetch status for all available rides
  const updateRideStatuses = async () => {
    const updatedRides = await Promise.all(
      availableRides.map(async (ride) => {
        const status = await getRideRequestStatus(ride.rideId);
        return { ...ride, requestStatus: status };
      })
    );
    setAvailableRides(updatedRides);
  };

  // When available rides are fetched, check their request status
  useEffect(() => {
    if (availableRides.length > 0) {
      updateRideStatuses();
    }
  }, [availableRides]);

  // Update the fetchAvailableRides function to include the status check
  const fetchAvailableRides = async () => {
    try {
      setIsLoading(true);

      const response = await axios.get("http://localhost:8080/api/rides");

      if (response.data.success) {
        // Get rides from response
        const rides = response.data.rides;

        // Only show rides with status "active" - this is the issue
        // We should be filtering by statuses that aren't appropriate for the available list
        const activeRides = rides.filter((ride) => ride.status === "active");

        // Check request status for each ride
        const ridesWithStatus = await Promise.all(
          activeRides.map(async (ride) => {
            const requestStatus = await getRideRequestStatus(ride.rideId);
            return { ...ride, requestStatus };
          })
        );

        setAvailableRides(ridesWithStatus);
      } else {
        console.error("Error fetching rides:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching available rides:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch client's rides
  const fetchMyRides = async () => {
    try {
      setIsLoading(true);
      const clientId = localStorage.getItem("clientId");
      const metaAccount = localStorage.getItem("metaAccount");

      if (!clientId || !metaAccount) {
        console.error("Client ID or metaAccount not found in localStorage");
        return;
      }

      console.log(`[fetchMyRides] Getting rides for client ID ${clientId}`);

      // Get client rides from the server
      const response = await axios.get(
        `http://localhost:8080/api/rides/client/${clientId}`
      );

      console.log("[fetchMyRides] Response:", response.data);

      if (response.data.success) {
        const ridesData = response.data.rides || [];
        console.log("[fetchMyRides] Received rides data:", ridesData);

        if (ridesData.length === 0) {
          console.log("[fetchMyRides] No rides found for this client");
          setMyRides([]);
          setSelectedRide(null);
          return;
        }

        // Process the rides to add additional information
        const processedRides = ridesData.map((ride) => {
          // Create a display status based on ride status and client role
          let displayStatus = ride.status;

          if (ride.isPassenger) {
            if (ride.status === "active") {
              displayStatus = "Ride Confirmed - Waiting to Start";
            } else if (ride.status === "in_progress") {
              displayStatus = "Ride In Progress";
            } else if (ride.status === "completed") {
              displayStatus = "Ride Completed";
            }
          } else if (ride.hasRequest) {
            if (ride.requestStatus === "pending") {
              displayStatus = "Request Pending";
            } else if (ride.requestStatus === "accepted") {
              displayStatus = "Request Accepted";
            } else if (ride.requestStatus === "rejected") {
              displayStatus = "Request Rejected";
            }
          }

          // Return the processed ride with display status
          return {
            ...ride,
            id: ride.rideId || ride.id,
            displayStatus,
            // Format dates for display
            departureDate: new Date(
              parseInt(ride.departureTime) * 1000
            ).toLocaleDateString(),
            departureTime: new Date(
              parseInt(ride.departureTime) * 1000
            ).toLocaleTimeString(),
          };
        });

        console.log("[fetchMyRides] Processed rides:", processedRides);
        setMyRides(processedRides);
      } else {
        console.error("Error fetching rides:", response.data.message);
        setMyRides([]);
      }
    } catch (error) {
      console.error("Error fetching my rides:", error);
      setMyRides([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the existing checkPaymentStatus function
  const checkPaymentStatus = async (rideId, clientId) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/rides/${rideId}/payment-status/${clientId}`
      );
      const data = await response.json();

      if (data.success) {
        setPaymentStatus((prev) => ({
          ...prev,
          [rideId]: data,
        }));
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
    }
  };

  // Set up an interval to refresh ride statuses every 10 seconds
  useEffect(() => {
    const statusInterval = setInterval(() => {
      if (availableRides.length > 0) {
        updateRideStatuses();
      }
    }, 10000); // 10 seconds

    // Clear the interval when component unmounts
    return () => clearInterval(statusInterval);
  }, [availableRides]);

  // Add a similar interval for My Rides to keep them updated
  useEffect(() => {
    const myRidesInterval = setInterval(() => {
      if (showMyRides) {
        fetchMyRides();
      }
    }, 10000); // 10 seconds

    return () => clearInterval(myRidesInterval);
  }, [showMyRides]);

  // After making a ride request, update statuses more aggressively
  // to show the pending status immediately
  const requestRide = async (rideId) => {
    try {
      setIsLoading(true);
      const metaAccount = localStorage.getItem("metaAccount");

      if (!metaAccount) {
        alert("Please connect your MetaMask account first");
        return;
      }

      console.log(`Requesting ride ${rideId} with account ${metaAccount}`);

      const response = await axios.post(
        "http://localhost:8080/api/ride-request",
        {
          rideId,
          clientMetaAccount: metaAccount,
        }
      );

      if (response.data.status === "success" || response.data.success) {
        alert("Ride request submitted successfully!");

        // Update the current rides array to show pending status immediately
        setAvailableRides((prevRides) =>
          prevRides.map((ride) =>
            ride.rideId === rideId
              ? { ...ride, requestStatus: "pending" }
              : ride
          )
        );

        // Then fetch everything fresh
        fetchMyRides();
        setTimeout(updateRideStatuses, 1000); // Update again after 1 second

        return true;
      } else {
        alert(
          "Error requesting ride: " + (response.data.message || "Unknown error")
        );
        return false;
      }
    } catch (error) {
      console.error("Error in requestRide:", error);
      alert(
        "Error requesting ride: " +
          (error.response?.data?.message || error.message)
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to cancel a ride request
  const cancelRide = async (rideId) => {
    try {
      setIsLoading(true);
      const clientId = localStorage.getItem("clientId");
      const metaAccount = localStorage.getItem("metaAccount");

      if (!clientId || !metaAccount) {
        console.error("Client ID or MetaAccount not found in localStorage");
        alert("Unable to cancel ride: Client information not found");
        return;
      }

      const response = await axios.post(
        `http://localhost:8080/api/rides/${rideId}/cancel-request`,
        {
          clientId,
          clientMetaAccount: metaAccount,
        }
      );

      if (response.data.success) {
        alert("Ride request cancelled successfully!");
        fetchMyRides(); // Refresh the rides list
      } else {
        alert("Error cancelling ride request: " + response.data.message);
      }
    } catch (error) {
      console.error("Error cancelling ride request:", error);
      alert(
        "Error cancelling ride request: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Function to make payment for a completed ride
  const makePayment = async (ride) => {
    try {
      setIsLoading(true);
      const metaAccount = localStorage.getItem("metaAccount");

      if (!metaAccount) {
        alert("Please connect your MetaMask account first");
        setIsLoading(false);
        return;
      }

      if (!window.ethereum) {
        alert("MetaMask is not installed");
        setIsLoading(false);
        return;
      }

      // Confirm the payment with the user
      const confirmPay = window.confirm(
        `Are you sure you want to pay ${ride.price} ETH for this ride?`
      );

      if (!confirmPay) {
        setIsLoading(false);
        return;
      }

      console.log(
        `Processing payment for ride ${ride.rideId} by client with account ${metaAccount}`
      );
      // Request the payment using the blockchain service
      const response = await axios.post(
        `http://localhost:8080/api/rides/${ride.rideId}/confirm`,
        {
          clientMetaAccount: metaAccount,
          price: ride.price,
        }
      );

      if (response.data.success) {
        alert("Payment successful! Thank you for using ChainRide.");
        // Update payment status locally
        setPaymentStatus((prev) => ({
          ...prev,
          [ride.rideId]: { paid: true, status: "completed" },
        }));
        // Refresh the rides list
        await fetchMyRides();
      } else {
        alert("Payment failed: " + (response.data.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error making payment:", error);
      alert(
        "Error making payment: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch client rides
  const fetchClientRides = async (metaAccount) => {
    try {
      console.log(
        `[fetchClientRides] Fetching rides for account: ${metaAccount}`
      );

      if (!metaAccount) {
        console.error("[fetchClientRides] No MetaMask account provided");
        return;
      }

      const response = await fetch(
        `/api/client-rides?metaAccount=${metaAccount}`
      );
      const data = await response.json();

      if (response.ok) {
        console.log("[fetchClientRides] Client rides:", data.rides);
        setMyRides(data.rides || []);
      } else {
        console.error(
          "[fetchClientRides] Error fetching client rides:",
          data.message
        );
        toast.error(`Failed to load your rides: ${data.message}`);
      }
    } catch (error) {
      console.error("[fetchClientRides] Error:", error);
      toast.error("Failed to fetch your rides");
    }
  };

  useEffect(() => {
    // Initialize
    const init = async () => {
      try {
        setLoading(true);

        // Check if MetaMask is available
        if (!window.ethereum) {
          toast.error("MetaMask is not installed");
          setLoading(false);
          return;
        }

        // Get MetaMask account
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const metaAccount = accounts[0];

        console.log(`[ClientLocation] Using MetaMask account: ${metaAccount}`);

        // Fetch available rides and client rides
        await fetchAvailableRides();
        await fetchClientRides(metaAccount);

        // Setup MetaMask account change listener
        window.ethereum.on("accountsChanged", (accounts) => {
          console.log(
            "[ClientLocation] MetaMask account changed:",
            accounts[0]
          );
          fetchClientRides(accounts[0]);
        });
      } catch (error) {
        console.error("[ClientLocation] Initialization error:", error);
        toast.error(`Error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Cleanup
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", () => {});
      }
    };
  }, []);

  // Update useEffect to check payment status for payment pending rides
  useEffect(() => {
    const interval = setInterval(() => {
      myRides.forEach((ride) => {
        if (ride.status === "payment_pending") {
          checkPaymentStatus(ride.rideId, ride.clientId);
        }
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [myRides]);

  // Update the renderRideStatus function
  const renderRideStatus = (ride) => {
    if (ride.isPassenger) {
      if (ride.status === "active") {
        return <span className="ride-status confirmed">Ride Confirmed</span>;
      } else if (ride.status === "in_progress") {
        return (
          <span className="ride-status in-progress">Ride In Progress</span>
        );
      } else if (ride.status === "completed") {
        return <span className="ride-status completed">Ride Completed</span>;
      }
    }

    if (ride.hasRequest) {
      if (ride.requestStatus === "pending") {
        return <span className="ride-status pending">Request Pending</span>;
      } else if (ride.requestStatus === "accepted") {
        return <span className="ride-status accepted">Request Accepted</span>;
      } else if (ride.requestStatus === "rejected") {
        return <span className="ride-status rejected">Request Rejected</span>;
      }
    }

    return (
      <span className="ride-status">{ride.displayStatus || ride.status}</span>
    );
  };

  // Add UI toggle functions
  const showAvailableRides = () => {
    setShowRidesList(true);
    setShowMyRides(false);
    fetchAvailableRides();
  };

  const showClientRides = () => {
    setShowRidesList(false);
    setShowMyRides(true);
    fetchMyRides();
  };

  // Add this function to poll for ride status changes more frequently when a ride is in progress
  useEffect(() => {
    // Only set up polling if we have at least one ride in "in_progress" status
    const hasInProgressRide = myRides.some(
      (ride) => ride.status === "in_progress"
    );

    if (hasInProgressRide && showMyRides) {
      console.log("Setting up frequent polling for in-progress rides");

      // Poll every 5 seconds for in-progress rides
      const statusInterval = setInterval(() => {
        fetchMyRides();
      }, 5000);

      return () => clearInterval(statusInterval);
    }
  }, [myRides, showMyRides]);

  // Add this logic to the render method to clearly show "No rides" message when appropriate
  {
    showMyRides && myRides.length === 0 && (
      <div className="no-rides-message">
        <p>You don't have any rides yet. Check available rides to book one!</p>
      </div>
    );
  }

  return (
    <>
      <div className={`ClientMapMainContainer ${showMap ? "show-map" : ""}`}>
        <div className="LocationFinderContainer">
          <div className="client-controls">
            <button
              className={`available-rides-button ${
                showRidesList ? "active" : ""
              }`}
              onClick={showAvailableRides}
              disabled={isLoading}
            >
              {isLoading && showRidesList ? "Loading..." : "Available Rides"}
            </button>

            <button
              className={`my-rides-button ${showMyRides ? "active" : ""}`}
              onClick={showClientRides}
              disabled={isLoading}
            >
              {isLoading && showMyRides ? "Loading..." : "My Rides"}
            </button>

            <button className="toggle-map-button" onClick={toggleMap}>
              {showMap ? "Hide Map" : "Show Map"}
            </button>
          </div>

          {/* Only show the map input when map is visible */}
          {showMap && (
            <>
              <p className="Driver-Search-Para">Enter Your Destination</p>
              <input
                type="text"
                className="LocationFinder-Text"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                placeholder="Enter your destination"
              />
              <button
                className="Client-Search-Button"
                onClick={geocodeDestination}
              >
                Search
              </button>
            </>
          )}

          {/* Available Rides List */}
          {showRidesList && availableRides.length > 0 && (
            <div className="available-rides-list">
              <h3>Available Rides</h3>

              <div className="rides-container">
                {availableRides.map((ride) => (
                  <div
                    key={ride.rideId}
                    className={`ride-item ${
                      selectedRide && selectedRide.rideId === ride.rideId
                        ? "selected"
                        : ""
                    } ${
                      ride.requestStatus ? `status-${ride.requestStatus}` : ""
                    }`}
                    onClick={() => setSelectedRide(ride)}
                  >
                    <div className="ride-header">
                      <h4>Ride #{ride.rideId}</h4>
                      <span className="seats-available">
                        {ride.availableSeats} seats
                      </span>
                    </div>

                    <div className="ride-details">
                      <p>
                        <strong>From:</strong> {ride.startLocation}
                      </p>
                      <p>
                        <strong>To:</strong> {ride.destination}
                      </p>
                      <p>
                        <strong>Price:</strong> {ride.price} ETH
                      </p>
                      <p>
                        <strong>Departure:</strong>{" "}
                        {new Date(ride.departureTime).toLocaleString()}
                      </p>
                    </div>

                    {/* Conditional rendering based on request status */}
                    {!ride.requestStatus && (
                      <button
                        className="request-ride-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestRide(ride.rideId);
                        }}
                        disabled={isLoading}
                      >
                        Request Ride
                      </button>
                    )}

                    {ride.requestStatus === "pending" && (
                      <div className="request-status pending">
                        Request Pending
                      </div>
                    )}

                    {ride.requestStatus === "accepted" && (
                      <div className="request-status accepted">
                        Request Accepted
                      </div>
                    )}

                    {ride.requestStatus === "rejected" && (
                      <div className="request-status rejected">
                        Request Rejected
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showRidesList && availableRides.length === 0 && (
            <div className="no-rides-message">
              <p>No available rides at the moment. Please check back later.</p>
            </div>
          )}

          {/* My Rides List */}
          {showMyRides && myRides.length > 0 && (
            <div className="my-rides-list">
              <h3>My Rides</h3>

              <div className="rides-container">
                {myRides.map((ride) => (
                  <div
                    key={ride.rideId}
                    className={`ride-item ${
                      selectedRide && selectedRide.rideId === ride.rideId
                        ? "selected"
                        : ""
                    } ${ride.paymentPending ? "payment-pending" : ride.status}`}
                    onClick={() => setSelectedRide(ride)}
                  >
                    <div className="ride-header">
                      <h4>Ride #{ride.rideId}</h4>
                      <span
                        className={`status ${
                          ride.paymentPending ? "payment-pending" : ride.status
                        }`}
                      >
                        {renderRideStatus(ride)}
                      </span>
                    </div>

                    <div className="ride-details">
                      <p>
                        <strong>From:</strong> {ride.startLocation}
                      </p>
                      <p>
                        <strong>To:</strong> {ride.destination}
                      </p>
                      <p>
                        <strong>Price:</strong> {ride.price} ETH
                      </p>
                      <p>
                        <strong>Departure:</strong>{" "}
                        {new Date(ride.departureTime).toLocaleString()}
                      </p>
                    </div>

                    {/* Show payment button for rides with pending payment */}
                    {ride.paymentPending && (
                      <button
                        className="payment-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          makePayment(ride);
                        }}
                        disabled={isLoading}
                      >
                        Make Payment ({ride.price} ETH)
                      </button>
                    )}

                    {/* Show cancel button for rides with pending status */}
                    {ride.status === "pending" && (
                      <button
                        className="cancel-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelRide(ride.rideId);
                        }}
                        disabled={isLoading}
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Only show the map when showMap is true */}
        {showMap && (
          <div className="map-container">
            <Map
              googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
              libraries={["geometry"]}
              center={currentDestination}
              zoom={12}
            >
              <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
                <Marker position={currentDestination} />
              </APIProvider>
            </Map>
          </div>
        )}
      </div>
    </>
  );
}

export default ClientLocation;
