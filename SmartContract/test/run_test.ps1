# Run tests using the existing Ganache instance
cd $PSScriptRoot/..
npx truffle test --network development

# Display completion message
Write-Host "Tests completed!" -ForegroundColor Green 