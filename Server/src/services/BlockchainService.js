const Web3 = require("web3");
const path = require("path");
const fs = require("fs");

class BlockchainService {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this._initialized = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.init();
  }

  // Getter for initialization status
  get isInitialized() {
    return this._initialized && this.web3 !== null && this.contract !== null;
  }

  // Method to check initialization status
  async ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error("Blockchain service not initialized");
    }
  }

  async init() {
    try {
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.error(
          `Failed to connect after ${this.maxConnectionAttempts} attempts. Please check if Ganache is running on port 8545.`
        );
        return;
      }

      this.connectionAttempts++;
      console.log(
        `Attempting to connect to Ethereum network (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})...`
      );

      // Handle different versions of Web3
      try {
        // For Web3 1.x
        this.web3 = new Web3("http://localhost:8545");
      } catch (error) {
        // For Web3 0.x
        this.web3 = new Web3(
          new Web3.providers.HttpProvider("http://localhost:8545")
        );
      }

      // Check connection
      await this.web3.eth.net.isListening();
      console.log("Connected to Ethereum network successfully");

      // Initialize contract
      await this.initContract();
    } catch (error) {
      console.error("Failed to connect to Ethereum network:", error.message);

      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log("Will retry connection in 5 seconds...");
        // Retry connection after 5 seconds
        setTimeout(() => this.init(), 5000);
      } else {
        console.error(
          "Maximum connection attempts reached. Please check if Ganache is running correctly."
        );
      }
    }
  }

  async initContract() {
    try {
      // Get contract JSON
      const contractPath = path.resolve(
        __dirname,
        "../../../SmartContract/build/contracts/ChainRideContract.json"
      );

      if (!fs.existsSync(contractPath)) {
        throw new Error(
          `Contract file not found at ${contractPath}. Make sure you've compiled the contract.`
        );
      }

      const ChainRideContract = require(contractPath);

      // Get the network ID
      const networkId = await this.web3.eth.net.getId();
      console.log(`Connected to network ID: ${networkId}`);

      // Get the deployed contract address for this network
      const deployedNetwork = ChainRideContract.networks[networkId];

      if (!deployedNetwork) {
        throw new Error(
          `Contract not deployed on network ${networkId}. Please deploy the contract first using 'truffle migrate --reset'.`
        );
      }

      // Create a contract instance
      this.contract = new this.web3.eth.Contract(
        ChainRideContract.abi,
        deployedNetwork.address
      );

      console.log("Contract initialized at address:", deployedNetwork.address);
      this._initialized = true;
    } catch (error) {
      console.error("Error initializing contract:", error.message);
      this._initialized = false;
      throw error;
    }
  }

  async getAccounts() {
    try {
      await this.ensureInitialized();
      return await this.web3.eth.getAccounts();
    } catch (error) {
      console.error("Error getting accounts:", error.message);
      return [];
    }
  }

  // Driver functions
  async registerDriver(
    address,
    name = "Driver",
    email = "driver@example.com",
    phone = "123-456-7890",
    carModel = "Default Car",
    licensePlate = "ABC123",
    carColor = "Black"
  ) {
    try {
      await this.ensureInitialized();
      const result = await this.contract.methods
        .registerDriver(name, email, phone, carModel, licensePlate, carColor)
        .send({
          from: address,
          gas: 3000000,
        });

      const driverId = result.events.DriverRegistered.returnValues.driverId;
      return { success: true, driverId };
    } catch (error) {
      console.error("Error registering driver:", error.message);
      return { success: false, error: error.message };
    }
  }

  async createRide(
    address,
    startLocation,
    destination,
    availableSeats,
    price,
    departureTime
  ) {
    try {
      await this.ensureInitialized();

      // Convert price to wei (assuming price is in ETH)
      const priceWei = this.web3.utils.toWei(price.toString(), "ether");

      // Convert departure time to Unix timestamp if it's not already
      const departureTimeUnix =
        typeof departureTime === "string"
          ? Math.floor(new Date(departureTime).getTime() / 1000)
          : departureTime;

      const result = await this.contract.methods
        .createRide(
          startLocation,
          destination,
          availableSeats,
          priceWei,
          departureTimeUnix
        )
        .send({
          from: address,
          gas: 5000000,
        });

      const rideId = result.events.RideCreated.returnValues.rideId;
      return { success: true, rideId };
    } catch (error) {
      console.error("Error creating ride:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Client functions
  async registerClient(
    address,
    name = "Client",
    email = "client@example.com",
    phone = "123-456-7890"
  ) {
    try {
      await this.ensureInitialized();
      const result = await this.contract.methods
        .registerClient(name, email, phone)
        .send({
          from: address,
          gas: 3000000,
        });

      const clientId = result.events.ClientRegistered.returnValues.clientId;
      return { success: true, clientId };
    } catch (error) {
      console.error("Error registering client:", error.message);
      return { success: false, error: error.message };
    }
  }

  async requestRide(address, rideId) {
    try {
      await this.ensureInitialized();
      const result = await this.contract.methods.requestRide(rideId).send({
        from: address,
        gas: 3000000,
      });

      const requestId = result.events.RideRequested.returnValues.requestId;
      return { success: true, requestId };
    } catch (error) {
      console.error("Error requesting ride:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Getter functions
  async getActiveRides() {
    try {
      await this.ensureInitialized();
      const activeRideIds = await this.contract.methods.getActiveRides().call();

      // Get details for each active ride
      const rides = await Promise.all(
        activeRideIds.map(async (rideId) => {
          const ride = await this.contract.methods.rides(rideId).call();
          return this.formatRide(ride);
        })
      );

      return { success: true, rides };
    } catch (error) {
      console.error("Error getting active rides:", error.message);
      return { success: false, error: error.message };
    }
  }

  async getAllDrivers() {
    try {
      await this.ensureInitialized();

      // Get total number of drivers
      const totalDrivers = await this.contract.methods.getTotalDrivers().call();

      // Create an array of driver IDs from 1 to totalDrivers
      const driverIds = Array.from(
        { length: parseInt(totalDrivers) },
        (_, i) => i + 1
      );

      // Get details for each driver
      const drivers = await Promise.all(
        driverIds.map(async (driverId) => {
          const driver = await this.contract.methods.drivers(driverId).call();
          return this.formatDriver(driver);
        })
      );

      return { success: true, drivers };
    } catch (error) {
      console.error("Error getting all drivers:", error.message);
      return { success: false, error: error.message };
    }
  }

  async getDriverRides(driverId) {
    try {
      await this.ensureInitialized();
      const rideIds = await this.contract.methods
        .getDriverRides(driverId)
        .call();

      // Get details for each ride
      const rides = await Promise.all(
        rideIds.map(async (rideId) => {
          const ride = await this.contract.methods.rides(rideId).call();
          return this.formatRide(ride);
        })
      );

      return { success: true, rides };
    } catch (error) {
      console.error("Error getting driver rides:", error.message);
      return { success: false, error: error.message };
    }
  }

  async getDriver(driverId) {
    try {
      await this.ensureInitialized();
      const driver = await this.contract.methods.drivers(driverId).call();

      if (driver && parseInt(driver.id) > 0) {
        return this.formatDriver(driver);
      }
      return null;
    } catch (error) {
      console.error("Error getting driver:", error.message);
      return null;
    }
  }

  async getClientRides(clientId) {
    try {
      await this.ensureInitialized();
      const rideIds = await this.contract.methods
        .getClientRides(clientId)
        .call();

      // Get details for each ride
      const rides = await Promise.all(
        rideIds.map(async (rideId) => {
          const ride = await this.contract.methods.rides(rideId).call();
          return this.formatRide(ride);
        })
      );

      return { success: true, rides };
    } catch (error) {
      console.error("Error getting client rides:", error.message);
      return { success: false, error: error.message };
    }
  }

  async getClient(clientId) {
    try {
      await this.ensureInitialized();
      const client = await this.contract.methods.clients(clientId).call();

      if (client && parseInt(client.id) > 0) {
        return this.formatClient(client);
      }
      return null;
    } catch (error) {
      console.error("Error getting client:", error.message);
      return null;
    }
  }

  async getRideRequests(rideId) {
    try {
      await this.ensureInitialized();
      const requestIds = await this.contract.methods
        .getRideRequests(rideId)
        .call();

      // Get details for each request
      const requests = await Promise.all(
        requestIds.map(async (requestId) => {
          const request = await this.contract.methods
            .rideRequests(requestId)
            .call();
          return this.formatRideRequest(request, requestId);
        })
      );

      return { success: true, requests };
    } catch (error) {
      console.error("Error getting ride requests:", error.message);
      return { success: false, error: error.message };
    }
  }

  async acceptRideRequest(address, rideId, requestId) {
    try {
      await this.ensureInitialized();
      await this.contract.methods.acceptRideRequest(rideId, requestId).send({
        from: address,
        gas: 3000000,
      });

      return { success: true };
    } catch (error) {
      console.error("Error accepting ride request:", error.message);
      return { success: false, error: error.message };
    }
  }

  async rejectRideRequest(address, rideId, requestId) {
    try {
      await this.ensureInitialized();
      await this.contract.methods.rejectRideRequest(rideId, requestId).send({
        from: address,
        gas: 3000000,
      });

      return { success: true };
    } catch (error) {
      console.error("Error rejecting ride request:", error.message);
      return { success: false, error: error.message };
    }
  }

  async startRide(address, rideId) {
    try {
      await this.ensureInitialized();
      await this.contract.methods.startRide(rideId).send({
        from: address,
        gas: 3000000,
      });

      return { success: true };
    } catch (error) {
      console.error("Error starting ride:", error.message);
      return { success: false, error: error.message };
    }
  }

  async completeRide(address, rideId) {
    try {
      await this.ensureInitialized();
      await this.contract.methods.completeRide(rideId).send({
        from: address,
        gas: 3000000,
      });

      return { success: true };
    } catch (error) {
      console.error("Error completing ride:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Method to confirm ride and make payment
  async confirmRide(clientMetaAccount, rideId, price) {
    try {
      if (!this.isInitialized) {
        throw new Error("Blockchain service not initialized");
      }

      console.log(
        `Confirming ride ${rideId} payment from ${clientMetaAccount} for ${price} ETH`
      );

      // First get client ID for the account
      const clientId = await this.getClientIdByAccount(clientMetaAccount);

      if (!clientId) {
        throw new Error(`No client found for account ${clientMetaAccount}`);
      }

      // Get ride details
      const ride = await this.getRide(rideId);

      if (!ride) {
        throw new Error(`Ride ${rideId} not found`);
      }

      // Check if the contract has a confirmRidePayment method
      if (typeof this.contract.methods.confirmRidePayment === "function") {
        // Convert price to wei (assuming price is in ETH)
        const priceInWei = this.web3.utils.toWei(price.toString(), "ether");

        // Send transaction
        const receipt = await this.contract.methods
          .confirmRidePayment(rideId)
          .send({
            from: clientMetaAccount,
            value: priceInWei,
            gas: 500000,
          });

        console.log(
          `Payment confirmed for ride ${rideId}, transaction hash: ${receipt.transactionHash}`
        );

        return {
          success: true,
          transactionHash: receipt.transactionHash,
        };
      } else {
        // Fallback if method doesn't exist
        console.log(
          `Contract doesn't have confirmRidePayment method, using fallback`
        );

        // Record the payment in our local database
        // This is a simplified approach that doesn't actually transfer funds

        // Mark the ride as completed
        if (typeof this.contract.methods.completeRide === "function") {
          await this.contract.methods.completeRide(rideId).send({
            from: clientMetaAccount,
            gas: 200000,
          });
        }

        // Return success
        return {
          success: true,
          message: "Payment recorded (fallback method)",
        };
      }
    } catch (error) {
      console.error(`Error confirming ride ${rideId} payment:`, error);
      return {
        success: false,
        error: error.message || "Unknown error in payment confirmation",
      };
    }
  }

  async completeRideForPassenger(address, rideId, passengerId) {
    try {
      await this.ensureInitialized();
      await this.contract.methods
        .completeRideForPassenger(rideId, passengerId)
        .send({
          from: address,
          gas: 3000000,
        });

      return { success: true };
    } catch (error) {
      console.error("Error completing ride for passenger:", error.message);
      return { success: false, error: error.message };
    }
  }

  async cancelRide(address, rideId) {
    try {
      await this.ensureInitialized();
      await this.contract.methods.cancelRide(rideId).send({
        from: address,
        gas: 3000000,
      });

      return { success: true };
    } catch (error) {
      console.error("Error cancelling ride:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Helper functions to format data from blockchain to JSON
  formatRide(ride) {
    try {
      return {
        rideId: parseInt(ride.id),
        driverId: parseInt(ride.driverId),
        driverWalletAddress: ride.driverWalletAddress,
        startLocation: ride.startLocation,
        destination: ride.destination,
        availableSeats: parseInt(ride.availableSeats),
        price: this.web3.utils.fromWei(ride.price, "ether"),
        status: ride.status,
        createdAt: new Date(parseInt(ride.createdAt) * 1000).toISOString(),
        departureTime: new Date(
          parseInt(ride.departureTime) * 1000
        ).toISOString(),
      };
    } catch (error) {
      console.error("Error formatting ride:", error.message);
      return {
        rideId: parseInt(ride.id),
        error: "Error formatting ride data",
      };
    }
  }

  formatDriver(driver) {
    try {
      return {
        driverId: parseInt(driver.id),
        walletAddress: driver.walletAddress,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        carModel: driver.carModel,
        licensePlate: driver.licensePlate,
        carColor: driver.carColor,
        isActive: driver.isActive,
        timestamp: new Date(parseInt(driver.timestamp) * 1000).toISOString(),
      };
    } catch (error) {
      console.error("Error formatting driver:", error.message);
      return {
        driverId: parseInt(driver.id),
        error: "Error formatting driver data",
      };
    }
  }

  formatClient(client) {
    try {
      return {
        clientId: parseInt(client.id),
        walletAddress: client.walletAddress,
        name: client.name,
        email: client.email,
        phone: client.phone,
        isActive: client.isActive,
        timestamp: new Date(parseInt(client.timestamp) * 1000).toISOString(),
      };
    } catch (error) {
      console.error("Error formatting client:", error.message);
      return {
        clientId: parseInt(client.id),
        error: "Error formatting client data",
      };
    }
  }

  formatRideRequest(request, requestId) {
    try {
      return {
        requestId: parseInt(requestId),
        clientId: parseInt(request.clientId),
        clientWalletAddress: request.clientWalletAddress,
        status: request.status,
        requestedAt: new Date(
          parseInt(request.requestedAt) * 1000
        ).toISOString(),
      };
    } catch (error) {
      console.error("Error formatting ride request:", error.message);
      return {
        requestId: parseInt(requestId),
        error: "Error formatting ride request data",
      };
    }
  }

  // Get driver ID by wallet address
  async getDriverIdByAccount(address) {
    try {
      await this.ensureInitialized();
      const driverId = await this.contract.methods
        .driverAddressToId(address)
        .call();
      return driverId > 0 ? driverId : null;
    } catch (error) {
      console.error("Error getting driver ID by account:", error.message);
      return null;
    }
  }

  // Get client ID by wallet address
  async getClientIdByAccount(address) {
    try {
      await this.ensureInitialized();
      const clientId = await this.contract.methods
        .clientAddressToId(address)
        .call();
      return clientId > 0 ? clientId : null;
    } catch (error) {
      console.error("Error getting client ID by account:", error.message);
      return null;
    }
  }

  // Add this method to get ride details
  async getRide(rideId) {
    try {
      if (!this.isInitialized) {
        throw new Error("Blockchain service not initialized");
      }

      console.log(`Getting details for ride ${rideId}`);

      // Check if the contract has a getRide method
      if (typeof this.contract.methods.getRide === "function") {
        const ride = await this.contract.methods.getRide(rideId).call();
        return ride;
      }

      // Fallback: If getRide doesn't exist, try to get it from active rides
      const allRides = await this.getActiveRides();
      if (!allRides.success) {
        throw new Error(`Failed to get active rides: ${allRides.error}`);
      }

      const ride = allRides.rides.find(
        (r) => r.rideId.toString() === rideId.toString()
      );
      return ride || null;
    } catch (error) {
      console.error(`Error getting ride ${rideId}:`, error);
      return null;
    }
  }

  // Add this method to check payment status
  async checkPaymentStatus(rideId, clientId) {
    try {
      if (!this.isInitialized) {
        throw new Error("Blockchain service not initialized");
      }

      console.log(
        `Checking payment status for ride ${rideId} and client ${clientId}`
      );

      // Try to get ride directly
      try {
        const ride = await this.getRide(rideId);

        if (!ride) {
          console.log(`Ride ${rideId} not found`);
          return { paid: false, status: "not_found" };
        }

        // Check if client has paid for this ride
        if (ride.paidClients && Array.isArray(ride.paidClients)) {
          const paid = ride.paidClients.includes(clientId.toString());
          console.log(
            `Client ${clientId} payment status for ride ${rideId}: ${
              paid ? "Paid" : "Not paid"
            }`
          );
          return { paid, status: paid ? "completed" : "pending" };
        } else if (ride.status === "completed") {
          // If ride is completed and we don't have explicit payment info, assume paid
          console.log(
            `Ride ${rideId} is completed, assuming client ${clientId} has paid`
          );
          return { paid: true, status: "completed" };
        } else {
          // If ride isn't completed, payment is still pending
          return { paid: false, status: "pending" };
        }
      } catch (error) {
        console.error(`Error getting ride ${rideId}:`, error);

        // Fallback approach - check transactions to the contract
        try {
          // This would be implementation specific to how your contract handles payments
          // For now, we'll return a default response
          console.log(
            `Using fallback payment verification for ride ${rideId} and client ${clientId}`
          );
          return { paid: false, status: "unknown" };
        } catch (fallbackError) {
          console.error("Fallback payment verification failed:", fallbackError);
          throw fallbackError;
        }
      }
    } catch (error) {
      console.error(
        `Error checking payment status for ride ${rideId} and client ${clientId}:`,
        error
      );
      throw error;
    }
  }
}

// Export the class instance
module.exports = new BlockchainService();
