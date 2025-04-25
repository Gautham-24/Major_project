const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const loginRoute = require("./routes/login");
const verifiedRoute = require("./routes/Verified");
const cookieJwtAuth = require("./src/middleware/cookieJwtAuth");

// Import blockchain service
const blockchainService = require("./src/services/BlockchainService");
console.log("BlockchainService loaded successfully");

// Verify required methods are available
const requiredMethods = [
  "getClientIdByAccount",
  "getClient",
  "registerClient",
  "registerDriver",
  "getDriverIdByAccount",
  "getDriver",
];

requiredMethods.forEach((method) => {
  if (typeof blockchainService[method] !== "function") {
    console.error(`ERROR: ${method} method is missing from BlockchainService!`);
  }
});

const app = express();
const Port = 8080;

// Counter variables for fallback ID generation
let driverIdCounter = 1;
let clientIdCounter = 1;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

// Routes
app.use("/api/login", loginRoute);
app.use("/api/verified", verifiedRoute);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    blockchain: blockchainService.isInitialized ? "connected" : "disconnected",
  });
});

// API endpoints with better error handling
// Driver endpoints
app.post("/api/driver-register", async (req, res) => {
  try {
    const {
      metaAccount,
      name,
      email,
      phone,
      carModel,
      licensePlate,
      carColor,
    } = req.body;

    if (!metaAccount) {
      return res.status(400).json({
        success: false,
        message: "metaAccount is required",
      });
    }

    // Register driver on blockchain
    const result = await blockchainService.registerDriver(
      metaAccount,
      name || "Driver",
      email || "driver@example.com",
      phone || "123-456-7890",
      carModel || "Default Car",
      licensePlate || "ABC123",
      carColor || "Black"
    );

    if (result.success) {
      res.status(201).json({ success: true, driverId: result.driverId });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error("Error registering driver:", error.message);
    res.status(500).json({
      success: false,
      message: "Error registering driver",
      error: error.message,
    });
  }
});

app.get("/api/drivers", async (req, res) => {
  try {
    // Get all drivers from blockchain
    const result = await blockchainService.getAllDrivers();

    if (result.success) {
      res.status(200).json({ success: true, drivers: result.drivers });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error("Error getting drivers:", error.message);
    res.status(500).json({
      success: false,
      message: "Error getting drivers",
      error: error.message,
    });
  }
});

app.get("/api/driver/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;

    // Get driver from blockchain
    const driver = await blockchainService.getDriver(driverId);

    if (driver) {
      res.status(200).json({ success: true, driver });
    } else {
      res.status(404).json({ success: false, message: "Driver not found" });
    }
  } catch (error) {
    console.error("Error getting driver:", error.message);
    res.status(500).json({
      success: false,
      message: "Error getting driver",
      error: error.message,
    });
  }
});

