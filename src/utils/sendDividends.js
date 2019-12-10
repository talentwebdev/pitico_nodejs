/*
  Get the token information based on the id.
*/
import Big from "big.js";
import { Utils } from "slpjs";
import withSLP from "./withSLP";
import { sendBch } from "./sendBch";
import getWalletDetails from "./getWalletDetails";

export const DUST = 0.00005;

export const getBalancesForToken = withSLP(async (SLP, tokenId) => {
  try {
    const balances = await SLP.Utils.balancesForToken(tokenId);
    balances.totalBalance = balances.reduce((p, c) => c.tokenBalance + p, 0);
    return balances;
  } catch (err) {
    console.error(`Error in getTokenInfo: `, err);
    throw err;
  }
});

export const getElegibleAddresses = async (wallet, balances, value) => {
  let addresses = [];
  let values = [];
  let elegibleBalances = [...balances];

  while (true) {
    const tokenBalanceSum = elegibleBalances.reduce((p, c) => c.tokenBalance + p, 0);
    const minTokenBalance = (tokenBalanceSum * DUST) / value;
    console.info(minTokenBalance);

    const newElegibleBalances = elegibleBalances.filter(
      elegibleBalance => elegibleBalance.tokenBalance >= minTokenBalance
    );

    if (newElegibleBalances.length === elegibleBalances.length) {
      newElegibleBalances.forEach(elegibleBalance => {
        const address = Utils.toCashAddress(elegibleBalance.slpAddress);
        const elegibleValue = ((elegibleBalance.tokenBalance / tokenBalanceSum) * value).toFixed(8);
        if (address !== wallet.cashAddress) {
          addresses.push(address);
          values.push(Number(elegibleValue));
        }
      });
      break;
    } else {
      elegibleBalances = newElegibleBalances;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return {
    addresses,
    values
  };
};

export const sendDividends = async (wallet, { value, tokenId }) => {
  const outputs = await getBalancesForToken(tokenId);

  const walletDetails = getWalletDetails(wallet);

  const { addresses, values } = await getElegibleAddresses(walletDetails, outputs, value);

  return await sendBch(walletDetails, { addresses, values });
};
