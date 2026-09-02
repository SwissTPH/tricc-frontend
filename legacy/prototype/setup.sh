#!/bin/bash

# TRICC Frontend Setup Script
echo "Setting up TRICC Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 16+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "Error: Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "Node.js version: $(node -v)"

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "To start the development server, run:"
    echo "  npm start"
    echo ""
    echo "To build for production, run:"
    echo "  npm run build"
    echo ""
    echo "The application will be available at: http://localhost:3000"
else
    echo "❌ Failed to install dependencies. Please check the error messages above."
    exit 1
fi

