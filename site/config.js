window.DCIP_CONFIG = Object.assign(
  {
    nodeApiBaseUrl: "http://localhost:3000",
    chainId: 87,
    rpcUrl: "https://rpc.worldland.io",
    explorerBaseUrl: "https://scan.worldland.io",
    ipfsGatewayBaseUrl: "https://ipfs.io/ipfs/"
  },
  window.DCIP_CONFIG || {}
);
