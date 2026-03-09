// SPDX-License-Identifier: MIT

import path from "path";

import dotenv from "dotenv";

// Load shared root config first, then allow a node-server-local .env to override it.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });
