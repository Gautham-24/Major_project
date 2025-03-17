# ChainRide - Decentralized Ride-Sharing Application

ChainRide is a fully decentralized ride-sharing application built on Ethereum blockchain technology. This application allows drivers to post rides and riders to book them, with all data stored securely on the blockchain.

## Features

- **Fully Decentralized**: All ride data is stored on the Ethereum blockchain
- **Driver Features**: Post rides, accept/reject ride requests, complete rides
- **Rider Features**: Book rides, view available rides, make payments
- **Map Integration**: Google Maps integration for location selection
- **Wallet Integration**: MetaMask integration for blockchain transactions

## Technology Stack

- **Frontend**: React.js
- **Backend**: Express.js
- **Blockchain**: Ethereum (Ganache for local development)
- **Smart Contracts**: Solidity
- **Contract Management**: Truffle
- **Maps**: Google Maps API

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Ganache (for local blockchain)
- Truffle (for smart contract deployment)
- MetaMask browser extension

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ChainRide.git
cd ChainRide
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd Server
npm install

# Install frontend dependencies
cd ../my-app
npm install

# Install smart contract dependencies
cd ../SmartContract
npm install
```

### 3. Set Up Ganache

1. Install Ganache from [https://trufflesuite.com/ganache/](https://trufflesuite.com/ganache/)
2. Launch Ganache and create a new workspace
3. Configure Ganache to use port 7545 (default)
4. Note down the available accounts and their private keys

### 4. Deploy Smart Contracts

```bash
cd SmartContract
truffle compile
truffle migrate --reset
```

### 5. Set Up Test Data (Optional)

```bash
cd SmartContract
truffle exec scripts/deploy.js
```

### 6. Start the Backend Server

```bash
cd Server
npm start
```

### 7. Start the Frontend Application

```bash
cd my-app
npm start
```

### 8. Configure MetaMask

1. Install the MetaMask extension in your browser
2. Connect MetaMask to your local Ganache network:
   - Network Name: Ganache
   - RPC URL: http://127.0.0.1:7545
   - Chain ID: 1337
   - Currency Symbol: ETH
3. Import accounts from Ganache using their private keys

## Usage

### Driver Flow

1. Log in as a driver using a Ganache account
2. Post a new ride with details (from, to, pickup point, price, etc.)
3. View and manage ride requests
4. Accept or reject ride requests
5. Start and complete rides

### Rider Flow

1. Log in as a rider using a different Ganache account
2. Set your current location and destination
3. Browse available rides
4. Request to join a ride
5. Pay for completed rides using MetaMask

## API Endpoints

### Driver Endpoints

- `POST /api/driver-register`: Register a new driver
- `POST /api/driver-location`: Update driver location
- `GET /api/driver/:driverId`: Get driver details

### Client Endpoints

- `POST /api/client-register`: Register a new client
- `POST /api/client-location`: Update client location
- `GET /api/client/:clientId`: Get client details

### Ride Endpoints

- `POST /api/rides`: Create a new ride
- `GET /api/rides`: Get all active rides
- `GET /api/rides/driver/:driverId`: Get rides for a specific driver
- `GET /api/rides/client/:clientId`: Get rides for a specific client
- `POST /api/rides/:rideId/request`: Request to join a ride
- `POST /api/rides/:rideId/accept-request/:requestId`: Accept a ride request
- `POST /api/rides/:rideId/reject-request/:requestId`: Reject a ride request
- `POST /api/rides/:rideId/start`: Start a ride
- `POST /api/rides/:rideId/complete`: Complete a ride
- `POST /api/rides/:rideId/complete-passenger/:passengerId`: Complete ride for a passenger
- `POST /api/rides/:rideId/cancel`: Cancel a ride

## Smart Contract Functions

### Driver Functions

- `registerDriver()`: Register a new driver
- `updateDriverLocation()`: Update driver's current location
- `createRide()`: Create a new ride offer
- `acceptRideRequest()`: Accept a ride request
- `rejectRideRequest()`: Reject a ride request
- `startRide()`: Start a ride
- `completeRide()`: Complete a ride
- `completeRideForPassenger()`: Complete ride for a specific passenger
- `cancelRide()`: Cancel a ride

### Client Functions

- `registerClient()`: Register a new client
- `updateClientLocation()`: Update client's current location and destination
- `requestRide()`: Request to join a ride
- `payForRide()`: Make payment for a completed ride

## Troubleshooting

- **MetaMask Connection Issues**: Ensure MetaMask is connected to the correct network (Ganache)
- **Contract Deployment Errors**: Make sure Ganache is running and accessible
- **Transaction Failures**: Check if you have enough ETH in your account
- **Map Issues**: Verify that your Google Maps API key is valid and has the necessary permissions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Truffle Suite for the development tools
- OpenZeppelin for smart contract libraries
- Google Maps for location services
