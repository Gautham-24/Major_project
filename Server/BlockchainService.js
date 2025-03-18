const Web3 = require("web3");
const ChainRideContract = require("../my-app/src/Contracts/ChainRideContract.json");

class BlockchainService {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.account = null;
    this.isInitialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      // Connect to local Ethereum node
      this.web3 = new Web3("http://localhost:8545");

      // Get the network ID
      const networkId = await this.web3.eth.net.getId();

      // Get the deployed contract
      const deployedNetwork = ChainRideContract.networks[networkId];

      if (!deployedNetwork) {
        console.error("Contract not deployed on the current network");
        return;
      }

      // Create contract instance
      this.contract = new this.web3.eth.Contract(
        ChainRideContract.abi,
        deployedNetwork.address
      );

      // Get accounts
      const accounts = await this.web3.eth.getAccounts();
      this.account = accounts[0];

      this.isInitialized = true;
      console.log("Blockchain service initialized successfully");
    } catch (error) {
      console.error("Error initializing blockchain service:", error);
      this.isInitialized = false;
    }
  }

  /**
   * Get client ID by MetaMask account
   * @param {string} account - The client's MetaMask account
   * @returns {Promise<string|null>} - The client ID or null if not found
   */
  async getClientIdByAccount(account) {
    try {
      if (!this.contract) {
        console.error("[getClientIdByAccount] Contract not initialized");
        throw new Error("Contract not initialized");
      }

      console.log(
        `[getClientIdByAccount] Looking for client with account: ${account}`
      );

      // Get all clients
      const clientCount = await this.contract.methods.getClientCount().call();
      console.log(`[getClientIdByAccount] Total clients: ${clientCount}`);

      // Validate input
      if (!account || typeof account !== "string") {
        console.error(
          `[getClientIdByAccount] Invalid account parameter: ${account}`
        );
        return null;
      }

      // Normalize account address
      const normalizedAccount = account.toLowerCase();

      // Loop through all clients and check if wallet address matches
      for (let i = 1; i <= clientCount; i++) {
        try {
          const client = await this.contract.methods.getClientById(i).call();

          // Debug log current client being checked
          console.log(
            `[getClientIdByAccount] Checking client #${i}:`,
            client ? client.walletAddress || "No wallet address" : "null client"
          );

          if (
            client &&
            client.walletAddress &&
            client.walletAddress.toLowerCase() === normalizedAccount
          ) {
            console.log(
              `[getClientIdByAccount] Found client #${i} matching account ${account}`
            );
            return i.toString();
          }
        } catch (clientError) {
          console.error(
            `[getClientIdByAccount] Error checking client #${i}:`,
            clientError
          );
          // Continue to next client
        }
      }

      console.log(
        `[getClientIdByAccount] No client found with account ${account}`
      );
      return null;
    } catch (error) {
      console.error(
        "[getClientIdByAccount] Error getting client ID by account:",
        error
      );
      return null;
    }
  }

  /**
   * Get client details by ID
   * @param {string} clientId - The client ID
   * @returns {Promise<Object|null>} - Client details or null if not found
   */
  async getClient(clientId) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      console.log(`Getting client with ID ${clientId}`);

      // Get client from blockchain
      const client = await this.contract.methods.getClientById(clientId).call();

      if (
        !client ||
        client.walletAddress === "0x0000000000000000000000000000000000000000"
      ) {
        console.log(`Client with ID ${clientId} not found`);
        return null;
      }

      return {
        id: clientId,
        walletAddress: client.walletAddress,
        name: client.name,
        email: client.email,
        phone: client.phone,
      };
    } catch (error) {
      console.error(`Error getting client with ID ${clientId}:`, error);
      return null;
    }
  }

  /**
   * Register a new client
   * @param {string} metaAccount - The client's MetaMask account
   * @param {string} name - The client's name
   * @param {string} email - The client's email
   * @param {string} phone - The client's phone number
   * @returns {Promise<{success: boolean, clientId?: string, error?: string}>} - Result of the operation
   */
  async registerClient(metaAccount, name, email, phone) {
    try {
      if (!this.contract) {
        console.error("[registerClient] Contract not initialized");
        throw new Error("Contract not initialized");
      }

      console.log(
        `[registerClient] Attempting to register client with account ${metaAccount}`
      );

      // Validate parameters
      if (!metaAccount || typeof metaAccount !== "string") {
        console.error(
          `[registerClient] Invalid metaAccount parameter: ${metaAccount}`
        );
        return {
          success: false,
          error: "Invalid MetaMask account",
        };
      }

      // Check if client is already registered
      let existingClientId;
      try {
        existingClientId = await this.getClientIdByAccount(metaAccount);
        console.log(
          `[registerClient] Client exists check result: ${
            existingClientId ? "Found" : "Not found"
          }`
        );
      } catch (checkError) {
        console.error(
          "[registerClient] Error checking if client exists:",
          checkError
        );
      }

      if (existingClientId) {
        console.log(
          `[registerClient] Client already registered with ID: ${existingClientId}`
        );
        return {
          success: true,
          clientId: existingClientId,
          message: "Client already registered",
        };
      }

      // Normalize account address
      const normalizedAccount = metaAccount.toLowerCase();

      // Register the client
      console.log("[registerClient] Registering new client...");
      console.log("[registerClient] Parameters:", { name, email, phone });

      try {
        const result = await this.contract.methods
          .registerClient(
            name || "Client",
            email || "client@example.com",
            phone || "123-456-7890"
          )
          .send({ from: this.account, gas: 3000000 });

        console.log(`[registerClient] Transaction result:`, result);

        // Extract the client ID from the transaction events
        if (result.events && result.events.ClientRegistered) {
          const clientId = result.events.ClientRegistered.returnValues.clientId;
          console.log(
            `[registerClient] New client registered with ID: ${clientId}`
          );

          return {
            success: true,
            clientId,
          };
        } else {
          console.error(
            "[registerClient] ClientRegistered event not found in result"
          );
          return {
            success: false,
            error: "ClientRegistered event not found in transaction result",
          };
        }
      } catch (txError) {
        // Check for specific errors
        const errorString = txError.toString().toLowerCase();

        // Special handling for "already registered" errors
        if (errorString.includes("already registered")) {
          console.log(
            "[registerClient] Client appears to be already registered according to error message"
          );

          // Try to get the client ID again
          try {
            const clientId = await this.getClientIdByAccount(metaAccount);
            if (clientId) {
              console.log(
                `[registerClient] Found client with ID: ${clientId} after failed registration`
              );
              return {
                success: true,
                clientId: clientId,
                message: "Client already registered",
              };
            }
          } catch (getIdError) {
            console.error(
              "[registerClient] Error getting client ID after transaction error:",
              getIdError
            );
          }
        }

        console.error("[registerClient] Transaction error:", txError);
        return {
          success: false,
          error: txError.message || "Unknown transaction error",
        };
      }
    } catch (error) {
      console.error("[registerClient] Error registering client:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Request to join a ride
   * @param {string} clientMetaAccount - The client's MetaMask account
   * @param {string} rideId - The ID of the ride
   * @returns {Promise<{success: boolean, requestId?: string, error?: string}>} - Result of the operation
   */
  async requestRide(clientMetaAccount, rideId) {
    try {
      if (!this.contract) {
        console.error("[requestRide] Contract not initialized");
        throw new Error("Contract not initialized");
      }

      console.log(
        `[requestRide] Processing ride request for ride ${rideId} by account ${clientMetaAccount}`
      );

      // Validate parameters
      if (!clientMetaAccount || typeof clientMetaAccount !== "string") {
        console.error(
          `[requestRide] Invalid clientMetaAccount parameter: ${clientMetaAccount}`
        );
        return {
          success: false,
          error: "Invalid MetaMask account",
        };
      }

      if (!rideId) {
        console.error(`[requestRide] Invalid rideId parameter: ${rideId}`);
        return {
          success: false,
          error: "Invalid ride ID",
        };
      }

      // First, make sure the client is registered
      let clientId;

      // Check if the client is registered
      try {
        clientId = await this.getClientIdByAccount(clientMetaAccount);
        console.log(
          `[requestRide] Client ID check result: ${clientId || "Not found"}`
        );
      } catch (checkError) {
        console.error("[requestRide] Error checking client ID:", checkError);
      }

      // If not registered, register the client
      if (!clientId) {
        console.log(`[requestRide] Client not registered. Registering now...`);

        const registerResult = await this.registerClient(
          clientMetaAccount,
          `Client ${clientMetaAccount.substring(0, 6)}`,
          `client_${clientMetaAccount.substring(0, 6)}@example.com`,
          "123-456-7890"
        );

        if (!registerResult.success) {
          console.error(
            "[requestRide] Failed to register client:",
            registerResult.error
          );
          return {
            success: false,
            error: `Failed to register client: ${registerResult.error}`,
          };
        }

        clientId = registerResult.clientId;
        console.log(`[requestRide] Client registered with ID: ${clientId}`);
      } else {
        console.log(
          `[requestRide] Client already registered with ID: ${clientId}`
        );
      }

      // Now verify that the ride exists
      try {
        console.log(`[requestRide] Verifying ride ${rideId} exists...`);
        const ride = await this.contract.methods.getRideById(rideId).call();

        if (!ride) {
          console.error(`[requestRide] Ride with ID ${rideId} not found`);
          return {
            success: false,
            error: `Ride with ID ${rideId} not found`,
          };
        }

        console.log(`[requestRide] Ride ${rideId} found:`, ride);
      } catch (rideError) {
        console.error(`[requestRide] Error verifying ride:`, rideError);
        return {
          success: false,
          error: `Error verifying ride: ${rideError.message}`,
        };
      }

      // Request the ride
      console.log(`[requestRide] Sending ride request transaction...`);
      try {
        const result = await this.contract.methods
          .requestRide(rideId)
          .send({ from: this.account, gas: 3000000 });

        console.log(`[requestRide] Ride request transaction result:`, result);

        // Extract the request ID from the transaction events
        if (result.events && result.events.RideRequested) {
          const requestId = result.events.RideRequested.returnValues.requestId;
          console.log(
            `[requestRide] Ride requested successfully with request ID: ${requestId}`
          );

          return {
            success: true,
            requestId,
          };
        } else {
          console.error(
            "[requestRide] RideRequested event not found in result"
          );
          return {
            success: false,
            error: "RideRequested event not found in transaction result",
          };
        }
      } catch (txError) {
        console.error("[requestRide] Transaction error:", txError);
        return {
          success: false,
          error: txError.message || "Unknown transaction error",
        };
      }
    } catch (error) {
      console.error("[requestRide] Error requesting ride:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cancel a ride request
   * @param {string} clientMetaAccount - The client's MetaMask account
   * @param {string} rideId - The ID of the ride
   * @param {string} clientId - The ID of the client
   * @returns {Promise<{success: boolean, error?: string}>} - Result of the operation
   */
  async cancelRideRequest(clientMetaAccount, rideId, clientId) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      console.log(
        `Cancelling ride request for ride ${rideId} by client ${clientId}`
      );

      // Get the ride details
      const ride = await this.contract.methods.getRideById(rideId).call();

      if (!ride) {
        return {
          success: false,
          error: `Ride with ID ${rideId} not found`,
        };
      }

      // Check if the client has a pending request for this ride
      const hasRequest = await this.contract.methods
        .hasClientRequestedRide(clientId, rideId)
        .call();

      if (!hasRequest) {
        return {
          success: false,
          error: `Client ${clientId} has no pending request for ride ${rideId}`,
        };
      }

      // Cancel the ride request
      const result = await this.contract.methods
        .cancelRideRequest(rideId, clientId)
        .send({ from: this.account, gas: 3000000 });

      console.log(`Ride request cancellation transaction result:`, result);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error cancelling ride request:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Complete a ride payment
   * @param {string} rideId - The ID of the ride
   * @param {string} clientId - The ID of the client making the payment
   * @param {string} transactionHash - The hash of the payment transaction
   * @returns {Promise<boolean>} - True if successful
   */
  async completeRidePayment(rideId, clientId, transactionHash) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      console.log(
        `Completing payment for ride ${rideId} by client ${clientId}`
      );
      console.log(`Transaction hash: ${transactionHash}`);

      // Get the ride details
      const ride = await this.contract.methods.getRideById(rideId).call();

      if (!ride) {
        throw new Error(`Ride with ID ${rideId} not found`);
      }

      // Check if the client is a passenger of this ride
      const isPassenger = await this.contract.methods
        .isClientPassengerOfRide(clientId, rideId)
        .call();

      if (!isPassenger) {
        throw new Error(
          `Client ${clientId} is not a passenger of ride ${rideId}`
        );
      }

      // Update the payment status for this passenger
      const result = await this.contract.methods
        .completePayment(rideId, clientId, transactionHash)
        .send({ from: this.account, gas: 3000000 });

      console.log(`Payment completion transaction result:`, result);

      return true;
    } catch (error) {
      console.error("Error completing ride payment:", error);
      throw error;
    }
  }

  /**
   * Get rides associated with a client
   * @param {string} clientId - The client ID
   * @returns {Promise<Array>} - List of rides the client is part of
   */
  async getClientRides(clientId) {
    try {
      if (!this.contract) {
        console.error("[getClientRides] Contract not initialized");
        return { success: false, error: "Contract not initialized" };
      }

      console.log(`[getClientRides] Fetching rides for client: ${clientId}`);

      if (!clientId) {
        console.error("[getClientRides] Invalid clientId parameter");
        return { success: false, error: "Invalid client ID" };
      }

      // Use the new smart contract function to get all rides for this client
      const clientRideIds = await this.contract.methods
        .getClientRides(clientId)
        .call();
      console.log(
        `[getClientRides] Found ${clientRideIds.length} rides for client ${clientId}`
      );

      // Initialize array for client rides
      const clientRides = [];

      // Get details for each ride
      for (const rideId of clientRideIds) {
        try {
          const ride = await this.contract.methods.getRideById(rideId).call();

          // Determine if client is a passenger in this ride
          let isPassenger = false;
          for (const passengerId of ride.passengerIds || []) {
            try {
              const passenger = await this.contract.methods
                .getPassenger(passengerId)
                .call();
              if (
                passenger &&
                passenger.clientId.toString() === clientId.toString()
              ) {
                isPassenger = true;
                break;
              }
            } catch (passengerError) {
              console.error(
                `[getClientRides] Error checking passenger ${passengerId}:`,
                passengerError
              );
            }
          }

          // Determine if client has a request for this ride and its status
          let hasRequest = false;
          let requestStatus = null;

          for (const requestId of ride.requestIds || []) {
            try {
              const request = await this.contract.methods
                .getRideRequest(requestId)
                .call();
              if (
                request &&
                request.clientId.toString() === clientId.toString()
              ) {
                hasRequest = true;
                requestStatus = request.status;
                break;
              }
            } catch (requestError) {
              console.error(
                `[getClientRides] Error checking request ${requestId}:`,
                requestError
              );
            }
          }

          console.log(
            `[getClientRides] Client ${clientId} is associated with ride ${rideId} (status: ${ride.status}, isPassenger: ${isPassenger})`
          );

          // Format the ride data
          const formattedRide = {
            rideId: rideId,
            driverId: ride.driverId,
            driverWalletAddress: ride.driverWalletAddress,
            from: ride.startLocation,
            to: ride.destination,
            availableSeats: ride.availableSeats,
            price: ride.price,
            status: ride.status,
            createdAt: ride.createdAt,
            departureTime: ride.departureTime,
            isPassenger: isPassenger,
            hasRequest: hasRequest,
            requestStatus: requestStatus,
            passengerCount: ride.passengerIds ? ride.passengerIds.length : 0,
          };

          clientRides.push(formattedRide);
        } catch (rideError) {
          console.error(
            `[getClientRides] Error processing ride ${rideId}:`,
            rideError
          );
          // Continue with next ride
        }
      }

      return { success: true, rides: clientRides };
    } catch (error) {
      console.error("[getClientRides] Error fetching client rides:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get client request status for a specific ride
   * @param {string} rideId - The ride ID
   * @param {string} clientId - The client ID
   * @returns {Promise<Object>} - Object with success flag and status
   */
  async getClientRequestStatus(rideId, clientId) {
    try {
      if (!this.contract) {
        console.error("[getClientRequestStatus] Contract not initialized");
        return { success: false, error: "Contract not initialized" };
      }

      console.log(
        `[getClientRequestStatus] Checking request status for ride ${rideId}, client ${clientId}`
      );

      // Get ride details
      const ride = await this.contract.methods.getRideById(rideId).call();

      if (!ride) {
        return { success: false, error: "Ride not found" };
      }

      // Check if client is already a passenger
      let isPassenger = false;

      // Check if passengerIds exists and is not empty
      if (ride.passengerIds && ride.passengerIds.length > 0) {
        for (const passengerId of ride.passengerIds) {
          try {
            const passenger = await this.contract.methods
              .getPassenger(passengerId)
              .call();
            if (
              passenger &&
              passenger.clientId.toString() === clientId.toString()
            ) {
              isPassenger = true;
              break;
            }
          } catch (passengerError) {
            console.error(
              `[getClientRequestStatus] Error checking passenger ${passengerId}:`,
              passengerError
            );
          }
        }
      }

      if (isPassenger) {
        return {
          success: true,
          status: "accepted",
        };
      }

      // Check if client has a request for this ride
      const requests = await this.contract.methods
        .getRideRequests(rideId)
        .call();

      // Look for requests from this client
      for (const requestId of requests) {
        try {
          const request = await this.contract.methods
            .getRideRequest(requestId)
            .call();

          if (request && request.clientId.toString() === clientId.toString()) {
            return {
              success: true,
              status: request.status,
              requestId: requestId.toString(),
            };
          }
        } catch (requestError) {
          console.error(
            `[getClientRequestStatus] Error processing request ${requestId}:`,
            requestError
          );
          // Continue to next request
        }
      }

      return { success: false, error: "No request found" };
    } catch (error) {
      console.error(
        "[getClientRequestStatus] Error checking client request status:",
        error
      );
      return { success: false, error: error.message };
    }
  }

  async getActiveRides() {
    try {
      if (!this.contract) {
        console.error("[getActiveRides] Contract not initialized");
        throw new Error("Contract not initialized");
      }

      // Get active ride IDs from blockchain
      const activeRideIds = await this.contract.methods.getActiveRides().call();
      console.log(
        `[getActiveRides] Found ${activeRideIds.length} active rides`
      );

      const rides = [];

      // Get details for each active ride
      for (const rideId of activeRideIds) {
        try {
          const ride = await this.contract.methods.getRideById(rideId).call();

          // Get passenger count and IDs
          const passengerIds = ride.passengerIds || [];

          // Format the ride data
          const formattedRide = {
            rideId: rideId,
            driverId: ride.driverId,
            driverWalletAddress: ride.driverWalletAddress,
            from: ride.startLocation,
            to: ride.destination,
            availableSeats: ride.availableSeats,
            price: ride.price,
            status: ride.status,
            createdAt: ride.createdAt,
            departureTime: ride.departureTime,
            passengerIds: passengerIds,
            passengerCount: passengerIds.length,
          };

          rides.push(formattedRide);
        } catch (error) {
          console.error(
            `[getActiveRides] Error getting ride ${rideId}:`,
            error
          );
        }
      }

      return { success: true, rides };
    } catch (error) {
      console.error("[getActiveRides] Error getting active rides:", error);
      return { success: false, error: error.message };
    }
  }

  async getDriverRides(driverId) {
    try {
      if (!this.contract) {
        console.error("[getDriverRides] Contract not initialized");
        throw new Error("Contract not initialized");
      }

      // Get driver ride IDs from blockchain
      const driverRideIds = await this.contract.methods
        .getDriverRides(driverId)
        .call();
      console.log(
        `[getDriverRides] Found ${driverRideIds.length} rides for driver ${driverId}`
      );

      const rides = [];

      // Get details for each driver ride
      for (const rideId of driverRideIds) {
        try {
          const ride = await this.contract.methods.getRideById(rideId).call();

          // Get passenger count and IDs
          const passengerIds = ride.passengerIds || [];
          const passengers = [];

          // Get details for each passenger
          for (const passengerId of passengerIds) {
            try {
              const passenger = await this.contract.methods
                .getPassenger(passengerId)
                .call();
              passengers.push({
                id: passengerId,
                clientId: passenger.clientId,
                walletAddress: passenger.clientWalletAddress,
                status: passenger.status,
                paid: passenger.paid,
              });
            } catch (passengerError) {
              console.error(
                `[getDriverRides] Error getting passenger ${passengerId}:`,
                passengerError
              );
            }
          }

          // Format the ride data
          const formattedRide = {
            rideId: rideId,
            driverId: ride.driverId,
            driverWalletAddress: ride.driverWalletAddress,
            from: ride.startLocation,
            to: ride.destination,
            availableSeats: ride.availableSeats,
            price: ride.price,
            status: ride.status,
            createdAt: ride.createdAt,
            departureTime: ride.departureTime,
            passengers: passengers,
            passengerCount: passengers.length,
          };

          rides.push(formattedRide);
        } catch (error) {
          console.error(
            `[getDriverRides] Error getting ride ${rideId}:`,
            error
          );
        }
      }

      return { success: true, rides };
    } catch (error) {
      console.error("[getDriverRides] Error getting driver rides:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a specific ride by ID with all its details
   * @param {string} rideId - The ride ID
   * @returns {Promise<Object>} - The ride details or null if not found
   */
  async getRideById(rideId) {
    try {
      if (!this.contract) {
        console.error("[getRideById] Contract not initialized");
        return { success: false, error: "Contract not initialized" };
      }

      console.log(`[getRideById] Fetching ride: ${rideId}`);

      // Get ride from blockchain
      const ride = await this.contract.methods.getRideById(rideId).call();

      if (!ride) {
        console.log(`[getRideById] Ride with ID ${rideId} not found`);
        return { success: false, error: "Ride not found" };
      }

      // Get passenger details if available
      const passengerIds = ride.passengerIds || [];
      const passengers = [];

      for (const passengerId of passengerIds) {
        try {
          const passenger = await this.contract.methods
            .getPassenger(passengerId)
            .call();
          passengers.push({
            id: passengerId,
            clientId: passenger.clientId,
            walletAddress: passenger.clientWalletAddress,
            status: passenger.status,
            paid: passenger.paid,
          });
        } catch (passengerError) {
          console.error(
            `[getRideById] Error getting passenger ${passengerId}:`,
            passengerError
          );
        }
      }

      // Format the ride data
      const formattedRide = {
        rideId: rideId,
        driverId: ride.driverId,
        driverWalletAddress: ride.driverWalletAddress,
        from: ride.startLocation,
        to: ride.destination,
        availableSeats: ride.availableSeats,
        price: ride.price,
        status: ride.status,
        createdAt: ride.createdAt,
        departureTime: ride.departureTime,
        passengerIds: passengerIds,
        passengers: passengers,
        passengerCount: passengerIds.length,
      };

      return { success: true, ride: formattedRide };
    } catch (error) {
      console.error(`[getRideById] Error getting ride ${rideId}:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new BlockchainService();
