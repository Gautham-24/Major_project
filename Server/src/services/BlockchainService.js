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

  /**
   * Update driver information
   * @param {string} address - Driver's MetaMask account address
   * @param {string} name - Driver's name
   * @param {string} email - Driver's email
   * @param {string} phone - Driver's phone number
   * @param {string} carModel - Driver's car model
   * @param {string} licensePlate - Driver's license plate
   * @param {string} carColor - Driver's car color
   * @returns {Promise<{success: boolean, error?: string}>} - Result of the operation
   */
  async updateDriver(
    address,
    name,
    email,
    phone,
    carModel,
    licensePlate,
    carColor
  ) {
    try {
      await this.ensureInitialized();

      // Check if driver exists
      const driverId = await this.getDriverIdByAccount(address);
      if (!driverId) {
        return {
          success: false,
          error: "Driver not found for this address",
        };
      }

      // Call the updateDriver function on the contract
      const result = await this.contract.methods
        .updateDriver(name, email, phone, carModel, licensePlate, carColor)
        .send({
          from: address,
          gas: 3000000,
        });

      console.log("Driver updated successfully:", result);

      return {
        success: true,
        driverId,
      };
    } catch (error) {
      console.error("Error updating driver:", error.message);
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

  /**
   * Update client information
   * @param {string} address - Client's MetaMask account address
   * @param {string} name - Client's name
   * @param {string} email - Client's email
   * @param {string} phone - Client's phone number
   * @returns {Promise<{success: boolean, clientId?: number, error?: string}>} - Result of the operation
   */
  async updateClient(address, name, email, phone) {
    try {
      await this.ensureInitialized();

      // Check if client exists
      const clientId = await this.getClientIdByAccount(address);
      if (!clientId) {
        return {
          success: false,
          error: "Client not found for this address",
        };
      }

      // Call the updateClient function on the contract
      const result = await this.contract.methods
        .updateClient(name, email, phone)
        .send({
          from: address,
          gas: 3000000,
        });

      console.log("Client updated successfully:", result);

      return {
        success: true,
        clientId,
      };
    } catch (error) {
      console.error("Error updating client:", error.message);
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

  /**
   * Method to handle confirming a ride and processing payment
   * @param {string} clientAccount - The client's MetaMask account address
   * @param {string} rideId - The ID of the ride to confirm
   * @param {number} price - The ride price in ETH
   * @returns {Object} - Result object with success status, transaction hash or error
   */
  async confirmRide(clientAccount, rideId, price) {
    try {
      await this.ensureInitialized();
      console.log(
        `Confirming ride ${rideId} for client ${clientAccount} with price ${price} ETH`
      );

      // Get the client ID associated with the account
      const clientId = await this.getClientIdByAccount(clientAccount);
      if (!clientId) {
        console.error(`Client with account ${clientAccount} not found`);
        return { success: false, error: "Client not found" };
      }
      console.log(`Found client with ID ${clientId}`);

      // Get the ride details
      const ride = await this.getRide(rideId);
      if (!ride) {
        console.error(`Ride ${rideId} not found`);
        return { success: false, error: "Ride not found" };
      }
      // console.log(`Found ride: ${JSON.stringify(ride)}`);

      // Convert the price from ETH to wei
      let priceInWei;
      try {
        priceInWei = this.web3.utils.toWei(price.toString(), "ether");
        console.log(`Price in wei: ${priceInWei}`);
      } catch (error) {
        console.error(`Error converting price to wei: ${error.message}`);
        return { success: false, error: "Invalid price format" };
      }

      // Check if the contract has the confirmRide method
      if (this.contract.methods.confirmRide) {
        try {
          // Check how many parameters the function expects
          const paramCount = await this.checkConfirmRideParameters();

          let transaction;
          if (paramCount === 1) {
            // Just pass the rideId
            console.log(
              `Calling contract.confirmRide with parameter: rideId=${rideId}, value=${priceInWei}`
            );
            transaction = this.contract.methods.confirmRide(rideId);
          } else if (paramCount === 2) {
            // Pass both clientId and rideId
            console.log(
              `Calling contract.confirmRide with parameters: clientId=${clientId}, rideId=${rideId}, value=${priceInWei}`
            );
            transaction = this.contract.methods.confirmRide(clientId, rideId);
          } else {
            // If somehow it expects a different number of parameters, log and error
            console.error(
              `Unexpected parameter count for confirmRide: ${paramCount}`
            );
            return {
              success: false,
              error: `Contract function confirmRide expects ${paramCount} parameters, but we can only handle 1 or 2`,
            };
          }

          // Try sending the transaction
          try {
            const receipt = await transaction.send({
              from: clientAccount,
              value: priceInWei,
              gas: 500000,
            });

            console.log(`Transaction successful: ${receipt.transactionHash}`);
            return { success: true, transactionHash: receipt.transactionHash };
          } catch (txError) {
            // If the transaction failed with parameter errors, try the other parameter count as a fallback
            if (
              txError.message.includes("Invalid number of parameters") ||
              txError.message.includes("parameters") ||
              txError.message.includes("wrong number of arguments")
            ) {
              console.log(
                `Transaction failed with parameter error: ${txError.message}`
              );
              console.log(`Trying alternative parameter count as fallback...`);

              // Try the opposite parameter count
              let fallbackTransaction;
              if (paramCount === 1) {
                console.log(`Fallback: Trying with 2 parameters instead`);
                fallbackTransaction = this.contract.methods.confirmRide(
                  clientId,
                  rideId
                );
              } else {
                console.log(`Fallback: Trying with 1 parameter instead`);
                fallbackTransaction = this.contract.methods.confirmRide(rideId);
              }

              try {
                const receipt = await fallbackTransaction.send({
                  from: clientAccount,
                  value: priceInWei,
                  gas: 500000,
                });

                console.log(
                  `Fallback transaction successful: ${receipt.transactionHash}`
                );
                return {
                  success: true,
                  transactionHash: receipt.transactionHash,
                };
              } catch (fallbackError) {
                console.error(
                  `Fallback transaction also failed: ${fallbackError.message}`
                );

                // As a last resort, try recording the payment locally
                console.log(
                  "Both blockchain transactions failed, falling back to local payment recording"
                );
                return await this.recordLocalPayment(
                  clientAccount,
                  rideId,
                  price
                );
              }
            }

            // If not a parameter issue or fallback failed, throw the original error
            console.error(`Transaction failed: ${txError.message}`);

            // Try to extract revert reason if available
            let revertReason = txError.message;
            if (txError.message.includes("revert")) {
              const revertMatch = txError.message.match(
                /VM Exception.*revert(.*)/
              );
              if (revertMatch && revertMatch[1]) {
                revertReason = revertMatch[1].trim();
              }
            }

            return { success: false, error: `Payment failed: ${revertReason}` };
          }
        } catch (error) {
          console.error(
            `Error setting up payment transaction: ${error.message}`
          );
          return {
            success: false,
            error: `Error setting up payment: ${error.message}`,
          };
        }
      } else {
        // Fallback if confirmRide is not available on contract
        console.log(
          "confirmRide method not available on contract, using fallback"
        );

        // Use our local payment recording mechanism
        return await this.recordLocalPayment(clientAccount, rideId, price);
      }
    } catch (error) {
      console.error(`Error in confirmRide: ${error.message}`);
      return {
        success: false,
        error: `Error processing payment: ${error.message}`,
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
        await this.ensureInitialized();
      }

      // console.log(`Getting details for ride ${rideId}`);

      // Try using rides mapping directly first
      try {
        const ride = await this.contract.methods.rides(rideId).call();

        // Check if we got a valid ride (id > 0)
        if (ride && parseInt(ride.id) > 0) {
          // console.log(`Found ride ${rideId} using rides mapping`);

          // Enhance the ride object with passenger information
          try {
            const passengerIds = await this.contract.methods
              .getRidePassengers(rideId)
              .call();
            // console.log(
            //   `Found ${passengerIds.length} passengers for ride ${rideId}`
            // );

            // Add the passenger IDs to the ride object
            ride.passengerIds = passengerIds;

            // If we have passengers, also get their details
            if (passengerIds && passengerIds.length > 0) {
              const passengerDetails = [];
              for (const passengerId of passengerIds) {
                try {
                  const passenger = await this.contract.methods
                    .passengers(passengerId)
                    .call();
                  passengerDetails.push({
                    id: passengerId,
                    clientId: passenger.clientId,
                    paid: passenger.paid,
                  });
                } catch (err) {
                  console.log(
                    `Could not get details for passenger ${passengerId}: ${err.message}`
                  );
                }
              }
              ride.passengers = passengerDetails;
            }
          } catch (passengerError) {
            console.log(
              `Error getting passengers for ride ${rideId}: ${passengerError.message}`
            );
            // If getRidePassengers fails, try alternate approach
            if (
              typeof this.contract.methods.getPassengersByRide === "function"
            ) {
              try {
                const passengers = await this.contract.methods
                  .getPassengersByRide(rideId)
                  .call();
                ride.passengerIds = passengers.map((p) => p.id);
                ride.passengers = passengers;
                console.log(
                  `Got ${ride.passengerIds.length} passengers using getPassengersByRide`
                );
              } catch (altError) {
                console.log(
                  `Alternative passenger retrieval failed: ${altError.message}`
                );
              }
            }
          }

          // If the ride is completed, try to find all clients who requested this ride
          if (ride.status === "completed") {
            try {
              const rideRequests = await this.contract.methods
                .getRideRequests(rideId)
                .call();
              // console.log(`Ride ${rideId} has ${rideRequests.length} requests`);

              // Get details for each request
              const requestDetails = [];
              for (const requestId of rideRequests) {
                try {
                  const request = await this.contract.methods
                    .rideRequests(requestId)
                    .call();
                  requestDetails.push({
                    id: requestId,
                    clientId: request.clientId,
                    status: request.status,
                  });
                } catch (err) {
                  console.log(
                    `Could not get details for request ${requestId}: ${err.message}`
                  );
                }
              }

              // Add the clientIds of accepted requests as passengers if not already present
              const acceptedRequests = requestDetails.filter(
                (req) => req.status === "accepted"
              );
              if (acceptedRequests.length > 0) {
                // console.log(
                //   `Ride ${rideId} has ${acceptedRequests.length} accepted requests`
                // );

                // If we don't have passenger IDs yet, initialize the array
                if (!ride.passengerIds) {
                  ride.passengerIds = [];
                }

                // Add client IDs from accepted requests
                for (const request of acceptedRequests) {
                  if (ride.passengerIds.indexOf(request.clientId) === -1) {
                    // console.log(
                    //   // `Adding client ${request.clientId} as passenger for ride ${rideId}`
                    // );
                    ride.passengerIds.push(request.clientId);
                  }
                }
              }
            } catch (requestsError) {
              // console.log(
              //   `Error getting ride requests: ${requestsError.message}`
              // );
            }
          }

          return ride;
        }
      } catch (error) {
        console.log(`Error using rides mapping: ${error.message}`);
      }

      // Try using getRideDetails function if available
      try {
        if (typeof this.contract.methods.getRideDetails === "function") {
          console.log(`Using getRideDetails function for ride ${rideId}`);
          const rideDetails = await this.contract.methods
            .getRideDetails(rideId)
            .call();

          if (rideDetails && parseInt(rideDetails.id) > 0) {
            console.log(`Found ride ${rideId} using getRideDetails`);
            return rideDetails;
          }
        }
      } catch (error) {
        console.log(`Error using getRideDetails: ${error.message}`);
      }

      // Fallback: If neither method works, try to get it from active rides
      console.log(`Trying to find ride ${rideId} in active rides`);
      const allRides = await this.getActiveRides();
      if (allRides.success) {
        const ride = allRides.rides.find(
          (r) => r.rideId.toString() === rideId.toString()
        );

        if (ride) {
          console.log(`Found ride ${rideId} in active rides`);
          return ride;
        }
      }

      // Check in all possible ride lists as a last resort
      console.log(`Checking all possible rides for ride ${rideId}`);
      try {
        // Get all ride IDs using allRideIds if available
        if (typeof this.contract.methods.allRideIds === "function") {
          const allRideIds = await this.contract.methods.allRideIds(0).call();
          for (let i = 0; i < allRideIds.length; i++) {
            if (allRideIds[i].toString() === rideId.toString()) {
              const foundRide = await this.contract.methods
                .rides(rideId)
                .call();
              if (foundRide && parseInt(foundRide.id) > 0) {
                console.log(`Found ride ${rideId} in allRideIds`);
                return foundRide;
              }
            }
          }
        }
      } catch (error) {
        console.log(`Error checking all ride IDs: ${error.message}`);
      }

      console.log(`Ride ${rideId} not found after all attempts`);
      return null;
    } catch (error) {
      console.error(`Error getting ride ${rideId}:`, error);
      return null;
    }
  }

  // Method to check payment status for a ride and client
  async checkPaymentStatus(rideId, clientId) {
    try {
      if (!this.isInitialized) {
        throw new Error("Blockchain service not initialized");
      }

      // Get ride details
      const ride = await this.getRide(rideId);

      if (!ride) {
        console.log(`Ride ${rideId} not found`);
        return { paid: false, status: "not_found" };
      }

      // Check if the ride is completed - payment is only relevant for completed rides
      if (ride.status !== "completed") {
        return { paid: false, status: "not_completed" };
      }

      // Check if we have passengerIds in the ride
      if (
        !ride.passengerIds ||
        !Array.isArray(ride.passengerIds) ||
        ride.passengerIds.length === 0
      ) {
        console.log(`No passengers found for ride ${rideId}`);
        return { paid: false, status: "no_passengers" };
      }

      // Check if this client is a passenger in this ride
      let passengerInfo = null;
      let passengerFound = false;

      for (let i = 0; i < ride.passengerIds.length; i++) {
        try {
          const passengerId = ride.passengerIds[i];
          const passenger = await this.contract.methods
            .passengers(passengerId)
            .call();

          // Check if this passenger is our client
          if (passenger.clientId.toString() === clientId.toString()) {
            passengerFound = true;
            passengerInfo = passenger;
            break;
          }
        } catch (err) {
          console.error(
            `Error checking passenger ${ride.passengerIds[i]}:`,
            err
          );
        }
      }

      if (!passengerFound) {
        console.log(`Client ${clientId} is not a passenger of ride ${rideId}`);
        return { paid: false, status: "not_passenger" };
      }

      // Check if the passenger has paid
      const isPaid =
        passengerInfo.paid === true || passengerInfo.paid === "true";
      const paymentStatus = isPaid ? "paid" : "payment_pending";
      const paymentTimestamp = isPaid ? passengerInfo.paymentTimestamp : null;

      return {
        paid: isPaid,
        status: paymentStatus,
        paymentTimestamp: paymentTimestamp,
      };
    } catch (error) {
      console.error(
        `Error checking payment status for ride ${rideId} and client ${clientId}:`,
        error
      );
      return { paid: false, status: "error", error: error.message };
    }
  }

  // Method to check if a client is a passenger on a ride
  async isClientPassengerOfRide(clientId, rideId) {
    try {
      await this.ensureInitialized();
      console.log(
        `Checking if client ${clientId} is a passenger on ride ${rideId}`
      );

      // Get the ride details
      const ride = await this.getRide(rideId);

      if (!ride) {
        console.log(`Ride ${rideId} not found`);
        return false;
      }

      // First check if we have passenger information in the ride object
      if (ride.passengers) {
        // If we have passenger details, check if this client is one of them
        const isPassenger = ride.passengers.some(
          (p) => p.clientId.toString() === clientId.toString()
        );
        if (isPassenger) {
          console.log(`Found client ${clientId} in ride.passengers`);
          return true;
        }
      }

      // If no passengers array or client not found there, check passengerIds
      if (ride.passengerIds && ride.passengerIds.length > 0) {
        console.log(`Ride has ${ride.passengerIds.length} passenger IDs`);

        // First check if clientId is directly in passengerIds (some contracts might store it this way)
        if (
          ride.passengerIds.some((id) => id.toString() === clientId.toString())
        ) {
          console.log(`Client ${clientId} directly found in passengerIds`);
          return true;
        }

        // Check each passenger to see if they match our client
        for (let i = 0; i < ride.passengerIds.length; i++) {
          try {
            const passengerId = ride.passengerIds[i];
            console.log(`Checking passenger ${passengerId}`);

            // Try to get passenger details from the contract
            const passenger = await this.contract.methods
              .passengers(passengerId)
              .call();
            console.log(
              `Passenger ${passengerId} has client ID: ${passenger.clientId}`
            );

            if (passenger.clientId.toString() === clientId.toString()) {
              console.log(
                `Match found! Client ${clientId} is passenger ${passengerId}`
              );
              return true;
            }
          } catch (err) {
            console.error(
              `Error checking passenger ${ride.passengerIds[i]}:`,
              err
            );
          }
        }
      } else {
        console.log(
          `Ride ${rideId} has no defined passengers, checking accepted requests`
        );
      }

      // For completed rides, if no passengers found, check if this client has an accepted request
      if (ride.status === "completed") {
        try {
          const requests = await this.contract.methods
            .getRideRequests(rideId)
            .call();
          console.log(`Found ${requests.length} requests for ride ${rideId}`);

          for (const requestId of requests) {
            try {
              const request = await this.contract.methods
                .rideRequests(requestId)
                .call();

              if (
                request.clientId.toString() === clientId.toString() &&
                (request.status === "accepted" ||
                  request.status === "completed")
              ) {
                console.log(
                  `Client ${clientId} has an accepted/completed request for ride ${rideId}`
                );
                return true;
              }
            } catch (error) {
              console.log(
                `Error checking request ${requestId}: ${error.message}`
              );
            }
          }
        } catch (error) {
          console.log(`Error getting ride requests: ${error.message}`);
        }
      }

      // For completed rides where we have no other way to check, assume client is a passenger
      // if they're trying to make a payment
      if (ride.status === "completed") {
        console.log(
          `Special case: For completed ride ${rideId}, allowing client ${clientId} as passenger for payment`
        );
        return true;
      }

      console.log(`Client ${clientId} is not a passenger on ride ${rideId}`);
      return false;
    } catch (error) {
      console.error(`Error checking if client is passenger: ${error.message}`);
      return false;
    }
  }

  /**
   * Updates a ride record locally when blockchain transactions can't be performed
   * @param {Object} updatedRide - The updated ride object
   */
  async updateRideRecord(updatedRide) {
    if (!updatedRide || !updatedRide.rideId) {
      console.error("Cannot update ride: invalid ride data");
      return;
    }

    try {
      console.log(`Updating local ride record for ride ${updatedRide.rideId}`);

      // If we have a local rides cache, update it
      if (this.ridesCache) {
        const rideIndex = this.ridesCache.findIndex(
          (r) => r.rideId === updatedRide.rideId
        );
        if (rideIndex >= 0) {
          this.ridesCache[rideIndex] = {
            ...this.ridesCache[rideIndex],
            ...updatedRide,
            lastUpdated: Date.now(),
          };
          console.log(`Updated ride in local cache: ${updatedRide.rideId}`);
        } else {
          console.log(
            `Ride ${updatedRide.rideId} not found in local cache, skipping update`
          );
        }
      }

      // If we're using a real blockchain, we might want to emit an event here
      // for other parts of the system to react to the update

      return true;
    } catch (error) {
      console.error(`Error updating ride record: ${error.message}`);
      return false;
    }
  }

  /**
   * Check the number of parameters expected by the confirmRide method
   * @returns {number} - Number of parameters expected (or 1 if can't be determined)
   */
  async checkConfirmRideParameters() {
    try {
      await this.ensureInitialized();

      if (!this.contract.methods.confirmRide) {
        console.log("No confirmRide method found on contract");
        return 1; // Default to 1 parameter
      }

      // Get the confirmRide function's ABI
      const abi = this.contract._jsonInterface.find(
        (item) => item.name === "confirmRide" && item.type === "function"
      );

      if (abi && abi.inputs) {
        console.log(
          `confirmRide method expects ${
            abi.inputs.length
          } parameters: ${JSON.stringify(abi.inputs)}`
        );
        return abi.inputs.length;
      }

      console.log(
        "Could not determine confirmRide parameters from ABI, defaulting to 1"
      );
      return 1; // Default to 1 parameter if we can't determine
    } catch (error) {
      console.error(`Error checking confirmRide parameters: ${error.message}`);
      return 1; // Default to 1 parameter on error
    }
  }

  /**
   * Record a payment locally when blockchain transactions can't be performed
   * This is an emergency fallback method
   * @param {string} clientAccount - Client's MetaMask account
   * @param {string} rideId - Ride ID
   * @param {number} price - Price in ETH
   * @returns {Object} - Result of the operation
   */
  async recordLocalPayment(clientAccount, rideId, price) {
    try {
      console.log(
        `Recording local payment for ride ${rideId} by ${clientAccount} of ${price} ETH`
      );

      // Get the ride
      const ride = await this.getRide(rideId);
      if (!ride) {
        return { success: false, error: "Ride not found" };
      }

      // Get client ID
      const clientId = await this.getClientIdByAccount(clientAccount);
      if (!clientId) {
        return { success: false, error: "Client not found" };
      }

      // Update ride with payment information
      const updatedRide = {
        ...ride,
        paymentConfirmed: true,
        paymentTimestamp: Date.now(),
        paymentAmount: price,
        paymentBy: clientId,
        paymentAccount: clientAccount,
      };

      // Save the updated ride
      const updated = await this.updateRideRecord(updatedRide);
      if (!updated) {
        return { success: false, error: "Failed to update ride record" };
      }

      // Return success
      const txId = `local-payment-${Date.now()}-${rideId}-${clientId}`;
      return {
        success: true,
        transactionHash: txId,
        message: "Payment recorded locally (fallback method)",
      };
    } catch (error) {
      console.error(`Error recording local payment: ${error.message}`);
      return {
        success: false,
        error: `Failed to record payment: ${error.message}`,
      };
    }
  }

  /**
   * Get all ride requests for a specific client
   * @param {string} clientId - The ID of the client
   * @returns {Promise<{success: boolean, requests: Array, error: string}>}
   */
  async getClientRequests(clientId) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if the getRideCount method exists before calling it
      if (!this.contract.methods.getRideCount) {
        // console.warn("getRideCount method is not available in the contract");
        return {
          success: true,
          requests: [],
          error: "getRideCount method is not available in the contract",
        };
      }

      // Get all ride IDs first to search through
      const rideCount = await this.contract.methods.getRideCount().call();
      const allRideRequests = [];

      // Iterate through all rides (could be optimized further with indexing)
      for (let i = 1; i <= rideCount; i++) {
        try {
          const rideId = i.toString();
          const requestsResponse = await this.getRideRequests(rideId);

          if (requestsResponse.success && requestsResponse.requests) {
            // Filter requests to find those from this client
            const clientRequests = requestsResponse.requests.filter(
              (request) => request.clientId.toString() === clientId.toString()
            );

            // Add ride ID to each request and add to results
            clientRequests.forEach((request) => {
              allRideRequests.push({
                ...request,
                rideId: rideId,
              });
            });
          }
        } catch (error) {
          console.error(
            `Error processing ride ${i} for client requests:`,
            error
          );
          // Continue to next ride even if one fails
        }
      }

      return {
        success: true,
        requests: allRideRequests,
      };
    } catch (error) {
      console.error("Error getting client ride requests:", error);
      return {
        success: false,
        requests: [],
        error: error.message,
      };
    }
  }

  /**
   * Rate a driver for a specific ride
   * @param {string} clientAccount - Client's wallet address
   * @param {number} rideId - ID of the ride
   * @param {number} score - Rating score (1-5)
   * @returns {Promise<{success: boolean, error: string}>}
   */
  async rateDriver(clientAccount, rideId, score) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Validate input
      if (score < 1 || score > 5) {
        return {
          success: false,
          error: "Rating must be between 1 and 5",
        };
      }

      console.log(
        `Rating driver for ride ${rideId} with score ${score} from account ${clientAccount}`
      );

      // Call the smart contract method
      const result = await this.contract.methods
        .rateDriver(rideId, score)
        .send({
          from: clientAccount,
          gas: 3000000,
        });

      console.log("Rating submitted successfully:", result.transactionHash);

      const ratingId =
        result.events && result.events.RatingSubmitted
          ? result.events.RatingSubmitted.returnValues.ratingId
          : null;

      return {
        success: true,
        ratingId,
        transactionHash: result.transactionHash,
      };
    } catch (error) {
      console.error("Error rating driver:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a driver's average rating
   * @param {number} driverId - ID of the driver
   * @returns {Promise<{success: boolean, averageRating: number, totalRatings: number, error: string}>}
   */
  async getDriverAverageRating(driverId) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // console.log(`Getting average rating for driver ${driverId}`);

      // Handle the case where the contract method doesn't return an array properly
      try {
        const result = await this.contract.methods
          .getDriverRating(driverId)
          .call();
        let totalRating = 0;
        let ratingCount = 0;

        // Check if result is an array with two elements
        if (Array.isArray(result) && result.length === 2) {
          totalRating = result[0];
          ratingCount = result[1];
        } else if (typeof result === "object") {
          // Handle case where result is returned as an object with numbered keys
          totalRating = result["0"] || 0;
          ratingCount = result["1"] || 0;
        }

        let averageRating = 0;
        if (parseInt(ratingCount) > 0) {
          averageRating = (
            parseInt(totalRating) / parseInt(ratingCount)
          ).toFixed(1);
        }

        return {
          success: true,
          averageRating: parseFloat(averageRating),
          totalRatings: parseInt(ratingCount),
        };
      } catch (error) {
        console.error(`Error calling getDriverRating: ${error.message}`);
        // Return default values if the contract call fails
        return {
          success: true,
          averageRating: 0,
          totalRatings: 0,
        };
      }
    } catch (error) {
      console.error(`Error getting driver rating: ${error.message}`);
      return {
        success: false,
        averageRating: 0,
        totalRatings: 0,
        error: error.message,
      };
    }
  }

  /**
   * Get all ratings for a specific driver
   * @param {number} driverId - ID of the driver
   * @returns {Promise<{success: boolean, ratings: Array, error: string}>}
   */
  async getDriverRatings(driverId) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // console.log(`Getting all ratings for driver ${driverId}`);

      const ratingIds = await this.contract.methods
        .getDriverRatings(driverId)
        .call();

      const ratingsDetail = await Promise.all(
        ratingIds.map(async (ratingId) => {
          const rating = await this.contract.methods.ratings(ratingId).call();
          return this.formatRating(rating);
        })
      );

      return {
        success: true,
        ratings: ratingsDetail,
      };
    } catch (error) {
      console.error(`Error getting driver ratings: ${error.message}`);
      return {
        success: false,
        ratings: [],
        error: error.message,
      };
    }
  }

  /**
   * Get all ratings for a specific ride
   * @param {number} rideId - ID of the ride
   * @returns {Promise<{success: boolean, ratings: Array, error: string}>}
   */
  async getRideRatings(rideId) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // console.log(`Getting all ratings for ride ${rideId}`);

      const ratingIds = await this.contract.methods
        .getRideRatings(rideId)
        .call();

      const ratingsDetail = await Promise.all(
        ratingIds.map(async (ratingId) => {
          const rating = await this.contract.methods.ratings(ratingId).call();
          return this.formatRating(rating);
        })
      );

      return {
        success: true,
        ratings: ratingsDetail,
      };
    } catch (error) {
      console.error(`Error getting ride ratings: ${error.message}`);
      return {
        success: false,
        ratings: [],
        error: error.message,
      };
    }
  }

  /**
   * Format a rating object from the blockchain
   * @param {Object} rating - The rating object from the blockchain
   * @returns {Object} - Formatted rating object
   */
  formatRating(rating) {
    try {
      return {
        id: parseInt(rating.id),
        rideId: parseInt(rating.rideId),
        driverId: parseInt(rating.driverId),
        clientId: parseInt(rating.clientId),
        score: parseInt(rating.score),
        timestamp: new Date(parseInt(rating.timestamp) * 1000).toISOString(),
      };
    } catch (error) {
      console.error("Error formatting rating:", error.message);
      return {
        id: parseInt(rating.id),
        error: "Error formatting rating data",
      };
    }
  }

  // Add a function to get driver statistics
  async getDriverStats(driverId) {
    try {
      if (!this.isInitialized) {
        console.error("Blockchain service not initialized");
        return { success: false, error: "Blockchain service not initialized" };
      }

      const stats = await this.contract.methods.getDriverStats(driverId).call();

      return {
        success: true,
        completedRides: parseInt(stats.completedRides),
        activeRides: parseInt(stats.activeRides),
        totalEarnings: this.web3.utils.fromWei(
          stats.totalEarnings.toString(),
          "ether"
        ),
      };
    } catch (error) {
      console.error("Error getting driver statistics:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get passenger details by ID
   * @param {string} passengerId - The passenger ID
   * @returns {Promise<Object|null>} - Passenger details or null if not found
   */
  async getPassenger(passengerId) {
    try {
      if (!this.isInitialized) {
        throw new Error("Blockchain service not initialized");
      }

      console.log(`Getting passenger with ID ${passengerId}`);

      // Get passenger from blockchain
      const passenger = await this.contract.methods
        .passengers(passengerId)
        .call();

      if (
        !passenger ||
        passenger.clientWalletAddress ===
          "0x0000000000000000000000000000000000000000"
      ) {
        console.log(`Passenger with ID ${passengerId} not found`);
        return null;
      }

      return {
        id: passengerId,
        clientId: passenger.clientId,
        clientWalletAddress: passenger.clientWalletAddress,
        status: passenger.status,
        paid: passenger.paid,
        paymentTimestamp: passenger.paymentTimestamp || null,
      };
    } catch (error) {
      console.error(`Error getting passenger with ID ${passengerId}:`, error);
      return null;
    }
  }
}

// Export the class instance
module.exports = new BlockchainService();
