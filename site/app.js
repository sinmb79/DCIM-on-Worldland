const config = window.DCIP_CONFIG || {};

const state = {
  provider: null,
  signer: null,
  account: null
};

const elements = {
  connectButtons: Array.from(document.querySelectorAll("[data-connect-wallet]")),
  walletStatus: document.querySelector("[data-wallet-status]"),
  walletAddress: document.querySelector("[data-wallet-address]"),
  networkStatus: document.querySelector("[data-network-status]"),
  queryForm: document.querySelector("[data-query-form]"),
  queryInput: document.querySelector("[data-query-input]"),
  queryLevel: document.querySelector("[data-query-level]"),
  querySubmit: document.querySelector("[data-query-submit]"),
  queryError: document.querySelector("[data-query-error]"),
  answer: document.querySelector("[data-answer]"),
  queryHash: document.querySelector("[data-query-hash]"),
  txLink: document.querySelector("[data-tx-link]"),
  cidLink: document.querySelector("[data-cid-link]"),
  resultCard: document.querySelector("[data-result-card]"),
  nodeAddress: document.querySelector("[data-node-address]"),
  nodeRegistered: document.querySelector("[data-node-registered]"),
  nodeRole: document.querySelector("[data-node-role]"),
  nodeReputation: document.querySelector("[data-node-reputation]"),
  nodeEndpoint: document.querySelector("[data-node-endpoint]"),
  tabButtons: Array.from(document.querySelectorAll("[data-tab-target]")),
  tabPanels: Array.from(document.querySelectorAll("[data-tab-panel]"))
};

function shortenAddress(address) {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function setWalletUi() {
  const connected = Boolean(state.account);
  const label = connected ? shortenAddress(state.account) : "Connect Wallet";

  elements.connectButtons.forEach((button) => {
    button.textContent = label;
  });

  if (elements.walletStatus) {
    elements.walletStatus.textContent = connected ? "Wallet ready" : "Wallet required";
  }

  if (elements.walletAddress) {
    elements.walletAddress.textContent = state.account || "Connect a Worldland wallet to submit queries.";
  }
}

function setNetworkUi(message) {
  if (elements.networkStatus) {
    elements.networkStatus.textContent = message;
  }
}

async function ensureWorldland() {
  if (!window.ethereum) {
    throw new Error("A Web3 wallet was not detected.");
  }

  const provider = state.provider || new ethers.BrowserProvider(window.ethereum);
  state.provider = provider;

  const expectedChainId = BigInt(config.chainId || 87);
  const network = await provider.getNetwork();

  if (network.chainId === expectedChainId) {
    setNetworkUi("Connected to Worldland");
    return;
  }

  const chainIdHex = ethers.toQuantity(expectedChainId);

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }]
    });
  } catch (error) {
    if (error && error.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: "Worldland Mainnet",
            rpcUrls: [config.rpcUrl || "https://rpc.worldland.io"],
            nativeCurrency: {
              name: "Worldland",
              symbol: "WL",
              decimals: 18
            },
            blockExplorerUrls: [config.explorerBaseUrl || "https://scan.worldland.io"]
          }
        ]
      });
    } else {
      throw error;
    }
  }

  setNetworkUi("Connected to Worldland");
}

async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("Install MetaMask or another compatible wallet.");
  }

  state.provider = new ethers.BrowserProvider(window.ethereum);
  await ensureWorldland();
  await state.provider.send("eth_requestAccounts", []);
  state.signer = await state.provider.getSigner();
  state.account = await state.signer.getAddress();
  setWalletUi();
}

function setLoading(isLoading) {
  if (!elements.querySubmit) {
    return;
  }

  elements.querySubmit.disabled = isLoading;
  elements.querySubmit.textContent = isLoading ? "Submitting..." : "Submit Query";
}

function showError(message) {
  if (elements.queryError) {
    elements.queryError.textContent = message || "";
  }
}

function renderResult(data) {
  if (!elements.resultCard) {
    return;
  }

  elements.resultCard.hidden = false;
  elements.answer.textContent = data.answer || "";
  elements.queryHash.textContent = data.queryHash || "";
  elements.txLink.href = `${(config.explorerBaseUrl || "https://scan.worldland.io").replace(/\/$/, "")}/tx/${data.txHash}`;
  elements.txLink.textContent = data.txHash || "";
  elements.cidLink.href = `${(config.ipfsGatewayBaseUrl || "https://ipfs.io/ipfs/").replace(/\/$/, "")}/${data.responseCID}`;
  elements.cidLink.textContent = data.responseCID || "";
}

async function submitQuery(event) {
  event.preventDefault();

  try {
    showError("");

    if (!state.account) {
      await connectWallet();
    }

    await ensureWorldland();
    setLoading(true);

    const response = await fetch(`${(config.nodeApiBaseUrl || "").replace(/\/$/, "")}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: elements.queryInput.value.trim(),
        level: Number(elements.queryLevel.value),
        sender: state.account
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Query submission failed.");
    }

    renderResult(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    showError(message);
  } finally {
    setLoading(false);
  }
}

async function refreshNodeStatus() {
  try {
    const response = await fetch(`${(config.nodeApiBaseUrl || "").replace(/\/$/, "")}/status`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Status unavailable");
    }

    elements.nodeAddress.textContent = data.address || "Unavailable";
    elements.nodeRegistered.textContent = data.registered ? "Yes" : "No";
    elements.nodeRole.textContent = data.role || "Unregistered";
    elements.nodeReputation.textContent = data.reputation ?? "N/A";
    elements.nodeEndpoint.textContent = data.endpoint || "Not published";
  } catch (_error) {
    elements.nodeAddress.textContent = "Unavailable";
    elements.nodeRegistered.textContent = "Unavailable";
    elements.nodeRole.textContent = "Unavailable";
    elements.nodeReputation.textContent = "Unavailable";
    elements.nodeEndpoint.textContent = "Check node API config";
  }
}

function switchTab(targetId) {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tabTarget === targetId);
  });

  elements.tabPanels.forEach((panel) => {
    panel.hidden = panel.dataset.tabPanel !== targetId;
  });
}

function bindTabs() {
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tabTarget));
  });
}

function bindWalletEvents() {
  if (!window.ethereum) {
    return;
  }

  window.ethereum.on("accountsChanged", async (accounts) => {
    state.account = accounts[0] || null;
    if (state.account && state.provider) {
      state.signer = await state.provider.getSigner();
    } else {
      state.signer = null;
    }
    setWalletUi();
  });

  window.ethereum.on("chainChanged", () => {
    setNetworkUi("Chain changed. Rechecking Worldland...");
  });
}

function bindEvents() {
  elements.connectButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await connectWallet();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Wallet connection failed.";
        showError(message);
      }
    });
  });

  if (elements.queryForm) {
    elements.queryForm.addEventListener("submit", submitQuery);
  }
}

async function init() {
  setWalletUi();
  bindTabs();
  bindEvents();
  bindWalletEvents();
  switchTab("user");
  await refreshNodeStatus();
}

init();
