const ChainRideContract = artifacts.require("ChainRideContract");

module.exports = function (deployer) {
  deployer.deploy(ChainRideContract);
};
