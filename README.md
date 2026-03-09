# DCIP on Worldland

DCIP on Worldland is a Fair Launch decentralized collective intelligence protocol built on the Worldland EVM network.

This implementation follows the contract and node specifications from the original bilingual project documents. Whitepaper-only ideas such as automatic fee burns, query rate limiting, sponsorship, and zkML are intentionally deferred to later versions.

## Included In This Repository

- Hardhat smart contracts for `ACLToken`, `DCIPRegistry`, `PoIVerifier`, and `Bounty`
- A deployment script that wires contracts, sets the minter, sets the reputation updater, and renounces token ownership
- Ten passing Hardhat tests covering the v1 contract scenarios
- A TypeScript node server for inference, IPFS storage, validator signature collection, and proof submission
- A static single-page site with Worldland wallet connection and query submission

## Project Structure

```text
dcip-worldland/
|-- contracts/
|-- scripts/
|-- test/
|-- node-server/
`-- site/
```

## Install

```bash
npm install --legacy-peer-deps
npm run compile
npm test
npm run typecheck
```

## Environment

Copy `.env.example` to `.env` in the repository root.

The node server now reads the shared root `.env` automatically. If you want node-specific overrides, you can additionally place a `.env` file inside `node-server/`.

Important variables:

- `DEPLOYER_PRIVATE_KEY`: wallet used for contract deployment
- `NODE_PRIVATE_KEY`: wallet used by the node server
- `REGISTRY_ADDRESS`, `POI_VERIFIER_ADDRESS`, `ACL_TOKEN_ADDRESS`, `BOUNTY_ADDRESS`: filled after deployment
- `NODE_ENDPOINT`: public node URL used for registration
- `NODE_ROLE`: `AGENT`, `VALIDATOR`, `HUMAN`, or `RELAY`
- `NODE_STAKE_WL`: WL stake sent during registration
- `PEER_NODES`: comma-separated validator endpoints
- `CORS_ORIGIN`: optional origin allowlist for the API

## Local Development Flow

Start a local Hardhat chain:

```bash
npx hardhat node
```

Deploy contracts to the local chain:

```bash
npm run deploy:local
```

Register a local node after setting the local values in `.env`:

```bash
npm run register:node:local
```

Start the node server:

```bash
npm run node:start
```

Serve the static site:

```bash
npm run site:serve
```

By default the site is available at `http://127.0.0.1:8080` and the node API is expected at `http://127.0.0.1:3000`.

## Testnet And Mainnet Deployment

Deploy to Worldland testnet:

```bash
npm run deploy:testnet
```

Deploy to Worldland mainnet:

```bash
npm run deploy:mainnet
```

The deployment script writes `deployed-addresses.json` and prints the contract addresses in `.env`-friendly format.

To register a node on a non-local network:

```bash
npx hardhat run scripts/register-node.js --network worldland_test
```

Or:

```bash
npx hardhat run scripts/register-node.js --network worldland
```

## API

- `POST /query { query, level, sender }`
- `POST /sign { queryHash, responseCID }`
- `GET /status`
- `GET /health`

`GET /status` returns the node address, registration flag, role, reputation, endpoint, and active adapter.

## Verification Status

Verified in this workspace:

- `npx hardhat test` passes all 10 scenarios
- `npm run typecheck` passes for the node server
- Local smoke checks succeeded for `/health`, `/status`, and `/sign`

Not fully verified in this workspace:

- Full `/query` end-to-end against a real IPFS daemon and three distinct validator nodes
- Real Worldland testnet or mainnet deployment
- Browser wallet interaction against a live Worldland endpoint

`/query` requires more than one online actor in realistic mode:

- 1 proposer node
- at least 3 distinct validator signatures
- a working IPFS API endpoint

## Site Configuration

The static site uses `site/config.js` for runtime settings:

```js
window.DCIP_CONFIG = {
  nodeApiBaseUrl: "http://localhost:3000",
  chainId: 87,
  rpcUrl: "https://rpc.worldland.io",
  explorerBaseUrl: "https://scan.worldland.io"
};
```

Adjust those values before serving the site against testnet, mainnet, or a different API host.

## License

MIT
