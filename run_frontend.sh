#!/bin/bash

# Run the React frontend

cd "$(dirname "$0")/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Run the development server
echo "Starting React frontend on http://localhost:3000"
npm run dev
