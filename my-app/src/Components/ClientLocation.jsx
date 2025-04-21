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
import {
  FaUser,
  FaSignOutAlt,
  FaTachometerAlt,
  FaCarAlt,
  FaClipboardList,
  FaSearch,
} from "react-icons/fa";
import RatingComponent from "./RatingComponent";
import StarDisplay from "./StarDisplay";

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

  // Add new state for navigation
  const [activeSection, setActiveSection] = useState("availableRides");

  // Add a new state for the rating modal
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rideToRate, setRideToRate] = useState(null);

  // Fetch client profile data on component mount
  useEffect(() => {
    const fetchClientProfile = async () => {
      try {
        const metaAccount = localStorage.getItem("metaAccount");
        if (!metaAccount) {
          navigate("/ClientLogin");
          return;
        }

        // Fetch client data
        const response = await axios.get(
          `http://localhost:8080/api/client-by-account/${metaAccount}`,
          { withCredentials: true }
        );

        if (response.data.success && response.data.client) {
          setClientData(response.data.client);
        }
        setLoading(false); // Set loading to false after client data is fetched
      } catch (err) {
        console.error("Error fetching client profile:", err);
        setLoading(false); // Also set loading to false on error
      }
    };

    fetchClientProfile();
  }, [navigate]);

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
      } finally {
        // Make sure to set loading to false regardless of success or failure
        setLoading(false);
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

  // Update the fetchAvailableRides function to include the status check
  const fetchAvailableRides = async () => {
    try {
      setIsLoading(true);
      const clientId = localStorage.getItem("clientId");

      // If no client ID, we can't check request status
      if (!clientId) {
        console.log("No client ID found, can't check request status");
        return;
      }

      const response = await axios.get("http://localhost:8080/api/rides");

      if (response.data.success) {
        // Get rides from response
        const rides = response.data.rides;

        // Only show rides with status "active"
        const activeRides = rides.filter((ride) => ride.status === "active");

        // Instead of checking each ride individually via separate API calls,
        // we'll batch fetch all request statuses once
        // This will prevent the infinite loop of API calls
        const clientRequestsResponse = await axios.get(
          `http://localhost:8080/api/client/${clientId}/ride-requests`
        );

        let requestStatusMap = {};

        // If successful, create a map of rideId -> status
        if (
          clientRequestsResponse.data &&
          clientRequestsResponse.data.success
        ) {
          const requests = clientRequestsResponse.data.requests || [];
          requests.forEach((request) => {
            requestStatusMap[request.rideId] = request.status;
          });
        }

        // Now use the map to add status to each ride
        const ridesWithStatus = activeRides.map((ride) => {
          return {
            ...ride,
            requestStatus: requestStatusMap[ride.rideId] || null,
          };
        });

        setAvailableRides(ridesWithStatus);
      } else {
        console.error("Error fetching rides:", response.data.message);
        setAvailableRides([]);
      }
    } catch (error) {
      console.error("Error fetching available rides:", error);
      setAvailableRides([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch client's rides
  const fetchMyRides = async () => {
    try {
      setIsLoading(true);
      const metaAccount = localStorage.getItem("metaAccount");
      const clientId = localStorage.getItem("clientId");

      if (!metaAccount) {
        console.error("MetaAccount not found in localStorage");
        setIsLoading(false);
        return;
      }

      console.log(
        `[fetchMyRides] Getting rides for client with account ${metaAccount}`
      );

      // Get client rides from the server using the new endpoint
      const response = await axios.get(
        `http://localhost:8080/api/client-rides/${metaAccount}`
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

        // Process the rides to add formatted dates and check payment status
        const processedRides = await Promise.all(
          ridesData.map(async (ride) => {
            // For completed rides, check payment status
            let paymentRequired = false;
            let isPaid = true;
            let hasRated = false;
            let userRating = 0;

            if (ride.status === "completed") {
              try {
                // Get client ID
                if (clientId) {
                  // Check payment status
                  const paymentStatusResponse = await axios.get(
                    `http://localhost:8080/api/rides/${ride.rideId}/payment-status/${clientId}`
                  );

                  if (paymentStatusResponse.data) {
                    isPaid = paymentStatusResponse.data.paid === true;
                    paymentRequired = !isPaid;
                  }

                  // Check if ride has been rated by this client
                  try {
                    const ratingsResponse = await axios.get(
                      `http://localhost:8080/api/rides/${ride.rideId}/ratings`
                    );

                    if (
                      ratingsResponse.data.success &&
                      ratingsResponse.data.ratings
                    ) {
                      const userRatingObj = ratingsResponse.data.ratings.find(
                        (rating) =>
                          rating.clientId &&
                          rating.clientId.toString() === clientId.toString()
                      );

                      if (userRatingObj) {
                        hasRated = true;
                        userRating = userRatingObj.score || 0;
                      }
                    }
                  } catch (ratingError) {
                    console.log(`Error checking ratings: ${ratingError}`);
                  }
                }
              } catch (err) {
                console.log(
                  `Error checking payment for ride ${ride.rideId}:`,
                  err
                );
                // If error, assume payment is required
                paymentRequired = true;
                isPaid = false;
              }
            }

            return {
              ...ride,
              id: ride.rideId || ride.id,
              // Format dates for display
              departureDate: new Date(
                parseInt(ride.departureTime) * 1000
              ).toLocaleDateString(),
              departureTime: new Date(
                parseInt(ride.departureTime) * 1000
              ).toLocaleTimeString(),
              paymentPending: paymentRequired,
              isPaid: isPaid,
              hasRated: hasRated,
              userRating: userRating,
            };
          })
        );

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

  // Update the renderRideStatus function to include a rate button for completed rides
  const renderRideStatus = (ride) => {
    // First priority: Payment status for completed rides
    if (ride.status === "completed") {
      if (ride.paymentPending) {
        return (
          <span className="ride-status payment-pending">Payment Required</span>
        );
      } else if (ride.isPaid) {
        // Always show the rate button for completed and paid rides
        return (
          <div className="ride-completed-actions">
            <span className="ride-status completed">Ride Completed & Paid</span>
            <button
              className="rate-ride-button"
              style={{
                backgroundColor: "#4caf50",
                color: "white",
                padding: "10px",
                width: "100%",
                fontSize: "14px",
              }}
              onClick={(e) => {
                e.stopPropagation();
                openRatingModal(ride);
              }}
            >
              Rate Driver
            </button>
          </div>
        );
      }
      return <span className="ride-status completed">Ride Completed</span>;
    }

    // Second priority: Active ride status
    if (ride.status === "active") {
      if (ride.isPassenger) {
        return <span className="ride-status confirmed">Ride Confirmed</span>;
      }
      return <span className="ride-status active">Ride Active</span>;
    }

    // Third priority: In-progress rides
    if (ride.status === "in_progress") {
      return <span className="ride-status in-progress">Ride In Progress</span>;
    }

    // Fourth priority: Request status
    if (ride.hasRequest || ride.requestStatus) {
      if (ride.requestStatus === "pending") {
        return <span className="ride-status pending">Request Pending</span>;
      } else if (ride.requestStatus === "accepted") {
        return <span className="ride-status accepted">Request Accepted</span>;
      } else if (ride.requestStatus === "rejected") {
        return <span className="ride-status rejected">Request Rejected</span>;
      }
    }

    // Default: Just display the status
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

  // Update the existing checkPaymentStatus function
  const checkPaymentStatus = async (rideId, clientId) => {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/rides/${rideId}/payment-status/${clientId}`
      );

      if (response.data) {
        setPaymentStatus((prev) => ({
          ...prev,
          [rideId]: response.data,
        }));
        return response.data;
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      return { paid: false, status: "error" };
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

  // Update useEffect to check payment status for completed rides
  useEffect(() => {
    if (myRides.length > 0) {
      const completedRides = myRides.filter(
        (ride) => ride.status === "completed" && !ride.isPaid
      );

      if (completedRides.length > 0) {
        console.log(
          `Checking payment status for ${completedRides.length} completed rides`
        );
        const clientId = localStorage.getItem("clientId");
        if (clientId) {
          completedRides.forEach((ride) => {
            checkPaymentStatus(ride.rideId, clientId);
          });
        }
      }
    }
  }, [myRides]);

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

      // First verify that this ride is eligible for payment
      console.log(`Verifying payment eligibility for ride ${ride.rideId}...`);
      try {
        const verifyResponse = await axios.get(
          `http://localhost:8080/api/rides/${ride.rideId}/verify-payment/${metaAccount}`
        );

        // Check if payment is needed
        if (!verifyResponse.data.canPay) {
          alert("This ride has already been paid for.");
          setIsLoading(false);
          await fetchMyRides(); // Refresh rides to update UI
          return;
        }

        // Use the price from the verification if available, otherwise use the one from the ride
        const price = verifyResponse.data.rideDetails?.price || ride.price;
        console.log(`Verified price for payment: ${price} ETH`);

        // Confirm the payment with the user
        const confirmPay = window.confirm(
          `Are you sure you want to pay ${price} ETH for this ride?`
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
            price: price,
          }
        );

        // Check for success based on new API format
        if (response.status === 200) {
          const txHash = response.data.transactionHash || "local";
          alert(`Payment successful! Transaction: ${txHash}`);

          // Update ride status locally
          const updatedRide = {
            ...ride,
            isPaid: true,
            paymentPending: false,
          };

          // Update in myRides array
          setMyRides((prevRides) =>
            prevRides.map((r) => (r.rideId === ride.rideId ? updatedRide : r))
          );

          // If this is the selected ride, update it too
          if (selectedRide && selectedRide.rideId === ride.rideId) {
            setSelectedRide(updatedRide);
          }

          // Update payment status locally
          setPaymentStatus((prev) => ({
            ...prev,
            [ride.rideId]: { paid: true, status: "completed" },
          }));

          // Open the rating modal after successful payment
          setRideToRate(updatedRide);
          setShowRatingModal(true);
        } else {
          alert("Payment failed: " + (response.data.error || "Unknown error"));
        }
      } catch (verifyError) {
        console.error("Error verifying payment eligibility:", verifyError);

        // Handle specific verification errors
        if (verifyError.response) {
          const errorMessage =
            verifyError.response.data.error || "Unknown error";
          alert(`Cannot process payment: ${errorMessage}`);
        } else {
          alert(`Error verifying payment: ${verifyError.message}`);
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error making payment:", error);

      // Enhanced error handling
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Unknown error";
      alert("Error making payment: " + errorMessage);
      setIsLoading(false);
    }
  };

  // Add new navigation function
  const navigateToRiderDashboard = () => {
    navigate("/RiderDashboard");
  };

  // Add logout function
  const handleLogout = () => {
    localStorage.removeItem("clientId");
    localStorage.removeItem("metaAccount");
    navigate("/ClientLogin");
  };

  // Profile section render
  const renderProfile = () => (
    <div className="profile-content">
      <h2>Rider Profile</h2>

      {clientData ? (
        <div className="profile-details">
          <div className="profile-picture">
            <div className="profile-avatar">
              {clientData.name ? clientData.name.charAt(0).toUpperCase() : "R"}
            </div>
          </div>

          <div className="profile-info">
            <div className="info-group">
              <label>Name:</label>
              <p>{clientData.name || "Not provided"}</p>
            </div>

            <div className="info-group">
              <label>Email:</label>
              <p>{clientData.email || "Not provided"}</p>
            </div>

            <div className="info-group">
              <label>Phone:</label>
              <p>{clientData.phone || "Not provided"}</p>
            </div>

            <div className="info-group">
              <label>Wallet Address:</label>
              <p className="wallet-address">
                {clientData.walletAddress ||
                  clientData.metaAccount ||
                  clientMetaAccount ||
                  "Not connected"}
              </p>
            </div>

            <div className="info-group">
              <label>Client ID:</label>
              <p>{clientData.clientId || clientId || "Unknown"}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="loading-indicator">Loading profile...</div>
      )}
    </div>
  );

  // Available rides section
  const renderAvailableRides = () => (
    <div className="available-rides-section">
      <div className="section-header">
        <h2>Available Rides</h2>
        <div className="section-controls">
          <button className="toggle-map-button" onClick={toggleMap}>
            {showMap ? "Hide Map" : "Show Map"}
          </button>
        </div>
      </div>

      {showMap && (
        <div className="map-search-controls">
          <p className="Driver-Search-Para">Enter Your Destination</p>
          <input
            type="text"
            className="LocationFinder-Text"
            value={destinationInput}
            onChange={(e) => setDestinationInput(e.target.value)}
            placeholder="Enter your destination"
          />
          <button className="Client-Search-Button" onClick={geocodeDestination}>
            Search
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="loading-indicator">Loading rides...</div>
      ) : availableRides.length > 0 ? (
        <div className="rides-container">
          {availableRides.map((ride) => (
            <div
              key={ride.rideId}
              className={`ride-item ${
                selectedRide && selectedRide.rideId === ride.rideId
                  ? "selected"
                  : ""
              } ${ride.requestStatus ? `status-${ride.requestStatus}` : ""}`}
              onClick={() => setSelectedRide(ride)}
            >
              <div className="ride-header">
                <h4>Ride #{ride.rideId}</h4>
                <span className="seats-available">
                  {ride.availableSeats} seats
                </span>
              </div>

              <div className="ride-details">
                <div className="detail-item">
                  <span className="detail-label">From</span>
                  <span className="detail-value">
                    {ride.startLocation || ride.startLocationName || "Unknown"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">To</span>
                  <span className="detail-value">
                    {ride.destination || ride.destinationName || "Unknown"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Price</span>
                  <span className="detail-value">{ride.price} ETH</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Departure</span>
                  <span className="detail-value">
                    {ride.departureTime
                      ? new Date(ride.departureTime).toLocaleString()
                      : "Flexible"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Driver Rating</span>
                  <RatingComponent driverId={ride.driverId} readOnly={true} />
                </div>
              </div>

              {ride.requestStatus && (
                <div className="request-status-container">
                  <span className={`request-status ${ride.requestStatus}`}>
                    {ride.requestStatus === "pending" && "Request Pending"}
                    {ride.requestStatus === "accepted" && "Request Accepted"}
                    {ride.requestStatus === "rejected" && "Request Rejected"}
                  </span>
                </div>
              )}

              {!ride.requestStatus && (
                <div className="ride-actions">
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
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-rides-message">
          No available rides at the moment. Please check back later.
        </div>
      )}

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
  );

  // Add a new function to show the rating modal
  const openRatingModal = (ride) => {
    setRideToRate(ride);
    setShowRatingModal(true);
  };

  // Add a function to handle when rating is submitted
  const handleRatingSubmitted = async (rating) => {
    setShowRatingModal(false);

    if (rideToRate) {
      // Update the ride's hasRated status locally without having to refetch all rides
      setMyRides((prevRides) =>
        prevRides.map((ride) =>
          ride.rideId === rideToRate.rideId
            ? { ...ride, hasRated: true, userRating: rating }
            : ride
        )
      );

      // Also update the selected ride if it's the one that was rated
      if (selectedRide && selectedRide.rideId === rideToRate.rideId) {
        setSelectedRide({
          ...selectedRide,
          hasRated: true,
          userRating: rating,
        });
      }
    }
  };

  // My rides section
  const renderMyRides = () => (
    <div className="my-rides-section">
      <div className="section-header">
        <h2>My Rides</h2>
        <button
          className="refresh-button"
          onClick={fetchMyRides}
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="loading-indicator">Loading your rides...</div>
      ) : myRides.length > 0 ? (
        <div className="rides-container">
          {myRides.map((ride) => (
            <div
              key={ride.rideId}
              className={`ride-item ${
                selectedRide && selectedRide.rideId === ride.rideId
                  ? "selected"
                  : ""
              } ${ride.status || "unknown"}`}
              onClick={() => setSelectedRide(ride)}
            >
              <div className="ride-header">
                <h4>Ride #{ride.rideId}</h4>
                <div className="ride-driver-info">
                  <span>Driver #{ride.driverId}</span>
                  {ride.driverId && (
                    <RatingComponent driverId={ride.driverId} readOnly={true} />
                  )}
                </div>
              </div>

              <div className="ride-details">
                <div className="detail-item">
                  <span className="detail-label">From</span>
                  <span className="detail-value">
                    {ride.startLocation || ride.startLocationName || "Unknown"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">To</span>
                  <span className="detail-value">
                    {ride.destination || ride.destinationName || "Unknown"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Price</span>
                  <span className="detail-value">{ride.price} ETH</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date</span>
                  <span className="detail-value">
                    {ride.departureTime
                      ? new Date(
                          parseInt(ride.departureTime) * 1000
                        ).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>

              {/* Show payment button for rides with pending payment */}
              {ride.status === "completed" && ride.paymentPending && (
                <div className="ride-actions">
                  <button
                    className="payment-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      makePayment(ride);
                    }}
                    disabled={isLoading}
                  >
                    {isLoading
                      ? "Processing..."
                      : `Make Payment (${ride.price} ETH)`}
                  </button>
                </div>
              )}

              {/* Show rating button for completed and paid rides that haven't been rated */}
              {ride.status === "completed" && ride.isPaid && !ride.hasRated && (
                <div className="ride-actions">
                  <button
                    className="rate-ride-button"
                    style={{
                      backgroundColor: "#4caf50",
                      color: "white",
                      padding: "10px",
                      width: "100%",
                      fontSize: "14px",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openRatingModal(ride);
                    }}
                  >
                    Rate Driver
                  </button>
                </div>
              )}

              {/* Show rating status for already rated rides */}
              {ride.status === "completed" && ride.isPaid && ride.hasRated && (
                <div className="ride-actions">
                  <div
                    className="rating-info"
                    style={{
                      textAlign: "center",
                      padding: "10px",
                      backgroundColor: "rgba(76, 175, 80, 0.1)",
                      border: "1px solid #4caf50",
                      borderRadius: "4px",
                      color: "#4caf50",
                      fontWeight: "bold",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", marginBottom: "3px" }}>
                        You rated this driver:
                      </div>
                      <StarDisplay rating={ride.userRating} size={18} />
                    </div>
                  </div>
                </div>
              )}

              {/* Show cancel button for rides with pending status */}
              {ride.status === "pending" && (
                <div className="ride-actions">
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
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-rides-message">
          You haven't booked any rides yet.
        </div>
      )}
    </div>
  );

  return (
    <div className="client-dashboard-wrapper">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-logo">
          <h1>RideApp</h1>
        </div>
        <div className="dashboard-user">
          {clientData && (
            <>
              <span className="user-greeting">
                Hello, {clientData.name || "Rider"}
              </span>
              <div
                className="user-avatar"
                onClick={() => setActiveSection("profile")}
              >
                {clientData.name
                  ? clientData.name.charAt(0).toUpperCase()
                  : "R"}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main content with sidebar and content area */}
      <div className="client-dashboard-container">
        {/* Sidebar */}
        <div className="dashboard-sidebar">
          <div className="sidebar-profile">
            {clientData && (
              <div className="sidebar-avatar">
                {clientData.name
                  ? clientData.name.charAt(0).toUpperCase()
                  : "R"}
              </div>
            )}
            <div className="sidebar-user-info">
              <h3>{clientData ? clientData.name || "Rider" : "Rider"}</h3>
              <p className="user-status">Online</p>
            </div>
          </div>

          <ul className="sidebar-menu">
            <li
              className={activeSection === "profile" ? "active" : ""}
              onClick={() => setActiveSection("profile")}
            >
              <FaUser className="menu-icon" />
              <span>Profile</span>
            </li>
            <li
              className={activeSection === "availableRides" ? "active" : ""}
              onClick={() => {
                setActiveSection("availableRides");
                setShowRidesList(true);
                setShowMyRides(false);
                fetchAvailableRides();
              }}
            >
              <FaSearch className="menu-icon" />
              <span>Available Rides</span>
            </li>
            <li
              className={activeSection === "myRides" ? "active" : ""}
              onClick={() => {
                setActiveSection("myRides");
                setShowRidesList(false);
                setShowMyRides(true);
                fetchMyRides();
              }}
            >
              <FaClipboardList className="menu-icon" />
              <span>My Rides</span>
            </li>
            <li onClick={handleLogout}>
              <FaSignOutAlt className="menu-icon" />
              <span>Logout</span>
            </li>
          </ul>
        </div>

        {/* Main content area */}
        <div className="dashboard-main">
          {loading ? (
            <div className="loading-indicator">Loading...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <>
              {activeSection === "profile" && renderProfile()}
              {activeSection === "availableRides" && renderAvailableRides()}
              {activeSection === "myRides" && renderMyRides()}
            </>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && rideToRate && (
        <div className="rating-modal">
          <div className="rating-modal-content">
            <span
              className="rating-modal-close"
              onClick={() => setShowRatingModal(false)}
            >
              &times;
            </span>
            <RatingComponent
              rideId={rideToRate.rideId}
              driverId={rideToRate.driverId}
              driverName={`Driver #${rideToRate.driverId}`}
              onRatingSubmitted={handleRatingSubmitted}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientLocation;