// Get driver by MetaMask account
app.get("/api/driver-by-account/:metaAccount", async (req, res) => {
  try {
    const { metaAccount } = req.params;

    if (!metaAccount) {
      return res.status(400).json({
        success: false,
        message: "metaAccount is required",
      });
    }

    // Get driver ID directly from blockchain
    const driverId = await blockchainService.getDriverIdByAccount(metaAccount);

    if (driverId) {
      // Get driver details
      const driver = await blockchainService.getDriver(driverId);
      return res.status(200).json({
        success: true,
        driver,
      });
    }

    // If no driver found
    return res.status(404).json({
      success: false,
      message: "Driver not found for this MetaMask account",
    });
  } catch (error) {
    console.error("Error in driver endpoint:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Update driver profile
app.put("/api/driver/update", async (req, res) => {
  try {
    const {
      metaAccount,
      name,
      email,
      phone,
      carModel,
      licensePlate,
      carColor,
    } = req.body;

    if (!metaAccount) {
      return res.status(400).json({
        success: false,
        message: "metaAccount is required",
      });
    }

    // Update driver on blockchain
    const result = await blockchainService.updateDriver(
      metaAccount,
      name,
      email,
      phone,
      carModel,
      licensePlate,
      carColor
    );

    if (result.success) {
      // Get updated driver details
      const updatedDriver = await blockchainService.getDriver(result.driverId);
      return res.status(200).json({
        success: true,
        driver: updatedDriver,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.error || "Failed to update driver",
      });
    }
  } catch (error) {
    console.error("Error updating driver:", error.message);
    res.status(500).json({
      success: false,
      message: "Error updating driver",
      error: error.message,
    });
  }
});

// Client endpoints
app.post("/api/client-register", async (req, res) => {
  try {
    const { metaAccount, name, email, phone } = req.body;

    if (!metaAccount) {
      return res.status(400).json({
        success: false,
        message: "metaAccount is required",
      });
    }

    // Check if the client is already registered
    if (typeof blockchainService.getClientIdByAccount !== "function") {
      console.error("getClientIdByAccount method is not available!");
      return res.status(500).json({
        success: false,
        message:
          "Server configuration error: getClientIdByAccount method not available",
      });
    }

    let existingClientId;
    try {
      existingClientId = await blockchainService.getClientIdByAccount(
        metaAccount
      );
      console.log(
        `Checking if client exists: ${existingClientId ? "Yes" : "No"}`
      );
    } catch (checkError) {
      console.error("Error checking if client exists:", checkError);
      // Continue with registration attempt even if check fails
    }

    if (existingClientId) {
      console.log(`Client already registered with ID: ${existingClientId}`);
      return res.status(200).json({
        success: true,
        clientId: existingClientId,
        message: "Client already registered",
      });
    }

    // Register client on blockchain
    if (typeof blockchainService.registerClient !== "function") {
      console.error("registerClient method is not available!");
      return res.status(500).json({
        success: false,
        message:
          "Server configuration error: registerClient method not available",
      });
    }

    // Register client on blockchain
    const result = await blockchainService.registerClient(
      metaAccount,
      name || "Client",
      email || "client@example.com",
      phone || "123-456-7890"
    );

    if (result.success) {
      res.status(201).json({ success: true, clientId: result.clientId });
    } else {
      // Check if the error message indicates the client is already registered
      if (result.error && result.error.includes("already registered")) {
        // Try to get the client ID again
        try {
          const clientId = await blockchainService.getClientIdByAccount(
            metaAccount
          );
          if (clientId) {
            console.log(`Client was already registered with ID: ${clientId}`);
            return res.status(200).json({
              success: true,
              clientId: clientId,
              message: "Client already registered",
            });
          }
        } catch (getIdError) {
          console.error(
            "Error getting client ID after failed registration:",
            getIdError
          );
        }
      }

      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    // Check if the error message indicates the client is already registered
    if (error.message && error.message.includes("already registered")) {
      try {
        const clientId = await blockchainService.getClientIdByAccount(
          metaAccount
        );
        if (clientId) {
          console.log(`Client was already registered with ID: ${clientId}`);
          return res.status(200).json({
            success: true,
            clientId: clientId,
            message: "Client already registered",
          });
        }
      } catch (getIdError) {
        console.error(
          "Error getting client ID after registration error:",
          getIdError
        );
      }
    }

    console.error("Error registering client:", error.message);
    res.status(500).json({
      success: false,
      message: "Error registering client",
      error: error.message,
    });
  }
});

app.get("/api/client/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;

    // Get client from blockchain
    const client = await blockchainService.getClient(clientId);

    if (client) {
      res.status(200).json({ success: true, client });
    } else {
      res.status(404).json({ success: false, message: "Client not found" });
    }
  } catch (error) {
    console.error("Error getting client:", error.message);
    res.status(500).json({
      success: false,
      message: "Error getting client",
      error: error.message,
    });
  }
});

// Get client by MetaMask account
app.get("/api/client-by-account/:account", async (req, res) => {
  try {
    const { account } = req.params;

    if (!account) {
      return res.status(400).json({
        success: false,
        message: "MetaMask account is required",
      });
    }

    // Check if the getClientIdByAccount method exists
    if (typeof blockchainService.getClientIdByAccount !== "function") {
      console.error("getClientIdByAccount method is not available!");
      return res.status(500).json({
        success: false,
        message:
          "Server configuration error: getClientIdByAccount method not available",
      });
    }

    // Get client ID by account
    let clientId;
    try {
      clientId = await blockchainService.getClientIdByAccount(account);
      console.log(`Client ID for account ${account}: ${clientId}`);
    } catch (idError) {
      console.error("Error in getClientIdByAccount:", idError);
      return res.status(500).json({
        success: false,
        message: "Error getting client ID by account",
        error: idError.message,
      });
    }

    if (!clientId) {
      return res.status(404).json({
        success: false,
        message: "Client not found for this MetaMask account",
      });
    }

    // Check if the getClient method exists
    if (typeof blockchainService.getClient !== "function") {
      console.error("getClient method is not available!");
      return res.status(500).json({
        success: false,
        message: "Server configuration error: getClient method not available",
      });
    }

    // Get client details
    let client;
    try {
      client = await blockchainService.getClient(clientId);
      console.log(`Client details for ID ${clientId}:`, client);
    } catch (clientError) {
      console.error("Error in getClient:", clientError);
      return res.status(500).json({
        success: false,
        message: "Error getting client details",
        error: clientError.message,
      });
    }

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    return res.status(200).json({
      success: true,
      client: {
        ...client,
        clientId,
      },
    });
  } catch (error) {
    console.error("Error getting client by account:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting client by account",
      error: error.message,
    });
  }
});

// Update client profile
app.put("/api/client/update", async (req, res) => {
  try {
    const { metaAccount, name, email, phone } = req.body;

    if (!metaAccount) {
      return res.status(400).json({
        success: false,
        message: "metaAccount is required",
      });
    }

    // Update client on blockchain
    const result = await blockchainService.updateClient(
      metaAccount,
      name,
      email,
      phone
    );

    if (result.success) {
      // Get updated client details
      const updatedClient = await blockchainService.getClient(result.clientId);
      return res.status(200).json({
        success: true,
        client: updatedClient,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.error || "Failed to update client",
      });
    }
  } catch (error) {
    console.error("Error updating client:", error.message);
    res.status(500).json({
      success: false,
      message: "Error updating client",
      error: error.message,
    });
  }
});

// Ride endpoints
app.post("/api/rides", async (req, res) => {
  try {
    const {
      driverMetaAccount,
      startLocation,
      destination,
      availableSeats,
      price,
      departureTime,
    } = req.body;

    if (!driverMetaAccount || !startLocation || !destination || !price) {
      return res.status(400).json({
        success: false,
        message:
          "driverMetaAccount, startLocation, destination, and price are required",
      });
    }

    // Create ride on blockchain
    const result = await blockchainService.createRide(
      driverMetaAccount,
      startLocation,
      destination,
      availableSeats || 1,
      price,
      departureTime || new Date().toISOString()
    );

    if (result.success) {
      res.status(201).json({ success: true, rideId: result.rideId });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error("Error creating ride:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/rides", async (req, res) => {
  try {
    // Get active rides from blockchain
    const result = await blockchainService.getActiveRides();

    if (result.success) {
      res.status(200).json({ success: true, rides: result.rides });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error("Error fetching rides:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching rides",
      error: error.message,
    });
  }
});

app.get("/api/rides/driver/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "driverId is required",
      });
    }

    // Get driver rides from blockchain
    const result = await blockchainService.getDriverRides(driverId);

    if (result.success) {
      res.status(200).json({ success: true, rides: result.rides });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error("Error fetching driver rides:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching driver rides",
      error: error.message,
    });
  }
});

app.get("/api/rides/client/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "clientId is required",
      });
    }

    // Get client rides from blockchain
    const result = await blockchainService.getClientRides(clientId);

    if (result.success) {
      res.status(200).json({ success: true, rides: result.rides });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error("Error fetching client rides:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching client rides",
      error: error.message,
    });
  }
});

