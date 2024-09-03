#!/bin/bash

# Colores para mensajes
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}Configurando el proyecto PICURA...${NC}"

# Crear estructura de directorios
mkdir -p src/commands
mkdir -p src/services
mkdir -p src/utils
mkdir -p tests

# Crear archivos principales
touch src/index.ts
touch src/commands/generate-architecture.ts
touch src/commands/generate-data-schema.ts
touch src/commands/analyze.ts
touch src/commands/assist.ts

# Crear archivo de configuración TypeScript
cat << EOF > tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "**/*.test.ts"
  ]
}
EOF

# Crear archivo de configuración ESLint
cat << EOF > .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "root": true
}
EOF

# Crear archivo .env
cat << EOF > .env
OPENAI_API_KEY=your_openai_api_key_here
KAFKA_BROKER=pkc-zgp5j7.us-south1.gcp.confluent.cloud:443
KAFKA_USERNAME=GVAZ54BZVQCLIMS
KAFKA_PASSWORD=xO8ShlIkzdQ6RAYiaVtC+EvXff3tY+sdkXbZ+VGaOWozSNjKg16rAfuNsUJS6d69
POSTGRES_URL=postgresql://developer:xJF3Bc8XpWZq@ep-proud-recipe-87355146-pooler.us-east-2.aws.neon.tech/pingerdata?sslmode=require
REDIS_URL=redis://redis-13167.c57.us-east-1-4.ec2.redns.redis-cloud.com:13167/0
REDIS_HOST=redis-13167.c57.us-east-1-4.ec2.redns.redis-cloud.com
REDIS_PORT=13167
REDIS_DB=0
REDIS_PASSWORD=FiR2sHxH2GfSUq4AkJp7DrHqSXalALIB
EOF

# Inicializar proyecto Node.js y agregar dependencias
npm init -y
npm install @oclif/core kafkajs ioredis @prisma/client openai dotenv fs-extra
npm install --save-dev typescript @types/node @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint

# Actualizar package.json con scripts
npm pkg set scripts.build="tsc"
npm pkg set scripts.start="node dist/index.js"
npm pkg set scripts.dev="npx ts-node src/index.ts"
npm pkg set scripts.lint="npx eslint . --ext .ts"
npm pkg set scripts.format="npx prettier --write \"src/**/*.ts\""
npm pkg set scripts.test="npx jest"

echo -e "${GREEN}Configuración completada. Ahora puedes ejecutar 'npm run build' para compilar el proyecto y 'npm start' para iniciarlo.${NC}"