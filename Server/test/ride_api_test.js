const axios = require("axios");
const Web3 = require("web3");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Connect to Ganache
const ganachePort = process.env.GANACHE_PORT || 8545;
const web3 = new Web3(`http://localhost:${ganachePort}`);

// Server API URL
const serverPort = process.env.SERVER_PORT || 8080;
const API_URL = `http://localhost:${serverPort}`;

// Contract address (same as in Ganache)
const contractAddress = "0x44c15fFC4e9b73ea286Fd93bbbc817cE611a312F"; // Latest deployed contract address

async function testRideAPI() {
  try {
    console.log("Starting ride API test...");
    console.log(`Server API URL: ${API_URL}`);

    // Get accounts from Ganache
    const accounts = await web3.eth.getAccounts();
    const driverAccount = accounts[0]; // Using the first account as driver

    console.log(`Using driver account: ${driverAccount}`);

    // Step 1: Check if the server is running
    try {
      await axios.get(`${API_URL}/api/health`);
      console.log("✅ Server is running");
    } catch (error) {
      console.error(
        "❌ Server is not running or health endpoint not available"
      );
      throw new Error("Server connection failed");
    }

    // Step 2: Register as a driver if not already registered
    let driverId;
    try {
      // Try to get driver ID
      const driverResponse = await axios.get(
        `${API_URL}/api/driver/${driverAccount}`
      );
      driverId = driverResponse.data.driverId;
      console.log(`Driver already registered with ID: ${driverId}`);
    } catch (error) {
      console.log("Driver not registered, registering now...");

      // Register as a driver
      const registerData = {
        metaAccount: driverAccount,
        name: "Test Driver",
        email: "test@example.com",
        phone: "1234567890",
        carModel: "Test Car",
        licensePlate: "ABC123",
        carColor: "Red",
      };

      const registerResponse = await axios.post(
        `${API_URL}/api/drivers`,
        registerData
      );

      if (registerResponse.data.success) {
        driverId = registerResponse.data.driverId;
        console.log(`Driver registered with ID: ${driverId}`);
      } else {
        throw new Error(
          `Failed to register driver: ${registerResponse.data.message}`
        );
      }
    }

    // Step 3: Post a ride
    console.log("Posting a test ride...");

    const rideData = {
      driverMetaAccount: driverAccount,
      startLatitude: 43.65107,
      startLongitude: -79.347015,
      startLocationName: "Toronto Start",
      destinationLatitude: 43.642567,
      destinationLongitude: -79.387054,
      destinationName: "Toronto Destination",
      pickupLatitude: 43.65107,
      pickupLongitude: -79.347015,
      pickupPoint: "Toronto Pickup",
      availableSeats: 2,
      price: "0.01",
      departureTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      distance: 10000, // Distance in meters
      duration: 1800, // Duration in seconds
    };

    try {
      const rideResponse = await axios.post(`${API_URL}/api/rides`, rideData);

      if (rideResponse.data.success) {
        const rideId = rideResponse.data.rideId;
        console.log(`✅ SUCCESS: Ride posted with ID: ${rideId}`);

        // Step 4: Verify the ride was created by getting its details
        const rideDetailsResponse = await axios.get(
          `${API_URL}/api/rides/${rideId}`
        );

        if (rideDetailsResponse.data.success) {
          console.log("Ride details:", rideDetailsResponse.data.ride);
          return {
            success: true,
            rideId,
            details: rideDetailsResponse.data.ride,
          };
        } else {
          console.error(
            "❌ ERROR: Failed to get ride details:",
            rideDetailsResponse.data.message
          );
          return {
            success: false,
            error: rideDetailsResponse.data.message,
          };
        }
      } else {
        console.error(
          "❌ ERROR: Failed to post ride:",
          rideResponse.data.message
        );
        return {
          success: false,
          error: rideResponse.data.message,
        };
      }
    } catch (error) {
      console.error(
        "❌ ERROR: Failed to post ride:",
        error.response?.data?.message || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  } catch (error) {
    console.error("❌ ERROR: Test failed:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the test
testRideAPI()
  .then((result) => {
    if (result.success) {
      console.log("✅ TEST PASSED: Ride API works correctly");
      process.exit(0);
    } else {
      console.log("❌ TEST FAILED: Ride API failed");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ TEST FAILED with exception:", error);
    process.exit(1);
  });