app.get("/api/rides/:rideId/requests", async (req, res) => {
  try {
    const { rideId } = req.params;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "rideId is required",
      });
    }

    // Get ride requests from blockchain
    const result = await blockchainService.getRideRequests(rideId);

    if (result.success) {
      res.status(200).json({ success: true, requests: result.requests });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error("Error fetching ride requests:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching ride requests",
      error: error.message,
    });
  }
});

app.post("/api/rides/:rideId/request", async (req, res) => {
  try {
    const { rideId } = req.params;
    const { clientMetaAccount } = req.body;

    if (!rideId || !clientMetaAccount) {
      return res.status(400).json({
        success: false,
        message: "rideId and clientMetaAccount are required",
      });
    }

    console.log(
      `Received ride request for ride ${rideId} from account ${clientMetaAccount}`
    );

    // Check if the requestRide method exists
    if (typeof blockchainService.requestRide !== "function") {
      console.error("requestRide method is not available!");
      return res.status(500).json({
        success: false,
        message: "Server configuration error: requestRide method not available",
      });
    }

    // Request ride on blockchain
    try {
      const result = await blockchainService.requestRide(
        clientMetaAccount,
        rideId
      );

      if (result.success) {
        console.log(
          `Ride ${rideId} requested successfully by ${clientMetaAccount}`
        );
        return res.status(200).json({
          success: true,
          requestId: result.requestId,
        });
      } else {
        console.error(`Error requesting ride: ${result.error}`);
        return res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (blockchainError) {
      console.error("Blockchain error requesting ride:", blockchainError);
      return res.status(500).json({
        success: false,
        message: "Blockchain error requesting ride",
        error: blockchainError.message,
      });
    }
  } catch (error) {
    console.error("Error requesting ride:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error requesting ride",
      error: error.message,
    });
  }
});

app.post("/api/rides/:rideId/accept-request/:requestId", async (req, res) => {
  try {
    const { rideId, requestId } = req.params;
    const { driverMetaAccount } = req.body;

    if (!rideId || !requestId || !driverMetaAccount) {
      return res.status(400).json({
        success: false,
        message: "rideId, requestId, and driverMetaAccount are required",
      });
    }

    // Accept ride request on blockchain
    const result = await blockchainService.acceptRideRequest(
      driverMetaAccount,
      rideId,
      requestId
    );

    if (result.success) {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error("Error accepting ride request:", error.message);
    res.status(500).json({
      success: false,
      message: "Error accepting ride request",
      error: error.message,
    });
  }
});

app.post("/api/rides/:rideId/reject-request/:requestId", async (req, res) => {
  try {
    const { rideId, requestId } = req.params;
    const { driverMetaAccount } = req.body;

    if (!rideId || !requestId || !driverMetaAccount) {
      return res.status(400).json({
        success: false,
        message: "rideId, requestId, and driverMetaAccount are required",
      });
    }

    // Reject ride request on blockchain
    const result = await blockchainService.rejectRideRequest(
      driverMetaAccount,
      rideId,
      requestId
    );

    if (result.success) {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error("Error rejecting ride request:", error.message);
    res.status(500).json({
      success: false,
      message: "Error rejecting ride request",
      error: error.message,
    });
  }
});

app.post("/api/rides/:rideId/start", async (req, res) => {
  try {
    const { rideId } = req.params;
    const { driverMetaAccount } = req.body;

    if (!rideId || !driverMetaAccount) {
      return res.status(400).json({
        success: false,
        message: "rideId and driverMetaAccount are required",
      });
    }

    // Start ride on blockchain
    const result = await blockchainService.startRide(driverMetaAccount, rideId);

    if (result.success) {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error("Error starting ride:", error.message);
    res.status(500).json({
      success: false,
      message: "Error starting ride",
      error: error.message,
    });
  }
});

app.post("/api/rides/:rideId/complete", async (req, res) => {
  try {
    const { rideId } = req.params;
    const { driverMetaAccount } = req.body;

    if (!driverMetaAccount) {
      return res.status(400).json({
        success: false,
        message: "driverMetaAccount is required",
      });
    }

    // Complete ride on blockchain
    const result = await blockchainService.completeRide(
      driverMetaAccount,
      rideId
    );

    if (result.success) {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error("Error completing ride:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/rides/:rideId/confirm", async (req, res) => {
  try {
    const { rideId } = req.params;
    const { clientMetaAccount, price } = req.body;

    if (!rideId || !clientMetaAccount || !price) {
      console.log("Missing required fields:", {
        rideId,
        clientMetaAccount,
        price,
      });
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log("Payment request:", { rideId, clientMetaAccount, price });

    // First verify payment eligibility
    try {
      // Get the client ID associated with the account
      const clientId = await blockchainService.getClientIdByAccount(
        clientMetaAccount
      );
      if (!clientId) {
        console.log(`Client with meta account ${clientMetaAccount} not found`);
        return res.status(404).json({ error: "Client not found" });
      }

      console.log(
        `Found client ID: ${clientId} for meta account: ${clientMetaAccount}`
      );

      // Get the ride
      const ride = await blockchainService.getRide(rideId);
      if (!ride) {
        console.log(`Ride ${rideId} not found`);
        return res.status(404).json({ error: "Ride not found" });
      }

      console.log("Ride found:", ride);

      // Check if the ride is completed
      if (ride.status !== "completed") {
        console.log(
          `Ride ${rideId} is not completed, current status: ${ride.status}`
        );
        return res.status(400).json({ error: "Ride is not completed" });
      }

      // Check if the client is a passenger on the ride
      const isPassenger = await blockchainService.isClientPassengerOfRide(
        clientId,
        rideId
      );
      if (!isPassenger) {
        console.log(`Client ${clientId} is not a passenger on ride ${rideId}`);
        return res
          .status(403)
          .json({ error: "Client is not a passenger on this ride" });
      }

      // Check if payment has already been made
      const paymentStatus = await blockchainService.checkPaymentStatus(
        rideId,
        clientId
      );
      if (paymentStatus.paid) {
        console.log(
          `Ride ${rideId} has already been paid for by client ${clientId}`
        );
        return res
          .status(400)
          .json({ error: "This ride has already been paid for" });
      }

      // Process the payment
      const result = await blockchainService.confirmRide(
        clientMetaAccount,
        rideId,
        price
      );

      if (result.success) {
        console.log("Payment successful:", result);
        return res.status(200).json({
          message: "Payment processed successfully",
          transactionHash: result.transactionHash,
        });
      } else {
        console.log("Payment failed:", result);
        return res
          .status(400)
          .json({ error: result.error || "Payment failed" });
      }
    } catch (verifyError) {
      console.error("Error during payment verification:", verifyError);
      return res
        .status(500)
        .json({ error: `Verification error: ${verifyError.message}` });
    }
  } catch (error) {
    console.error("Error processing ride payment:", error);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

app.post(
  "/api/rides/:rideId/complete-passenger/:passengerId",
  async (req, res) => {
    try {
      const { rideId, passengerId } = req.params;
      const { driverMetaAccount } = req.body;

      if (!rideId || !passengerId || !driverMetaAccount) {
        return res.status(400).json({
          success: false,
          message: "rideId, passengerId, and driverMetaAccount are required",
        });
      }

      // Complete ride for passenger on blockchain
      const result = await blockchainService.completeRideForPassenger(
        driverMetaAccount,
        rideId,
        passengerId
      );

      if (result.success) {
        res.status(200).json({ success: true });
      } else {
        res.status(400).json({ success: false, message: result.error });
      }
    } catch (error) {
      console.error("Error completing ride for passenger:", error.message);
      res.status(500).json({
        success: false,
        message: "Error completing ride for passenger",
        error: error.message,
      });
    }
  }
);

app.post("/api/rides/:rideId/cancel", async (req, res) => {
  try {
    const { rideId } = req.params;
    const { driverMetaAccount } = req.body;

    if (!rideId || !driverMetaAccount) {
      return res.status(400).json({
        success: false,
        message: "rideId and driverMetaAccount are required",
      });
    }

    // Cancel ride on blockchain
    const result = await blockchainService.cancelRide(
      driverMetaAccount,
      rideId
    );

    if (result.success) {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error("Error cancelling ride:", error.message);
    res.status(500).json({
      success: false,
      message: "Error cancelling ride",
      error: error.message,
    });
  }
});

app.get("/api/nearby-drivers", async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
      });
    }

    // Get nearby drivers from blockchain
    const result = await blockchainService.getNearbyDrivers(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(radius) || 5000 // Default 5km radius
    );

    if (result.success) {
      res.status(200).json({ success: true, drivers: result.drivers });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error("Error fetching nearby drivers:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching nearby drivers",
      error: error.message,
    });
  }
});

// Get all available Ganache accounts
app.get("/api/accounts", async (req, res) => {
  try {
    const accounts = await blockchainService.getAccounts();
    res.status(200).json({ success: true, accounts });
  } catch (error) {
    console.error("Error fetching accounts:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching accounts",
      error: error.message,
    });
  }
});

// Generate driver ID endpoint
app.get("/api/generate-driver-id", async (req, res) => {
  try {
    if (!blockchainService.isInitialized()) {
      return res
        .status(503)
        .json({ error: "Blockchain service not initialized" });
    }

    let driverId;
    try {
      const totalDrivers = await blockchainService.getTotalDrivers();
      driverId = totalDrivers + 1;
      console.log(`Generated driver ID ${driverId} using getTotalDrivers`);
    } catch (error) {
      console.log(
        "Error getting total drivers, falling back to driverIdCounter:",
        error
      );
      driverId = driverIdCounter++;
    }

    res.json({ driverId });
  } catch (error) {
    console.error("Error generating driver ID:", error);
    res.status(500).json({ error: "Failed to generate driver ID" });
  }
});

// Generate client ID endpoint
app.get("/api/generate-client-id", async (req, res) => {
  try {
    // Check if blockchain service is initialized
    if (!blockchainService.isInitialized) {
      return res.status(503).json({
        success: false,
        message:
          "Blockchain service is not initialized. Please try again later.",
      });
    }

    let newClientId;

    try {
      // Try to get the total number of clients using getTotalClients
      const totalClients = await blockchainService.contract.methods
        .getTotalClients()
        .call();
      newClientId = parseInt(totalClients) + 1;
    } catch (error) {
      console.log(
        "getTotalClients not available, using clientIdCounter directly"
      );
      // If getTotalClients is not available, use clientIdCounter directly
      const clientIdCounter = await blockchainService.contract.methods
        .clientIdCounter()
        .call();
      newClientId = parseInt(clientIdCounter);
    }

    res.status(200).json({
      success: true,
      clientId: newClientId,
    });
  } catch (error) {
    console.error("Error generating client ID:", error.message);
    res.status(500).json({
      success: false,
      message: "Error generating client ID",
      error: error.message,
    });
  }
});

// Cancel ride request endpoint
app.post("/api/rides/:rideId/cancel-request", async (req, res) => {
  try {
    const { rideId } = req.params;
    const { clientId, clientMetaAccount } = req.body;

    if (!rideId || !clientId || !clientMetaAccount) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required parameters: rideId, clientId, or clientMetaAccount",
      });
    }

    console.log(
      `Processing ride request cancellation for ride ${rideId} by client ${clientId}`
    );

    // Cancel ride request on blockchain
    const result = await blockchainService.cancelRideRequest(
      clientMetaAccount,
      rideId,
      clientId
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Ride request cancelled successfully",
        rideId,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }
  } catch (error) {
    console.error("Error cancelling ride request:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel ride request",
      error: error.message,
    });
  }
});

// Complete payment endpoint
app.post("/api/complete-payment", async (req, res) => {
  try {
    const { rideId, clientId, transactionHash } = req.body;

    if (!rideId || !clientId || !transactionHash) {
      return res.status(400).json({
        status: "failure",
        message:
          "Missing required parameters: rideId, clientId, or transactionHash",
      });
    }

    console.log(
      `Processing payment completion for ride ${rideId} by client ${clientId}`
    );
    console.log(`Transaction hash: ${transactionHash}`);

    // Update ride status in the blockchain
    await blockchainService.completeRidePayment(
      rideId,
      clientId,
      transactionHash
    );

    return res.status(200).json({
      status: "success",
      message: "Payment completed successfully",
      rideId,
      transactionHash,
    });
  } catch (error) {
    console.error("Error completing payment:", error);
    return res.status(500).json({
      status: "failure",
      message: "Failed to complete payment",
      error: error.message,
    });
  }
});

// API to get client rides
app.get("/api/client-rides", async (req, res) => {
  try {
    const { metaAccount } = req.query;

    console.log(
      `[/api/client-rides] Fetching rides for account: ${metaAccount}`
    );

    if (!metaAccount) {
      console.error("[/api/client-rides] No MetaMask account provided");
      return res.status(400).json({
        status: "error",
        message: "MetaMask account is required",
      });
    }

    try {
      // First, get the client ID for this account
      const clientId = await blockchainService.getClientIdByAccount(
        metaAccount
      );

      if (!clientId) {
        console.log(
          `[/api/client-rides] Client not found for account: ${metaAccount}`
        );
        return res.status(200).json({
          status: "success",
          rides: [],
        });
      }

      console.log(`[/api/client-rides] Found client ID: ${clientId}`);

      // Try using the alternative endpoint that works
      try {
        const response = await blockchainService.getClientRides(clientId);

        if (response && response.success) {
          return res.status(200).json({
            status: "success",
            rides: response.rides || [],
          });
        } else {
          console.error(
            `[/api/client-rides] Error from blockchain service: ${
              response?.error || "Unknown error"
            }`
          );
          throw new Error(response?.error || "Failed to fetch rides");
        }
      } catch (blockchainError) {
        console.error(
          `[/api/client-rides] Blockchain service error: ${blockchainError.message}`
        );
        // Fallback: Get all rides and filter for this client
        const allRides = await blockchainService.getActiveRides();

        if (allRides && allRides.success && Array.isArray(allRides.rides)) {
          const clientRides = allRides.rides.filter(
            (ride) => ride.participants && ride.participants.includes(clientId)
          );

          return res.status(200).json({
            status: "success",
            rides: clientRides || [],
          });
        } else {
          throw new Error("Failed to get rides using fallback method");
        }
      }
    } catch (error) {
      console.error(
        `[/api/client-rides] Error getting client data: ${error.message}`
      );
      return res.status(500).json({
        status: "error",
        message: error.message || "An unexpected error occurred",
      });
    }
  } catch (error) {
    console.error("[/api/client-rides] Error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "An unexpected error occurred",
    });
  }
});

// Ride request endpoint
app.post("/api/ride-request", async (req, res) => {
  try {
    const { rideId, metaAccount, clientMetaAccount } = req.body;
    const accountToUse = clientMetaAccount || metaAccount; // Use clientMetaAccount if available, otherwise fall back to metaAccount

    console.log(
      `[/api/ride-request] Received request from ${accountToUse} for ride ${rideId}`
    );

    if (!rideId || !accountToUse) {
      console.error(
        `[/api/ride-request] Missing required parameters: accountToUse=${accountToUse}, rideId=${rideId}`
      );
      return res.status(400).json({
        success: false,
        status: "error",
        message: "rideId and clientMetaAccount (or metaAccount) are required",
      });
    }

    // Request ride on blockchain
    const result = await blockchainService.requestRide(accountToUse, rideId);

    if (result.success) {
      console.log(
        `[/api/ride-request] Ride request successful, request ID: ${result.requestId}`
      );
      res.status(201).json({
        success: true,
        status: "success",
        requestId: result.requestId,
        message: "Ride request submitted successfully",
      });
    } else {
      console.error(`[/api/ride-request] Ride request failed: ${result.error}`);
      res.status(400).json({
        success: false,
        status: "error",
        message: result.error || "Failed to request ride",
      });
    }
  } catch (error) {
    console.error("Error requesting ride:", error.message);
    res.status(500).json({
      success: false,
      status: "error",
      message: "Error requesting ride",
      error: error.message,
    });
  }
});

// Endpoint to check a client's ride request status
app.get("/api/rides/:rideId/request-status/:clientId", async (req, res) => {
  try {
    const { rideId, clientId } = req.params;

    if (!rideId || !clientId) {
      return res.status(400).json({
        success: false,
        message: "rideId and clientId are required",
      });
    }

    // Get the ride details from blockchain to check requests
    const ride = await blockchainService.getRide(rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    // Get all requests for this ride
    const rideRequests = await blockchainService.getRideRequests(rideId);

    if (
      !rideRequests.success ||
      !rideRequests.requests ||
      rideRequests.requests.length === 0
    ) {
      return res.status(200).json({
        success: true,
        status: null, // No requests found for this ride
      });
    }

    // Find the client's request for this ride
    const clientRequest = rideRequests.requests.find(
      (request) => request.clientId.toString() === clientId.toString()
    );

    if (!clientRequest) {
      return res.status(200).json({
        success: true,
        status: null, // Client hasn't requested this ride
      });
    }

    // Return the status of the request
    return res.status(200).json({
      success: true,
      status: clientRequest.status, // pending, accepted, or rejected
    });
  } catch (error) {
    console.error("Error checking ride request status:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error checking ride request status",
      error: error.message,
    });
  }
});

// Endpoint to check payment status for a specific ride and client
app.get("/api/rides/:rideId/payment-status/:clientId", async (req, res) => {
  try {
    const { rideId, clientId } = req.params;

    if (!rideId || !clientId) {
      return res.status(400).json({
        success: false,
        message: "rideId and clientId are required",
      });
    }

    // Get payment status from blockchain
    const result = await blockchainService.checkPaymentStatus(rideId, clientId);

    return res.status(200).json({
      success: true,
      paid: result.paid,
      status: result.status,
    });
  } catch (error) {
    console.error("Error checking payment status:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error checking payment status",
      error: error.message,
    });
  }
});

// Add new endpoint to check client request status
app.get(
  "/api/rides/:rideId/client-request-status/:clientId",
  async (req, res) => {
    try {
      const { rideId, clientId } = req.params;

      if (!rideId || !clientId) {
        return res.status(400).json({
          success: false,
          message: "rideId and clientId are required",
        });
      }

      // Get the request status for this client on this ride
      const result = await blockchainService.getClientRequestStatus(
        rideId,
        clientId
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          status: result.status,
          requestId: result.requestId || null,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.error || "No request found",
        });
      }
    } catch (error) {
      console.error("Error checking client request status:", error.message);
      res.status(500).json({
        success: false,
        message: "Error checking client request status",
        error: error.message,
      });
    }
  }
);

// Add a new endpoint to get passenger count for a ride
app.get("/api/rides/:rideId/passenger-count", async (req, res) => {
  try {
    const { rideId } = req.params;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "rideId is required",
      });
    }

    // Get the ride details
    const response = await blockchainService.getRideById(rideId);

    if (response.success && response.ride) {
      const ride = response.ride;
      const passengerCount = ride.passengerIds ? ride.passengerIds.length : 0;

      res.status(200).json({
        success: true,
        passengerCount,
        passengerIds: ride.passengerIds || [],
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }
  } catch (error) {
    console.error("Error getting passenger count:", error.message);
    res.status(500).json({
      success: false,
      message: "Error getting passenger count",
      error: error.message,
    });
  }
});

// Endpoint to get a client's rides by meta account
app.get("/api/client-rides/:metaAccount", async (req, res) => {
  try {
    const { metaAccount } = req.params;

    if (!metaAccount) {
      return res
        .status(400)
        .json({ success: false, error: "MetaMask account is required" });
    }

    // console.log(`Getting rides for client with meta account ${metaAccount}`);

    // First get the client ID associated with this account
    const clientId = await blockchainService.getClientIdByAccount(metaAccount);
    if (!clientId) {
      console.log(`No client found for account ${metaAccount}`);
      return res.status(404).json({
        success: false,
        error: "No client found for this account",
      });
    }

    // console.log(`Found client ID: ${clientId}`);

    // Get the client's rides
    const ridesResult = await blockchainService.getClientRides(clientId);

    if (!ridesResult.success) {
      return res.status(400).json({
        success: false,
        error: ridesResult.error || "Could not retrieve rides",
      });
    }

    // Get rides and enhance them with payment status information
    const rides = ridesResult.rides || [];
    const enhancedRides = await Promise.all(
      rides.map(async (ride) => {
        try {
          // Check payment status for completed rides
          let paymentInfo = { paid: false, status: "unknown" };
          if (ride.status === "completed") {
            paymentInfo = await blockchainService.checkPaymentStatus(
              ride.rideId,
              clientId
            );
          }

          return {
            ...ride,
            paymentPending: ride.status === "completed" && !paymentInfo.paid,
            isPaid: paymentInfo.paid,
          };
        } catch (err) {
          console.error(`Error enhancing ride ${ride.rideId}:`, err);
          return ride;
        }
      })
    );

    return res.status(200).json({
      success: true,
      rides: enhancedRides,
      clientId,
    });
  } catch (error) {
    console.error("Error getting client rides:", error);
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`,
    });
  }
});

// API to verify if client can make payment for a ride
app.get("/api/rides/:rideId/verify-payment/:metaAccount", async (req, res) => {
  try {
    const { rideId, metaAccount } = req.params;

    if (!rideId || !metaAccount) {
      return res.status(400).json({
        error: "Missing required parameters",
      });
    }

    console.log(
      `Verifying payment eligibility for ride ${rideId} and account ${metaAccount}`
    );

    // Get the client ID for the account
    const clientId = await blockchainService.getClientIdByAccount(metaAccount);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found for the provided account",
      });
    }

    // Check if the ride exists and is completed
    const ride = await blockchainService.getRide(rideId);
    if (!ride) {
      return res.status(404).json({
        error: "Ride not found",
      });
    }

    if (ride.status !== "completed") {
      return res.status(400).json({
        error: "Ride is not completed yet",
        status: ride.status,
      });
    }

    // Check if client is a passenger
    const isPassenger = await blockchainService.isClientPassengerOfRide(
      clientId,
      rideId
    );

    if (!isPassenger) {
      return res.status(403).json({
        error: "You are not a passenger of this ride",
      });
    }

    // Check payment status
    const paymentStatus = await blockchainService.checkPaymentStatus(
      rideId,
      clientId
    );

    return res.status(200).json({
      canPay: !paymentStatus.paid,
      paymentStatus,
      rideDetails: {
        rideId: ride.id,
        price: blockchainService.web3.utils.fromWei(ride.price, "ether"),
        driverId: ride.driverId,
        status: ride.status,
      },
    });
  } catch (error) {
    console.error("Error verifying payment eligibility:", error);
    return res.status(500).json({
      error: `Server error: ${error.message}`,
    });
  }
});

// Add a new endpoint to get all ride requests for a client
app.get("/api/client/:clientId/ride-requests", async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "clientId is required",
      });
    }

    // Try to get the client's ride requests from blockchain
    try {
      const clientRequests = await blockchainService.getClientRequests(
        clientId
      );

      // If no error but no requests found
      if (clientRequests.requests && clientRequests.requests.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No ride requests found for this client",
          requests: [],
        });
      }

      // Return all the client's requests
      return res.status(200).json({
        success: true,
        requests: clientRequests.requests || [],
      });
    } catch (blockchainError) {
      // Handle the case where getRideCount method doesn't exist
      console.error(
        "Blockchain error getting client ride requests:",
        blockchainError.message
      );

      // Return an empty array when the blockchain service fails
      return res.status(200).json({
        success: true,
        message:
          "Unable to get ride requests from blockchain - returning empty list",
        requests: [],
        error: blockchainError.message,
      });
    }
  } catch (error) {
    console.error("Error getting client ride requests:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error retrieving client ride requests",
      error: error.message,
    });
  }
});

// Submit a rating for a driver
app.post("/api/rides/:rideId/rate", async (req, res) => {
  try {
    const { rideId } = req.params;
    const { clientAccount, score } = req.body;

    if (!clientAccount || !rideId || !score) {
      return res.status(400).json({
        success: false,
        message: "Client account, ride ID, and score are required",
      });
    }

    // Validate score
    const scoreNum = parseInt(score);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 5) {
      return res.status(400).json({
        success: false,
        message: "Score must be a number between 1 and 5",
      });
    }

    // Submit the rating through the blockchain service
    const result = await blockchainService.rateDriver(
      clientAccount,
      rideId,
      scoreNum
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Rating submitted successfully",
        ratingId: result.ratingId,
        transactionHash: result.transactionHash,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to submit rating",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error submitting rating:", error);
    return res.status(500).json({
      success: false,
      message: "Server error when submitting rating",
      error: error.message,
    });
  }
});

// Get average rating for a driver
app.get("/api/drivers/:driverId/rating", async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID is required",
      });
    }

    // Get the driver's rating
    const ratingResult = await blockchainService.getDriverAverageRating(
      driverId
    );

    if (ratingResult.success) {
      return res.status(200).json({
        success: true,
        averageRating: ratingResult.averageRating,
        totalRatings: ratingResult.totalRatings,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to get driver rating",
        error: ratingResult.error,
      });
    }
  } catch (error) {
    console.error("Error getting driver rating:", error);
    return res.status(500).json({
      success: false,
      message: "Server error when getting driver rating",
      error: error.message,
    });
  }
});

// Get all ratings for a driver
app.get("/api/drivers/:driverId/ratings", async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID is required",
      });
    }

    // Get all ratings for the driver
    const ratingsResult = await blockchainService.getDriverRatings(driverId);

    if (ratingsResult.success) {
      return res.status(200).json({
        success: true,
        ratings: ratingsResult.ratings,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to get driver ratings",
        error: ratingsResult.error,
      });
    }
  } catch (error) {
    console.error("Error getting driver ratings:", error);
    return res.status(500).json({
      success: false,
      message: "Server error when getting driver ratings",
      error: error.message,
    });
  }
});

// Get all ratings for a ride
app.get("/api/rides/:rideId/ratings", async (req, res) => {
  try {
    const { rideId } = req.params;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "Ride ID is required",
      });
    }

    // Get all ratings for the ride
    const ratingsResult = await blockchainService.getRideRatings(rideId);

    if (ratingsResult.success) {
      return res.status(200).json({
        success: true,
        ratings: ratingsResult.ratings,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to get ride ratings",
        error: ratingsResult.error,
      });
    }
  } catch (error) {
    console.error("Error getting ride ratings:", error);
    return res.status(500).json({
      success: false,
      message: "Server error when getting ride ratings",
      error: error.message,
    });
  }
});

// Get driver statistics
app.get("/api/driver-stats/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID is required",
      });
    }

    // Get driver statistics from blockchain
    const stats = await blockchainService.getDriverStats(driverId);

    if (stats.success) {
      res.status(200).json({
        success: true,
        stats: {
          completedRides: stats.completedRides,
          activeRides: stats.activeRides,
          totalEarnings: stats.totalEarnings,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: stats.error || "Failed to get driver statistics",
      });
    }
  } catch (error) {
    console.error("Error getting driver statistics:", error.message);
    res.status(500).json({
      success: false,
      message: "Error getting driver statistics",
      error: error.message,
    });
  }
});

// Start server with improved error handling
const startServer = async () => {
  try {
    // Wait for blockchain service to initialize with a timeout
    let attempts = 0;
    const maxAttempts = 5;
    const delay = 2000;

    while (!blockchainService.isInitialized && attempts < maxAttempts) {
      console.log(
        `Waiting for blockchain service to initialize (attempt ${
          attempts + 1
        }/${maxAttempts})...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempts++;
    }

    // Check if blockchain service initialized successfully
    const isInitialized = blockchainService.isInitialized;

    if (!isInitialized) {
      console.warn(
        "WARNING: Blockchain service failed to initialize. Some blockchain-related features may not work."
      );
      console.warn(
        "The server will start anyway, but blockchain functionality will be limited."
      );
      console.warn(
        "Please ensure Ganache is running on port 8545 and restart the server."
      );
    } else {
      console.log("Blockchain service initialized successfully");
    }

    // Start the server regardless of blockchain initialization
    app.listen(Port, () => {
      console.log(`Server is running on port ${Port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
