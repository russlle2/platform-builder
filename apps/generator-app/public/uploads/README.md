# Uploads Directory

This directory stores user-uploaded images.

The upload API automatically:
- Validates file types and sizes
- Generates unique filenames
- Optionally optimizes images with Sharp
- Stores images in this directory

## API Endpoints

- `POST /api/upload` - Upload image
- `GET /api/upload` - List uploaded images
- `DELETE /api/upload?filename=xxx` - Delete image

## Features

- Maximum file size: 4MB (fits the production function request limit)
- Supported formats: JPEG, PNG, GIF, WebP
- Optional image optimization with Sharp
- Automatic file management

## User Image Library

For logged-in users, uploaded images are:
- Saved to their account
- Reusable across sessions
- Organized by category
- Deletable/renameable
