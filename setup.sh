#!/bin/bash

# Install Spleeter if it's not installed globally
if ! command -v spleeter &> /dev/null; then
    echo "Spleeter not found. Installing..."
    pip install spleeter
else
    echo "Spleeter is already installed."
fi
