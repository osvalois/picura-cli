#!/usr/bin/env node

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import('../dist/index.js').catch(require('@oclif/core/handle'));