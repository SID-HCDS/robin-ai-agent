const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function prompt(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

(async () => {
  try {
    // Check Azure login
    try {
      execSync('az account show', { stdio: 'ignore' });
      console.log('Already logged into Azure.');
    } catch {
      console.log('Please login to Azure:');
      execSync('az login', { stdio: 'inherit' });
    }

    const envName = await prompt('Enter environment name (e.g., dev, test, prod): ');
    const region = await prompt('Enter Azure region (e.g., eastus2): ');
    let resourceGroupName = await prompt(`Enter Azure resource group (default: ${envName}Group): `);
    if (!resourceGroupName) resourceGroupName = `${envName}Group`;

    // Create resource group if not exists
    try {
      execSync(`az group show --name ${resourceGroupName}`, { stdio: 'ignore' });
      console.log(`Resource group ${resourceGroupName} exists.`);
    } catch {
      console.log(`Creating resource group ${resourceGroupName}...`);
      execSync(`az group create --name ${resourceGroupName} --location ${region}`, { stdio: 'inherit' });
    }

    // Generate parameters.json
    const params = {
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentParameters.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "envName": { "value": envName },
        "region": { "value": region }
      }
    };
    fs.writeFileSync('infrastructure/parameters.json', JSON.stringify(params, null, 2));
    console.log('Generated infrastructure/parameters.json');

    // Deploy ARM template
    console.log('Deploying resources...');
    execSync(
      `az deployment group create --resource-group ${resourceGroupName} --template-file infrastructure/template.json --parameters infrastructure/parameters.json`,
      { stdio: 'inherit' }
    );

    // Write .env file for outputs (if any)
    const envFile = `.env.${envName}`;
    const envContent = `ENV_NAME=${envName}\nAZURE_REGION=${region}\nRESOURCE_GROUP=${resourceGroupName}\n`;
    fs.writeFileSync(envFile, envContent);
    console.log(`Environment file written: ${envFile}`);

    rl.close();
  } catch (err) {
    console.error('Deployment failed:', err);
    rl.close();
    process.exit(1);
  }
})();
