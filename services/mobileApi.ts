import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
export const IMAGE_URL = process.env.EXPO_PUBLIC_IMAGE_BASE_URL;

console.log("API URL:", API_URL); // ← add this
export const mobileApi = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});
