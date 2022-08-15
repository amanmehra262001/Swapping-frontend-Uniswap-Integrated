import "./App.css";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { GearFill } from "react-bootstrap-icons";

import PageButton from "./components/PageButton";
import ConnectButton from "./components/ConnectButton";
import ConfigModal from "./components/ConfigModal";
import CurrencyField from "./components/CurrencyField";

import BeatLoader from "react-spinners/BeatLoader";
import {
  getNeoContract,
  getWmaticContract,
  getPriceNeoToMatic,
  runSwapNeoToMatic,
  getPoolContract,
  getPriceMaticToNeo,
  runSwapMaticToNeo,
} from "./AlphaRouterService";

function App() {
  const [provider, setProvider] = useState(undefined);
  const [signer, setSigner] = useState(undefined);
  const [signerAddress, setSignerAddress] = useState(undefined);

  const [slippageAmount, setSlippageAmount] = useState(2);
  const [deadlineMinutes, setDeadlineMinutes] = useState(10);
  const [showModal, setShowModal] = useState(undefined);

  const [inputAmount, setInputAmount] = useState(undefined);
  const [outputAmount, setOutputAmount] = useState(undefined);
  const [transaction, setTransaction] = useState(undefined);
  const [loading, setLoading] = useState(undefined);
  const [ratio, setRatio] = useState(undefined);
  const [poolcontract, setPoolcontract] = useState(undefined);
  const [neoContract, setNeoContract] = useState(undefined);
  const [wmaticContract, setWmaticContract] = useState(undefined);
  const [neoAmount, setNeoAmount] = useState(undefined);
  const [wmaticAmount, setWmaticAmount] = useState(undefined);
  const [transactionDirection, setTransactionDirection] = useState(true);

  useEffect(() => {
    const onLoad = async () => {
      const provider = await new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);

      const poolContract = getPoolContract();
      setPoolcontract(poolContract);

      const neoContract = getNeoContract();
      setNeoContract(neoContract);

      const wmaticContract = getWmaticContract();
      setWmaticContract(wmaticContract);
    };
    onLoad();
  }, []);

  const getSigner = async (provider) => {
    provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    setSigner(signer);
  };
  const isConnected = () => signer !== undefined;
  const getWalletAddress = () => {
    signer.getAddress().then((address) => {
      setSignerAddress(address);

      // todo: connect neo and wmatic contracts
      neoContract.balanceOf(address).then((res) => {
        setNeoAmount(Number(ethers.utils.formatEther(res)));
      });
      wmaticContract.balanceOf(address).then((res) => {
        setWmaticAmount(Number(ethers.utils.formatEther(res)));
      });
    });
  };

  if (signer !== undefined) {
    getWalletAddress();
  }

  const getSwapPriceNeoToMatic = (inputAmount) => {
    setLoading(true);
    setInputAmount(inputAmount);

    const swap = getPriceNeoToMatic(
      inputAmount,
      slippageAmount,
      Math.floor(Date.now() / 1000 + deadlineMinutes * 60),
      signerAddress
    ).then((data) => {
      setTransaction(data[0]);
      setOutputAmount(data[1]);
      setRatio(data[2]);
      setLoading(false);
    });
  };

  const getSwapPriceMaticToNeo = (inputAmount) => {
    setLoading(true);
    setInputAmount(inputAmount);
    console.log(inputAmount);

    const swap = getPriceMaticToNeo(
      inputAmount,
      slippageAmount,
      Math.floor(Date.now() / 1000 + deadlineMinutes * 60),
      signerAddress
    ).then((data) => {
      setTransaction(data[0]);
      setOutputAmount(data[1]);
      setRatio(data[2]);
      setLoading(false);
    });
  };

  const setTxdirec = () => {
    setTransactionDirection(!transactionDirection);
    console.log(`Transaction Direction set to ${transactionDirection}`);
  };

  return (
    <div className="App">
      <div className="appNav">
        <div className="my-2 buttonContainer buttonContainerTop">
          {transactionDirection ? (
            <>
              <PageButton name={"Neo to Matic"} isBold={"isBold"} />
              <PageButton name={"Matic to Neo"} />{" "}
            </>
          ) : (
            <>
              <PageButton name={"Neo to Matic"} />
              <PageButton name={"Matic to Neo"} isBold={"isBold"} />
            </>
          )}
        </div>
        <i className="fa-solid fa-retweet mx-2" onClick={setTxdirec} />

        <div className="rightNav">
          <div className="connectButtonContainer">
            <ConnectButton
              provider={provider}
              isConnected={isConnected}
              signerAddress={signerAddress}
              getSigner={getSigner}
            />
          </div>
          <div className="my-2 buttonContainer">
            <PageButton name={"..."} isBold={true} />
          </div>
        </div>
      </div>

      <div className="appBody">
        <div className="swapContainer">
          <div className="swapHeader">
            <span className="swapText">Swap</span>
            <span className="gearContainer" onClick={() => setShowModal(true)}>
              <GearFill />
            </span>
            {showModal && (
              <ConfigModal
                onClose={() => setShowModal(false)}
                setDeadlineMinutes={setDeadlineMinutes}
                deadlineMinutes={deadlineMinutes}
                setSlippageAmount={setSlippageAmount}
                slippageAmount={slippageAmount}
              />
            )}
          </div>
          {transactionDirection ? (
            <>
              <div className="swapBody">
                <CurrencyField
                  field="input"
                  tokenName="NEO"
                  getSwapPrice={getSwapPriceNeoToMatic}
                  signer={signer}
                  balance={neoAmount}
                />
                <CurrencyField
                  field="output"
                  tokenName="WMATIC"
                  value={outputAmount}
                  signer={signer}
                  balance={wmaticAmount}
                  spinner={BeatLoader}
                  loading={loading}
                />
              </div>

              <div className="ratioContainer">
                {ratio && <>{`1 WMATIC = ${ratio} NEO`}</>}
              </div>
            </>
          ) : (
            <>
              {" "}
              <div className="swapBody">
                <CurrencyField
                  field="input"
                  tokenName="WMATIC"
                  getSwapPrice={getSwapPriceMaticToNeo}
                  signer={signer}
                  balance={wmaticAmount}
                />
                <CurrencyField
                  field="output"
                  tokenName="NEO"
                  value={outputAmount}
                  signer={signer}
                  balance={neoAmount}
                  spinner={BeatLoader}
                  loading={loading}
                />
              </div>
              <div className="ratioContainer">
                {ratio && <>{`1 NEO = ${1 / ratio} WMATIC`}</>}
              </div>
            </>
          )}

          <div>
            <div className="swapButtonContainer">
              {isConnected() ? (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <div
                    style={{ width: "45%" }}
                    onClick={() => runSwapNeoToMatic(transaction, signer)}
                    className="swapButton"
                  >
                    Neo to Matic
                  </div>
                  <div
                    style={{ width: "45%" }}
                    onClick={() => runSwapMaticToNeo(transaction, signer)}
                    className="swapButton"
                  >
                    Matic To Neo
                  </div>
                </div>
              ) : (
                <div onClick={() => getSigner(provider)} className="swapButton">
                  Connect Wallet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;
