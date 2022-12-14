const { AlphaRouter } = require("@uniswap/smart-order-router");
const { UniswapV3Pool } = require("./constants/UniswapV3Pool.js");
const {
  Token,
  CurrencyAmount,
  TradeType,
  Percent,
} = require("@uniswap/sdk-core");
const { ethers, BigNumber } = require("ethers");
const JSBI = require("jsbi");
const ERC20ABI = require("./abi.json");
const { WmaticABI } = require("./constants/WmaticABI");

const V3_SWAP_ROUTER_ADDRESS = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
const POLYGON_MUMBAI_RPC_URL = process.env.REACT_APP_POLYGON_MUMBAI_RPC_URL;

const chainId = 80001;

const web3Provider = new ethers.providers.JsonRpcProvider(
  POLYGON_MUMBAI_RPC_URL
);
const router = new AlphaRouter({ chainId: chainId, provider: web3Provider });

const name0 = "Neoverse Token";
const symbol0 = "NEO";
const decimals0 = 18;
const address0 = "0x7007D4Dc65D768e275DDA842deB1cD793cf99642";

const name1 = "Wrapped Matic";
const symbol1 = "Wmatic";
const decimals1 = 18;
const address1 = "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889";
const poolAddress = "0xE903643041cDB499750E2715B53254b92767142f";

const NEO = new Token(chainId, address0, decimals0, symbol0, name0);
const WMATIC = new Token(chainId, address1, decimals1, symbol1, name1);

export const getNeoContract = () =>
  new ethers.Contract(address0, ERC20ABI, web3Provider);
export const getWmaticContract = () =>
  new ethers.Contract(address1, WmaticABI, web3Provider);
export const getPoolContract = () =>
  new ethers.Contract(poolAddress, UniswapV3Pool, web3Provider);

// _____________________________NEO->MATIC________________________________________

export const getPriceNeoToMatic = async (
  inputAmount,
  slippageAmount,
  deadline,
  walletAddress
) => {
  const percentSlippage = new Percent(slippageAmount, 100);
  const neoDecimals = ethers.utils.parseUnits(
    inputAmount.toString(),
    decimals0
  );
  const currencyAmount = CurrencyAmount.fromRawAmount(
    NEO,
    JSBI.BigInt(neoDecimals)
  );

  const route = await router.route(
    currencyAmount,
    WMATIC,
    TradeType.EXACT_INPUT,
    {
      recipient: walletAddress,
      slippageTolerance: percentSlippage,
      deadline: deadline,
    }
  );

  const transaction = {
    data: route.methodParameters.calldata,
    to: V3_SWAP_ROUTER_ADDRESS,
    value: BigNumber.from(route.methodParameters.value),
    from: walletAddress,
    gasPrice: BigNumber.from(route.gasPriceWei),
    gasLimit: ethers.utils.hexlify(1000000),
  };

  const quoteAmountOut = route.quote.toFixed(6);
  const ratio = (inputAmount / quoteAmountOut).toFixed(3);
  return [transaction, quoteAmountOut, ratio, neoDecimals.toString()];
};

export const runSwapNeoToWMatic = async (
  transaction,
  signer,
  approvalAmount
) => {
  const neoTokenContract = getNeoContract();
  await neoTokenContract
    .connect(signer)
    .approve(V3_SWAP_ROUTER_ADDRESS, approvalAmount);

  await signer.sendTransaction(transaction);
};

export const unwrapWmatic = async (signer) => {
  signer.getAddress().then((address) => {
    const wmaticTokenContract = getWmaticContract();
    console.log(wmaticTokenContract);
    wmaticTokenContract.balanceOf(address).then(async (res) => {
      const approvalAmount = Number(ethers.utils.formatEther(res));
      console.log("gotWmaticContract at : ", wmaticTokenContract.address);
      console.log("Your approval amount is : ", approvalAmount.toString());
      const transferAmount = ethers.utils
        .parseUnits(approvalAmount.toString(), 18)
        .toString();
      await wmaticTokenContract.connect(signer).withdraw(transferAmount, {
        gasLimit: ethers.utils.hexlify(1000000),
      });
    });
  });
};
// _____________________________MATIC->NEO________________________________________

export const wrapMatic = async (provider, signer) => {
  const wmaticTokenContract = getWmaticContract();
  signer.getAddress().then((address) => {
    provider.getBalance(address).then(async (balance) => {
      const transferAmount = balance.toString() / 2;
      console.log(transferAmount);
      await wmaticTokenContract.connect(signer).deposit({
        value: transferAmount.toString(),
        gasLimit: ethers.utils.hexlify(1000000),
      });
    });
  });
};

export const getPriceMaticToNeo = async (
  inputAmount,
  slippageAmount,
  deadline,
  walletAddress,
  signer
) => {
  const percentSlippage = new Percent(slippageAmount, 100);
  console.log(inputAmount);
  const wmaticDecimals = ethers.utils.parseUnits(
    inputAmount.toString(),
    decimals1
  );
  console.log(wmaticDecimals.toString());
  const currencyAmount = CurrencyAmount.fromRawAmount(
    WMATIC,
    JSBI.BigInt(wmaticDecimals)
  );

  const route = await router.route(currencyAmount, NEO, TradeType.EXACT_INPUT, {
    recipient: walletAddress,
    slippageTolerance: percentSlippage,
    deadline: deadline,
  });

  const transaction = {
    data: route.methodParameters.calldata,
    to: V3_SWAP_ROUTER_ADDRESS,
    value: BigNumber.from(route.methodParameters.value),
    from: walletAddress,
    gasPrice: BigNumber.from(route.gasPriceWei),
    gasLimit: ethers.utils.hexlify(1000000),
  };

  const quoteAmountOut = route.quote.toFixed(6);
  const ratio = (inputAmount / quoteAmountOut).toFixed(3);

  return [transaction, quoteAmountOut, ratio, wmaticDecimals.toString()];
};

export const runSwapMaticToNeo = async (
  transaction,
  signer,
  approvalAmount
) => {
  const wmaticTokenContract = getWmaticContract();
  await wmaticTokenContract
    .connect(signer)
    .approve(V3_SWAP_ROUTER_ADDRESS, approvalAmount);

  signer.sendTransaction(transaction);
};
