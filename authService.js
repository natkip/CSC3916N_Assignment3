import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export const signup = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/signup`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Signup failed" };
  }
};

export const signin = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/signin`, userData);
    localStorage.setItem("token", response.data.token); // Store JWT token
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Signin failed" };
  }
};

export const logout = () => {
  localStorage.removeItem("token");
};
